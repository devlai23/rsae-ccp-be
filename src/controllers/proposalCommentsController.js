import proposalCommentsRepository from '../repositories/proposalCommentsRepository.js';

const DEFAULT_AUTHOR = 'Anonymous Resident';
const BODY_MAX_LENGTH = 8000;

const proposalCommentsController = {
  async listByProposal(req, res) {
    try {
      const proposalId = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(proposalId) || proposalId <= 0) {
        return res.status(400).json({ error: 'Invalid proposal id' });
      }

      const exists =
        await proposalCommentsRepository.proposalExists(proposalId);
      if (!exists) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      const comments =
        await proposalCommentsRepository.listByProposalId(proposalId);
      return res.status(200).json({ comments });
    } catch (error) {
      console.error('List proposal comments error:', error);
      return res.status(500).json({
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to load comments'
            : error.message,
      });
    }
  },

  async create(req, res) {
    try {
      const proposalId = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(proposalId) || proposalId <= 0) {
        return res.status(400).json({ error: 'Invalid proposal id' });
      }

      const { body: rawBody, author: rawAuthor } = req.body ?? {};

      if (typeof rawBody !== 'string' || !rawBody.trim()) {
        return res.status(400).json({ error: 'Comment body is required' });
      }

      const body = rawBody.trim();
      if (body.length > BODY_MAX_LENGTH) {
        return res.status(400).json({
          error: `Comment body must be at most ${BODY_MAX_LENGTH} characters`,
        });
      }

      let author = DEFAULT_AUTHOR;
      if (typeof rawAuthor === 'string' && rawAuthor.trim()) {
        author = rawAuthor.trim().slice(0, 150);
      }

      const exists =
        await proposalCommentsRepository.proposalExists(proposalId);
      if (!exists) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      const created = await proposalCommentsRepository.create({
        proposalId,
        author,
        body,
      });

      return res.status(201).json(created);
    } catch (error) {
      console.error('Create proposal comment error:', error);
      return res.status(500).json({
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to create comment'
            : error.message,
      });
    }
  },
};

export default proposalCommentsController;
