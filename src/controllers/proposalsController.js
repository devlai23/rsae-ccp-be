import proposalRepository from '../repositories/proposalRepository.js';
import auditLogService from '../services/auditLogService.js';

const parseSort = (value) => (value === 'oldest' ? 'oldest' : 'newest');

const proposalsController = {
  async updateProposalStatus(req, res) {
    try {
      const proposalId = Number.parseInt(req.params.id, 10);
      const { status } = req.body;
      if (Number.isNaN(proposalId) || proposalId <= 0) {
        return res.status(400).json({ error: 'Invalid proposal id' });
      }
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      const updated = await proposalRepository.updateStatus(proposalId, status);
      if (!updated) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      await auditLogService.write(req, {
        actionType: status === 'approved' ? 'proposal.approve' : 'proposal.reject',
        entityType: 'proposal',
        entityId: String(proposalId),
        metadata: { status },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Update proposal status error:', error);
      return res.status(500).json({
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to update proposal status'
            : error.message,
      });
    }
  },

  async getProposals(req, res) {
    try {
      const filters = {
        search: req.query.search?.trim() || '',
        category: req.query.category?.trim() || '',
        status: req.query.status?.trim() || '',
        tag: req.query.tag?.trim() || '',
        sort: parseSort(req.query.sort),
      };

      const items = await proposalRepository.getAll(filters);

      return res.status(200).json({
        items,
        pagination: {
          page: 1,
          limit: items.length,
          totalItems: items.length,
          totalPages: 1,
        },
      });
    } catch (error) {
      console.error('Get proposals error:', error);
      return res.status(500).json({
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to load proposals'
            : error.message,
      });
    }
  },

  async getProposalById(req, res) {
    try {
      const proposalId = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(proposalId) || proposalId <= 0) {
        return res.status(400).json({ error: 'Invalid proposal id' });
      }

      const proposal = await proposalRepository.getById(proposalId);
      if (!proposal) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      return res.status(200).json(proposal);
    } catch (error) {
      console.error('Get proposal by id error:', error);
      return res.status(500).json({
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to load proposal'
            : error.message,
      });
    }
  },

  async getProposalTags(_req, res) {
    try {
      const tags = await proposalRepository.getAllTags();
      return res.status(200).json({ tags });
    } catch (error) {
      console.error('Get proposal tags error:', error);
      return res.status(500).json({
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to load tags'
            : error.message,
      });
    }
  },

  async createProposal(req, res) {
    try {
      const { title, category, description, submittedBy, tags } = req.body;

      if (!title || !category || !description || !submittedBy) {
        return res.status(400).json({
          error:
            'Missing required fields: title, category, description, submittedBy',
        });
      }

      if (typeof title !== 'string' || title.trim().length < 5) {
        return res
          .status(400)
          .json({ error: 'Title must be at least 5 characters long' });
      }

      const newProposal = await proposalRepository.create({
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        submittedBy: submittedBy.trim(),
        tags: Array.isArray(tags) ? tags : [],
      });

      return res.status(201).json(newProposal);
    } catch (error) {
      console.error('Create proposal error:', error);
      return res.status(500).json({
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to create proposal'
            : error.message,
      });
    }
  },
};

export default proposalsController;
