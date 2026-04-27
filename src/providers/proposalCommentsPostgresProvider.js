import { pgPool } from '../config/database.js';

const isMySql = typeof pgPool.execute === 'function';

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

const mapCommentRow = (row) => ({
  id: row.id,
  proposalId: row.proposalId ?? row.proposal_id,
  author: row.author,
  body: row.body,
  createdAt: row.createdAt ?? row.created_at,
});

const proposalCommentsPostgresProvider = {
  async proposalExists(proposalId) {
    const sql = isMySql
      ? 'SELECT 1 AS ok FROM proposals WHERE id = ? LIMIT 1'
      : 'SELECT 1 AS ok FROM proposals WHERE id = $1 LIMIT 1';
    const rows = await queryRows(sql, [proposalId]);
    return rows.length > 0;
  },

  async listByProposalId(proposalId) {
    const wherePlaceholder = isMySql ? '?' : '$1';

    const sql = `
      SELECT
        id,
        proposal_id,
        author,
        body,
        created_at
      FROM proposal_comments
      WHERE proposal_id = $1
        AND deleted_at IS NULL
      ORDER BY created_at ASC;
    `;
    const rows = await queryRows(sql, [proposalId]);
    return rows.map(mapCommentRow);
  },

  async create({ proposalId, author, body }) {
    if (isMySql) {
      const insertSql = `
        INSERT INTO proposal_comments (proposal_id, author, body)
        VALUES (?, ?, ?);
      `;
      const result = await queryResult(insertSql, [proposalId, author, body]);

      if (!result.insertId) {
        return null;
      }

      const rows = await queryRows(
        `
          SELECT
            id,
            proposal_id,
            author,
            body,
            created_at
          FROM proposal_comments
          WHERE id = ?
          LIMIT 1;
        `,
        [result.insertId]
      );

      return rows[0] ? mapCommentRow(rows[0]) : null;
    }

    const sql = `
      INSERT INTO proposal_comments (proposal_id, author, body)
      VALUES ($1, $2, $3)
      RETURNING
        id,
        proposal_id,
        author,
        body,
        created_at;
    `;
    const rows = await queryRows(sql, [proposalId, author, body]);
    return rows[0] ? mapCommentRow(rows[0]) : null;
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
