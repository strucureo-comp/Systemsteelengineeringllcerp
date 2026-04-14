const express = require('express');
const { auth } = require('../middleware/auth');
const Notification = require('../models/Notification');

const router = express.Router();

/**
 * GET /api/notifications
 * Get notifications for current user
 */
router.get('/', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const userId = req.user._id;
        const { read, type, limit = 50 } = req.query;
        
        const query = {
            tenant_id,
            user_id: userId
        };
        
        if (read !== undefined) {
            query.read = read === 'true';
        }
        
        if (type) {
            query.type = type;
        }
        
        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
        
        const unreadCount = await Notification.getUnreadCount(tenant_id, userId);
        
        res.json({
            success: true,
            data: notifications,
            unread_count: unreadCount,
            count: notifications.length
        });
        
    } catch (error) {
        console.error('[Notifications API] Get error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch notifications' 
        });
    }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const userId = req.user._id;
        
        const count = await Notification.getUnreadCount(tenant_id, userId);
        
        res.json({
            success: true,
            count
        });
        
    } catch (error) {
        console.error('[Notifications API] Unread count error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch unread count' 
        });
    }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch('/:id/read', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const userId = req.user._id;
        
        const notification = await Notification.findOne({
            _id: req.params.id,
            tenant_id,
            user_id: userId
        });
        
        if (!notification) {
            return res.status(404).json({ 
                error: 'Notification not found' 
            });
        }
        
        await notification.markAsRead();
        
        res.json({
            success: true,
            data: notification
        });
        
    } catch (error) {
        console.error('[Notifications API] Mark read error:', error);
        res.status(500).json({ 
            error: 'Failed to mark notification as read' 
        });
    }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/read-all', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const userId = req.user._id;
        
        const result = await Notification.markAllAsRead(tenant_id, userId);
        
        res.json({
            success: true,
            message: 'All notifications marked as read',
            modified_count: result.modifiedCount
        });
        
    } catch (error) {
        console.error('[Notifications API] Mark all read error:', error);
        res.status(500).json({ 
            error: 'Failed to mark all as read' 
        });
    }
});

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const userId = req.user._id;
        
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            tenant_id,
            user_id: userId
        });
        
        if (!notification) {
            return res.status(404).json({ 
                error: 'Notification not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Notification deleted'
        });
        
    } catch (error) {
        console.error('[Notifications API] Delete error:', error);
        res.status(500).json({ 
            error: 'Failed to delete notification' 
        });
    }
});

module.exports = router;
