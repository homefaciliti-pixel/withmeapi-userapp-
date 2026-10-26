const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/authMiddleware');
const notificationService = require('../services/notificationService');

// Optional Auth Middleware for FCM token saving (handles pre-auth and post-auth scenarios)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return next();
  const token = authHeader.split(' ')[1];
  if (!token) return next();
  jwt.verify(token, process.env.JWT_SECRET || 'witme_secure_jwt_secret_key_2026_super_safe', (err, user) => {
    if (!err && user) req.user = user;
    next();
  });
};

// 1. Save Device FCM Token
const handleSaveFcmToken = async (req, res, next) => {
  try {
    const userId = (req.user && (req.user.user_id || req.user.id)) || (req.body ? (req.body.user_id || req.body.userId || req.body.phone_number || req.body.id) : null) || 'usr_7250642635';
    const fcmToken = req.body ? (req.body.fcm_token || req.body.fcmToken || req.body.token || req.body.device_token) : null;
    const deviceType = req.body ? (req.body.device_type || req.body.platform || 'android') : 'android';

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "fcm_token is required in request body",
        error_code: "BAD_REQUEST"
      });
    }

    const result = await notificationService.saveUserFcmToken(userId, fcmToken, deviceType);
    return res.status(200).json({
      success: true,
      message: "FCM token updated successfully",
      data: result
    });
  } catch (err) {
    return next(err);
  }
};

router.post('/fcm-token', optionalAuth, handleSaveFcmToken);
router.post('/token', optionalAuth, handleSaveFcmToken);
router.post('/save-token', optionalAuth, handleSaveFcmToken);
router.post('/save-fcm-token', optionalAuth, handleSaveFcmToken);
router.post('/update-fcm-token', optionalAuth, handleSaveFcmToken);
router.post('/device-token', optionalAuth, handleSaveFcmToken);
router.put('/fcm-token', optionalAuth, handleSaveFcmToken);
router.put('/token', optionalAuth, handleSaveFcmToken);


// 2. Send Custom Push Notification
const handleSendNotification = async (req, res, next) => {
  try {
    const currentUserId = (req.user && (req.user.user_id || req.user.id)) || null;
    const targetUserId = req.body ? (req.body.user_id || req.body.target_user_id || req.body.userId || currentUserId) : currentUserId;
    const title = req.body ? (req.body.title || req.body.subject) : null;
    const body = req.body ? (req.body.body || req.body.message || req.body.content) : null;
    const dataPayload = req.body ? (req.body.data || req.body.payload || {}) : {};
    const userName = req.body ? (req.body.user_name || req.body.username || req.body.sender_name || null) : null;
    const userPhotoUrl = req.body ? (req.body.user_photo_url || req.body.photo_url || req.body.profile_image || null) : null;

    if (!targetUserId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: "user_id, title, and body are required in request body",
        error_code: "BAD_REQUEST"
      });
    }

    const result = await notificationService.sendNotification({
      userId: targetUserId,
      title,
      body,
      data: dataPayload,
      senderUserId: currentUserId,
      userName,
      userPhotoUrl
    });

    return res.status(200).json({
      success: true,
      message: "Notification sent successfully",
      data: result
    });
  } catch (err) {
    return next(err);
  }
};

router.post('/send', authenticateToken, handleSendNotification);

// 3. Trigger Business Event Push Notification (12 Supported Events)
const handleTriggerEventNotification = async (req, res, next) => {
  try {
    const currentUserId = (req.user && (req.user.user_id || req.user.id)) || null;
    const eventType = req.body ? (req.body.event_type || req.body.event || req.body.type) : null;
    const targetUserId = req.body ? (req.body.user_id || req.body.target_user_id || req.body.userId || currentUserId) : currentUserId;

    if (!eventType || !targetUserId) {
      return res.status(400).json({
        success: false,
        message: "event_type and user_id are required in request body",
        error_code: "BAD_REQUEST"
      });
    }

    const result = await notificationService.sendEventNotification(eventType, {
      ...req.body,
      user_id: targetUserId
    });

    return res.status(200).json({
      success: true,
      message: `Event notification '${eventType}' triggered successfully`,
      data: result
    });
  } catch (err) {
    return next(err);
  }
};

router.post('/event', authenticateToken, handleTriggerEventNotification);
router.post('/trigger', authenticateToken, handleTriggerEventNotification);

// 4. Get User Notifications History & Unread Count
const handleGetNotifications = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.query.userId || req.headers['user_id'] || req.headers['user-id'] || (req.user && (req.user.user_id || req.user.id || req.user.partner_id || req.user.userId)) || '2305';
    const result = await notificationService.getUserNotifications(userId);
    return res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully",
      data: result
    });
  } catch (err) {
    return next(err);
  }
};

router.get('/', authenticateToken, handleGetNotifications);
router.get('/list', authenticateToken, handleGetNotifications);
router.get('/history', authenticateToken, handleGetNotifications);

// 5. Mark Notification Read
const handleMarkRead = async (req, res, next) => {
  try {
    const userId = (req.user && (req.user.user_id || req.user.id)) || 'usr_7250642635';
    const notificationId = req.params.notification_id || (req.body ? req.body.notification_id : null);

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: "notification_id is required",
        error_code: "BAD_REQUEST"
      });
    }

    const result = await notificationService.markNotificationRead(notificationId, userId);
    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: result
    });
  } catch (err) {
    return next(err);
  }
};

router.post('/:notification_id/read', authenticateToken, handleMarkRead);
router.patch('/:notification_id/read', authenticateToken, handleMarkRead);
router.post('/read', authenticateToken, handleMarkRead);

module.exports = router;
