import express from 'express';

import auditLogsController from '../controllers/auditLogsController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireAdmin from '../middleware/requireAdmin.js';

const router = express.Router();

router.get('/', authMiddleware, requireAdmin, auditLogsController.list);

export default router;
