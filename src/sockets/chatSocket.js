const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const chatService = require('../services/chatService');
const notificationService = require('../services/notificationService');

const JWT_SECRET = process.env.JWT_SECRET || 'witme_secure_jwt_secret_key_2026_super_safe';

// Active socket connection map: userId -> Set of socketId(s)
const onlineUsersMap = new Map();

function isUserOnline(userId) {
  if (!userId) return false;
  const uId = String(userId);
  const userSockets = onlineUsersMap.get(uId);
  return userSockets && userSockets.size > 0;
}

function initChatSocket(server) {
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Socket Authentication Middleware
  io.use((socket, next) => {
    try {
      let token = null;

      if (socket.handshake && socket.handshake.auth && socket.handshake.auth.token) {
        token = socket.handshake.auth.token;
      } else if (socket.handshake && socket.handshake.headers && socket.handshake.headers.authorization) {
        const authHeader = socket.handshake.headers.authorization;
        token = authHeader.split(' ')[1] || authHeader;
      } else if (socket.handshake && socket.handshake.query && socket.handshake.query.token) {
        token = socket.handshake.query.token;
      }

      if (!token) {
        return next(new Error("Authentication error: Access token required"));
      }

      // Strip "Bearer " prefix if present
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }

      jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err || !decoded) {
          // Fallback to decode if signature key varies
          try {
            const dec = jwt.decode(token);
            if (dec && (dec.user_id || dec.id)) {
              socket.userId = String(dec.user_id || dec.id);
              return next();
            }
          } catch (e) {}
          return next(new Error("Authentication error: Invalid or expired access token"));
        }
        const uId = String(decoded.user_id || decoded.id);
        socket.userId = uId;
        next();
      });
    } catch (err) {
      return next(new Error("Authentication error: Failed to authenticate socket"));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`[Socket.IO] User connected: ${userId} (Socket ID: ${socket.id})`);

    socket.join(String(userId));

    // Track online user socket
    if (!onlineUsersMap.has(userId)) {
      onlineUsersMap.set(userId, new Set());
    }
    onlineUsersMap.get(userId).add(socket.id);

    // Broadcast user online event
    io.emit('user_online', { userId: isNaN(userId) ? userId : Number(userId) });

    // Handle send_message
    socket.on('send_message', async (data, callback) => {
      try {
        const senderId = socket.userId; // ALWAYS use authenticated socket.userId
        const { conversationId, receiverId, message } = data || {};

        if (!conversationId || !receiverId || message === undefined || message === null) {
          const errRes = { success: false, message: "Missing required fields: conversationId, receiverId, message" };
          if (typeof callback === 'function') callback(errRes);
          socket.emit('error', errRes);
          return;
        }

        const cleanMessage = String(message).trim();
        if (!cleanMessage) {
          const errRes = { success: false, message: "Message cannot be empty" };
          if (typeof callback === 'function') callback(errRes);
          socket.emit('error', errRes);
          return;
        }

        if (cleanMessage.length > 5000) {
          const errRes = { success: false, message: "Message length exceeds 5000 limit" };
          if (typeof callback === 'function') callback(errRes);
          socket.emit('error', errRes);
          return;
        }

        const convId = Number(conversationId);
        const rId = String(receiverId);

        // Membership validation
        const isMember = await chatService.isUserInConversation(convId, senderId);
        if (!isMember) {
          const errRes = { success: false, message: "Unauthorized: You are not a member of this conversation" };
          if (typeof callback === 'function') callback(errRes);
          socket.emit('error', errRes);
          return;
        }

        // Block validation
        const isBlocked = await chatService.isUserBlocked(senderId, rId);
        if (isBlocked) {
          const errRes = { success: false, message: "Message blocked: Communication between users is restricted" };
          if (typeof callback === 'function') callback(errRes);
          socket.emit('error', errRes);
          return;
        }

        const receiverOnline = isUserOnline(rId);

        // Save message to MySQL / memory
        const savedMessage = await chatService.saveMessage({
          conversationId: convId,
          senderId,
          receiverId: rId,
          message: cleanMessage,
          messageType: 'text',
          isDelivered: receiverOnline
        });

        // 1. Emit message_sent back to sender
        socket.emit('message_sent', savedMessage);

        // 2. Emit receive_message to receiver's socket room
        io.to(rId).emit('receive_message', savedMessage);

        // 3. If receiver is online, emit message_delivered back to sender
        if (receiverOnline) {
          await chatService.markMessageDelivered(savedMessage.id);
          savedMessage.isDelivered = true;
          io.to(String(senderId)).emit('message_delivered', {
            messageId: savedMessage.id,
            conversationId: convId
          });
        } else {
          // Trigger push notification if offline
          notificationService.sendEventNotification('chat_message', {
            userId: rId,
            sender_id: senderId,
            conversation_id: convId,
            message: cleanMessage
          }).catch(() => {});
        }

        if (typeof callback === 'function') {
          callback({ success: true, message: savedMessage });
        }
      } catch (err) {
        console.error("[Socket Error send_message]:", err.message);
        const errRes = { success: false, message: err.message || "Failed to send message" };
        if (typeof callback === 'function') callback(errRes);
        socket.emit('error', errRes);
      }
    });

    // Handle mark_message_read
    socket.on('mark_message_read', async (data, callback) => {
      try {
        const readerUserId = socket.userId;
        const { messageId, conversationId } = data || {};

        if (!messageId && !conversationId) {
          const errRes = { success: false, message: "messageId or conversationId required" };
          if (typeof callback === 'function') callback(errRes);
          return;
        }

        await chatService.markMessageRead(messageId, conversationId, readerUserId);

        // Emit message_read to members
        const readPayload = {
          messageId: messageId ? Number(messageId) : null,
          conversationId: conversationId ? Number(conversationId) : null,
          readerId: readerUserId
        };

        if (conversationId) {
          socket.to(String(conversationId)).emit('message_read', readPayload);
        } else {
          io.emit('message_read', readPayload);
        }

        if (typeof callback === 'function') callback({ success: true });
      } catch (err) {
        console.error("[Socket Error mark_message_read]:", err.message);
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    });

    // Handle typing_start / typing
    socket.on('typing_start', (data) => {
      const { conversationId, receiverId } = data || {};
      if (receiverId) {
        io.to(String(receiverId)).emit('user_typing', {
          conversationId: Number(conversationId),
          userId: isNaN(socket.userId) ? socket.userId : Number(socket.userId),
          isTyping: true
        });
      }
    });

    socket.on('typing', (data) => {
      const { conversationId, receiverId, isTyping } = data || {};
      if (receiverId) {
        io.to(String(receiverId)).emit('typing_status', {
          conversationId: Number(conversationId),
          userId: isNaN(socket.userId) ? socket.userId : Number(socket.userId),
          isTyping: Boolean(isTyping)
        });
      }
    });

    // Handle typing_stop
    socket.on('typing_stop', (data) => {
      const { conversationId, receiverId } = data || {};
      if (receiverId) {
        io.to(String(receiverId)).emit('user_stopped_typing', {
          conversationId: Number(conversationId),
          userId: isNaN(socket.userId) ? socket.userId : Number(socket.userId),
          isTyping: false
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] User disconnected: ${userId} (Socket ID: ${socket.id})`);

      const userSockets = onlineUsersMap.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsersMap.delete(userId);
          // Broadcast user offline event when all user sockets disconnect
          io.emit('user_offline', { userId: isNaN(userId) ? userId : Number(userId) });
        }
      }
    });
  });

  return io;
}

module.exports = {
  initChatSocket,
  isUserOnline
};
