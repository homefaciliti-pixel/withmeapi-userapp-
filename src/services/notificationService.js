const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');

// In-memory notifications store
const memoryNotifications = new Map(); // notification_id -> object
const memoryUserTokens = new Map(); // user_id -> { fcmToken, deviceType }

// Firebase Service Account Credentials & Token Cache
let serviceAccountCreds = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccountCreds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (parseErr) {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8');
      serviceAccountCreds = JSON.parse(decoded);
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    serviceAccountCreds = JSON.parse(decoded);
  } else {
    const saPath = path.join(__dirname, '../config/firebase-service-account.json');
    if (fs.existsSync(saPath)) {
      serviceAccountCreds = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    }
  }
} catch (e) {
  console.warn('[FCM] Service account load notice:', e.message);
}

let cachedOAuthToken = null;
let tokenExpiresAt = 0;

async function getFirebaseAccessToken() {
  if (!serviceAccountCreds) return null;
  const now = Math.floor(Date.now() / 1000);
  if (cachedOAuthToken && tokenExpiresAt > now + 60) {
    return cachedOAuthToken;
  }

  return new Promise((resolve, reject) => {
    try {
      const header = { alg: 'RS256', typ: 'JWT' };
      const claim = {
        iss: serviceAccountCreds.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
      };

      const encodeBase64Url = (obj) => {
        return Buffer.from(JSON.stringify(obj))
          .toString('base64')
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');
      };

      const encodedHeader = encodeBase64Url(header);
      const encodedClaim = encodeBase64Url(claim);
      const signInput = `${encodedHeader}.${encodedClaim}`;

      const signer = crypto.createSign('RSA-SHA256');
      signer.update(signInput);
      const signature = signer.sign(serviceAccountCreds.private_key, 'base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      const jwt = `${signInput}.${signature}`;
      const postData = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;

      const req = https.request({
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (json.access_token) {
              cachedOAuthToken = json.access_token;
              tokenExpiresAt = now + (json.expires_in || 3600);
              resolve(cachedOAuthToken);
            } else {
              console.warn('[FCM OAuth2 Error]:', body);
              resolve(null);
            }
          } catch (err) {
            resolve(null);
          }
        });
      });

      req.on('error', (err) => {
        console.warn('[FCM OAuth2 Request Error]:', err.message);
        resolve(null);
      });
      req.write(postData);
      req.end();
    } catch (err) {
      console.warn('[FCM Sign Error]:', err.message);
      resolve(null);
    }
  });
}

/**
 * Fetch user name and profile photo URL from DB (users or withme_partners table)
 */
async function fetchUserInfo(userId) {
  const uId = String(userId || '').trim();
  if (!uId) {
    return {
      name: 'Amit',
      photo_url: 'https://withmeapi-userapp.onrender.com/uploads/amit_1.jpg'
    };
  }

  const digits = uId.replace(/\D/g, '');

  // 1. Check users table (id, name, profile_image)
  try {
    const rows = await query(
      `SELECT id, name, profile_image FROM users WHERE id = ? OR id = ? OR phone_number = ? LIMIT 1`,
      [uId, digits || 0, uId]
    );
    if (rows && rows.length > 0) {
      const u = rows[0];
      let photo = u.profile_image || 'https://withmeapi-userapp.onrender.com/uploads/amit_1.jpg';
      if (photo && !photo.startsWith('http://') && !photo.startsWith('https://')) {
        photo = `https://withmeapi-userapp.onrender.com${photo.startsWith('/') ? '' : '/'}${photo}`;
      }
      return {
        name: (u.name || `User ${uId}`).trim(),
        photo_url: photo
      };
    }
  } catch (err) { /* Ignore */ }

  // 2. Check withme_partners table
  try {
    const rows = await query(
      `SELECT partner_id, name, full_name, image, profile_photo_url FROM withme_partners WHERE partner_id = ? OR partner_id = ? OR id = ? OR user_id = ? OR mobile_number = ? LIMIT 1`,
      [uId, `usr_${digits}`, digits || 0, uId, uId]
    );
    if (rows && rows.length > 0) {
      const p = rows[0];
      let photo = p.image || p.profile_photo_url || 'https://withmeapi-userapp.onrender.com/uploads/priya.jpg';
      if (photo && !photo.startsWith('http://') && !photo.startsWith('https://')) {
        photo = `https://withmeapi-userapp.onrender.com${photo.startsWith('/') ? '' : '/'}${photo}`;
      }
      return {
        name: (p.name || p.full_name || `Partner ${uId}`).trim(),
        photo_url: photo
      };
    }
  } catch (err) { /* Ignore */ }

  return {
    name: 'Amit',
    photo_url: 'https://withmeapi-userapp.onrender.com/uploads/amit_1.jpg'
  };
}

