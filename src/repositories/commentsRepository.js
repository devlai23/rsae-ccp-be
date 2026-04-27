import provider from '../providers/commentsPostgresProvider.js';

const commentsRepository = {
  listByProposalId: (proposalId) => provider.listByProposalId(proposalId),
  create: (data) => provider.create(data),
  softDelete: (data) => provider.softDelete(data),
};

export default commentsRepository;
