import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as userController from '../controllers/userController.js'

const router = express.Router();

router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, userController.updateProfile);
router.get('/:username', userController.getPublicProfile);
router.get('/:username/resources', userController.getUserResources);

export default router;