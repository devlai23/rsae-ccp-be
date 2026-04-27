import { pgPool } from '../config/database.js';

const commentsPostgresProvider = {
  async listByProposalId(proposalId) {
    const sql = `
      SELECT
        id,
        proposal_id AS "proposalId",
        author_uid AS "authorUid",
        author_display AS "authorDisplay",
        body,
        created_at AS "createdAt"
      FROM comments
      WHERE proposal_id = $1
        AND deleted_at IS NULL
      ORDER BY created_at ASC;
    `;
    const { rows } = await pgPool.query(sql, [proposalId]);
    return rows;
  },

  async create({ proposalId, authorUid, authorDisplay, body }) {
    const sql = `
      INSERT INTO comments (proposal_id, author_uid, author_display, body)
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        proposal_id AS "proposalId",
        author_uid AS "authorUid",
        author_display AS "authorDisplay",
        body,
        created_at AS "createdAt";
    `;
    const values = [
      proposalId,
      authorUid ?? null,
      authorDisplay,
      body,
    ];
    const { rows } = await pgPool.query(sql, values);
    return rows[0];
  },

  async softDelete({ commentId, deletedByUid }) {
    const sql = `
      UPDATE comments
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

export default commentsPostgresProvider;
