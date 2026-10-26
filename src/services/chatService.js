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
 * Format IST Date and Time helper
 * Fixes timezone double conversion bug (+5:30 applied twice on MySQL datetime).
 * Produces accurate UTC ISO string (ending in Z) for client-side .toLocal() parsing
 * and exact Asia/Kolkata 12h/24h strings for direct display.
 */
function formatISTDateTime(dateInput) {
  let dateObj;
  if (!dateInput) {
    dateObj = new Date();
  } else if (dateInput instanceof Date) {
    dateObj = dateInput;
  } else if (typeof dateInput === 'string') {
    const s = dateInput.trim();
    if (!s.includes('Z') && !s.includes('+') && !s.match(/-\d{2}:\d{2}$/)) {
      // MySQL datetime string from IST server: 'YYYY-MM-DD HH:mm:ss' is already in IST (+05:30)
      dateObj = new Date(s.replace(' ', 'T') + '+05:30');
    } else {
      dateObj = new Date(s);
    }
  } else if (typeof dateInput === 'number') {
    dateObj = new Date(dateInput);
  } else {
    dateObj = new Date();
  }

  if (isNaN(dateObj.getTime())) {
    dateObj = new Date();
  }

  // Format with Intl in Asia/Kolkata timezone
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = dtf.formatToParts(dateObj);
  const getPart = (type) => (parts.find(p => p.type === type) || {}).value || '00';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour24 = parseInt(getPart('hour'), 10);
  const minutes = getPart('minute');
  const seconds = getPart('second');

  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  const hours12 = (hour24 % 12 || 12).toString().padStart(2, '0');

  const time12 = `${hours12}:${minutes} ${ampm}`;
  const time24 = `${hour24.toString().padStart(2, '0')}:${minutes}`;
  const dateStr = `${year}-${month}-${day}`;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(month, 10) - 1;
  const formattedDate = `${day} ${monthNames[monthIdx] || 'Jan'} ${year}`;

  const isoUTC = dateObj.toISOString();
  const isoIST = `${year}-${month}-${day}T${hour24.toString().padStart(2, '0')}:${minutes}:${seconds}+05:30`;

  return {
    iso: isoUTC,
    iso_utc: isoUTC,
    iso_ist: isoIST,
    time: time12,
    formatted_time: time12,
    time12: time12,
    time24: time24,
    date: formattedDate,
    date_str: dateStr,
    timestamp: dateObj.getTime()
  };
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
      `SELECT * FROM users WHERE id = ? OR id = ? OR phone_number = ? LIMIT 1`,
      [uId, rawId, uId]
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
  const rawId = String(userId).trim();
  const digits = rawId.replace(/\D/g, '');
  const formattedId = rawId.startsWith('usr_') ? rawId : (digits ? `usr_${digits}` : rawId);

  const inMem = memoryMembers.some(
    m => m.conversation_id === convId && (toUserIdStr(m.user_id) === uId || m.user_id === rawId || m.user_id === formattedId)
  );
  if (inMem) return true;

  try {
    const rows = await query(
      `SELECT id FROM conversation_members WHERE conversation_id = ? AND (user_id = ? OR user_id = ? OR user_id = ?) LIMIT 1`,
      [convId, uId, rawId, formattedId]
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
 *
 * If bookingId is supplied, each booking gets its own isolated conversation.
 * Without bookingId, falls back to the existing single shared conversation per pair.
 */
async function createOrGetConversation(authenticatedUserId, targetUserId, bookingId = null) {
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

  const bId = bookingId ? String(bookingId).trim() : null;

  // ── PATH A: Booking-specific conversation ──────────────────────────────────
  if (bId) {
    // 0. Search existing in memory
    for (const [id, conv] of memoryConversations.entries()) {
      if (conv.booking_id === bId) {
        return { conversationId: Number(id), bookingId: bId, isNew: false };
      }
    }

    // 1. Look for an existing conversation tied to this exact booking in MySQL
    try {
      const rows = await query(
        `SELECT id FROM conversations WHERE booking_id = ? LIMIT 1`,
        [bId]
      );
      if (rows && rows.length > 0) {
        const foundId = Number(rows[0].id);
        memoryConversations.set(foundId, { id: foundId, type: 'private', booking_id: bId });
        return { conversationId: foundId, bookingId: bId, isNew: false };
      }
    } catch (err) {
      // Ignore — booking_id column may not exist yet; handled below
    }

    // 2. Create a new conversation scoped to this booking
    try {
      const resConv = await query(
        `INSERT INTO conversations (type, booking_id, created_at, updated_at) VALUES ('private', ?, NOW(), NOW())`,
        [bId]
      );
      const dbConvId = Number(resConv.insertId);

      await query(
        `INSERT IGNORE INTO conversation_members (conversation_id, user_id) VALUES (?, ?), (?, ?)`,
        [dbConvId, currentId, dbConvId, targetId]
      );

      const now = new Date().toISOString();
      memoryConversations.set(dbConvId, { id: dbConvId, type: 'private', booking_id: bId, created_at: now, updated_at: now });
      memoryMembers.push({ id: memoryMembers.length + 1, conversation_id: dbConvId, user_id: currentId, joined_at: now });
      memoryMembers.push({ id: memoryMembers.length + 1, conversation_id: dbConvId, user_id: targetId, joined_at: now });

      return { conversationId: dbConvId, bookingId: bId, isNew: true };
    } catch (err) {
      // booking_id column missing — run migration and retry once
      await ensureBookingIdColumn();
      try {
        const resConv = await query(
          `INSERT INTO conversations (type, booking_id, created_at, updated_at) VALUES ('private', ?, NOW(), NOW())`,
          [bId]
        );
        const dbConvId = Number(resConv.insertId);
        await query(
          `INSERT IGNORE INTO conversation_members (conversation_id, user_id) VALUES (?, ?), (?, ?)`,
          [dbConvId, currentId, dbConvId, targetId]
        );

        const now = new Date().toISOString();
        memoryConversations.set(dbConvId, { id: dbConvId, type: 'private', booking_id: bId, created_at: now, updated_at: now });
        memoryMembers.push({ id: memoryMembers.length + 1, conversation_id: dbConvId, user_id: currentId, joined_at: now });
        memoryMembers.push({ id: memoryMembers.length + 1, conversation_id: dbConvId, user_id: targetId, joined_at: now });

        return { conversationId: dbConvId, bookingId: bId, isNew: true };
      } catch (retryErr) {
        // Fallback to in-memory store with booking_id so booking isolation still works
        autoConversationId++;
        const newConvId = autoConversationId;
        const now = new Date().toISOString();
        memoryConversations.set(newConvId, { id: newConvId, type: 'private', booking_id: bId, created_at: now, updated_at: now });
        memoryMembers.push({ id: memoryMembers.length + 1, conversation_id: newConvId, user_id: currentId, joined_at: now });
        memoryMembers.push({ id: memoryMembers.length + 1, conversation_id: newConvId, user_id: targetId, joined_at: now });
        return { conversationId: newConvId, bookingId: bId, isNew: true };
      }
    }
  }

  // ── PATH B: Shared conversation per user pair (legacy behaviour) ───────────
  // 1. Search existing in memory
  const userConvs = memoryMembers.filter(m => toUserIdStr(m.user_id) === currentId).map(m => m.conversation_id);
  const commonMemConv = memoryMembers.find(m => userConvs.includes(m.conversation_id) && toUserIdStr(m.user_id) === targetId);

  if (commonMemConv) {
    return { conversationId: commonMemConv.conversation_id, isNew: false };
  }

  // 2. Search existing in MySQL (no booking filter)
  try {
    const rows = await query(
      `SELECT cm1.conversation_id
       FROM conversation_members cm1
       JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
       JOIN conversations c ON c.id = cm1.conversation_id
       WHERE cm1.user_id = ? AND cm2.user_id = ? AND c.type = 'private'
         AND (c.booking_id IS NULL OR c.booking_id = '')
       LIMIT 1`,
      [currentId, targetId]
    );

    if (rows && rows.length > 0) {
      return { conversationId: Number(rows[0].conversation_id), isNew: false };
    }
  } catch (err) {
    // If booking_id column doesn't exist yet fall back to old query
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
        return { conversationId: Number(rows[0].conversation_id), isNew: false };
      }
    } catch (e) {}
  }

  // 3. Create new shared conversation
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
      `INSERT IGNORE INTO conversation_members (conversation_id, user_id) VALUES (?, ?), (?, ?)`,
      [dbConvId, currentId, dbConvId, targetId]
    );

    return { conversationId: Number(dbConvId), isNew: true };
  } catch (err) {
    // Fallback to memory
  }

  return { conversationId: newConvId, isNew: true };
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
        `SELECT * FROM messages WHERE conversation_id = ? AND is_deleted = 0 ORDER BY id DESC LIMIT 1`,
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
        .sort((a, b) => (b.id || 0) - (a.id || 0));
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

    let isOnline = false;
    if (typeof isUserOnlineFn === 'function') {
      try {
        isOnline = await isUserOnlineFn(otherUserId);
      } catch (e) {
        isOnline = false;
      }
    }

    const lastMsgFormatted = formatISTDateTime(lastMsg ? lastMsg.created_at : new Date());

    let convBookingId = null;
    try {
      const cRows = await query(`SELECT booking_id FROM conversations WHERE id = ? LIMIT 1`, [cId]);
      if (cRows && cRows.length > 0 && cRows[0].booking_id) {
        convBookingId = cRows[0].booking_id;
      }
    } catch (e) {}
    if (!convBookingId && memoryConversations.has(cId)) {
      convBookingId = memoryConversations.get(cId).booking_id || null;
    }

    conversationList.push({
      conversationId: cId,
      conversation_id: cId,
      bookingId: convBookingId,
      booking_id: convBookingId,
      sessionId: convBookingId,
      session_id: convBookingId,
      id: cId,
      otherUserId: formatNumericUserId(otherUserId),
      other_user_id: otherUserId,
      userId: formatNumericUserId(otherUserId),
      user_id: otherUserId,
      partner_id: otherUserId,
      partnerId: otherUserId,
      name: otherUserName,
      otherUserName,
      other_user_name: otherUserName,
      partner_name: otherUserName,
      otherUserProfileImage,
      other_user_profile_image: otherUserProfileImage,
      profile_image: otherUserProfileImage,
      avatar: otherUserProfileImage,
      image: otherUserProfileImage,
      lastMessage: lastMsg ? lastMsg.message : "No messages yet",
      last_message: lastMsg ? lastMsg.message : "No messages yet",
      message: lastMsg ? lastMsg.message : "No messages yet",
      lastMessageTime: lastMsgFormatted.iso,
      last_message_time: lastMsgFormatted.iso,
      lastMessageTimeFormatted: lastMsgFormatted.time,
      last_message_time_formatted: lastMsgFormatted.time,
      createdAt: lastMsgFormatted.iso,
      created_at: lastMsgFormatted.iso,
      time: lastMsgFormatted.time,
      formatted_time: lastMsgFormatted.time,
      time12: lastMsgFormatted.time12,
      time24: lastMsgFormatted.time24,
      timestamp: lastMsgFormatted.timestamp,
      date: lastMsgFormatted.date,
      iso_ist: lastMsgFormatted.iso_ist,
      unreadCount,
      unread_count: unreadCount,
      isOnline: Boolean(isOnline),
      is_online: Boolean(isOnline),
      online: Boolean(isOnline),
      status: isOnline ? 'online' : 'offline',
      online_status: isOnline ? 'ONLINE' : 'OFFLINE'
    });
  }

  conversationList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return {
    success: true,
    data: conversationList,
    conversations: conversationList
  };
}

