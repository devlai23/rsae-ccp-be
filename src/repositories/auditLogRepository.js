import provider from '../providers/auditLogPostgresProvider.js';

const auditLogRepository = {
  insert: (entry) => provider.insert(entry),
  list: (filters) => provider.list(filters),
};

export default auditLogRepository;
