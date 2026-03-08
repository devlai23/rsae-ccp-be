import provider from '../providers/proposalPostgresProvider.js';

const proposalRepository = {
  getAll: () => provider.getAll(),
  getCountsByCategory: () => provider.getCountsByCategory(),
  getCountsByStatus: () => provider.getCountsByStatus(),
  getTotalCount: () => provider.getTotalCount(),
};

export default proposalRepository;
