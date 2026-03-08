import { pgPool } from '../config/database.js';

const proposalPostgresProvider = {
  async getAll() {
    const sql = `
      SELECT
        id,
        title,
        category,
        description,
        votes,
        submitted_by AS "submittedBy",
        submitted_at AS "submittedAt",
        status
      FROM proposals
      ORDER BY submitted_at DESC;
    `;

    const { rows } = await pgPool.query(sql);
    return rows;
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
};

export default proposalPostgresProvider;