/**
 * Save / Update FCM Token for a user.
 * Tries withme_users first, then falls back to users table.
 * Both tables' tokens are kept in sync so notifications always reach the device.
 */
async function saveUserFcmToken(userId, fcmToken, deviceType = 'android') {
  if (!userId || !fcmToken) {
    throw new Error("userId and fcm_token are required");
  }

  const uId = String(userId).trim();
  const digits = uId.replace(/\D/g, '');
  const formattedId = uId.startsWith('usr_') ? uId : (digits ? `usr_${digits}` : uId);

  // Always update the in-memory store (all alias forms)
  memoryUserTokens.set(uId, { fcmToken, deviceType });
  if (digits) {
    memoryUserTokens.set(digits, { fcmToken, deviceType });
    memoryUserTokens.set(formattedId, { fcmToken, deviceType });
  }

  // 1. Upsert into withme_users (the primary FCM store)
  try {
    // Try update first
    const updateRes = await query(
      `UPDATE withme_users SET fcm_token = ?, device_type = ?, updated_at = NOW()
       WHERE user_id = ? OR user_id = ? OR user_id = ? OR phone_number = ?`,
      [fcmToken, deviceType, uId, digits || '', formattedId, uId]
    );

    // If no row matched, insert a new record
    if (updateRes && updateRes.affectedRows === 0) {
      await query(
        `INSERT INTO withme_users (user_id, fcm_token, device_type, created_at, updated_at)
         VALUES (?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE fcm_token = VALUES(fcm_token), device_type = VALUES(device_type), updated_at = NOW()`,
        [formattedId || uId, fcmToken, deviceType]
      );
    }
  } catch (err) {
    console.warn('[FCM] withme_users upsert notice:', err.message);
  }

  // 2. Also update the users table if a matching record exists (belt-and-suspenders)
  try {
    await query(
      `UPDATE users SET fcm_token = ? WHERE id = ? OR id = ? OR phone_number = ?`,
      [fcmToken, uId, digits || '', uId]
    );
  } catch (err) {
    // users.fcm_token column may not exist — add it silently then retry
    try {
      await query(`ALTER TABLE users ADD COLUMN fcm_token TEXT DEFAULT NULL`);
      await query(
        `UPDATE users SET fcm_token = ? WHERE id = ? OR id = ? OR phone_number = ?`,
        [fcmToken, uId, digits || '', uId]
      );
    } catch (e) { /* Ignore */ }
  }

  return {
    user_id: uId,
    fcm_token: fcmToken,
    device_type: deviceType
  };
}

/**
 * Dispatch Push Notification via Firebase FCM HTTP API if Server Key present
 */
/**
 * Helper to sanitize FCM data payload
 * Firebase Cloud Messaging strictly requires all values in the 'data' map to be strings.
 */
function sanitizeFcmData(data) {
  const result = {};
  if (!data || typeof data !== 'object') return result;
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined) {
      result[k] = '';
    } else if (typeof v === 'object') {
      result[k] = JSON.stringify(v);
    } else {
      result[k] = String(v);
    }
  }
  return result;
}

/**
 * Send push notification via modern Firebase Cloud Messaging HTTP v1 API
 * Falls back to legacy HTTP API if service account is unavailable.
 */
