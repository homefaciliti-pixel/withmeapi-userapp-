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
const getApprovedPartnersList = (baseUrl) => [
  {
    id: 101,
    user_id: 'usr_101',
    name: 'Priya',
    city: 'Jaipur',
    rating: 4.8,
    price: 999,
    currency: 'INR',
    price_type: 'session',
    profile_image: `${baseUrl}/uploads/priya.jpg`,
    image: `${baseUrl}/uploads/priya.jpg`,
    avatar: `${baseUrl}/uploads/priya.jpg`,
    profile_images: [
      `${baseUrl}/uploads/priya.jpg`,
      `${baseUrl}/uploads/priya2.jpg`,
      `${baseUrl}/uploads/priya3.jpg`
    ],
    photos: [
      `${baseUrl}/uploads/priya.jpg`,
      `${baseUrl}/uploads/priya2.jpg`,
      `${baseUrl}/uploads/priya3.jpg`
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
    user_id: 'usr_102',
    name: 'Anjali',
    city: 'Jaipur',
    rating: 4.9,
    price: 1199,
    currency: 'INR',
    price_type: 'session',
    profile_image: `${baseUrl}/uploads/ananya.jpg`,
    image: `${baseUrl}/uploads/ananya.jpg`,
    avatar: `${baseUrl}/uploads/ananya.jpg`,
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
  }
];

// 1. Send Request API — POST
router.post('/send', authenticateToken, (req, res) => {
  const baseUrl = getBaseUrl(req);
  const { receiver_id, activity_id, message } = req.body;

  if (!receiver_id) {
    return res.status(400).json({
      success: false,
      message: 'receiver_id is required'
    });
  }

  const newRequest = {
    request_id: `req_${Date.now()}`,
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
    data: newRequest
  });
});

// 2. Request Partner List API — GET (/list, /, /approved, /pending)
const handlePartnerList = (req, res) => {
  const baseUrl = getBaseUrl(req);
  const type = (req.query.type || req.query.status || req.query.filter || '').toLowerCase();
  const approvedPartners = getApprovedPartnersList(baseUrl);

  // If client specifically requests pending list after all have been approved
  if (type === 'pending' || type === 'unapproved') {
    return res.status(200).json({
      success: true,
      message: 'All pending partners have been approved',
      data: {
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
    data: {
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

