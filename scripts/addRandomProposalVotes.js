import crypto from 'crypto';

import { pool } from '../src/config/database.js';

const MIN_VOTES = 1;
const MAX_VOTES = 25;
const shouldWrite = process.argv.includes('--write');

const randomVoteCount = () =>
  Math.floor(Math.random() * (MAX_VOTES - MIN_VOTES + 1)) + MIN_VOTES;

const buildSyntheticVoterId = (proposalId, index) =>
  `seed-${proposalId}-${Date.now()}-${index}-${crypto.randomUUID()}`;

const loadProposals = async () => {
  const [rows] = await pool.query(`
    SELECT id, title, votes, status
    FROM proposals
    ORDER BY id ASC;
  `);

  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    votes: Number(row.votes || 0),
    status: row.status,
  }));
};

const buildPlan = (proposals) =>
  proposals.map((proposal) => {
    const addedVotes = randomVoteCount();
    return {
      ...proposal,
      addedVotes,
      nextVotes: proposal.votes + addedVotes,
    };
  });

const applyPlan = async (plan) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const proposal of plan) {
      for (let index = 0; index < proposal.addedVotes; index += 1) {
        await connection.query(
          `
            INSERT INTO proposal_votes (proposal_id, voter_id)
            VALUES (?, ?);
          `,
          [proposal.id, buildSyntheticVoterId(proposal.id, index)]
        );
      }

      await connection.query(
        `
          UPDATE proposals
          SET votes = votes + ?
          WHERE id = ?;
        `,
        [proposal.addedVotes, proposal.id]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const main = async () => {
  const proposals = await loadProposals();

  if (proposals.length === 0) {
    console.log('No proposals found. Nothing to update.');
    return;
  }

  const plan = buildPlan(proposals);

  console.log(
    `${shouldWrite ? 'Applying' : 'Previewing'} random upvotes for ${plan.length} proposal(s).`
  );
  console.table(
    plan.map((proposal) => ({
      id: proposal.id,
      title: proposal.title,
      status: proposal.status,
      currentVotes: proposal.votes,
      addedVotes: proposal.addedVotes,
      nextVotes: proposal.nextVotes,
    }))
  );

  if (!shouldWrite) {
    console.log('Dry run only. Re-run with --write to persist these changes.');
    return;
  }

  await applyPlan(plan);
  console.log('Random proposal upvotes applied successfully.');
};

main()
  .catch((error) => {
    console.error('Failed to add random proposal votes:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
