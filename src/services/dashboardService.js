import proposalRepository from '../repositories/proposalRepository.js';

const categoryOrder = [
  'Housing',
  'Health and Wellness',
  'Economic development',
  'Art and culture',
  'Education',
];

const categoryIdMap = {
  Housing: 'housing',
  'Health and Wellness': 'health-and-wellness',
  'Economic development': 'economic-development',
  'Art and culture': 'art-and-culture',
  Education: 'education',
};

const normalizeCategory = (value) => value?.trim().toLowerCase();

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
  const knownCategoryMap = new Map(
    categoryOrder.map((name) => [normalizeCategory(name), { name, count: 0 }])
  );
  const unknownCategories = [];

  rows.forEach((row) => {
    const rowName = row.category?.trim();
    const rowCount = row.count || 0;
    const normalized = normalizeCategory(rowName);
    const known = knownCategoryMap.get(normalized);

    if (known) {
      known.count += rowCount;
      return;
    }

    if (rowName) {
      unknownCategories.push({ name: rowName, count: rowCount });
    }
  });

  const knownCategories = categoryOrder.map((name) => {
    const count = knownCategoryMap.get(normalizeCategory(name))?.count || 0;
    const percentage =
      totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;

    return {
      id: categoryIdMap[name],
      name,
      percentage,
    };
  });

  const unknownCategoryValues = unknownCategories.map((category) => ({
    id: slugify(category.name),
    name: category.name,
    percentage:
      totalCount > 0 ? Math.round((category.count / totalCount) * 100) : 0,
  }));

  return [...knownCategories, ...unknownCategoryValues];
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

  async getCategories() {
    const [totalCount, categoryCounts] = await Promise.all([
      proposalRepository.getTotalCount(),
      proposalRepository.getCountsByCategory(),
    ]);

    return {
      categories: buildCategoryDistribution(categoryCounts, totalCount),
    };
  },

  async getProposals() {
    const items = await proposalRepository.getAll();

    return {
      items,
      pagination: {
        page: 1,
        limit: items.length,
        totalItems: items.length,
        totalPages: 1,
      },
    };
  },
};

export default dashboardService;
