import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { trackUserActivity } from '../controllers/userController.js'; // Add this import
import * as userController from '../controllers/userController.js'

const router = express.Router();

//protected routes
router.get('/profile', authenticateToken, trackUserActivity, userController.getProfile);
router.put('/profile', authenticateToken, trackUserActivity, userController.updateProfile);

// Public routes
router.get('/:username', userController.getPublicProfile); 
router.get('/:username/resources', userController.getUserResources);
router.get('/:username/tags/viewed', userController.getUserViewedTags);

router.post('/activity-ping', authenticateToken, trackUserActivity, (req, res) => {
  res.status(200).json({ success: true });
});

export default router;