async function sendFcmPushNotification(fcmToken, title, body, dataPayload = {}) {
  const sanitizedData = sanitizeFcmData(dataPayload);

  // Try modern FCM HTTP v1 using Service Account JSON
  try {
    const accessToken = await getFirebaseAccessToken();
    if (accessToken && serviceAccountCreds && serviceAccountCreds.project_id) {
      const payload = JSON.stringify({
        message: {
          token: fcmToken,
          notification: {
            title: title,
            body: body
          },
          data: sanitizedData,
          android: {
            priority: 'high',
            notification: {
              channel_id: 'chat_messages',
              sound: 'default'
            }
          }
        }
      });

      return new Promise((resolve) => {
        const req = https.request({
          hostname: 'fcm.googleapis.com',
          path: `/v1/projects/${serviceAccountCreds.project_id}/messages:send`,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve({ sent: res.statusCode === 200, status: res.statusCode, response: parsed });
            } catch (e) {
              resolve({ sent: res.statusCode === 200, status: res.statusCode, raw: data });
            }
          });
        });

        req.on('error', (err) => {
          console.error('[FCM v1 Push Error]:', err.message);
          resolve({ sent: false, error: err.message });
        });

        req.write(payload);
        req.end();
      });
    }
  } catch (err) {
    console.warn('[FCM v1 Attempt Error]:', err.message);
  }

  // Fallback to legacy FCM Server Key
  const serverKey = process.env.FIREBASE_SERVER_KEY || process.env.FCM_SERVER_KEY || 'AIzaSyDFBUhNlPjsnkfVA4auuznMeyoTz-AhJDQ';
  if (!serverKey) {
    console.log(`[FCM Notice] Notification stored. To enable Firebase push delivery, set FIREBASE_SERVER_KEY in .env`);
    return Promise.resolve({ sent: false, reason: "NO_SERVER_KEY" });
  }

  return new Promise((resolve) => {
    const payload = JSON.stringify({
      to: fcmToken,
      priority: "high",
      notification: {
        title: title,
        body: body,
        sound: "default"
      },
      data: sanitizedData
    });

    const options = {
      hostname: 'fcm.googleapis.com',
      path: '/fcm/send',
      method: 'POST',
      headers: {
        'Authorization': `key=${serverKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ sent: true, response: parsed });
        } catch (e) {
          resolve({ sent: true, raw: data });
        }
      });
    });

    req.on('error', (err) => {
      console.error("[FCM Push Error]:", err.message);
      resolve({ sent: false, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Create and send a notification to a target user
 */
async function sendNotification({ userId, title, body, data = {}, senderUserId = null, userName = null, userPhotoUrl = null }) {
  if (!userId || !title || !body) {
    throw new Error("userId, title, and body are required");
  }

  const uId = String(userId);
  const notificationId = `ntf_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const nowStr = new Date().toISOString();

  // Resolve sender name + photo if not passed in
  let resolvedName = userName;
  let resolvedPhoto = userPhotoUrl;
  if ((!resolvedName || !resolvedPhoto) && senderUserId) {
    const info = await fetchUserInfo(senderUserId);
    if (!resolvedName) resolvedName = info.name;
    if (!resolvedPhoto) resolvedPhoto = info.photo_url;
  }

  // Find target user FCM token — check all alias forms across withme_users, users, and withme_partners tables
  let fcmToken = null;
  const uIdDigits = uId.replace(/\D/g, '');
  const uIdFormatted = uId.startsWith('usr_') ? uId : (uIdDigits ? `usr_${uIdDigits}` : uId);

  // 1. In-memory store (all aliases)
  for (const alias of [uId, uIdDigits, uIdFormatted]) {
    if (alias && memoryUserTokens.has(alias)) {
      fcmToken = memoryUserTokens.get(alias).fcmToken;
      break;
    }
  }

  if (!fcmToken) {
    // 2. withme_users table
    try {
      const rows = await query(
        `SELECT fcm_token FROM withme_users
         WHERE user_id = ? OR user_id = ? OR user_id = ? OR phone_number = ? LIMIT 1`,
        [uId, uIdDigits || '', uIdFormatted, uId]
      );
      if (rows && rows.length > 0 && rows[0].fcm_token) {
        fcmToken = rows[0].fcm_token;
      }
    } catch (err) { /* Ignore */ }
  }

  if (!fcmToken) {
    // 3. users table
    try {
      const rows = await query(
        `SELECT fcm_token FROM users WHERE id = ? OR id = ? OR phone_number = ? LIMIT 1`,
        [uId, uIdDigits || '', uId]
      );
      if (rows && rows.length > 0 && rows[0].fcm_token) {
        fcmToken = rows[0].fcm_token;
      }
    } catch (err) { /* Ignore */ }
  }

  if (!fcmToken) {
    // 4. withme_partners table (crucial for notifications to partners!)
    try {
      const pRows = await query(
        `SELECT fcm_token FROM withme_partners 
         WHERE partner_id = ? OR partner_id = ? OR id = ? OR user_id = ? OR mobile_number = ? LIMIT 1`,
        [uId, uIdFormatted, uIdDigits || 0, uId, uId]
      );
      if (pRows && pRows.length > 0 && pRows[0].fcm_token) {
        fcmToken = pRows[0].fcm_token;
      }
    } catch (err) { /* Ignore */ }
  }

  // Inject user_name and user_photo_url inside data object
  let dataPayloadObj = {};
  if (typeof data === 'object' && data !== null) {
    dataPayloadObj = { ...data };
  } else if (typeof data === 'string') {
    try {
      dataPayloadObj = JSON.parse(data);
    } catch (e) {
      dataPayloadObj = {};
    }
  }

  const finalName = resolvedName || 'Amit';
  const finalPhoto = resolvedPhoto || 'https://withmeapi-userapp.onrender.com/uploads/amit_1.jpg';

  dataPayloadObj.user_name = finalName;
  dataPayloadObj.username = finalName;
  dataPayloadObj.user_photo_url = finalPhoto;
  dataPayloadObj.userPhotoUrl = finalPhoto;
  dataPayloadObj.photo_url = finalPhoto;

  const dataPayloadStr = JSON.stringify(dataPayloadObj);

  const ntfObj = {
    notification_id: notificationId,
    user_id: uId,
    user_name: finalName,
    user_photo_url: finalPhoto,
    username: finalName,
    userPhotoUrl: finalPhoto,
    photo_url: finalPhoto,
    title: title,
    body: body,
    data: dataPayloadObj,
    is_read: false,
    created_at: nowStr
  };

  // Save to memory
  memoryNotifications.set(notificationId, ntfObj);

  // Save to MySQL (including user_name and user_photo_url)
  try {
    await query(
      `INSERT INTO withme_notifications (notification_id, user_id, user_name, user_photo_url, title, body, data_payload) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [notificationId, uId, finalName, finalPhoto, title, body, dataPayloadStr]
    );
  } catch (err) {
    // Ignore MySQL error
  }

  // Trigger FCM push if token exists
  let pushResult = { sent: false };
  if (fcmToken) {
    pushResult = await sendFcmPushNotification(fcmToken, title, body, ntfObj.data);
  }

  return {
    notification_id: notificationId,
    target_user_id: uId,
    user_name: finalName,
    user_photo_url: finalPhoto,
    username: finalName,
    userPhotoUrl: finalPhoto,
    photo_url: finalPhoto,
    title: title,
    body: body,
    data: dataPayloadObj,
    fcm_sent: pushResult.sent,
    sent_at: nowStr
  };
}

/**
 * Get notification list for a user
 */
async function getUserNotifications(userId) {
  const uId = String(userId || '').trim();
  const digits = uId.replace(/\D/g, '');
  let list = [];

  // Fetch from MySQL
  try {
    const rows = await query(
      `SELECT * FROM withme_notifications WHERE user_id = ? OR user_id = ? OR user_id = ? ORDER BY id DESC LIMIT 50`,
      [uId, digits || 0, `usr_${digits}`]
    );
    if (rows && rows.length > 0) {
      list = await Promise.all(rows.map(async (r) => {
        let dataObj = {};
        try {
          dataObj = r.data_payload ? JSON.parse(r.data_payload) : {};
        } catch (e) {
          dataObj = {};
        }

        let name = r.user_name || dataObj.user_name || dataObj.username || dataObj.sender_name || dataObj.customer_name || null;
        let photo = r.user_photo_url || dataObj.user_photo_url || dataObj.userPhotoUrl || dataObj.photo_url || dataObj.profile_image || null;

        // If missing, check sender_id
        const senderId = dataObj.sender_id || dataObj.senderId || dataObj.from_user_id || null;
        if ((!name || !photo) && senderId) {
          const senderInfo = await fetchUserInfo(senderId);
          if (!name) name = senderInfo.name;
          if (!photo) photo = senderInfo.photo_url;
        }

        // If missing, check title / body
        if (!name) {
          const match = (r.title + " " + r.body).match(/from\s+([A-Za-z0-9_\s]+?)(?:\s+for|\s+at|[\!💬🔔💌]|$)/i);
          if (match && match[1]) {
            name = match[1].trim();
          }
        }

        if (!name || name === 'User' || name.startsWith('User ')) {
          name = 'Amit';
        }

        if (!photo || photo.includes('base64-1792144167755')) {
          photo = 'https://withmeapi-userapp.onrender.com/uploads/amit_1.jpg';
        }

        if (photo && !photo.startsWith('http://') && !photo.startsWith('https://')) {
          photo = `https://withmeapi-userapp.onrender.com${photo.startsWith('/') ? '' : '/'}${photo}`;
        }

        // Ensure user_name and user_photo_url are inside data
        dataObj.user_name = name;
        dataObj.username = name;
        dataObj.user_photo_url = photo;
        dataObj.userPhotoUrl = photo;
        dataObj.photo_url = photo;

        // Ensure chat-specific navigation fields are present in dataObj
        if (dataObj.type === 'chat_message') {
          if (!dataObj.otherUserName && name) dataObj.otherUserName = name;
          if (!dataObj.other_user_name && name) dataObj.other_user_name = name;
          if (!dataObj.otherUserId && (dataObj.sender_id || dataObj.senderId)) {
            dataObj.otherUserId = dataObj.sender_id || dataObj.senderId;
            dataObj.other_user_id = dataObj.sender_id || dataObj.senderId;
          }
          if (!dataObj.chatId && (dataObj.conversation_id || dataObj.conversationId)) {
            dataObj.chatId = dataObj.conversation_id || dataObj.conversationId;
            dataObj.chat_id = dataObj.conversation_id || dataObj.conversationId;
          }
        }

        return {
          notification_id: r.notification_id,
          user_name: name,
          user_photo_url: photo,
          username: name,
          userPhotoUrl: photo,
          photo_url: photo,
          title: r.title,
          body: r.body,
          data: dataObj,
          is_read: Boolean(r.is_read),
          created_at: typeof r.created_at === 'string' ? r.created_at : new Date(r.created_at).toISOString()
        };
      }));
    }
  } catch (err) {
    // Ignore MySQL error
  }

  // Merge with memory store
  const memList = Array.from(memoryNotifications.values())
    .filter(n => String(n.user_id) === uId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const map = new Map();
  list.forEach(n => map.set(n.notification_id, n));
  memList.forEach(n => map.set(n.notification_id, n));

  const allNotifications = Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const unreadCount = allNotifications.filter(n => !n.is_read).length;

  return {
    notifications: allNotifications,
    unread_count: unreadCount
  };
}

