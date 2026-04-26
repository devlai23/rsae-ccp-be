import { pgPool } from '../config/database.js';

const isMySql = typeof pgPool.execute === 'function';

const getPlaceholder = (values, value) => {
  values.push(value);
  return isMySql ? '?' : `$${values.length}`;
};

const queryRows = async (sql, values = []) => {
  const result = await pgPool.query(sql, values);

  if (Array.isArray(result)) {
    return result[0] || [];
  }

  return result?.rows || [];
};

const queryResult = async (sql, values = []) => {
  const result = await pgPool.query(sql, values);
  if (Array.isArray(result)) {
    return result[0] || {};
  }
  return result;
};

const normalizeTags = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((tag) => typeof tag === 'string' && tag.trim() !== '');
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (tag) => typeof tag === 'string' && tag.trim() !== ''
        );
      }
    } catch {
      return [];
    }
  }

  return [];
};

const normalizeProposalRow = (row) => ({
  id: row.id,
  title: row.title,
  category: row.category,
  description: row.description,
  votes: Number(row.votes || 0),
  submittedBy: row.submittedBy ?? row.submitted_by,
  submittedAt: row.submittedAt ?? row.submitted_at,
  status: row.status,
  tags: normalizeTags(row.tags),
});

const buildWhereClause = ({ search, category, status, tag }, values) => {
  const clauses = [];

  if (search) {
    const idx = getPlaceholder(values, `%${search}%`);
    const searchOperator = isMySql ? 'LIKE' : 'ILIKE';
    clauses.push(
      `(title ${searchOperator} ${idx} OR description ${searchOperator} ${idx} OR submitted_by ${searchOperator} ${idx})`
    );
  }

  if (category && category.toLowerCase() !== 'all') {
    const idx = getPlaceholder(values, category);
    clauses.push(`category = ${idx}`);
  }

  if (status && status.toLowerCase() !== 'all') {
    const idx = getPlaceholder(values, status);
    clauses.push(`status = ${idx}`);
  }

  if (tag && tag.toLowerCase() !== 'all') {
    const idx = getPlaceholder(values, tag);
    clauses.push(
      isMySql
        ? `JSON_CONTAINS(COALESCE(tags, JSON_ARRAY()), JSON_ARRAY(${idx}))`
        : `${idx} = ANY(tags)`
    );
  }

  return clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
};

const proposalPostgresProvider = {
  async updateStatus(id, status) {
    if (isMySql) {
      const sql = `
        UPDATE proposals
        SET status = ?
        WHERE id = ?;
      `;
      const result = await queryResult(sql, [status, id]);
      return Number(result.affectedRows || 0) > 0;
    }

    const sql = `
      UPDATE proposals
      SET status = $2
      WHERE id = $1
      RETURNING id;
    `;
    const rows = await queryRows(sql, [id, status]);
    return rows.length > 0;
  },

  async getAll(filters = {}) {
    const values = [];
    const whereClause = buildWhereClause(filters, values);
    const sortOrder = filters.sort === 'oldest' ? 'ASC' : 'DESC';
    const tagsExpression = isMySql
      ? 'COALESCE(tags, JSON_ARRAY())'
      : 'COALESCE(tags, ARRAY[]::TEXT[])';

    const sql = `
      SELECT
        id,
        title,
        category,
        description,
        votes,
        submitted_by,
        submitted_at,
        status,
        ${tagsExpression} AS tags
      FROM proposals
      ${whereClause}
      ORDER BY submitted_at ${sortOrder};
    `;

    const rows = await queryRows(sql, values);
    return rows.map(normalizeProposalRow);
  },

  async getById(id) {
    const wherePlaceholder = isMySql ? '?' : '$1';
    const tagsExpression = isMySql
      ? 'COALESCE(tags, JSON_ARRAY())'
      : 'COALESCE(tags, ARRAY[]::TEXT[])';

    const sql = `
      SELECT
        id,
        title,
        category,
        description,
        votes,
        submitted_by,
        submitted_at,
        status,
        ${tagsExpression} AS tags
      FROM proposals
      WHERE id = ${wherePlaceholder}
      LIMIT 1;
    `;

    const rows = await queryRows(sql, [id]);
    return rows[0] ? normalizeProposalRow(rows[0]) : null;
  },

  async getAllTags() {
    const rows = await queryRows('SELECT tags FROM proposals;');
    const tagSet = new Set();

    rows.forEach((row) => {
      normalizeTags(row.tags).forEach((tag) => tagSet.add(tag));
    });

    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  },

  async getCountsByCategory() {
    const sql = `
      SELECT category, COUNT(*) AS count
      FROM proposals
      GROUP BY category
      ORDER BY category ASC;
    `;

    const rows = await queryRows(sql);
    return rows.map((row) => ({
      ...row,
      count: Number(row.count || 0),
    }));
  },

  async getTotalCount() {
    const rows = await queryRows('SELECT COUNT(*) AS total FROM proposals;');
    return Number(rows[0]?.total || 0);
  },

  async getCountsByStatus() {
    const sql = `
      SELECT status, COUNT(*) AS count
      FROM proposals
      GROUP BY status;
    `;

    const rows = await queryRows(sql);
    return rows.map((row) => ({
      ...row,
      count: Number(row.count || 0),
    }));
  },

  async create(proposalData) {
    const {
      title,
      category,
      description,
      submittedBy = 'Anonymous Resident',
      tags = [],
    } = proposalData;

    const normalizedTags = Array.isArray(tags)
      ? tags.filter((tag) => typeof tag === 'string' && tag.trim() !== '')
      : [];

    if (isMySql) {
      const sql = `
        INSERT INTO proposals (title, category, description, submitted_by, tags)
        VALUES (?, ?, ?, ?, ?);
      `;

      const result = await queryResult(sql, [
        title,
        category,
        description,
        submittedBy,
        JSON.stringify(normalizedTags),
      ]);

      if (!result.insertId) {
        return null;
      }

      return this.getById(result.insertId);
    }

    const sql = `
      INSERT INTO proposals (title, category, description, submitted_by, tags)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id,
        title,
        category,
        description,
        votes,
        submitted_by,
        submitted_at,
        status,
        tags;
    `;

    const values = [title, category, description, submittedBy, normalizedTags];
    const rows = await queryRows(sql, values);

    return rows[0] ? normalizeProposalRow(rows[0]) : null;
  },
};

export default proposalPostgresProvider;
