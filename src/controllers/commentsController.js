import proposalCommentsRepository from '../repositories/proposalCommentsRepository.js';
import auditLogService from '../services/auditLogService.js';

const commentsController = {
  async deleteComment(req, res) {
    try {
      const commentId = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(commentId) || commentId <= 0) {
        return res.status(400).json({ error: 'Invalid comment id' });
      }

      const deletedByUid = req.user?.uid ?? null;

      const deleted = await proposalCommentsRepository.softDelete({
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
          preview:
            typeof deleted.body === 'string' ? deleted.body.slice(0, 80) : '',
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
