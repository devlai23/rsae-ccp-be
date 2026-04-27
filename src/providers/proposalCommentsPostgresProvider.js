import { pgPool } from '../config/database.js';

const proposalCommentsPostgresProvider = {
  async proposalExists(proposalId) {
    const { rows } = await pgPool.query(
      'SELECT 1 AS ok FROM proposals WHERE id = $1 LIMIT 1',
      [proposalId]
    );
    return rows.length > 0;
  },

  async listByProposalId(proposalId) {
    const sql = `
      SELECT
        id,
        proposal_id AS "proposalId",
        author,
        body,
        created_at AS "createdAt"
      FROM proposal_comments
      WHERE proposal_id = $1
        AND deleted_at IS NULL
      ORDER BY created_at ASC;
    `;
    const { rows } = await pgPool.query(sql, [proposalId]);
    return rows;
  },

  async create({ proposalId, author, body }) {
    const sql = `
      INSERT INTO proposal_comments (proposal_id, author, body)
      VALUES ($1, $2, $3)
      RETURNING
        id,
        proposal_id AS "proposalId",
        author,
        body,
        created_at AS "createdAt";
    `;
    const { rows } = await pgPool.query(sql, [proposalId, author, body]);
    return rows[0] || null;
  },

  async softDelete({ commentId, deletedByUid }) {
    const sql = `
      UPDATE proposal_comments
      SET deleted_at = NOW(),
          deleted_by_uid = $2
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id, proposal_id AS "proposalId", body;
    `;
    const { rows } = await pgPool.query(sql, [commentId, deletedByUid ?? null]);
    return rows[0] || null;
  },
};

export default proposalCommentsPostgresProvider;
