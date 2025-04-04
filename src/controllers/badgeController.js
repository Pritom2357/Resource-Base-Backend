import * as badgeModel from '../models/badgeModel.js';
import * as resourceModel from '../models/resourceModel.js';
import { BADGE_TYPES } from '../config/badgeConfig.js';

export async function getUserBadges(req, res) {
    try {
        const userId = req.params.userId || req.user.id;
        const badges = await badgeModel.getUserBadges(userId);
        res.json(badges);
    } catch (error) {
        console.error('Error getting user badges:', error);
        res.status(500).json({ error: 'Failed to get user badges' });
    }
}

export async function getUserBadgeCounts(req, res) {
    try {
        const userId = req.params.userId || req.user.id;
        const counts = await badgeModel.getUserBadgeCounts(userId);
        res.json(counts);
    } catch (error) {
        console.error('Error getting user badge counts:', error);
        res.status(500).json({ error: 'Failed to get user badge counts' });
    }
}

export async function checkResourceCreatorBadges(req, res, next) {
    try {
        if(!req.user) return next();

        const userId = req.user.id;
        const resources = await resourceModel.getUserResourceCount(userId);
        const count = resources.count || 0;

        for(const level of ['BRONZE', 'SILVER', 'GOLD']){
            const badge = BADGE_TYPES.RESOURCE_CREATOR[level];
            if(count >= badge.requirement){
                await badgeModel.awardBadge(userId, 'RESOURCE_CREATOR', level);
            }
        }
        next();
    } catch (error) {
        console.error('Error checking resource badges:', error);
        next();
    }
}