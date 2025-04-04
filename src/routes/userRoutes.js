import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { trackUserActivity } from '../controllers/userController.js';
import * as userController from '../controllers/userController.js';
import * as badgeController from '../controllers/badgeController.js'; // Add this
import { handleImageUpload, uploadImage, updateProfileWithImage } from '../controllers/uploadController.js';
import * as uploadController from '../controllers/uploadController.js'

const router = express.Router();

//protected routes
router.get('/profile', authenticateToken, trackUserActivity, userController.getProfile);
router.put('/profile', authenticateToken, trackUserActivity, userController.updateProfile);

// Public routes
router.get('/:username', userController.getPublicProfile); 
router.get('/:username/resources', userController.getUserResources);
router.get('/:username/tags/viewed', userController.getUserViewedTags); 
router.get('/:username/badge-counts', badgeController.getUserBadgeCounts); 
router.get('/:username/badges', badgeController.getUserBadges); 

router.post('/activity-ping', authenticateToken, trackUserActivity, (req, res) => {
  res.status(200).json({ success: true });
});

router.post('/upload-image', authenticateToken, handleImageUpload, uploadImage);
router.put('/profile-with-image', authenticateToken, handleImageUpload, updateProfileWithImage);



// Add this route
router.get('/recalculate-badges', authenticateToken, badgeController.recalculateAllBadges);

export default router;