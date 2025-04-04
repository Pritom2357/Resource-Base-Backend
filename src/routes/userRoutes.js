import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as userController from '../controllers/userController.js'

const router = express.Router();

router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, userController.updateProfile);
router.get('/:username', userController.getPublicProfile);
router.get('/:username/resources', userController.getUserResources);

router.post('/activity-ping', authenticateToken, (req, res) => {
  userModel.updateLastActive(req.user.id)
    .then(() => res.status(200).json({ success: true }))
    .catch(err => {
      console.error("Error updating activity:", err);
      res.status(500).json({ error: "Failed to update activity" });
    });
});

export default router;