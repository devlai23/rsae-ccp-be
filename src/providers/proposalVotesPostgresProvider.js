import { pgPool } from '../config/database.js';

const proposalVotesPostgresProvider = {
  async getByUserAndProposal(userId, proposalId) {
    const sql = `
      SELECT
        id,
        proposal_id AS "proposalId",
        user_id AS "userId",
        vote_type AS "voteType",
        created_at AS "createdAt"
      FROM proposal_votes
      WHERE user_id = $1 AND proposal_id = $2
      LIMIT 1;
    `;
    const { rows } = await pgPool.query(sql, [userId, proposalId]);
    return rows[0] || null;
  },

  async create({ proposalId, userId, voteType }) {
    const sql = `
      INSERT INTO proposal_votes (proposal_id, user_id, vote_type)
      VALUES ($1, $2, $3)
      ON CONFLICT (proposal_id, user_id)
      DO UPDATE SET vote_type = EXCLUDED.vote_type, updated_at = NOW()
      RETURNING
        id,
        proposal_id AS "proposalId",
        user_id AS "userId",
        vote_type AS "voteType",
        created_at AS "createdAt";
    `;
    const { rows } = await pgPool.query(sql, [proposalId, userId, voteType]);
    return rows[0] || null;
  },

  async remove(userId, proposalId) {
    const sql = `
      DELETE FROM proposal_votes
      WHERE user_id = $1 AND proposal_id = $2
      RETURNING id;
    `;
    const { rows } = await pgPool.query(sql, [userId, proposalId]);
    return rows.length > 0;
  },

  async getVotesByProposal(proposalId) {
    const sql = `
      SELECT
        user_id AS "userId",
        vote_type AS "voteType"
      FROM proposal_votes
      WHERE proposal_id = $1;
    `;
    const { rows } = await pgPool.query(sql, [proposalId]);
    return rows;
  },
};

export default proposalVotesPostgresProvider;
