import express from 'express';
import * as resourceController from '../controllers/resourceController.js';
import {authenticateToken} from '../middleware/authMiddleware.js';
// import auth from '../config/auth';

const router = express.Router();

//public 
router.get('/', resourceController.getResources);
router.get('/search', resourceController.searchResources);
router.get('/:id', resourceController.getResource);
router.get('/:id/comments', resourceController.getResourceComments);

//protected
router.post('/', authenticateToken, resourceController.createResource);
router.put('/:id', authenticateToken, resourceController.updateResource);
router.post('/:id/vote', authenticateToken, resourceController.voteOnResource);
router.post('/:id/bookmark', authenticateToken, resourceController.toggleBookmark);
router.post('/:id/comment', authenticateToken, resourceController.addComment);

export default router;

