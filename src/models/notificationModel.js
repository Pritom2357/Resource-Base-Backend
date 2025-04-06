import pool from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export async function createNotification(data) {
    
    const {recipientId, senderId, notificationType, content, resourceId} = data;
    const id = uuidv4();

    try {
        const query = `
            INSERT INTO notifications (id, recipient_id, sender_id, notification_type, content, resourceId, is_read, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, false, NOW()) 
            RETURNING * 
        `;

        const result = await pool.query(query, [id, recipientId, senderId, notificationType, content, resourceId, ]);

        return result.rows[0];
    } catch (error) {
        console.error("Error creating notification: ", error);
        throw error;
    }
}

export async function getNotificationById(notificationId) {
    try {
        const query = `
            SELECT n.*,
                u.username as sender_username,
                u.photo as sender_photo,
                r.post_title as resource_title
            FROM notifications n
            LEFT JOIN users u ON n.sender_id = u.id
            LEFT JOIN resource_posts r ON n.resource_id = r.id
            WHERE n.id = $1
        `;

        const result = await pool.query(query, [notificationId]);
        return result.rows[0] || null;

    } catch (error) {
        console.error('Error fetching notification by ID:', error);
        throw error;
    }
}

export async function getUserNotifications(userId, limit=10, offset=0, includeRead=false) {
    try {
        let query = `
            SELECT n.*,
                u.username as sender_username,
                u.photo as sender_photo,
                r.post_title as resource_title
            FROM notifications n
            LEFT JOIN users u ON n.sender_id = u.id
            LEFT JOIN resource_posts r ON n.resource_id = r.id
            WHERE n.recipient_id = $1
        `;

        if(!includeRead){
            query += ` AND n.is_read = false`;
        }

        query = ` ORDER BY n.created_at DESC LIMIT $2 OFFSET $3`;

        const result = await pool.query(query, [userId, limit, offset]);

        const countQuery = `SELECT COUNT(*) FROM notifications WHERE recipient_id = $1 AND is_read = false`;

        const countResult = await pool.query(countQuery, [userId]);

        return {
            notifications: result.rows,
            unreadCount: parseInt(countResult.rows[0].count)
        };

    } catch (error) {
        console.error('Error fetching notifications:', error);
        throw error;
    }
}

