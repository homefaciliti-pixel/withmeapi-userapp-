const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

const getBaseUrl = (req) => {
  if (req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${protocol}://${host}`;
  }
  return process.env.BASE_URL || 'https://withmeapi-userapp.onrender.com';
};

// Approved partners list generator
const getApprovedPartnersList = (baseUrl, requestedBookingId) => [
  {
    id: 101,
    booking_id: requestedBookingId || 'BK197860',
    request_id: 'req_101',
    user_id: 'usr_101',
    partner_id: 101,
    name: 'Priya',
    full_name: 'Priya Sharma',
    city: 'Jaipur',
    rating: 4.8,
    price: 999,
    currency: 'INR',
    price_type: 'session',
    activity: 'Coffee',
    profile_image: `${baseUrl}/uploads/priya.jpg`,
    image: `${baseUrl}/uploads/priya.jpg`,
    avatar: `${baseUrl}/uploads/priya.jpg`,
    profile_images: [
      `${baseUrl}/uploads/priya.jpg`,
      `${baseUrl}/uploads/priya2.jpg`,
      `${baseUrl}/uploads/priya3.jpg`,
      `${baseUrl}/uploads/priya4.jpg`
    ],
    photos: [
      `${baseUrl}/uploads/priya.jpg`,
      `${baseUrl}/uploads/priya2.jpg`,
      `${baseUrl}/uploads/priya3.jpg`,
      `${baseUrl}/uploads/priya4.jpg`
    ],
    is_verified: true,
    is_approved: true,
    approval_status: 'approved',
    interests: ['Coffee', 'Travel'],
    status: 'approved',
    is_accepted: true,
    request_accepted: true,
    is_request_accepted: true,
    accepted: true,
    request_status: 'accepted'
  },
  {
    id: 102,
    booking_id: requestedBookingId ? `${requestedBookingId}_102` : 'BK197861',
    request_id: 'req_102',
    user_id: 'usr_102',
    partner_id: 102,
    name: 'Anjali',
    full_name: 'Anjali Sharma',
    city: 'Jaipur',
    rating: 4.9,
    price: 1199,
    currency: 'INR',
    price_type: 'session',
    activity: 'Dinner',
    profile_image: `${baseUrl}/uploads/anjali.jpg`,
    image: `${baseUrl}/uploads/anjali.jpg`,
    avatar: `${baseUrl}/uploads/anjali.jpg`,
    profile_images: [
      `${baseUrl}/uploads/anjali.jpg`,
      `${baseUrl}/uploads/ananya.jpg`
    ],
    photos: [
      `${baseUrl}/uploads/anjali.jpg`,
      `${baseUrl}/uploads/ananya.jpg`
    ],
    is_verified: true,
    is_approved: true,
    approval_status: 'approved',
    interests: ['Coffee', 'Events'],
    status: 'approved',
    is_accepted: true,
    request_accepted: true,
    is_request_accepted: true,
    accepted: true,
    request_status: 'accepted'
  },
  {
    id: 103,
    booking_id: requestedBookingId ? `${requestedBookingId}_103` : 'BK197862',
    request_id: 'req_103',
    user_id: 'usr_103',
    partner_id: 103,
    name: 'Riya',
    full_name: 'Riya Mehta',
    city: 'Mumbai',
    rating: 4.8,
    price: 999,
    currency: 'INR',
    price_type: 'session',
    activity: 'Music & Coffee',
    profile_image: `${baseUrl}/uploads/riya.jpg`,
    image: `${baseUrl}/uploads/riya.jpg`,
    avatar: `${baseUrl}/uploads/riya.jpg`,
    profile_images: [
      `${baseUrl}/uploads/riya.jpg`,
      `${baseUrl}/uploads/sneha.jpg`
    ],
    photos: [
      `${baseUrl}/uploads/riya.jpg`,
      `${baseUrl}/uploads/sneha.jpg`
    ],
    is_verified: true,
    is_approved: true,
    approval_status: 'approved',
    interests: ['Music', 'Coffee'],
    status: 'approved',
    is_accepted: true,
    request_accepted: true,
    is_request_accepted: true,
    accepted: true,
    request_status: 'accepted'
  }
];

