import commentsRepository from '../repositories/commentsRepository.js';
import auditLogService from '../services/auditLogService.js';

const commentsController = {
  async listForProposal(req, res) {
    try {
      const proposalId = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(proposalId) || proposalId <= 0) {
        return res.status(400).json({ error: 'Invalid proposal id' });
      }

      const items = await commentsRepository.listByProposalId(proposalId);
      return res.status(200).json({ items });
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

  async createForProposal(req, res) {
    try {
      const proposalId = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(proposalId) || proposalId <= 0) {
        return res.status(400).json({ error: 'Invalid proposal id' });
      }

      const { body, authorDisplay } = req.body;
      if (!body || typeof body !== 'string' || body.trim().length < 1) {
        return res.status(400).json({ error: 'Comment body is required' });
      }

      const display =
        typeof authorDisplay === 'string' && authorDisplay.trim()
          ? authorDisplay.trim()
          : 'Anonymous Resident';

      const authorUid = req.user?.uid ?? null;

      const created = await commentsRepository.create({
        proposalId,
        authorUid,
        authorDisplay: display,
        body: body.trim(),
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

  async deleteComment(req, res) {
    try {
      const commentId = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(commentId) || commentId <= 0) {
        return res.status(400).json({ error: 'Invalid comment id' });
      }

      const deletedByUid = req.user?.uid ?? null;

      const deleted = await commentsRepository.softDelete({
        commentId,
        deletedByUid,
      });
      if (!deleted) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      await auditLogService.write(req, {
        actionType: 'comment.delete',
        entityType: 'comment',
        entityId: String(commentId),
        metadata: {
          proposalId: deleted.proposalId,
          preview: typeof deleted.body === 'string' ? deleted.body.slice(0, 80) : '',
        },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete comment error:', error);
      return res.status(500).json({
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to delete comment'
            : error.message,
      });
    }
  },
};

export default commentsController;
