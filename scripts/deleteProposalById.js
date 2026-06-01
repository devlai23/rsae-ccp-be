import { pool } from '../src/config/database.js';

const shouldWrite = process.argv.includes('--write');

const idArg = process.argv.find((arg) => arg.startsWith('--id='));
const proposalId = Number.parseInt(idArg?.split('=')[1] || '', 10);

const printUsage = () => {
  console.log('Delete a single proposal by id.');
  console.log('');
  console.log('Dry run:');
  console.log('  node scripts/deleteProposalById.js --id=12');
  console.log('  npm run proposal:delete -- --id=12');
  console.log('');
  console.log('Apply:');
  console.log('  node scripts/deleteProposalById.js --id=12 --write');
  console.log('  npm run proposal:delete:write -- --id=12');
};

const loadProposalSummary = async (id) => {
  const [proposalRows] = await pool.query(
    `
      SELECT id, title, category, status, votes, submitted_by, submitted_at
      FROM proposals
      WHERE id = ?;
    `,
    [id]
  );

  if (!proposalRows.length) {
    return null;
  }

  const proposal = proposalRows[0];

  const [commentRows] = await pool.query(
    'SELECT COUNT(*) AS total FROM proposal_comments WHERE proposal_id = ?;',
    [id]
  );
  const [voteRows] = await pool.query(
    'SELECT COUNT(*) AS total FROM proposal_votes WHERE proposal_id = ?;',
    [id]
  );

  return {
    id: Number(proposal.id),
    title: proposal.title,
    category: proposal.category,
    status: proposal.status,
    votes: Number(proposal.votes || 0),
    submittedBy: proposal.submitted_by,
    submittedAt: proposal.submitted_at,
    commentCount: Number(commentRows[0]?.total || 0),
    voteRecordCount: Number(voteRows[0]?.total || 0),
  };
};

const deleteProposal = async (id) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      'DELETE FROM proposals WHERE id = ?;',
      [id]
    );
    await connection.commit();
    return Number(result.affectedRows || 0) > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const main = async () => {
  if (!Number.isInteger(proposalId) || proposalId <= 0) {
    console.error('A valid proposal id is required.');
    printUsage();
    process.exitCode = 1;
    return;
  }

  const proposal = await loadProposalSummary(proposalId);

  if (!proposal) {
    console.log(`Proposal ${proposalId} was not found. No changes applied.`);
    return;
  }

  console.log(
    `${shouldWrite ? 'Preparing to delete' : 'Dry run for'} proposal ${proposal.id}:`
  );
  console.table([proposal]);
  console.log(
    `Deleting this proposal will also remove ${proposal.commentCount} comment(s) and ${proposal.voteRecordCount} vote record(s) via cascade.`
  );

  if (!shouldWrite) {
    console.log('No changes applied. Re-run with --write to delete it.');
    return;
  }

  const deleted = await deleteProposal(proposal.id);
  console.log(
    deleted
      ? `Deleted proposal ${proposal.id} successfully.`
      : `Proposal ${proposal.id} was not deleted.`
  );
};

main()
  .catch((error) => {
    console.error('Failed to delete proposal:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
