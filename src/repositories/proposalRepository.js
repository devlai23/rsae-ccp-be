import provider from '../providers/proposalPostgresProvider.js';

const proposalRepository = {
  updateStatus: (id, status) => provider.updateStatus(id, status),
  getAll: (filters) => provider.getAll(filters),
  getById: (id) => provider.getById(id),
  getAllTags: () => provider.getAllTags(),
  getCountsByCategory: () => provider.getCountsByCategory(),
  getCountsByStatus: () => provider.getCountsByStatus(),
  getTotalCount: () => provider.getTotalCount(),
  create: (proposalData) => provider.create(proposalData),
};

export default proposalRepository;
