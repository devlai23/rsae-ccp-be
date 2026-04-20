// Switch this import to swap between Supabase (Postgres) and AWS (MySQL)
import provider from '../providers/proposalPostgresProvider.js';

// import provider from '../providers/mysqlProvider.js';

const proposalRepository = {
  updateStatus: (id, status) => provider.updateStatus(id, status),
  getAll: (filters, userId) => provider.getAll(filters, userId),
  getById: (id, userId) => provider.getById(id, userId),
  getAllTags: () => provider.getAllTags(),
  getCountsByCategory: () => provider.getCountsByCategory(),
  getCountsByStatus: () => provider.getCountsByStatus(),
  getTotalCount: () => provider.getTotalCount(),
  create: (proposalData) => provider.create(proposalData),
};

export default proposalRepository;
