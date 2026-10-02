const { query } = require('../config/db');

// In-memory fallback stores for Chat
const memoryConversations = new Map(); // conversationId -> { id, type, created_at, updated_at }
const memoryMembers = []; // [{ id, conversation_id, user_id, joined_at }]
const memoryMessages = new Map(); // messageId -> { id, conversation_id, sender_id, receiver_id, message_type, message, is_delivered, is_read, is_deleted, created_at }
const memoryBlocks = new Set(); // "blockerId:blockedId"

let autoMessageId = 1000;
let autoConversationId = 100;

function formatNumericUserId(id) {
  if (id === null || id === undefined || id === '') return 101;
  const str = String(id).trim();
  const digits = str.replace(/\D/g, '');
  if (digits.length > 0) {
    const num = Number(digits);
    return isNaN(num) ? digits : num;
  }
  return 101;
}

function toUserIdStr(id) {
  if (id === null || id === undefined) return "";
  const str = String(id).trim();
  const digits = str.replace(/\D/g, '');
  return digits.length > 0 ? digits : str;
}

/**
 * Format photo URL helper
 */
function getPhotoUrl(imagePath, req) {
  if (!imagePath) {
    const protocol = req ? (req.headers['x-forwarded-proto'] || req.protocol || 'http') : 'http';
    const host = req ? (req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5000') : 'localhost:5000';
    return `${protocol}://${host}/uploads/profile.jpg`;
  }
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const protocol = req ? (req.headers['x-forwarded-proto'] || req.protocol || 'http') : 'http';
  const host = req ? (req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5000') : 'localhost:5000';
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${protocol}://${host}${cleanPath}`;
}

/**
 * Find user details from memory or MySQL
 */
async function findUser(userId) {
  const uId = toUserIdStr(userId);
  if (!uId) return null;

  const rawId = uId.replace(/^usr_/, '');
  const formattedId = uId.startsWith('usr_') ? uId : `usr_${uId}`;

  // 1. Check users table
  try {
    const rows = await query(
      `SELECT * FROM users WHERE id = ? OR user_id = ? OR id = ? OR phone_number = ? LIMIT 1`,
      [uId, formattedId, rawId, uId]
    );
    if (rows && rows.length > 0) {
      const u = rows[0];
      return {
        user_id: formatNumericUserId(u.id || u.user_id || uId),
        name: u.name || u.full_name || `User ${uId}`,
        full_name: u.full_name || u.name || `User ${uId}`,
        profile_image: u.profile_image || u.image || u.profile_photo_url || "/uploads/profile.jpg"
      };
    }
  } catch (err) {
    // Ignore database connection error
  }

  // 2. Check withme_partners table
  try {
    const rows = await query(
      `SELECT * FROM withme_partners WHERE partner_id = ? OR id = ? OR user_id = ? OR mobile_number = ? LIMIT 1`,
      [uId, rawId, formattedId, uId]
    );
    if (rows && rows.length > 0) {
      const p = rows[0];
      return {
        user_id: formatNumericUserId(p.user_id || p.partner_id || p.id || uId),
        name: p.name || p.full_name || `Partner ${uId}`,
        full_name: p.full_name || p.name || `Partner ${uId}`,
        profile_image: p.image || p.profile_photo_url || "/uploads/priya.jpg"
      };
    }
  } catch (err) {
    // Ignore database connection error
  }

  if (uId.length > 0) {
    return {
      user_id: formatNumericUserId(uId),
      name: `User ${uId}`,
      full_name: `User ${uId}`,
      profile_image: "/uploads/profile.jpg"
    };
  }

  return null;
}

/**
 * Check if either user has blocked the other
 */
async function isUserBlocked(user1Id, user2Id) {
  const u1 = toUserIdStr(user1Id);
  const u2 = toUserIdStr(user2Id);
  if (!u1 || !u2) return false;

  if (memoryBlocks.has(`${u1}:${u2}`) || memoryBlocks.has(`${u2}:${u1}`)) {
    return true;
  }

  try {
    const rows = await query(
      `SELECT id FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1`,
      [u1, u2, u2, u1]
    );
    if (rows && rows.length > 0) {
      return true;
    }
  } catch (err) {
    // Ignore MySQL error
  }

  return false;
}

/**
 * Block a user
 */
async function blockUser(blockerId, blockedId) {
  const b1 = toUserIdStr(blockerId);
  const b2 = toUserIdStr(blockedId);

  if (!b1 || !b2) {
    throw new Error("Invalid blocker or blocked user ID");
  }

  if (b1 === b2) {
    throw new Error("Cannot block yourself");
  }

  memoryBlocks.add(`${b1}:${b2}`);

  try {
    await query(
      `INSERT IGNORE INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?)`,
      [b1, b2]
    );
  } catch (err) {
    // Ignore MySQL error
  }

  return { success: true, message: "User blocked successfully" };
}

/**
 * Check if a user is a member of a conversation
 */
async function isUserInConversation(conversationId, userId) {
  const convId = Number(conversationId);
  const uId = toUserIdStr(userId);

  const inMem = memoryMembers.some(m => m.conversation_id === convId && toUserIdStr(m.user_id) === uId);
  if (inMem) return true;

  if (memoryConversations.has(convId)) {
    return false;
  }

  try {
    const rows = await query(
      `SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ? LIMIT 1`,
      [convId, uId]
    );
    if (rows && rows.length > 0) {
      return true;
    }
  } catch (err) {
    // Ignore MySQL error
  }

  return false;
}

/**
 * API 1 – Create/Get Private Conversation
 */
async function createOrGetConversation(authenticatedUserId, targetUserId) {
  const currentId = toUserIdStr(authenticatedUserId);
  const targetId = toUserIdStr(targetUserId);

  if (!currentId || !targetId) {
    throw new Error("Invalid user IDs");
  }

  if (currentId === targetId) {
    throw new Error("Cannot create conversation with yourself");
  }

  const blocked = await isUserBlocked(currentId, targetId);
  if (blocked) {
    throw new Error("User is blocked");
  }

  const targetUser = await findUser(targetId);
  if (!targetUser) {
    throw new Error("Target user not found");
  }

  // 1. Search existing in memory
  const userConvs = memoryMembers.filter(m => toUserIdStr(m.user_id) === currentId).map(m => m.conversation_id);
  const commonMemConv = memoryMembers.find(m => userConvs.includes(m.conversation_id) && toUserIdStr(m.user_id) === targetId);

  if (commonMemConv) {
    return { conversationId: commonMemConv.conversation_id };
  }

  // 2. Search existing in MySQL
  try {
    const rows = await query(
      `SELECT cm1.conversation_id 
       FROM conversation_members cm1
       JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
       JOIN conversations c ON c.id = cm1.conversation_id
       WHERE cm1.user_id = ? AND cm2.user_id = ? AND c.type = 'private'
       LIMIT 1`,
      [currentId, targetId]
    );

    if (rows && rows.length > 0) {
      return { conversationId: Number(rows[0].conversation_id) };
    }
  } catch (err) {
    // Ignore MySQL error
  }

  // 3. Create new conversation
  autoConversationId++;
  const newConvId = autoConversationId;
  const now = new Date().toISOString();

  memoryConversations.set(newConvId, { id: newConvId, type: 'private', created_at: now, updated_at: now });
  memoryMembers.push({ id: memoryMembers.length + 1, conversation_id: newConvId, user_id: currentId, joined_at: now });
  memoryMembers.push({ id: memoryMembers.length + 1, conversation_id: newConvId, user_id: targetId, joined_at: now });

  try {
    const resConv = await query(
      `INSERT INTO conversations (type, created_at, updated_at) VALUES ('private', NOW(), NOW())`
    );
    const dbConvId = resConv.insertId || newConvId;

    await query(
      `INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?), (?, ?)`,
      [dbConvId, currentId, dbConvId, targetId]
    );

    return { conversationId: Number(dbConvId) };
  } catch (err) {
    // Fallback to memory
  }

  return { conversationId: newConvId };
}

/**
 * API 2 – Get Chat List
 */
async function getUserConversations(authenticatedUserId, req, isUserOnlineFn) {
  const currentId = toUserIdStr(authenticatedUserId);
  let convIds = [];

  try {
    const rows = await query(
      `SELECT DISTINCT conversation_id FROM conversation_members WHERE user_id = ?`,
      [currentId]
    );
    if (rows && rows.length > 0) {
      convIds = rows.map(r => Number(r.conversation_id));
    }
  } catch (err) {
    // Ignore MySQL error
  }

  const memConvs = memoryMembers.filter(m => toUserIdStr(m.user_id) === currentId).map(m => m.conversation_id);
  convIds = Array.from(new Set([...convIds, ...memConvs]));

  const conversationList = [];

  for (const cId of convIds) {
    let otherUserId = null;

    try {
      const rows = await query(
        `SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ? LIMIT 1`,
        [cId, currentId]
      );
      if (rows && rows.length > 0) {
        otherUserId = toUserIdStr(rows[0].user_id);
      }
    } catch (err) {
      // Ignore
    }

    if (!otherUserId) {
      const matchMem = memoryMembers.find(m => m.conversation_id === cId && toUserIdStr(m.user_id) !== currentId);
      if (matchMem) {
        otherUserId = toUserIdStr(matchMem.user_id);
      }
    }

    if (!otherUserId) continue;

    const otherUser = await findUser(otherUserId);
    const otherUserName = (otherUser && (otherUser.name || otherUser.full_name)) || `User ${otherUserId}`;
    const otherUserProfileImage = getPhotoUrl(otherUser ? (otherUser.profile_image || otherUser.image || otherUser.profile_photo_url) : null, req);

    let lastMsg = null;

    try {
      const rows = await query(
        `SELECT * FROM messages WHERE conversation_id = ? AND is_deleted = 0 ORDER BY created_at DESC LIMIT 1`,
        [cId]
      );
      if (rows && rows.length > 0) {
        const r = rows[0];
        lastMsg = {
          message: r.message,
          created_at: typeof r.created_at === 'string' ? r.created_at : new Date(r.created_at).toISOString()
        };
      }
    } catch (err) {
      // Ignore
    }

    if (!lastMsg) {
      const memMsgs = Array.from(memoryMessages.values())
        .filter(m => m.conversation_id === cId && !m.is_deleted)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (memMsgs.length > 0) {
        lastMsg = {
          message: memMsgs[0].message,
          created_at: memMsgs[0].created_at
        };
      }
    }

    let unreadCount = 0;
    try {
      const rows = await query(
        `SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ? AND receiver_id = ? AND is_read = 0 AND is_deleted = 0`,
        [cId, currentId]
      );
      if (rows && rows.length > 0) {
        unreadCount = Number(rows[0].cnt || 0);
      }
    } catch (err) {
      // Ignore
    }

    const memUnread = Array.from(memoryMessages.values()).filter(
      m => m.conversation_id === cId && toUserIdStr(m.receiver_id) === currentId && !m.is_read && !m.is_deleted
    ).length;
    unreadCount = Math.max(unreadCount, memUnread);

    const isOnline = typeof isUserOnlineFn === 'function' ? isUserOnlineFn(otherUserId) : false;

    conversationList.push({
      conversationId: cId,
      otherUserId: formatNumericUserId(otherUserId),
      otherUserName,
      otherUserProfileImage,
      lastMessage: lastMsg ? lastMsg.message : "No messages yet",
      lastMessageTime: lastMsg ? lastMsg.created_at : new Date().toISOString(),
      unreadCount,
      isOnline
    });
  }

  conversationList.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

  return {
    success: true,
    data: conversationList
  };
}

/**
 * API 3 – Get Chat History
 */
async function getConversationMessages(conversationId, authenticatedUserId) {
  const convId = Number(conversationId);
  const currentId = toUserIdStr(authenticatedUserId);

  const isMember = await isUserInConversation(convId, currentId);
  if (!isMember) {
    const err = new Error("Access denied: You are not a member of this conversation");
    err.statusCode = 403;
    throw err;
  }

  let dbMessages = [];
  try {
    const rows = await query(
      `SELECT * FROM messages WHERE conversation_id = ? AND is_deleted = 0 ORDER BY created_at ASC LIMIT 100`,
      [convId]
    );
    if (rows && rows.length > 0) {
      dbMessages = rows.map(r => ({
        messageId: Number(r.id),
        id: Number(r.id),
        conversationId: Number(r.conversation_id),
        senderId: formatNumericUserId(r.sender_id),
        receiverId: formatNumericUserId(r.receiver_id),
        message: r.message,
        messageType: r.message_type || 'text',
        isDelivered: Boolean(r.is_delivered),
        isRead: Boolean(r.is_read),
        createdAt: typeof r.created_at === 'string' ? r.created_at : new Date(r.created_at).toISOString()
      }));
    }
  } catch (err) {
    // Ignore MySQL error
  }

  const memMsgs = Array.from(memoryMessages.values())
    .filter(m => m.conversation_id === convId && !m.is_deleted)
    .map(r => ({
      messageId: Number(r.id),
      id: Number(r.id),
      conversationId: Number(r.conversation_id),
      senderId: formatNumericUserId(r.sender_id),
      receiverId: formatNumericUserId(r.receiver_id),
      message: r.message,
      messageType: r.message_type || 'text',
      isDelivered: Boolean(r.is_delivered),
      isRead: Boolean(r.is_read),
      createdAt: r.created_at
    }));

  const map = new Map();
  dbMessages.forEach(m => map.set(m.messageId, m));
  memMsgs.forEach(m => map.set(m.messageId, m));

  const finalMessages = Array.from(map.values()).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return {
    success: true,
    data: finalMessages
  };
}

/**
 * Save Chat Message (Used by Socket & REST)
 */
async function saveMessage({ conversationId, senderId, receiverId, message, messageType = 'text', isDelivered = false }) {
  const convId = Number(conversationId);
  const sId = toUserIdStr(senderId);
  const rId = toUserIdStr(receiverId);

  const blocked = await isUserBlocked(sId, rId);
  if (blocked) {
    throw new Error("Message blocked: User has blocked communication");
  }

  autoMessageId++;
  const msgId = autoMessageId;
  const now = new Date().toISOString();

  const msgObj = {
    id: msgId,
    conversation_id: convId,
    sender_id: sId,
    receiver_id: rId,
    message_type: messageType,
    message: String(message),
    is_delivered: isDelivered ? 1 : 0,
    is_read: 0,
    is_deleted: 0,
    created_at: now
  };

  memoryMessages.set(msgId, msgObj);

  let insertedId = msgId;
  try {
    const res = await query(
      `INSERT INTO messages (conversation_id, sender_id, receiver_id, message_type, message, is_delivered, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
      [convId, sId, rId, messageType, String(message), isDelivered ? 1 : 0]
    );
    if (res.insertId) {
      insertedId = Number(res.insertId);
      msgObj.id = insertedId;
    }
  } catch (err) {
    // Ignore MySQL error
  }

  return {
    id: insertedId,
    messageId: insertedId,
    conversationId: convId,
    senderId: formatNumericUserId(sId),
    receiverId: formatNumericUserId(rId),
    messageType,
    message: String(message),
    isDelivered: Boolean(isDelivered),
    isRead: false,
    createdAt: now
  };
}

/**
 * Mark Message Read Status
 */
async function markMessageRead(messageId, conversationId, readerUserId) {
  const mId = Number(messageId);
  const rId = toUserIdStr(readerUserId);

  if (memoryMessages.has(mId)) {
    const m = memoryMessages.get(mId);
    if (toUserIdStr(m.receiver_id) === rId || !readerUserId) {
      m.is_read = 1;
      m.is_delivered = 1;
    }
  }

  try {
    await query(
      `UPDATE messages SET is_read = 1, is_delivered = 1 WHERE id = ?`,
      [mId]
    );
  } catch (err) {
    // Ignore
  }

  if (conversationId && readerUserId) {
    try {
      await query(
        `UPDATE messages SET is_read = 1, is_delivered = 1 WHERE conversation_id = ? AND receiver_id = ?`,
        [Number(conversationId), rId]
      );
    } catch (err) {
      // Ignore
    }
  }

  return { success: true };
}

/**
 * Mark Message Delivered Status
 */
async function markMessageDelivered(messageId) {
  const mId = Number(messageId);

  if (memoryMessages.has(mId)) {
    memoryMessages.get(mId).is_delivered = 1;
  }

  try {
    await query(
      `UPDATE messages SET is_delivered = 1 WHERE id = ?`,
      [mId]
    );
  } catch (err) {
    // Ignore
  }

  return { success: true };
}

/**
 * API 4 – Delete Message
 */
async function deleteMessage(messageId, authenticatedUserId) {
  const mId = Number(messageId);
  const sId = toUserIdStr(authenticatedUserId);

  let targetMsg = memoryMessages.get(mId);

  if (!targetMsg) {
    try {
      const rows = await query(
        `SELECT * FROM messages WHERE id = ? LIMIT 1`,
        [mId]
      );
      if (rows && rows.length > 0) {
        targetMsg = rows[0];
      }
    } catch (err) {
      // Ignore
    }
  }

  if (!targetMsg) {
    const err = new Error("Message not found");
    err.statusCode = 404;
    throw err;
  }

  if (toUserIdStr(targetMsg.sender_id) !== sId) {
    const err = new Error("Forbidden: You can only delete messages sent by you");
    err.statusCode = 403;
    throw err;
  }

  if (memoryMessages.has(mId)) {
    memoryMessages.get(mId).is_deleted = 1;
  }

  try {
    await query(
      `UPDATE messages SET is_deleted = 1 WHERE id = ?`,
      [mId]
    );
  } catch (err) {
    // Ignore
  }

  return {
    success: true,
    message: "Message deleted successfully",
    messageId: mId
  };
}

module.exports = {
  createOrGetConversation,
  getUserConversations,
  getConversationMessages,
  saveMessage,
  markMessageRead,
  markMessageDelivered,
  deleteMessage,
  blockUser,
  isUserBlocked,
  isUserInConversation,
  findUser
};
