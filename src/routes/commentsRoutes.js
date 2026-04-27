import express from 'express';

import commentsController from '../controllers/commentsController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireAdmin from '../middleware/requireAdmin.js';

const router = express.Router();

router.delete('/:id', authMiddleware, requireAdmin, commentsController.deleteComment);

export default router;
