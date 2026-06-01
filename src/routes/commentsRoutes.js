import express from 'express';

import commentsController from '../controllers/commentsController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.delete(
  '/:id',
  authMiddleware,
  commentsController.deleteComment
);

export default router;
