const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  handleCreateOrGetConversation,
  handleGetConversations,
  handleGetMessages,
  handleGetUserStatus,
  handleDeleteMessage,
  handleBlockUser
} = require('../controllers/chatController');

// 1. Create/Get Conversation
router.post('/conversation', authenticateToken, handleCreateOrGetConversation);
router.post('/conversations', authenticateToken, handleCreateOrGetConversation);

// 2. Get Chat List
router.get('/conversations', authenticateToken, handleGetConversations);
router.get('/conversation', authenticateToken, handleGetConversations);
router.get('/list', authenticateToken, handleGetConversations);

// 3. Get Chat History
router.get('/messages/:conversationId', authenticateToken, handleGetMessages);
router.get('/conversation/:conversationId', authenticateToken, handleGetMessages);
router.get('/conversations/:conversationId', authenticateToken, handleGetMessages);
router.get('/history/:conversationId', authenticateToken, handleGetMessages);
router.get('/messages', authenticateToken, (req, res, next) => {
  if (req.query && (req.query.conversationId || req.query.conversation_id)) {
    req.params.conversationId = req.query.conversationId || req.query.conversation_id;
    return handleGetMessages(req, res, next);
  }
  return res.status(400).json({
    success: false,
    message: "conversationId parameter is required",
    error_code: "BAD_REQUEST"
  });
});

// 3.1 Check Online Status
router.get('/status/:userId', authenticateToken, handleGetUserStatus);
router.get('/online-status/:userId', authenticateToken, handleGetUserStatus);
router.get('/user-status/:userId', authenticateToken, handleGetUserStatus);
router.get('/user/:userId/status', authenticateToken, handleGetUserStatus);
router.get('/user/:userId/online', authenticateToken, handleGetUserStatus);
router.get('/status', authenticateToken, handleGetUserStatus);
router.post('/status', authenticateToken, handleGetUserStatus);
router.get('/online-status', authenticateToken, handleGetUserStatus);
router.post('/online-status', authenticateToken, handleGetUserStatus);
router.all('/heartbeat', authenticateToken, (req, res) => res.status(200).json({ success: true, status: 'online', isOnline: true }));
router.all('/ping', authenticateToken, (req, res) => res.status(200).json({ success: true, status: 'online', isOnline: true }));

// 4. Delete Message
router.delete('/message/:messageId', authenticateToken, handleDeleteMessage);
router.post('/message/:messageId/delete', authenticateToken, handleDeleteMessage);

// 5. Block User
router.post('/block', authenticateToken, handleBlockUser);

module.exports = router;
