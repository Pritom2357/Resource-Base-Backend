import * as userModel from '../models/userModel.js';
import * as badgeModel from '../models/badgeModel.js';
import { BADGE_TYPES } from '../config/badgeConfig.js';
import * as resourceModel from '../models/resourceModel.js';

export async function getUserBadgeCounts(req, res) {
    try {
        const { username } = req.params;
        
        const user = await userModel.findUserByUsername(username);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        const counts = await badgeModel.getUserBadgeCounts(user.id);
        res.json(counts);
    } catch (error) {
        console.error('Error getting user badge counts:', error);
        res.status(500).json({ error: 'Failed to get user badge counts' });
    }
}

export async function getUserBadges(req, res) {
    try {
        const { username } = req.params;
        
        const user = await userModel.findUserByUsername(username);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        const badges = await badgeModel.getUserBadges(user.id);
        res.json(badges);
    } catch (error) {
        console.error('Error getting user badges:', error);
        res.status(500).json({ error: 'Failed to get user badges' });
    }
}

export async function checkResourceCreatorBadges(req, res, next) {
    try {
        if (!req.user) return next();
        
        const userId = req.user.id;
        console.log(`Checking resource badges for user ${userId}`);
        
        const resources = await resourceModel.getUserResourceCount(userId);
        const count = parseInt(resources.count) || 0;
        
        for (const level of ['BRONZE', 'SILVER', 'GOLD']) {
            const badge = BADGE_TYPES.RESOURCE_CREATOR[level];
            if (count >= badge.requirement) {
                await badgeModel.awardBadge(userId, 'RESOURCE_CREATOR', level);
            }
        }
        
        next();
    } catch (error) {
        console.error('Error checking resource badges:', error);
        next(); // Continue even if badge check fails
    }
}