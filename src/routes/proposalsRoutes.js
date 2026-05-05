import express from 'express';

import proposalCommentsController from '../controllers/proposalCommentsController.js';
import proposalsController from '../controllers/proposalsController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import voteRateLimit from '../middleware/voteRateLimit.js';

const router = express.Router();

router.get('/', proposalsController.getProposals);
router.get('/tags', proposalsController.getProposalTags);
router.post(
  '/:id/vote',
  voteRateLimit,
  proposalsController.vote
);
router.get('/:id/comments', proposalCommentsController.listByProposal);
router.post('/:id/comments', proposalCommentsController.create);
router.get('/:id', proposalsController.getProposalById);

router.post('/', proposalsController.createProposal);

router.put(
  '/:id/status',
  authMiddleware,
  proposalsController.updateProposalStatus
);

export default router;
