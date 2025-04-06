import express from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', notificationController.getNotifications);

router.post('/:notificationId/read', notificationController.markNotificationRead);

router.post('/mark-all-read', notificationController.markAllNotificationsRead);

export default router;