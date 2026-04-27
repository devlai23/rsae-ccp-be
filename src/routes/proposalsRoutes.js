import express from 'express';

import proposalsController from '../controllers/proposalsController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireAdmin from '../middleware/requireAdmin.js';
import commentsController from '../controllers/commentsController.js';

const router = express.Router();

router.get('/', proposalsController.getProposals);
router.get('/tags', proposalsController.getProposalTags);
router.get('/:id', proposalsController.getProposalById);

router.post('/', proposalsController.createProposal);

router.put(
  '/:id/status',
  authMiddleware,
  requireAdmin,
  proposalsController.updateProposalStatus
);

router.get('/:id/comments', commentsController.listForProposal);
router.post('/:id/comments', commentsController.createForProposal);

export default router;
