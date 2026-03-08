import express from 'express';

import dashboardController from '../controllers/dashboardController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);
router.get('/metrics', dashboardController.getMetrics);
router.get('/categories', dashboardController.getCategories);

export default router;
