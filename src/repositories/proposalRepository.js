import provider from '../providers/proposalPostgresProvider.js';

const proposalRepository = {
  getAll: (filters) => provider.getAll(filters),
  getById: (id) => provider.getById(id),
  getAllTags: () => provider.getAllTags(),
  getCountsByCategory: () => provider.getCountsByCategory(),
  getCountsByStatus: () => provider.getCountsByStatus(),
  getTotalCount: () => provider.getTotalCount(),
  create: (proposalData) => provider.create(proposalData),
};

export default proposalRepository;