/**
 * API 3 – Get Chat History
 */
async function getConversationMessages(conversationId, authenticatedUserId, isUserOnlineFn) {
  const convId = Number(conversationId);
  const currentId = toUserIdStr(authenticatedUserId);

  const isMember = await isUserInConversation(convId, currentId);
  if (!isMember) {
    const err = new Error("Access denied: You are not a member of this conversation");
    err.statusCode = 403;
    throw err;
  }

  let otherUserId = null;
  try {
    const mRows = await query(
      `SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ? LIMIT 1`,
      [convId, currentId]
    );
    if (mRows && mRows.length > 0) {
      otherUserId = toUserIdStr(mRows[0].user_id);
    }
  } catch (err) {}

  if (!otherUserId) {
    const matchMem = memoryMembers.find(m => m.conversation_id === convId && toUserIdStr(m.user_id) !== currentId);
    if (matchMem) {
      otherUserId = toUserIdStr(matchMem.user_id);
    }
  }

  const otherUser = otherUserId ? await findUser(otherUserId) : null;
  const otherUserName = (otherUser && (otherUser.name || otherUser.full_name)) || (otherUserId ? `User ${otherUserId}` : '');
  const otherUserProfileImage = otherUser ? (otherUser.profile_image || otherUser.image || otherUser.profile_photo_url || '') : '';
  let isOnline = false;
  if (otherUserId && typeof isUserOnlineFn === 'function') {
    try {
      isOnline = await isUserOnlineFn(otherUserId);
    } catch (e) {
      isOnline = false;
    }
  }

  const formatSingleMsg = (r) => {
    const formatted = formatISTDateTime(r.created_at);
    return {
      messageId: Number(r.id),
      id: Number(r.id),
      conversationId: Number(r.conversation_id),
      conversation_id: Number(r.conversation_id),
      senderId: formatNumericUserId(r.sender_id),
      sender_id: r.sender_id,
      receiverId: formatNumericUserId(r.receiver_id),
      receiver_id: r.receiver_id,
      message: r.message,
      messageType: r.message_type || 'text',
      message_type: r.message_type || 'text',
      isDelivered: Boolean(r.is_delivered),
      is_delivered: Boolean(r.is_delivered),
      isRead: Boolean(r.is_read),
      is_read: Boolean(r.is_read),
      createdAt: formatted.iso,
      created_at: formatted.iso,
      iso_ist: formatted.iso_ist,
      time: formatted.time,
      formatted_time: formatted.time,
      time12: formatted.time12,
      time24: formatted.time24,
      timestamp: formatted.timestamp,
      date: formatted.date
    };
  };

  let dbMessages = [];
  try {
    const rows = await query(
      `SELECT * FROM messages WHERE conversation_id = ? AND is_deleted = 0 ORDER BY id ASC LIMIT 100`,
      [convId]
    );
    if (rows && rows.length > 0) {
      dbMessages = rows.map(formatSingleMsg);
    }
  } catch (err) {
    // Ignore MySQL error
  }

  const memMsgs = Array.from(memoryMessages.values())
    .filter(m => m.conversation_id === convId && !m.is_deleted)
    .map(formatSingleMsg);

  const map = new Map();
  dbMessages.forEach(m => map.set(m.messageId, m));
  memMsgs.forEach(m => map.set(m.messageId, m));

  const finalMessages = Array.from(map.values()).sort((a, b) => (a.id || 0) - (b.id || 0));

  let convBookingId = null;
  try {
    const cRows = await query(`SELECT booking_id FROM conversations WHERE id = ? LIMIT 1`, [convId]);
    if (cRows && cRows.length > 0 && cRows[0].booking_id) {
      convBookingId = cRows[0].booking_id;
    }
  } catch (e) {}
  if (!convBookingId && memoryConversations.has(convId)) {
    convBookingId = memoryConversations.get(convId).booking_id || null;
  }

  return {
    success: true,
    data: finalMessages,
    messages: finalMessages,
    conversationId: convId,
    conversation_id: convId,
    bookingId: convBookingId,
    booking_id: convBookingId,
    sessionId: convBookingId,
    session_id: convBookingId,
    isOnline: Boolean(isOnline),
    is_online: Boolean(isOnline),
    online: Boolean(isOnline),
    status: isOnline ? 'online' : 'offline',
    online_status: isOnline ? 'ONLINE' : 'OFFLINE',
    otherUserId: otherUserId ? formatNumericUserId(otherUserId) : null,
    other_user_id: otherUserId,
    otherUserName,
    other_user_name: otherUserName,
    otherUserProfileImage,
    other_user_profile_image: otherUserProfileImage,
    user: {
      userId: otherUserId ? formatNumericUserId(otherUserId) : null,
      user_id: otherUserId,
      id: otherUserId,
      name: otherUserName,
      profile_image: otherUserProfileImage,
      isOnline: Boolean(isOnline),
      is_online: Boolean(isOnline),
      online: Boolean(isOnline),
      status: isOnline ? 'online' : 'offline',
      online_status: isOnline ? 'ONLINE' : 'OFFLINE'
    }
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
  const formatted = formatISTDateTime(new Date());

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
    created_at: formatted.iso
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
    message_id: insertedId,
    conversationId: convId,
    conversation_id: convId,
    senderId: formatNumericUserId(sId),
    sender_id: sId,
    receiverId: formatNumericUserId(rId),
    receiver_id: rId,
    messageType,
    message_type: messageType,
    message: String(message),
    isDelivered: Boolean(isDelivered),
    is_delivered: Boolean(isDelivered),
    isRead: false,
    is_read: false,
    createdAt: formatted.iso,
    created_at: formatted.iso,
    iso_ist: formatted.iso_ist,
    time: formatted.time,
    formatted_time: formatted.time,
    time12: formatted.time12,
    time24: formatted.time24,
    timestamp: formatted.timestamp,
    date: formatted.date
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

/**
 * One-time migration: add booking_id column to conversations table.
 * Safe to call multiple times — ALTER fails silently if column already exists.
 */
async function ensureBookingIdColumn() {
  try {
    await query(`ALTER TABLE conversations ADD COLUMN booking_id VARCHAR(100) DEFAULT NULL`);
    await query(`ALTER TABLE conversations ADD INDEX idx_booking_id (booking_id)`);
    console.log('[ChatService] conversations.booking_id column added successfully');
  } catch (e) {
    // Column already exists — ignore
  }
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
  findUser,
  formatISTDateTime,
  formatNumericUserId,
  ensureBookingIdColumn
};
