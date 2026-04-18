import provider from '../providers/proposalCommentsPostgresProvider.js';

const proposalCommentsRepository = {
  proposalExists: (proposalId) => provider.proposalExists(proposalId),
  listByProposalId: (proposalId) => provider.listByProposalId(proposalId),
  create: (data) => provider.create(data),
};

export default proposalCommentsRepository;
