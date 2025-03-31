import express from 'express';
import passport from 'passport';
import * as authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
// import auth from '../config/auth';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/token', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/logout/all', authenticateToken, authController.logoutAll);

router.get('/google', passport.authenticate('google', {scope: ['profile', 'email']}));
router.get('/google/callback', 
    passport.authenticate('google', {failureRedirect: '/login'}),
    authController.googleCallback
);

router.get('/github', passport.authenticate('github', {scope: ['user:email']}));
router.get('/github/callback',
    passport.authenticate('github', {failureRedirect: '/login'}),
    authController.githubCallback
);

export default router;