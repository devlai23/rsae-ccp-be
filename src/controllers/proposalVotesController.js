import proposalVotesProvider from '../providers/proposalVotesPostgresProvider.js';
import proposalRepository from '../repositories/proposalRepository.js';
import userRepository from '../repositories/userRepository.js';

const getUserIdFromRequest = async (req) => {
  const firebaseUid = req.user?.uid;
  if (!firebaseUid) return null;

  const user = await userRepository.findByUid(firebaseUid);
  return user?.id || null;
};

const proposalVotesController = {
  async getUserVote(req, res) {
    try {
      const proposalId = Number.parseInt(req.params.id, 10);
      const userId = await getUserIdFromRequest(req);

      if (Number.isNaN(proposalId) || proposalId <= 0) {
        return res.status(400).json({ error: 'Invalid proposal id' });
      }

      if (!userId) {
        return res.status(200).json({ voteType: null });
      }

      const vote = await proposalVotesProvider.getByUserAndProposal(userId, proposalId);
      return res.status(200).json({ voteType: vote?.voteType || null });
    } catch (error) {
      console.error('Get user vote error:', error);
      return res.status(500).json({
        error: process.env.NODE_ENV === 'production' ? 'Failed to get vote' : error.message,
      });
    }
  },

  async createOrUpdate(req, res) {
    try {
      const proposalId = Number.parseInt(req.params.id, 10);
      const userId = await getUserIdFromRequest(req);
      const { vote_type: rawVoteType } = req.body ?? {};

      if (Number.isNaN(proposalId) || proposalId <= 0) {
        return res.status(400).json({ error: 'Invalid proposal id' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!['up', 'down'].includes(rawVoteType)) {
        return res.status(400).json({ error: 'vote_type must be "up" or "down"' });
      }

      const proposal = await proposalRepository.getById(proposalId, userId);
      if (!proposal) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      const existingVote = await proposalVotesProvider.getByUserAndProposal(userId, proposalId);
      const voteType = rawVoteType;

      let removed = false;
      if (existingVote && existingVote.voteType === voteType) {
        await proposalVotesProvider.remove(userId, proposalId);
        removed = true;
      } else {
        await proposalVotesProvider.create({ proposalId, userId, voteType });
      }

      const updatedProposal = await proposalRepository.getById(proposalId, userId);

      return res.status(200).json({
        success: true,
        votes: updatedProposal.votes,
        userVote: removed ? null : voteType,
      });
    } catch (error) {
      console.error('Create/update vote error:', error);
      return res.status(500).json({
        error: process.env.NODE_ENV === 'production' ? 'Failed to record vote' : error.message,
      });
    }
  },

  async remove(req, res) {
    try {
      const proposalId = Number.parseInt(req.params.id, 10);
      const userId = await getUserIdFromRequest(req);

      if (Number.isNaN(proposalId) || proposalId <= 0) {
        return res.status(400).json({ error: 'Invalid proposal id' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const removed = await proposalVotesProvider.remove(userId, proposalId);
      if (!removed) {
        return res.status(404).json({ error: 'Vote not found' });
      }

      const updatedProposal = await proposalRepository.getById(proposalId, userId);

      return res.status(200).json({
        success: true,
        votes: updatedProposal.votes,
        userVote: null,
      });
    } catch (error) {
      console.error('Remove vote error:', error);
      return res.status(500).json({
        error: process.env.NODE_ENV === 'production' ? 'Failed to remove vote' : error.message,
      });
    }
  },
};

export default proposalVotesController;