export async function markAsRead(notificationId, userId) {
    try {
        const query = `
            UPDATE notifications
            SET is_read = true
            WHERE notification_id = $1 AND recipient_id = $2
            RETURNING *
        `;

        const result = await pool.query(query, [notificationId, userId]);
        return result.rows[0];

    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
}

export async function markAllAsRead(userId) {
    try {
        const query = `
            UPDATE notifications
            SET is_read = true
            WHERE recipient_id = $1 AND is_read = false
        `;

        const result = await pool.query(query, [userId]);
        return {
            success: true
        }
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
    }
}

export async function createVoteNotification(req, resourceId, voterId, action) {
    try {
        const resourceQuery = `
            SELECT user_id, post_title FROM resource_posts WHERE id = $1
        `;
        const resourceResult = await pool.query(resourceQuery, [resourceId]);

        if(resourceResult.rows.length === 0) return null;

        const resourceOwnerId = resourceResult.rows[0].user_id;
        const resourceTitle = resourceResult.rows[0].post_title;

        if(resourceOwnerId === voterId) return null;

        const content = `Someone ${action === 'added' ? 'upvoted' : 'change their vote on'} your resource "${resourceTitle}"`;

        const notification = await createNotification({
            recipientId: resourceOwnerId,
            senderId: voterId,
            notificationType: 'VOTE',
            content,
            resourceId
        });

        if(notification && req){
            const {sendNotificationInRealTime} = await import('../controllers.js');
            await sendNotificationInRealTime(req, notification);
        }

        return notification;
    } catch (error) {
        console.error('Error creating vote notification:', error);
        throw error;
    }
}

export async function createCommentNotification(req, resourceId, commenterId, commentText) {
    try {
        const resourceQuery = `
            SELECT user_id, post_title FROM resource_posts WHERE id = $1
        `;
        const resourceResult = await pool.query(resourceQuery, [resourceId]);

        if(resourceResult.rows.length === 0) return null;

        const resourceOwnerId = resourceResult.rows[0].user_id;
        const resourceTitle = resourceResult.rows[0].post_title;

        if(resourceOwnerId === commenterId) return null;

        const content = `Someone commented on your resource "${resourceTitle}" - "${commentText}"`;

        const notification = await createNotification({
            recipientId: resourceOwnerId,
            senderId: commenterId,
            notificationType: 'COMMENT',
            content, 
            resourceId
        });

        if(notification && req){
            const {sendNotificationInRealTime} = await import('../controllers/notificationController.js');
            await sendNotificationInRealTime(req, notification);
        }

        return notification;

    } catch (error) {
        console.error('Error creating comment notification:', error);
        throw error;
    }
}

export async function createResourceUpdateNotification(req, resourceId, updaterId) {
    try {
        const resourceQuery = `
            SELECT post_title FROM resource_posts WHERE id = $1
        `;
        const resourceResult = await pool.query(resourceQuery, [resourceId]);

        if(resourceResult.rows.length === 0) return null;

        const resourceTitle = resourceResult.rows[0].post_title;

        const bookmarkQuery = `
            SELECT user_id FROM bookmarks WHERE resource_id = $1 AND user_id != $2
        `;

        const bookmarkResult = await pool.query(bookmarkQuery, [resourceId, updaterId]);
        
        const notifications = [];
        for(const row of bookmarkResult.rows){
            const notification = await createNotification({
                recipientId: row.user_id,
                senderId: updaterId,
                notificationType: 'RESOURCE_UPDATE',
                content: `A resource you bookmarked "${resourceTitle}" has been updated`,
                resourceId
            });

            if(notification && req){
                const {sendNotificationInRealTime} = await import ('../controllers/notificationController.js');
                await sendNotificationInRealTime(req, notification);
            }
            notifications.push(notification);
        }

        return notifications;
    } catch (error) {
        console.error('Error creating resource update notification:', error);
        throw error;
    }
}

export async function createSimilarResourceNotification(req, resourceId, tagIds) {
    try {
        const resourceQuery = `
            SELECT r.post_title, r.user_id, u.username
            FROM resource_posts r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = $1
        `;

        const resourceResult = await pool.query(resourceQuery, [resourceId]);

        if(resourceResult.rows.length === 0) return null;

        const resourceTitle = resourceResult.rows[0].post_title;
        const resourceCreatorId = resourceResult.rows[0].user_id;
        const creatorUsername = resourceResult.rows[0].username;

        const interestedUsersQuery = `
        WITH interested_users AS (
            -- Users who have viewed resources with these tags
            SELECT DISTINCT rv.user_id
            FROM resource_views rv
            JOIN resource_posts rp ON rv.resource_id = rp.id
            JOIN resource_tags rt ON rp.id = rt.post_id
            WHERE rt.tag_id = ANY($1::uuid[])
            
            UNION
            
            -- Users who have preferences set for these tags
            SELECT DISTINCT user_id
            FROM user_preferences
            WHERE type = 'tag' AND preference_value IN (
            SELECT tag_name FROM tags WHERE id = ANY($1::uuid[])
            )
        )
        SELECT user_id FROM interested_users
        WHERE user_id != $2
        LIMIT 50
        `;

        const interestedUsersResult = await pool.query(interestedUsersQuery, [tagIds, resourceCreatorId]);
    
        const notifications = [];
        for (const row of interestedUsersResult.rows) {
        const notification = await createNotification({
            recipientId: row.user_id,
            senderId: resourceCreatorId,
            notificationType: 'SIMILAR_RESOURCE',
            content: `${creatorUsername} shared a resource "${resourceTitle}" that matches your interests`,
            resourceId
        });
        if (notification && req) {
            const { sendNotificationInRealTime } = await import('../controllers/notificationController.js');
            await sendNotificationInRealTime(req, notification);
        }
        notifications.push(notification);
        }
    
        return notifications;
    } catch (error) {
        console.error('Error creating similar resource notification:', error);
        throw error;
    }
}