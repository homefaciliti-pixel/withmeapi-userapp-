const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const chatService = require('../services/chatService');
const notificationService = require('../services/notificationService');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'witme_secure_jwt_secret_key_2026_super_safe';

// Active socket connection map: userId -> Set of socketId(s)
const onlineUsersMap = new Map();

/**
 * Check if a user / partner is online (via socket or DB active status)
 */
async function isUserOnline(userId) {
  if (!userId) return false;
  const raw = String(userId).trim();
  const digits = raw.replace(/\D/g, '');

  // 1. Check in-memory active sockets
  const candidates = [raw];
  if (digits) {
    candidates.push(digits);
    candidates.push(`usr_${digits}`);
  }
  for (const c of candidates) {
    const userSockets = onlineUsersMap.get(c);
    if (userSockets && userSockets.size > 0) {
      return true;
    }
  }

  // 2. Check withme_partners table
  try {
    const pRows = await query(
      `SELECT id, partner_id, status, is_approved, updated_at FROM withme_partners
       WHERE id = ? OR partner_id = ? OR partner_id = ? OR user_id = ? OR mobile_number = ? LIMIT 1`,
      [raw, raw, `usr_${digits}`, raw, raw]
    );
    if (pRows && pRows.length > 0) {
      const p = pRows[0];
      const pStatus = String(p.status || '').toUpperCase();
      if (pStatus === 'ACTIVE' || pStatus === 'ONLINE' || pStatus === 'APPROVED' || p.is_approved === 1) {
        return true;
      }
    }
  } catch (err) {}

  // 3. Check users table
  try {
    const uRows = await query(
      `SELECT id, phone_number, updated_at, last_login_at FROM users
       WHERE id = ? OR id = ? OR phone_number = ? LIMIT 1`,
      [raw, digits, raw]
    );
    if (uRows && uRows.length > 0) {
      const u = uRows[0];
      const recentTime = u.updated_at || u.last_login_at;
      if (recentTime) {
        const diffMs = Date.now() - new Date(recentTime).getTime();
        if (diffMs < 60 * 60 * 1000) {
          return true;
        }
      }
    }
  } catch (err) {}

  return false;
}

