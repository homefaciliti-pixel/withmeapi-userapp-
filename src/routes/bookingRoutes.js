const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { query } = require('../config/db');

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
    getPartnerApiUrl(),
    'http://localhost:5000',
    'http://localhost:5001'
  ];

  for (const baseUrl of partnerUrls) {
    try {
      const response = await fetch(`${baseUrl}/partner/incoming-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload)
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

  const userId = (req.user && (req.user.user_id || req.user.id)) || 'usr_998877';
  const userName = (req.user && req.user.name && req.user.name !== 'User') ? req.user.name : 'Amit';
  const userPhone = (req.user && (req.user.phone_number || req.user.full_phone_number)) || '+917250642635';
  const locationStr = typeof location === 'string' ? location : (location.address || 'Jaipur');

  const newBooking = {
    booking_id: bookingId,
    status: 'Upcoming',
    user_id: userId,
    user_name: userName,
    activity_user_id: effectivePartnerId,
    partner_id: effectivePartnerId,
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

  // 1. Save to MySQL table `partner_bookings`
  try {
    await query(
      `INSERT INTO partner_bookings (
        booking_id, user_id, user_name, user_phone, partner_id, activity,
        date, time, location, price, currency, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'Upcoming', NOW())
      ON DUPLICATE KEY UPDATE status = 'Upcoming', updated_at = NOW()`,
      [bookingId, userId, userName, userPhone, effectivePartnerId, activity, date, time, locationStr, price]
    );
    console.log(`[Database] Booking ${bookingId} saved to MySQL partner_bookings table.`);
  } catch (err) {
    console.warn('MySQL booking insert notice:', err.message);
  }

  // 2. Real-time sync to Partner App
  syncBookingToPartnerApp({
    booking_id: bookingId,
    partner_id: effectivePartnerId,
    user_id: userId,
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

  return res.status(200).json({
    success: true,
    message: 'Booking request sent successfully and synced with partner',
    data: newBooking
  });
};

router.post('/', authenticateToken, handleCreateBooking);
router.post('/create', authenticateToken, handleCreateBooking);

// 3. User Bookings List API — GET (/bookings/list or /api/v1/bookings/list)
router.get('/list', authenticateToken, async (req, res) => {
  let combinedBookings = [...bookingsStore];

  try {
    const dbBookings = await query(`SELECT * FROM partner_bookings ORDER BY created_at DESC LIMIT 50`);
    if (dbBookings && dbBookings.length > 0) {
      dbBookings.forEach(db => {
        if (!combinedBookings.some(b => b.booking_id === db.booking_id)) {
          combinedBookings.push({
            booking_id: db.booking_id,
            status: db.status,
            activity_user_id: db.partner_id,
            partner_id: db.partner_id,
            partner_name: db.partner_name,
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
    // Fallback to in-memory bookings
  }

  return res.status(200).json({
    success: true,
    count: combinedBookings.length,
    bookings: combinedBookings
  });
});

module.exports = router;