/**
 * Mark notification as read
 */
async function markNotificationRead(notificationId, userId) {
  const nId = String(notificationId);
  const uId = String(userId);

  if (memoryNotifications.has(nId)) {
    memoryNotifications.get(nId).is_read = true;
  }

  try {
    await query(
      `UPDATE withme_notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?`,
      [nId, uId]
    );
  } catch (err) {
    // Ignore MySQL error
  }

  return { success: true };
}

/**
 * Trigger Event-Based Push Notification for WithMe24 Business Events:
 * 1. booking_request
 * 2. booking_confirmed
 * 3. booking_cancelled
 * 4. booking_completed
 * 5. request_cancelled
 * 6. booking_reminder
 * 7. safe_meet_alert
 * 8. wallet_credit
 * 9. withdraw_success
 * 10. withdraw_failed
 * 11. chat_message
 * 12. review_rating
 */
async function sendEventNotification(eventType, params = {}) {
  try {
    const recipientId = params.userId || params.targetUserId || params.user_id || params.target_user_id || params.partner_id;

    if (!recipientId) {
      return { sent: false, reason: "NO_RECIPIENT_ID" };
    }

    // Resolve sender info for user_name and user_photo_url
    const senderUserId = params.sender_id || params.senderId || params.from_user_id || null;
    let resolvedName = params.name || params.customer_name || params.sender_name || null;
    let resolvedPhoto = params.user_photo_url || params.photo_url || params.profile_image || null;

    // Auto-fetch from DB if not supplied
    if (senderUserId && (!resolvedName || !resolvedPhoto)) {
      const senderInfo = await fetchUserInfo(senderUserId);
      if (!resolvedName) resolvedName = senderInfo.name;
      if (!resolvedPhoto) resolvedPhoto = senderInfo.photo_url;
    }

    const name = resolvedName || 'User';
    const activity = params.activity || params.interest || 'Date';
    const location = params.location || 'Jaipur';
    const bookingId = params.booking_id || params.bookingId || '';
    const requestId = params.request_id || params.requestId || '';
    const amount = params.amount || 0;
    const dateStr = params.date || '';
    const timeStr = params.time || '';
    const ratingVal = params.rating || 5;

    let title = "WithMe24 Alert 🔔";
    let body = `You have a new update regarding ${eventType}.`;
    let dataPayload = { event_type: String(eventType).toLowerCase(), ...params };

    switch (String(eventType).toLowerCase()) {
      case 'booking_request':
      case 'request':
        title = "New Booking Request 💌";
        body = `You received a new booking request from ${name} for ${activity} at ${location}!`;
        dataPayload = {
          type: "booking_request",
          request_id: requestId || `req_${Date.now()}`,
          user_name: resolvedName || null,
          user_photo_url: resolvedPhoto || null
        };
        break;

      case 'booking_confirmed':
      case 'confirm':
      case 'booking_confirm':
        title = "Booking Confirmed! ✅";
        body = `Your booking ${bookingId} with ${name} for ${activity} is confirmed for ${dateStr} ${timeStr}!`;
        dataPayload = {
          type: "booking_confirmed",
          booking_id: bookingId,
          request_id: requestId,
          user_name: resolvedName || null,
          user_photo_url: resolvedPhoto || null
        };
        break;

      case 'booking_cancelled':
      case 'cancel':
      case 'cancle':
      case 'booking_cancel':
      case 'booking_cancle':
        title = "Booking Cancelled ❌";
        body = `Booking ${bookingId} with ${name} has been cancelled.`;
        dataPayload = {
          type: "booking_cancelled",
          booking_id: bookingId,
          user_name: resolvedName || null,
          user_photo_url: resolvedPhoto || null
        };
        break;

      case 'booking_completed':
      case 'complete':
      case 'booking_complete':
        title = "Booking Completed 🎉";
        body = `Booking ${bookingId} with ${name} has been marked as completed. Thank you!`;
        dataPayload = {
          type: "booking_completed",
          booking_id: bookingId,
          user_name: resolvedName || null,
          user_photo_url: resolvedPhoto || null
        };
        break;

      case 'request_cancelled':
      case 'request_cancel':
      case 'request_cancle':
        title = "Request Cancelled ❌";
        body = `Booking request ${requestId} has been cancelled.`;
        dataPayload = {
          type: "request_cancelled",
          request_id: requestId,
          user_name: resolvedName || null,
          user_photo_url: resolvedPhoto || null
        };
        break;

      case 'booking_reminder':
      case 'remind_booking':
      case 'remind_about_booking_details':
      case 'remind_booking_details':
      case 'remind':
        title = "Upcoming Booking Reminder ⏰";
        body = `Reminder: You have an upcoming booking with ${name} on ${dateStr} at ${timeStr}. Location: ${location}.`;
        dataPayload = {
          type: "booking_reminder",
          booking_id: bookingId,
          date: dateStr,
          time: timeStr,
          location,
          user_name: resolvedName || null,
          user_photo_url: resolvedPhoto || null
        };
        break;

      case 'safe_meet_alert':
      case 'safe_meet':
        title = "Safe Meet Mode Active 🛡️";
        body = `Safe Meet protection is active for booking ${bookingId}. Your emergency contacts and live location monitoring are enabled.`;
        dataPayload = {
          type: "safe_meet_alert",
          booking_id: bookingId,
          user_name: resolvedName || null,
          user_photo_url: resolvedPhoto || null
        };
        break;

      case 'wallet_credit':
      case 'credit_wallet':
      case 'credit_wallet_in_earning':
      case 'earning_credit':
        title = "Wallet Credited 💰";
        body = `₹${amount} has been credited to your WithMe earnings wallet!`;
        dataPayload = {
          type: "wallet_credit",
          amount: Number(amount),
          booking_id: bookingId,
          user_name: resolvedName || null,
          user_photo_url: resolvedPhoto || null
        };
        break;

      case 'withdraw_success':
      case 'withdraw_sucess':
      case 'withdrawal_success':
        title = "Withdrawal Successful 🏦";
        body = `Your withdrawal payout request of ₹${amount} has been processed successfully to your bank account.`;
        dataPayload = {
          type: "withdraw_success",
          amount: Number(amount),
          user_name: resolvedName || null,
          user_photo_url: resolvedPhoto || null
        };
        break;

      case 'withdraw_failed':
      case 'withdrawal_failed':
        title = "Withdrawal Failed ❌";
        body = `Your withdrawal request of ₹${amount} failed. ${params.reason ? `Reason: ${params.reason}. ` : ''}Amount has been refunded to your wallet.`;
        dataPayload = {
          type: "withdraw_failed",
          amount: Number(amount),
          reason: params.reason || 'Processing error',
          user_name: resolvedName || null,
          user_photo_url: resolvedPhoto || null
        };
        break;

      case 'chat_message':
      case 'chat':
      case 'message':
        const senderId = params.sender_id || params.senderId || '';
        const convId = params.conversation_id || params.conversationId || params.chat_id || params.chatId || '';
        const bId = params.booking_id || params.bookingId || '';
        title = `New Message from ${name} 💬`;
        body = params.message ? (params.message.length > 80 ? params.message.substring(0, 80) + '...' : params.message) : "Sent you a new chat message.";
        dataPayload = {
          type: "chat_message",
          conversation_id: convId,
          conversationId: convId,
          chat_id: convId,
          chatId: convId,
          sender_id: senderId,
          senderId: senderId,
          other_user_id: senderId,
          otherUserId: senderId,
          other_user_name: resolvedName || name,
          otherUserName: resolvedName || name,
          user_name: resolvedName || name,
          username: resolvedName || name,
          user_photo_url: resolvedPhoto || null,
          userPhotoUrl: resolvedPhoto || null,
          booking_id: bId,
          bookingId: bId
        };
        break;

      case 'review_rating':
      case 'review':
      case 'rating':
        title = `New Review (${ratingVal}⭐) Received`;
        body = `${name} rated you ${ratingVal} stars${params.review ? `: "${params.review}"` : ''}!`;
        dataPayload = {
          type: "review_rating",
          rating: Number(ratingVal),
          review: params.review || '',
          user_name: resolvedName || null,
          user_photo_url: resolvedPhoto || null
        };
        break;

      default:
        title = params.title || `WithMe24 Alert: ${eventType}`;
        body = params.body || `Event update for ${eventType}`;
        dataPayload = {
          type: eventType,
          user_name: resolvedName || null,
          user_photo_url: resolvedPhoto || null,
          ...params
        };
        break;
    }

    return await sendNotification({
      userId: recipientId,
      title,
      body,
      data: dataPayload,
      senderUserId: senderUserId || null,
      userName: resolvedName || null,
      userPhotoUrl: resolvedPhoto || null
    });
  } catch (err) {
    console.error("[Event Notification Error]:", err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = {
  saveUserFcmToken,
  sendNotification,
  getUserNotifications,
  markNotificationRead,
  sendEventNotification,
  sendFcmPushNotification
};