// 1. Send Request API — POST
router.post('/send', authenticateToken, (req, res) => {
  const baseUrl = getBaseUrl(req);
  const { receiver_id, activity_id, message, booking_id } = req.body;

  if (!receiver_id) {
    return res.status(400).json({
      success: false,
      message: 'receiver_id is required'
    });
  }

  const generatedBookingId = booking_id || `BK${Math.floor(100000 + Math.random() * 900000)}`;

  const newRequest = {
    request_id: `req_${Date.now()}`,
    booking_id: generatedBookingId,
    sender: {
      user_id: req.user.id || 'usr_998877',
      name: req.user.name || 'Amit',
      avatar: `${baseUrl}/uploads/profile.jpg`
    },
    receiver_id,
    activity_id: activity_id || 'act_general',
    message: message || 'Hello, I want to connect for an activity!',
    status: 'APPROVED',
    is_accepted: true,
    accepted: true,
    created_at: new Date().toISOString()
  };

  return res.status(200).json({
    success: true,
    message: 'Partner request sent and approved successfully',
    request_id: newRequest.request_id,
    booking_id: generatedBookingId,
    data: newRequest
  });
});

// 2. Request Partner List API — GET (/list, /, /approved, /pending)
const handlePartnerList = (req, res) => {
  const baseUrl = getBaseUrl(req);
  const type = (req.query.type || req.query.status || req.query.filter || '').toLowerCase();
  const requestedBookingId = req.query.booking_id || req.query.bookingId || 'BK197860';
  const approvedPartners = getApprovedPartnersList(baseUrl, requestedBookingId);

  // If client specifically requests pending list after all have been approved
  if (type === 'pending' || type === 'unapproved') {
    return res.status(200).json({
      success: true,
      message: 'All pending partners have been approved',
      booking_id: requestedBookingId,
      data: {
        booking_id: requestedBookingId,
        partners: [],
        pending_partners: [],
        approved_partners: approvedPartners
      },
      partners: [],
      pending_partners: [],
      approved_partners: approvedPartners,
      count: 0,
      requests: []
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Approved partners fetched successfully',
    booking_id: requestedBookingId,
    data: {
      booking_id: requestedBookingId,
      partners: approvedPartners,
      approved_partners: approvedPartners,
      pending_partners: []
    },
    partners: approvedPartners,
    approved_partners: approvedPartners,
    pending_partners: [],
    count: approvedPartners.length,
    requests: approvedPartners
  });
};

router.get('/list', authenticateToken, handlePartnerList);
router.get('/', authenticateToken, handlePartnerList);
router.get('/approved', authenticateToken, handlePartnerList);
router.get('/approved-partners', authenticateToken, handlePartnerList);
router.get('/pending', authenticateToken, handlePartnerList);
router.get('/pending-partners', authenticateToken, handlePartnerList);

// 3. Approve All / Partner Action API — POST (/action, /approve-all, /approve)
const handlePartnerAction = (req, res) => {
  const baseUrl = getBaseUrl(req);
  const { request_id, action = 'APPROVE' } = req.body;
  const approvedPartners = getApprovedPartnersList(baseUrl);

  return res.status(200).json({
    success: true,
    message: `All pending partners have been approved successfully (${action})`,
    request_id: request_id || 'all',
    status: 'APPROVED',
    is_accepted: true,
    data: {
      partners: approvedPartners,
      approved_partners: approvedPartners
    }
  });
};

router.post('/action', authenticateToken, handlePartnerAction);
router.post('/approve-all', authenticateToken, handlePartnerAction);
router.post('/approve', authenticateToken, handlePartnerAction);

module.exports = router;

