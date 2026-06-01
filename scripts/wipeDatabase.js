import { pool } from '../src/config/database.js';

const TABLES_IN_WIPE_ORDER = [
  'proposal_votes',
  'proposal_comments',
  'proposals',
];

const shouldWrite = process.argv.includes('--write');
const hasConfirmation = process.argv.includes('--confirm=WIPE_DB');

const printUsage = () => {
  console.log(
    'This script wipes proposal data and related records but keeps the schema.'
  );
  console.log(`Tables: ${TABLES_IN_WIPE_ORDER.join(', ')}`);
  console.log('Preserved tables include: users, audit_logs');
  console.log('');
  console.log('Dry run:');
  console.log('  npm run db:wipe');
  console.log('');
  console.log('Apply:');
  console.log('  npm run db:wipe:write');
};

const getTableCounts = async () => {
  const counts = [];

  for (const tableName of TABLES_IN_WIPE_ORDER) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total FROM \`${tableName}\`;`
    );
    counts.push({
      table: tableName,
      total: Number(rows[0]?.total || 0),
    });
  }

  return counts;
};

const wipeTables = async () => {
  const connection = await pool.getConnection();

  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

    for (const tableName of TABLES_IN_WIPE_ORDER) {
      await connection.query(`TRUNCATE TABLE \`${tableName}\`;`);
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
  } catch (error) {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    throw error;
  } finally {
    connection.release();
  }
};

const main = async () => {
  const counts = await getTableCounts();

  console.log(
    `${shouldWrite ? 'Preparing to wipe' : 'Dry run for'} application tables:`
  );
  console.table(counts);

  if (!shouldWrite || !hasConfirmation) {
    console.log(
      'No changes applied. Re-run with --write --confirm=WIPE_DB to wipe the database.'
    );
    printUsage();
    return;
  }

  await wipeTables();
  console.log('Database wipe complete.');
};

main()
  .catch((error) => {
    console.error('Failed to wipe database:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
