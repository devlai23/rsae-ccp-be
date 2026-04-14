import express from 'express';

import proposalsController from '../controllers/proposalsController.js';

const router = express.Router();

router.get('/', proposalsController.getProposals);
router.get('/tags', proposalsController.getProposalTags);
router.get('/:id', proposalsController.getProposalById);

router.post('/', proposalsController.createProposal);

router.put('/:id/status', proposalsController.updateProposalStatus);

export default router;
