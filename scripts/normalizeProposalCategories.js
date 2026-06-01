import { pool } from '../src/config/database.js';

const CANONICAL_CATEGORIES = new Set([
  'Housing',
  'Health and Wellness',
  'Economic Development',
  'Art and Culture',
  'Education',
]);

const shouldWrite = process.argv.includes('--write');

const canonicalizeCategory = (value) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return '';
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

const normalizeTagValue = (tag) => {
  const canonical = canonicalizeCategory(tag);
  if (CANONICAL_CATEGORIES.has(canonical)) {
    return canonical;
  }

  return tag.trim();
};

const dedupeTags = (tags) => {
  const seen = new Set();
  const result = [];

  tags.forEach((tag) => {
    const key = tag.toLowerCase();
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(tag);
  });

  return result;
};

const summarizeChange = (proposal, nextCategory, nextTags) => ({
  id: proposal.id,
  title: proposal.title,
  fromCategory: proposal.category,
  toCategory: nextCategory,
  fromTags: normalizeTags(proposal.tags),
  toTags: nextTags,
});

const main = async () => {
  const [rows] = await pool.query(`
    SELECT id, title, category, tags
    FROM proposals
    ORDER BY id ASC;
  `);

  const changes = rows
    .map((proposal) => {
      const nextCategory = canonicalizeCategory(proposal.category);
      const nextTags = dedupeTags(
        normalizeTags(proposal.tags).map(normalizeTagValue)
      );
      const currentTags = normalizeTags(proposal.tags);

      const categoryChanged = nextCategory !== proposal.category;
      const tagsChanged =
        JSON.stringify(nextTags) !== JSON.stringify(currentTags);

      if (!categoryChanged && !tagsChanged) {
        return null;
      }

      return {
        proposal,
        nextCategory,
        nextTags,
        summary: summarizeChange(proposal, nextCategory, nextTags),
      };
    })
    .filter(Boolean);

  if (changes.length === 0) {
    console.log('No proposal category/tag normalization changes are needed.');
    return;
  }

  console.log(
    `${shouldWrite ? 'Applying' : 'Previewing'} ${changes.length} proposal normalization change(s).`
  );
  console.table(
    changes.map(({ summary }) => ({
      id: summary.id,
      title: summary.title,
      fromCategory: summary.fromCategory,
      toCategory: summary.toCategory,
      fromTags: summary.fromTags.join(', '),
      toTags: summary.toTags.join(', '),
    }))
  );

  if (!shouldWrite) {
    console.log('Dry run only. Re-run with --write to persist these changes.');
    return;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const { proposal, nextCategory, nextTags } of changes) {
      await connection.query(
        `
          UPDATE proposals
          SET category = ?, tags = ?
          WHERE id = ?;
        `,
        [nextCategory, JSON.stringify(nextTags), proposal.id]
      );
    }

    await connection.commit();
    console.log(`Updated ${changes.length} proposal record(s).`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

main()
  .catch((error) => {
    console.error('Failed to normalize proposal categories:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
