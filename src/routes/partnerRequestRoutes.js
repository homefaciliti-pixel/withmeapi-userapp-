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
      name: req.user.name || 'Alex Sharma',
      avatar: `${baseUrl}/uploads/profile.jpg`
    },
    receiver_id,
    activity_id: activity_id || 'act_general',
    message: message || 'Hello, I want to connect for an activity!',
    status: 'PENDING',
    created_at: new Date().toISOString()
  };

  return res.status(200).json({
    success: true,
    message: 'Partner request sent successfully',
    request_id: newRequest.request_id,
    data: newRequest
  });
});

// 2. Request Partner List API — GET
router.get('/list', authenticateToken, (req, res) => {
  const baseUrl = getBaseUrl(req);
  const { type = 'received' } = req.query;

  const partnersList = [
    {
      id: 101,
      name: 'Priya',
      city: 'Jaipur',
      rating: 4.8,
      price: 999,
      currency: 'INR',
      price_type: 'session',
      profile_image: `${baseUrl}/uploads/priya.jpg`,
      is_verified: true,
      interests: ['Coffee', 'Travel'],
      status: 'available'
    },
    {
      id: 102,
      name: 'Anjali',
      city: 'Jaipur',
      rating: 4.9,
      price: 1199,
      currency: 'INR',
      price_type: 'session',
      profile_image: `${baseUrl}/uploads/ananya.jpg`,
      is_verified: true,
      interests: ['Coffee', 'Events'],
      status: 'available'
    }
  ];

  return res.status(200).json({
    success: true,
    message: 'Available partners fetched successfully',
    data: {
      partners: partnersList
    },
    partners: partnersList,
    count: partnersList.length,
    requests: partnersList
  });
});

// 3. Request API (Accept / Reject / Cancel) — POST
router.post('/action', authenticateToken, (req, res) => {
  const { request_id, action } = req.body; // action: ACCEPT, REJECT, CANCEL

  if (!request_id || !action) {
    return res.status(400).json({
      success: false,
      message: 'request_id and action (ACCEPT / REJECT / CANCEL) are required'
    });
  }

  return res.status(200).json({
    success: true,
    message: `Partner request status updated to ${action}`,
    request_id,
    status: action
  });
});

module.exports = router;