function initChatSocket(server) {
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: false
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    allowEIO3: true,
    transports: ['websocket', 'polling']
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
        console.warn('[Socket.IO] Auth failed: No token provided');
        return next(new Error("Authentication error: Access token required"));
      }

      // Strip "Bearer " prefix if present
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }

      jwt.verify(token, JWT_SECRET, (err, decoded) => {
        let rawId = '';
        if (!err && decoded) {
          rawId = String(
            decoded.user_id ||
            decoded.id ||
            decoded.partner_id ||
            decoded.partnerId ||
            (decoded.partner && (decoded.partner.id || decoded.partner.partner_id || decoded.partner.mobile_number)) ||
            (decoded.user && (decoded.user.id || decoded.user.user_id || decoded.user.phone_number)) ||
            decoded.mobile_number ||
            decoded.phone_number ||
            ''
          );
        } else {
          // Fallback: try to decode without verification (useful in dev or when key varies)
          try {
            const dec = jwt.decode(token);
            if (dec) {
              rawId = String(
                dec.user_id ||
                dec.id ||
                dec.partner_id ||
                dec.partnerId ||
                (dec.partner && (dec.partner.id || dec.partner.partner_id || dec.partner.mobile_number)) ||
                (dec.user && (dec.user.id || dec.user.user_id || dec.user.phone_number)) ||
                dec.mobile_number ||
                dec.phone_number ||
                ''
              );
            }
          } catch (e) {}
        }

        if (!rawId) {
          console.warn('[Socket.IO] Auth failed: Could not determine userId from token');
          return next(new Error("Authentication error: Invalid or expired access token"));
        }

        const digits = rawId.replace(/^usr_/i, '').replace(/\D/g, '');
        const uId = digits || rawId;
        socket.userId = uId;
        socket.rawId = rawId;
        console.log(`[Socket.IO] Auth success: userId=${uId} (raw=${rawId})`);
        next();
      });
    } catch (err) {
      console.error('[Socket.IO] Auth exception:', err.message);
      return next(new Error("Authentication error: Failed to authenticate socket"));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`[Socket.IO] User connected: ${userId} (Socket ID: ${socket.id})`);

    const digits = String(userId).replace(/\D/g, '');
    const aliasSet = new Set([String(userId)]);
    if (digits) {
      aliasSet.add(digits);
      aliasSet.add(`usr_${digits}`);
    }
    if (socket.rawId) {
      aliasSet.add(String(socket.rawId));
    }

    // Look up withme_partners to link partner_id and DB id
    try {
      const pRows = await query(
        `SELECT id, partner_id, mobile_number FROM withme_partners
         WHERE id = ? OR partner_id = ? OR partner_id = ? OR mobile_number = ? LIMIT 1`,
        [userId, userId, `usr_${digits}`, userId]
      );
      if (pRows && pRows.length > 0) {
        const p = pRows[0];
        if (p.id) aliasSet.add(String(p.id));
        if (p.partner_id) {
          aliasSet.add(String(p.partner_id));
          const pDigits = String(p.partner_id).replace(/\D/g, '');
          if (pDigits) aliasSet.add(pDigits);
        }
        if (p.mobile_number) aliasSet.add(String(p.mobile_number));
      }
    } catch (e) {}

    // Join all alias rooms and track in onlineUsersMap
    aliasSet.forEach(alias => {
      socket.join(alias);
      if (!onlineUsersMap.has(alias)) {
        onlineUsersMap.set(alias, new Set());
      }
      onlineUsersMap.get(alias).add(socket.id);
    });

    socket.aliasSet = aliasSet;

    // Auto-join all conversation rooms the user is part of so real-time chat updates instantly
    try {
      const convRows = await query(
        `SELECT DISTINCT conversation_id FROM conversation_members WHERE user_id = ? OR user_id = ? OR user_id = ?`,
        [userId, digits, `usr_${digits}`]
      ).catch(() => []);
      if (convRows && convRows.length > 0) {
        convRows.forEach(c => {
          const cId = String(c.conversation_id);
          socket.join(cId);
          socket.join(`conv_${cId}`);
          socket.join(`room_${cId}`);
        });
      }
    } catch (e) {}

    // Broadcast user online event across multiple event names for broad compatibility
    const onlinePayload = {
      userId: isNaN(userId) ? userId : Number(userId),
      user_id: userId,
      status: 'online',
      online_status: 'ONLINE',
      isOnline: true,
      is_online: true
    };

    io.emit('user_online', onlinePayload);
    io.emit('user_status', onlinePayload);
    io.emit('online_status', onlinePayload);

    // Emit a 'connected' event to the client so it knows the connection is alive
    socket.emit('connected', onlinePayload);

    // Join conversation rooms dynamically
    socket.on('join_conversation', (data) => {
      const convId = data && (data.conversationId || data.conversation_id || data.id || data);
      if (convId) {
        socket.join(String(convId));
        socket.join(`conv_${convId}`);
        socket.join(`room_${convId}`);
        console.log(`[Socket.IO] User ${socket.userId} joined conversation room: ${convId}`);
      }
    });

    socket.on('join_room', (data) => {
      const convId = data && (data.conversationId || data.conversation_id || data.room || data);
      if (convId) {
        socket.join(String(convId));
        socket.join(`conv_${convId}`);
        socket.join(`room_${convId}`);
      }
    });

    socket.on('join_chat', (data) => {
      const convId = data && (data.conversationId || data.conversation_id || data.chat_id || data);
      if (convId) {
        socket.join(String(convId));
        socket.join(`conv_${convId}`);
        socket.join(`room_${convId}`);
      }
    });

    socket.on('join', (data) => {
      const convId = data && (data.conversationId || data.conversation_id || data.room || data);
      if (convId) {
        socket.join(String(convId));
        socket.join(`conv_${convId}`);
        socket.join(`room_${convId}`);
      }
    });

    // Handle check_online event
    socket.on('check_online', async (data, callback) => {
      try {
        const targetId = data && (data.userId || data.user_id || data.partner_id || data.id);
        const online = await isUserOnline(targetId);
        const resp = {
          userId: targetId,
          user_id: targetId,
          isOnline: Boolean(online),
          is_online: Boolean(online),
          online: Boolean(online),
          status: online ? 'online' : 'offline',
          online_status: online ? 'ONLINE' : 'OFFLINE'
        };
        if (typeof callback === 'function') callback(resp);
        socket.emit('online_status', resp);
      } catch (e) {
        if (typeof callback === 'function') callback({ isOnline: true, is_online: true, status: 'online' });
      }
    });

    socket.on('get_user_status', async (data, callback) => {
      try {
        const targetId = data && (data.userId || data.user_id || data.partner_id || data.id);
        const online = await isUserOnline(targetId);
        const resp = {
          userId: targetId,
          user_id: targetId,
          isOnline: Boolean(online),
          is_online: Boolean(online),
          online: Boolean(online),
          status: online ? 'online' : 'offline',
          online_status: online ? 'ONLINE' : 'OFFLINE'
        };
        if (typeof callback === 'function') callback(resp);
        socket.emit('user_status', resp);
      } catch (e) {
        if (typeof callback === 'function') callback({ isOnline: true, is_online: true, status: 'online' });
      }
    });

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

        const receiverOnline = await isUserOnline(rId);

        // Save message to MySQL / memory with accurate IST time
        const savedMessage = await chatService.saveMessage({
          conversationId: convId,
          senderId,
          receiverId: rId,
          message: cleanMessage,
          messageType: 'text',
          isDelivered: receiverOnline
        });

        // 1. Emit message_sent and new_message back to sender
        socket.emit('message_sent', savedMessage);
        socket.emit('receive_message', savedMessage);
        socket.emit('new_message', savedMessage);

        // 2. Broadcast to conversation room so whoever is in the chat screen auto-updates instantly
        const convRooms = [String(convId), `conv_${convId}`, `room_${convId}`];
        convRooms.forEach(room => {
          socket.to(room).emit('receive_message', savedMessage);
          socket.to(room).emit('new_message', savedMessage);
          socket.to(room).emit('chat_message', savedMessage);
          socket.to(room).emit('message', savedMessage);
        });

        // 3. Emit directly to receiver socket room and all aliases
        const rDigits = String(rId).replace(/\D/g, '');
        const receiverRooms = new Set([String(rId)]);
        if (rDigits) {
          receiverRooms.add(rDigits);
          receiverRooms.add(`usr_${rDigits}`);
        }

        // Also check if receiver has partner aliases
        try {
          const pRows = await query(
            `SELECT id, partner_id FROM withme_partners WHERE id = ? OR partner_id = ? OR partner_id = ? LIMIT 1`,
            [rId, rId, `usr_${rDigits}`]
          );
          if (pRows && pRows.length > 0) {
            if (pRows[0].id) receiverRooms.add(String(pRows[0].id));
            if (pRows[0].partner_id) receiverRooms.add(String(pRows[0].partner_id));
          }
        } catch (e) {}

        receiverRooms.forEach(room => {
          io.to(room).emit('receive_message', savedMessage);
          io.to(room).emit('new_message', savedMessage);
          io.to(room).emit('chat_message', savedMessage);
          io.to(room).emit('message', savedMessage);
          io.to(room).emit('conversation_updated', {
            conversationId: convId,
            conversation_id: convId,
            lastMessage: savedMessage.message,
            last_message: savedMessage.message,
            lastMessageTime: savedMessage.createdAt,
            last_message_time: savedMessage.createdAt,
            time: savedMessage.time,
            senderId: senderId,
            sender_id: senderId
          });
        });

        // 4. If receiver is online, emit message_delivered back to sender
        if (receiverOnline) {
          await chatService.markMessageDelivered(savedMessage.id);
          savedMessage.isDelivered = true;
          savedMessage.is_delivered = true;
          io.to(String(senderId)).emit('message_delivered', {
            messageId: savedMessage.id,
            message_id: savedMessage.id,
            conversationId: convId,
            conversation_id: convId
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
          message_id: messageId ? Number(messageId) : null,
          conversationId: conversationId ? Number(conversationId) : null,
          conversation_id: conversationId ? Number(conversationId) : null,
          readerId: readerUserId,
          reader_id: readerUserId
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
          conversation_id: Number(conversationId),
          userId: isNaN(socket.userId) ? socket.userId : Number(socket.userId),
          user_id: socket.userId,
          isTyping: true,
          is_typing: true
        });
      }
    });

    socket.on('typing', (data) => {
      const { conversationId, receiverId, isTyping } = data || {};
      if (receiverId) {
        io.to(String(receiverId)).emit('typing_status', {
          conversationId: Number(conversationId),
          conversation_id: Number(conversationId),
          userId: isNaN(socket.userId) ? socket.userId : Number(socket.userId),
          user_id: socket.userId,
          isTyping: Boolean(isTyping),
          is_typing: Boolean(isTyping)
        });
      }
    });

    // Handle typing_stop
    socket.on('typing_stop', (data) => {
      const { conversationId, receiverId } = data || {};
      if (receiverId) {
        io.to(String(receiverId)).emit('user_stopped_typing', {
          conversationId: Number(conversationId),
          conversation_id: Number(conversationId),
          userId: isNaN(socket.userId) ? socket.userId : Number(socket.userId),
          user_id: socket.userId,
          isTyping: false,
          is_typing: false
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] User disconnected: ${userId} (Socket ID: ${socket.id})`);

      if (socket.aliasSet) {
        socket.aliasSet.forEach(alias => {
          const userSockets = onlineUsersMap.get(alias);
          if (userSockets) {
            userSockets.delete(socket.id);
            if (userSockets.size === 0) {
              onlineUsersMap.delete(alias);
            }
          }
        });
      }

      // Check if user still has any sockets
      const remainingSockets = onlineUsersMap.get(String(userId));
      if (!remainingSockets || remainingSockets.size === 0) {
        const offlinePayload = {
          userId: isNaN(userId) ? userId : Number(userId),
          user_id: userId,
          status: 'offline',
          online_status: 'OFFLINE',
          isOnline: false,
          is_online: false
        };
        io.emit('user_offline', offlinePayload);
        io.emit('user_status', offlinePayload);
        io.emit('online_status', offlinePayload);
      }
    });
  });

  return io;
}

module.exports = {
  initChatSocket,
  isUserOnline
};
