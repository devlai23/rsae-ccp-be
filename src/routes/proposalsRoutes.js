import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';

import proposalCommentsController from '../controllers/proposalCommentsController.js';
import proposalVotesController from '../controllers/proposalVotesController.js';
import proposalsController from '../controllers/proposalsController.js';

const router = express.Router();

router.get('/', proposalsController.getProposals);
router.get('/tags', proposalsController.getProposalTags);
router.get('/:id/comments', proposalCommentsController.listByProposal);
router.post('/:id/comments', proposalCommentsController.create);
router.get('/:id', proposalsController.getProposalById);

router.post('/', proposalsController.createProposal);

router.put('/:id/status', proposalsController.updateProposalStatus);

router.get('/:id/vote', authMiddleware, proposalVotesController.getUserVote);
router.post('/:id/vote', authMiddleware, proposalVotesController.createOrUpdate);
router.delete('/:id/vote', authMiddleware, proposalVotesController.remove);

export default router;
