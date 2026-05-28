import proposalRepository from '../repositories/proposalRepository.js';

const categoryOrder = [
  'Housing',
  'Health and Wellness',
  'Economic Development',
  'Art and Culture',
  'Education',
];

const categoryIdMap = {
  Housing: 'housing',
  'Health and Wellness': 'health-and-wellness',
  'Economic Development': 'economic-development',
  'Art and Culture': 'art-and-culture',
  Education: 'education',
};

const normalizeCategory = (value) => value?.trim().toLowerCase();

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

  if (normalized.includes('economic')) {
    return 'Economic Development';
  }

  if (normalized.includes('arts') || normalized.includes('cult')) {
    return 'Art and Culture';
  }

  if (normalized.includes('educ')) {
    return 'Education';
  }

  return trimmed;
};

const slugify = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildMetricCards = (totalCount, pendingCount, approvedCount) => [
  {
    id: 'total-submissions',
    title: 'Total Submissions',
    value: totalCount,
    timeframe: 'all time',
    pendingCount,
  },
  {
    id: 'pending-submissions',
    title: 'Pending Submissions',
    value: pendingCount,
    timeframe: 'awaiting review',
    pendingCount: 0,
  },
  {
    id: 'approved-submissions',
    title: 'Approved Submissions',
    value: approvedCount,
    timeframe: 'all time',
    pendingCount: 0,
  },
];

const buildCategoryDistribution = (rows, totalCount) => {
  const aggregatedCounts = new Map();

  rows.forEach((row) => {
    const rowName = canonicalizeCategory(row.category);
    const rowCount = row.count || 0;
    if (!rowName) {
      return;
    }

    const currentCount = aggregatedCounts.get(rowName) || 0;
    aggregatedCounts.set(rowName, currentCount + rowCount);
  });

  const knownCategories = categoryOrder.map((name) => {
    const count = aggregatedCounts.get(name) || 0;
    const percentage =
      totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;

    return {
      id: categoryIdMap[name],
      name,
      percentage,
    };
  });

  const unknownCategoryValues = Array.from(aggregatedCounts.entries())
    .filter(([name]) => !categoryOrder.includes(name))
    .map(([name, count]) => ({
      id: slugify(name),
      name,
      percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
    }));

  return [...knownCategories, ...unknownCategoryValues];
};

const buildTrendingCategory = (rows) => {
  const categoryCounts = new Map();

  rows.forEach((row) => {
    const rowName = canonicalizeCategory(row.category);
    const rowCount = row.count || 0;

    if (!rowName) {
      return;
    }

    const normalized = normalizeCategory(rowName);
    const knownCategoryName =
      categoryOrder.find((name) => normalizeCategory(name) === normalized) ||
      rowName;
    const currentCount = categoryCounts.get(knownCategoryName) || 0;

    categoryCounts.set(knownCategoryName, currentCount + rowCount);
  });

  let trendingCategory = 'N/A';
  let highestCount = 0;

  categoryCounts.forEach((count, name) => {
    if (count > highestCount) {
      highestCount = count;
      trendingCategory = name;
    }
  });

  return trendingCategory;
};

const dashboardService = {
  async getMetrics() {
    const [totalCount, statusCounts] = await Promise.all([
      proposalRepository.getTotalCount(),
      proposalRepository.getCountsByStatus(),
    ]);

    const statusCountMap = new Map(
      statusCounts.map((row) => [row.status?.toLowerCase(), row.count])
    );
    const pendingCount = statusCountMap.get('pending') || 0;
    const approvedCount = statusCountMap.get('approved') || 0;

    return { cards: buildMetricCards(totalCount, pendingCount, approvedCount) };
  },

  async getPublicMetrics() {
    const [totalCount, statusCounts, categoryCounts] = await Promise.all([
      proposalRepository.getTotalCount(),
      proposalRepository.getCountsByStatus(),
      proposalRepository.getCountsByCategory(),
    ]);
    const statusCountMap = new Map(
      statusCounts.map((row) => [row.status?.toLowerCase(), row.count])
    );
    const approvedCount = statusCountMap.get('approved') || 0;
    const trendingCategory = buildTrendingCategory(categoryCounts);

    return {
      totalSubmissions: totalCount,
      approvedSubmissions: approvedCount,
      trendingCategory,
    };
  },

  async getCategories() {
    const [totalCount, categoryCounts] = await Promise.all([
      proposalRepository.getTotalCount(),
      proposalRepository.getCountsByCategory(),
    ]);

    return {
      categories: buildCategoryDistribution(categoryCounts, totalCount),
    };
  },
};

export default dashboardService;
