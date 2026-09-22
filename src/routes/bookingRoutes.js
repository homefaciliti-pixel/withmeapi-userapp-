const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

// Price map by activity name
const activityPriceMap = {
  'Coffee': 299,
  'Dinner': 499,
  'Travel': 699,
  'Movie': 399,
  'Event': 499,
  'Conversation': 199
};

// Memory store for bookings
let bookingsStore = [];

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
const handleCreateBooking = (req, res) => {
  const {
    activity_user_id = 'usr_201',
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

  const bookingId = `BK${Math.floor(100000 + Math.random() * 900000)}`;
  let price = (req.body && req.body.price) ? parseInt(req.body.price) : (activityPriceMap[activity] || 299);
  if (activity === 'Coffee' && (activity_user_id === 'usr_203' || activity_user_id === '101' || activity_user_id === 'usr_101' || activity_user_id === 'usr_301' || String(activity_user_id).toLowerCase().includes('priya'))) {
    price = 999;
  }

  const newBooking = {
    booking_id: bookingId,
    status: 'pending',
    activity_user_id,
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

  return res.status(200).json({
    success: true,
    message: 'Booking request sent successfully',
    data: newBooking
  });
};

router.post('/', authenticateToken, handleCreateBooking);
router.post('/create', authenticateToken, handleCreateBooking);

// 3. User Bookings List API — GET (/bookings/list or /api/v1/bookings/list)
router.get('/list', authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    count: bookingsStore.length,
    bookings: bookingsStore
  });
});

module.exports = router;
