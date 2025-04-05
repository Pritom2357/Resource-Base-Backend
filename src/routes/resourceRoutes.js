import express from 'express';
import * as resourceController from '../controllers/resourceController.js';
import {authenticateToken} from '../middleware/authMiddleware.js';
import {trackUserActivity} from '../controllers/userController.js';
import { checkResourceCreatorBadges } from '../controllers/badgeController.js';

const router = express.Router();

// Public routes - no authentication needed
router.get('/', resourceController.getResources);
router.get('/search', resourceController.searchResources);
router.get('/tags/popular', resourceController.getPopularTags);
router.get('/categories', resourceController.getCategories);
router.get('/check-similarity', resourceController.checkSimilarity);
router.get('/extract-metadata', resourceController.extractUrlMetadata);
router.post('/', authenticateToken, resourceController.createResource, checkResourceCreatorBadges);
router.get('/bookmarks', authenticateToken, resourceController.getUserBookmarks); //protected


router.get('/:id', resourceController.getResource);
router.get('/:id/comments', resourceController.getResourceComments);

// Protected routes - apply both middlewares
router.get('/:id/user-vote', authenticateToken, resourceController.getUserVote);
router.get('/:id/bookmark-status', authenticateToken, resourceController.getBookmarkStatus);
router.put('/:id', authenticateToken, trackUserActivity, resourceController.updateResource);
router.post('/:id/vote', authenticateToken, trackUserActivity, resourceController.voteOnResource);
router.post('/:id/bookmark', authenticateToken, trackUserActivity, resourceController.toggleBookmark);
router.post('/:id/comment', authenticateToken, trackUserActivity, resourceController.addComment);
router.post('/:id/view', (req, res, next) => {
    authenticateToken(req, res, (err) => {
        next();
    });
}, resourceController.recordView); 

export default router;

