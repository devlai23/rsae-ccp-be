import { pgPool } from '../config/database.js';

const buildWhereClause = ({ search, category, status, tag }, values) => {
  const clauses = [];

  if (search) {
    values.push(`%${search}%`);
    const idx = values.length;
    clauses.push(
      `(title ILIKE $${idx} OR description ILIKE $${idx} OR submitted_by ILIKE $${idx})`
    );
  }

  if (category && category.toLowerCase() !== 'all') {
    values.push(category);
    clauses.push(`category = $${values.length}`);
  }

  if (status && status.toLowerCase() !== 'all') {
    values.push(status);
    clauses.push(`status = $${values.length}`);
  }

  if (tag && tag.toLowerCase() !== 'all') {
    values.push(tag);
    clauses.push(`$${values.length} = ANY(tags)`);
  }

  return clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
};

const proposalPostgresProvider = {
  async updateStatus(id, status) {
    const sql = `
      UPDATE proposals
      SET status = $2
      WHERE id = $1
      RETURNING id;
    `;
    const { rows } = await pgPool.query(sql, [id, status]);
    return rows.length > 0;
  },
  async getAll(filters = {}, userId = null) {
    const values = [];
    const whereClause = buildWhereClause(filters, values);
    const sortOrder = filters.sort === 'oldest' ? 'ASC' : 'DESC';

    const userVoteJoin = userId
      ? `LEFT JOIN proposal_votes pv ON pv.proposal_id = proposals.id AND pv.user_id = ${userId}`
      : '';
    const userVoteSelect = userId ? `, pv.vote_type AS "userVote"` : '';

    const sql = `
      SELECT
        proposals.id,
        proposals.title,
        proposals.category,
        proposals.description,
        proposals.votes,
        proposals.submitted_by AS "submittedBy",
        proposals.submitted_at AS "submittedAt",
        proposals.status,
        COALESCE(proposals.tags, ARRAY[]::TEXT[]) AS tags
        ${userVoteSelect}
      FROM proposals
      ${userVoteJoin}
      ${whereClause}
      ORDER BY proposals.submitted_at ${sortOrder};
    `;

    const { rows } = await pgPool.query(sql, values);
    return rows;
  },

  async getById(id, userId = null) {
    const userVoteJoin = userId
      ? `LEFT JOIN proposal_votes pv ON pv.proposal_id = proposals.id AND pv.user_id = ${userId}`
      : '';
    const userVoteSelect = userId ? `, pv.vote_type AS "userVote"` : '';

    const sql = `
      SELECT
        proposals.id,
        proposals.title,
        proposals.category,
        proposals.description,
        proposals.votes,
        proposals.submitted_by AS "submittedBy",
        proposals.submitted_at AS "submittedAt",
        proposals.status,
        COALESCE(proposals.tags, ARRAY[]::TEXT[]) AS tags
        ${userVoteSelect}
      FROM proposals
      ${userVoteJoin}
      WHERE proposals.id = $1
      LIMIT 1;
    `;
    const { rows } = await pgPool.query(sql, [id]);
    return rows[0] || null;
  },

  async getAllTags() {
    const sql = `
      SELECT DISTINCT tag
      FROM (
        SELECT unnest(COALESCE(tags, ARRAY[]::TEXT[])) AS tag
        FROM proposals
      ) tag_values
      WHERE tag IS NOT NULL AND tag <> ''
      ORDER BY tag ASC;
    `;
    const { rows } = await pgPool.query(sql);
    return rows.map((row) => row.tag);
  },

  async getCountsByCategory() {
    const sql = `
      SELECT category, COUNT(*)::int AS count
      FROM proposals
      GROUP BY category
      ORDER BY category ASC;
    `;
    const { rows } = await pgPool.query(sql);
    return rows;
  },

  async getTotalCount() {
    const { rows } = await pgPool.query(
      'SELECT COUNT(*)::int AS total FROM proposals;'
    );
    return rows[0]?.total || 0;
  },

  async getCountsByStatus() {
    const sql = `
      SELECT status, COUNT(*)::int AS count
      FROM proposals
      GROUP BY status;
    `;
    const { rows } = await pgPool.query(sql);
    return rows;
  },

  async create(proposalData) {
    const {
      title,
      category,
      description,
      submittedBy = 'Anonymous Resident',
      tags = []
    } = proposalData;

    const sql = `
      INSERT INTO proposals (title, category, description, submitted_by, tags)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        title,
        category,
        description,
        votes,
        submitted_by AS "submittedBy",
        submitted_at AS "submittedAt",
        status,
        tags;
    `;

    const values = [title, category, description, submittedBy, tags];
    const { rows } = await pgPool.query(sql, values);

    return rows[0];
  },
};

export default proposalPostgresProvider;
