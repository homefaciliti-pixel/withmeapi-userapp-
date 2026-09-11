const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

let partnerRequestsStore = [
  {
    request_id: 'req_5544',
    sender: { user_id: 'usr_202', name: 'Priya Sharma', avatar: 'http://localhost:5000/uploads/priya.jpg' },
    receiver_id: 'usr_998877',
    activity_id: 'act_top1',
    message: 'Hey! Would love to join you for the trek!',
    status: 'PENDING',
    created_at: '2026-09-11T11:00:00Z'
  }
];

// 1. Send Request API — POST
router.post('/send', authenticateToken, (req, res) => {
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
      avatar: 'http://localhost:5000/uploads/profile.jpg'
    },
    receiver_id,
    activity_id: activity_id || 'act_general',
    message: message || 'Hello, I want to connect for an activity!',
    status: 'PENDING',
    created_at: new Date().toISOString()
  };

  partnerRequestsStore.push(newRequest);

  return res.status(200).json({
    success: true,
    message: 'Partner request sent successfully',
    request_id: newRequest.request_id,
    data: newRequest
  });
});

// 2. Request Partner List API — GET
router.get('/list', authenticateToken, (req, res) => {
  const { type = 'received' } = req.query;
  const currentUserId = req.user.id || 'usr_998877';

  let filteredRequests = partnerRequestsStore;
  if (type === 'sent') {
    filteredRequests = partnerRequestsStore.filter(r => r.sender.user_id === currentUserId);
  } else {
    filteredRequests = partnerRequestsStore.filter(r => r.receiver_id === currentUserId);
  }

  return res.status(200).json({
    success: true,
    type,
    count: filteredRequests.length,
    requests: filteredRequests
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

  const targetRequest = partnerRequestsStore.find(r => r.request_id === request_id);
  if (targetRequest) {
    targetRequest.status = action;
  }

  return res.status(200).json({
    success: true,
    message: `Partner request status updated to ${action}`,
    request_id,
    status: action
  });
});

module.exports = router;
