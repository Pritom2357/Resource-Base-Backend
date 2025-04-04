import pool from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';
import { BADGE_TYPES } from '../config/badgeConfig.js';

export async function awardBadge(userId, badgeType, badgeLevel) {
  try {
    const existingQuery = await pool.query(
      `SELECT id FROM user_badges 
       WHERE user_id = $1 AND badge_type = $2 AND badge_level = $3`,
      [userId, badgeType, badgeLevel]
    );
    
    if (existingQuery.rows.length > 0) {
      return { alreadyAwarded: true };
    }
    
    const id = uuidv4();
    await pool.query(
      `INSERT INTO user_badges (id, user_id, badge_type, badge_level)
       VALUES ($1, $2, $3, $4)`,
      [id, userId, badgeType, badgeLevel]
    );
    
    return { 
      awarded: true,
      badge: BADGE_TYPES[badgeType][badgeLevel]
    };
  } catch (error) {
    console.error('Error awarding badge:', error);
    throw error;
  }
}

export async function getUserBadges(userId) {
  try {
    const result = await pool.query(
      `SELECT badge_type, badge_level, awarded_at
       FROM user_badges
       WHERE user_id = $1
       ORDER BY awarded_at DESC`,
      [userId]
    );
    
    return result.rows.map(badge => {
      const badgeConfig = BADGE_TYPES[badge.badge_type]?.[badge.badge_level];
      return {
        ...badge,
        name: badgeConfig?.name || 'Unknown Badge',
        description: badgeConfig?.description || '',
        level: badge.badge_level
      };
    });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    throw error;
  }
}

export async function getUserBadgeCounts(userId) {
  try {
    const result = await pool.query(
      `SELECT badge_level, COUNT(*) as count
       FROM user_badges
       WHERE user_id = $1
       GROUP BY badge_level`,
      [userId]
    );
    
    const counts = { bronze: 0, silver: 0, gold: 0 };
    result.rows.forEach(row => {
      counts[row.badge_level] = parseInt(row.count);
    });
    
    return counts;
  } catch (error) {
    console.error('Error fetching badge counts:', error);
    throw error;
  }
}