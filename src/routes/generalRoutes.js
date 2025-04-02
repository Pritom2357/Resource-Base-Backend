import express from 'express';
import { subscribeToNewsletter, getSubscribers } from '../controllers/generalController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/newsletter/subscribe', subscribeToNewsletter);
router.get('/newsletter/subscribers', authenticateToken, getSubscribers);

export default router;