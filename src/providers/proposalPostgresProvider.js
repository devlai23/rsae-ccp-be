import { pool, pgPool } from '../config/database.js';

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

const canonicalizeCategory = (value) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return trimmed;
  }

  const normalized = trimmed.toLowerCase().replace(/&/g, 'and');

  if (normalized.includes('hous')) {
    return 'Housing';
  }

  if (normalized.includes('health') || normalized.includes('wellness')) {
    return 'Health and Wellness';
  }

  if (normalized.includes('econ')) {
    return 'Economic Development';
  }

  if (normalized.includes('art') || normalized.includes('cult')) {
    return 'Art and Culture';
  }

  if (normalized.includes('educ')) {
    return 'Education';
  }

  return trimmed;
};

const getCategoryVariants = (value) => {
  const canonical = canonicalizeCategory(value);

  switch (canonical) {
    case 'Housing':
      return ['Housing', 'housing'];
    case 'Health and Wellness':
      return ['Health and Wellness', 'Health & Wellness', 'health'];
    case 'Economic Development':
      return ['Economic Development', 'Economic development', 'economic'];
    case 'Art and Culture':
      return ['Art and Culture', 'Art and culture', 'Arts & Culture', 'arts'];
    case 'Education':
      return ['Education', 'education'];
    default:
      return canonical ? [canonical] : [];
  }
};

const normalizeProposalRow = (row) => ({
  id: row.id,
  title: row.title,
  category: canonicalizeCategory(row.category),
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
    const variants = getCategoryVariants(category);

    if (variants.length === 1) {
      const idx = getPlaceholder(values, variants[0]);
      clauses.push(`category = ${idx}`);
    } else if (variants.length > 1) {
      const placeholders = variants.map((variant) => getPlaceholder(values, variant));
      clauses.push(`category IN (${placeholders.join(', ')})`);
    }
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

  async getVotedProposalIds(voterId) {
    if (!voterId) {
      return new Set();
    }
    if (isMySql) {
      const sql =
        'SELECT proposal_id FROM proposal_votes WHERE voter_id = ?';
      const rows = await queryRows(sql, [voterId]);
      return new Set(rows.map((r) => Number(r.proposal_id ?? r.proposalId)));
    }

    const sql =
      'SELECT proposal_id FROM proposal_votes WHERE voter_id = $1';
    const rows = await queryRows(sql, [voterId]);
    return new Set(rows.map((r) => Number(r.proposal_id ?? r.proposalId)));
  },

  /**
   * Toggle vote for (proposal_id, voter_id). Adds support if absent, removes if present.
   */
  async toggleVote(proposalId, voterId) {
    if (isMySql) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const [rows] = await conn.execute(
          'SELECT id, status, votes FROM proposals WHERE id = ? FOR UPDATE',
          [proposalId]
        );
        if (!rows?.length) {
          await conn.rollback();
          return { ok: false, code: 'not_found' };
        }

        const proposal = rows[0];
        if (proposal.status !== 'approved') {
          await conn.rollback();
          return {
            ok: false,
            code: 'not_voteable',
            votes: Number(proposal.votes || 0),
          };
        }

        const [existing] = await conn.execute(
          'SELECT id FROM proposal_votes WHERE proposal_id = ? AND voter_id = ?',
          [proposalId, voterId]
        );

        if (existing?.length) {
          await conn.execute(
            'DELETE FROM proposal_votes WHERE proposal_id = ? AND voter_id = ?',
            [proposalId, voterId]
          );
          await conn.execute(
            'UPDATE proposals SET votes = GREATEST(votes - 1, 0) WHERE id = ?',
            [proposalId]
          );
        } else {
          await conn.execute(
            'INSERT INTO proposal_votes (proposal_id, voter_id) VALUES (?, ?)',
            [proposalId, voterId]
          );
          await conn.execute(
            'UPDATE proposals SET votes = votes + 1 WHERE id = ?',
            [proposalId]
          );
        }

        const [after] = await conn.execute(
          'SELECT votes FROM proposals WHERE id = ?',
          [proposalId]
        );

        await conn.commit();
        return {
          ok: true,
          hasVoted: !existing?.length,
          votes: Number(after[0]?.votes ?? 0),
        };
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    }

    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');

      const lockRes = await client.query(
        'SELECT id, status, votes FROM proposals WHERE id = $1 FOR UPDATE',
        [proposalId]
      );

      if (!lockRes.rows?.length) {
        await client.query('ROLLBACK');
        return { ok: false, code: 'not_found' };
      }

      const proposal = lockRes.rows[0];
      if (proposal.status !== 'approved') {
        await client.query('ROLLBACK');
        return {
          ok: false,
          code: 'not_voteable',
          votes: Number(proposal.votes || 0),
        };
      }

      const existingRes = await client.query(
        `SELECT id FROM proposal_votes
         WHERE proposal_id = $1 AND voter_id = $2`,
        [proposalId, voterId]
      );

      if (existingRes.rowCount > 0) {
        await client.query(
          'DELETE FROM proposal_votes WHERE proposal_id = $1 AND voter_id = $2',
          [proposalId, voterId]
        );
        await client.query(
          'UPDATE proposals SET votes = GREATEST(votes - 1, 0) WHERE id = $1',
          [proposalId]
        );
      } else {
        await client.query(
          `INSERT INTO proposal_votes (proposal_id, voter_id) VALUES ($1, $2)`,
          [proposalId, voterId]
        );
        await client.query(
          'UPDATE proposals SET votes = votes + 1 WHERE id = $1',
          [proposalId]
        );
      }

      const countRes = await client.query(
        'SELECT votes FROM proposals WHERE id = $1',
        [proposalId]
      );

      await client.query('COMMIT');
      return {
        ok: true,
        hasVoted: existingRes.rowCount === 0,
        votes: Number(countRes.rows[0]?.votes ?? 0),
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
};

export default proposalPostgresProvider;
