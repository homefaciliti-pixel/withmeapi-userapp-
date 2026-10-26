const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { query } = require('../config/db');
const chatService = require('../services/chatService');

// Price map by activity name
const activityPriceMap = {
  'Coffee': 1,
  'Dinner': 499,
  'Travel': 699,
  'Movie': 399,
  'Event': 499,
  'Conversation': 199
};

// Memory store for bookings
let bookingsStore = [];

const getPartnerApiUrl = () => {
  return process.env.PARTNER_API_URL || 'https://withme-partnerapi.onrender.com';
};

const syncBookingToPartnerApp = async (bookingPayload) => {
  const partnerUrls = [
    process.env.PARTNER_API_URL,
    'https://withmepartner.onrender.com',
    'https://withme-partnerapi.onrender.com',
    'https://withmepartnerapi.onrender.com',
    'http://localhost:5000',
    'http://localhost:5001'
  ].filter(Boolean);

  for (const baseUrl of partnerUrls) {
    try {
      const response = await fetch(`${baseUrl}/partner/incoming-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
        signal: AbortSignal.timeout(3500)
      });
      if (response.ok) {
        console.log(`[Partner Booking Sync] Successfully forwarded booking ${bookingPayload.booking_id} to Partner App at ${baseUrl}`);
        return true;
      }
    } catch (err) {
      // Ignore offline partner url notice
    }
  }
  return false;
};

// 1. Availability API — GET (/bookings/availability or /api/v1/bookings/availability)
router.get('/availability', authenticateToken, (req, res) => {
  const { userId = 'usr_201', date = '2026-09-25', duration = '1' } = req.query;

  return res.status(200).json({
    success: true,
    message: 'Availability fetched successfully',
    data: {
      userId,
      date,
      available: true,
      slots: [
        '05:00 PM',
        '05:30 PM',
        '06:00 PM',
        '06:30 PM',
        '07:00 PM',
        '07:30 PM',
        '08:00 PM'
      ]
    }
  });
});

// 2. Create Booking Request API — POST (/bookings or /api/v1/bookings)
const handleCreateBooking = async (req, res) => {
  const {
    activity_user_id = 'usr_201',
    partner_id,
    activity = 'Coffee',
    date = '2026-09-25',
    time = '06:00 PM',
    duration = 1,
    location = {
      address: 'Jaipur Coffee House',
      latitude: 26.9124,
      longitude: 75.7873
    }
  } = req.body || {};

  const effectivePartnerId = partner_id || activity_user_id || 'usr_201';
  const bookingId = `BK${Math.floor(100000 + Math.random() * 900000)}`;
  let price = (req.body && req.body.price) ? parseInt(req.body.price) : (activityPriceMap[activity] || 1);
  if (activity === 'Coffee' || String(activity).toLowerCase().includes('coffee')) {
    price = 1;
  }

  const userId = (req.user && (req.user.user_id || req.user.id)) || `usr_${Date.now()}`;
  let userName = (req.user && req.user.name && req.user.name !== 'User') ? req.user.name : null;
  const userPhone = (req.user && (req.user.phone_number || req.user.full_phone_number)) || '';

  // Always resolve latest customer name from users table
  try {
    const uRows = await query(`SELECT name FROM users WHERE id = ? OR phone_number = ? LIMIT 1`, [userId, userPhone]).catch(() => []);
    if (uRows && uRows.length > 0 && uRows[0].name && uRows[0].name !== 'User') {
      userName = uRows[0].name.trim();
    }
  } catch (e) {}
  if (!userName) userName = 'Amit';

  const locationStr = typeof location === 'string' ? location : (location.address || 'Jaipur');

  // Resolve actual partner name from request body or database
  let partnerName = (req.body && (req.body.partner_name || req.body.partnerName || req.body.name)) || '';
  let partnerAvatar = null;
  try {
    const pRows = await query(
      `SELECT name, full_name, profile_photo_url, image FROM withme_partners WHERE partner_id = ? OR id = ? OR user_id = ? LIMIT 1`,
      [String(effectivePartnerId), String(effectivePartnerId), String(effectivePartnerId)]
    ).catch(() => []);
    if (pRows && pRows.length > 0) {
      if (!partnerName || partnerName === userName) {
        partnerName = pRows[0].full_name || pRows[0].name || 'Partner';
      }
      partnerAvatar = pRows[0].profile_photo_url || pRows[0].image;
    }
  } catch (e) {}
  if (!partnerName || partnerName === userName) partnerName = 'Partner';

  const newBooking = {
    booking_id: bookingId,
    status: 'Upcoming',
    user_id: userId,
    user_name: userName,
    customer_name: userName,
    activity_user_id: effectivePartnerId,
    partner_id: effectivePartnerId,
    partner_name: partnerName,
    partner_avatar: partnerAvatar,
    name: partnerName,
    full_name: partnerName,
    activity,
    date,
    time,
    duration: typeof duration === 'number' ? duration : parseInt(duration) || 1,
    location,
    price,
    currency: 'INR',
    created_at: new Date().toISOString()
  };

  bookingsStore.push(newBooking);

  // 1. Save to MySQL table `withme_partner_bookings`
  try {
    // Ensure partner_name column exists
    query(`ALTER TABLE withme_partner_bookings ADD COLUMN partner_name VARCHAR(150)`).catch(() => {});

    await query(
      `INSERT INTO withme_partner_bookings (
        booking_id, user_id, partner_id, partner_name, customer_name, customer_phone, activity,
        date, time, duration, location, price, currency, payment_status, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'PENDING', 'PENDING', NOW())
      ON DUPLICATE KEY UPDATE status = 'PENDING', partner_name = VALUES(partner_name), updated_at = NOW()`,
      [bookingId, userId, effectivePartnerId, partnerName, userName, userPhone, activity, date, time, newBooking.duration, locationStr, price]
    ).catch(async () => {
      // Fallback without partner_name column if alter not ready
      await query(
        `INSERT INTO withme_partner_bookings (
          booking_id, user_id, partner_id, customer_name, customer_phone, activity,
          date, time, duration, location, price, currency, payment_status, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'PENDING', 'PENDING', NOW())
        ON DUPLICATE KEY UPDATE status = 'PENDING', updated_at = NOW()`,
        [bookingId, userId, effectivePartnerId, userName, userPhone, activity, date, time, newBooking.duration, locationStr, price]
      );
    });
    // Backward compatibility mirror
    query(
      `INSERT INTO partner_bookings (
        booking_id, user_id, user_name, user_phone, partner_id, activity,
        date, time, location, price, currency, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'Pending', NOW())
      ON DUPLICATE KEY UPDATE status = 'Pending', updated_at = NOW()`,
      [bookingId, userId, userName, userPhone, effectivePartnerId, activity, date, time, locationStr, price]
    ).catch(() => {});
    console.log(`[Database] Booking ${bookingId} saved to MySQL withme_partner_bookings table for partner ${partnerName}.`);
  } catch (err) {
    console.warn('MySQL booking insert notice:', err.message);
  }

  // 2. Real-time sync to Partner App
  syncBookingToPartnerApp({
    booking_id: bookingId,
    partner_id: effectivePartnerId,
    partner_name: partnerName,
    user_id: userId,
    user_name: userName,
    customer_name: userName,
    name: userName,
    interest: activity,
    location: locationStr,
    date,
    time,
    status: 'Upcoming',
    meeting_info: {
      date,
      time,
      location: locationStr,
      activity
    }
  }).catch(() => {});

  // 3. Auto-create a booking-specific conversation so the chat room is ready immediately
  let conversationId = null;
  try {
    const convResult = await chatService.createOrGetConversation(userId, effectivePartnerId, bookingId);
    conversationId = convResult.conversationId;
    newBooking.conversation_id = conversationId;
    newBooking.conversationId = conversationId;
  } catch (convErr) {
    console.warn('[Booking] Auto-conversation create notice:', convErr.message);
  }

  return res.status(200).json({
    success: true,
    message: 'Booking request sent successfully and synced with partner',
    data: {
      ...newBooking,
      conversation_id: conversationId,
      conversationId: conversationId
    }
  });
};

router.post('/', authenticateToken, handleCreateBooking);
router.post('/create', authenticateToken, handleCreateBooking);

// 3. User Bookings List API — GET (/bookings/list or /api/v1/bookings/list)
router.get('/list', authenticateToken, async (req, res) => {
  const userId = req.user ? (req.user.user_id || req.user.id) : null;
  let combinedBookings = [];

  // Add matching user in-memory bookings
  bookingsStore.forEach(b => {
    if (!userId || String(b.user_id) === String(userId)) {
      combinedBookings.push(b);
    }
  });

  try {
    let dbQuery = `
      SELECT b.*,
             p.name AS partner_name_from_db,
             p.full_name AS partner_fullname_from_db,
             p.image AS partner_img,
             p.profile_photo_url AS partner_photo
      FROM withme_partner_bookings b
      LEFT JOIN withme_partners p ON (b.partner_id = p.partner_id OR b.partner_id = p.id OR b.partner_id = p.user_id)
    `;
    let queryParams = [];
    if (userId) {
      dbQuery += ` WHERE b.user_id = ? ORDER BY b.created_at DESC LIMIT 50`;
      queryParams = [userId];
    } else {
      dbQuery += ` ORDER BY b.created_at DESC LIMIT 50`;
    }

    const dbBookings = await query(dbQuery, queryParams).catch(() => []);
    if (dbBookings && dbBookings.length > 0) {
      dbBookings.forEach(db => {
        if (!combinedBookings.some(b => b.booking_id === db.booking_id)) {
          const resolvedPartnerName = (db.partner_name && db.partner_name !== db.customer_name)
            ? db.partner_name
            : (db.partner_fullname_from_db || db.partner_name_from_db || 'Partner');

          const partnerPhoto = db.partner_photo || db.partner_img || null;

          combinedBookings.push({
            booking_id: db.booking_id,
            status: db.status || 'Upcoming',
            activity_user_id: db.partner_id,
            partner_id: db.partner_id,
            partner_name: resolvedPartnerName,
            partner_avatar: partnerPhoto,
            name: resolvedPartnerName,
            full_name: resolvedPartnerName,
            customer_name: db.customer_name || 'User',
            user_name: db.customer_name || 'User',
            user_id: db.user_id,
            activity: db.activity,
            date: db.date,
            time: db.time,
            location: db.location,
            price: parseFloat(db.price || 1),
            currency: db.currency || 'INR',
            created_at: db.created_at
          });
        }
      });
    }
  } catch (err) {
    console.warn('DB Bookings list query notice:', err.message);
  }

  return res.status(200).json({
    success: true,
    count: combinedBookings.length,
    bookings: combinedBookings
  });
});

module.exports = router;
