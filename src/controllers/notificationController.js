import * as notificationModel from '../models/notificationModel.js';
import { sendNotification } from '../services/websocketService.js';

export async function getNotifications(req, res) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const includeRead = req.query.includeRead === 'true';
    
    const result = await notificationModel.getUserNotifications(userId, limit, offset, includeRead);
    
    res.json(result);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

export async function markNotificationRead(req, res) {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    
    const result = await notificationModel.markAsRead(notificationId, userId);
    
    if (!result) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}

export async function markAllNotificationsRead(req, res) {
  try {
    const userId = req.user.id;
    
    await notificationModel.markAllAsRead(userId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
}

export async function sendNotificationInRealTime(req, notification) {
  try {
    const io = req.app.get('io');
    const userConnections = req.app.get('userConnections');
    
    if (!io || !userConnections) {
      console.log('Socket.io not initialized, skipping real-time notification');
      return false;
    }
    
    const recipientId = notification.recipient_id;
    
    const fullNotification = await notificationModel.getNotificationById(notification.id);
    
    if (fullNotification) {
      const { sendNotification } = await import('../services/websocketService.js');
      return sendNotification(io, userConnections, recipientId, fullNotification);
    }
    
    return false;
  } catch (error) {
    console.error('Error sending real-time notification:', error);
    return false;
  }
}