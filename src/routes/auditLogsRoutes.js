import express from 'express';

import auditLogsController from '../controllers/auditLogsController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, auditLogsController.list);

export default router;
