const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

let supportTickets = [];

// 1. Help & Support API — GET & POST
router.get('/help-support', authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    faqs: [
      { id: 1, question: 'How do I complete KYC verification?', answer: 'Go to Profile -> KYC and enter your document details or upload Aadhaar.' },
      { id: 2, question: 'How do partner requests work?', answer: 'Browse recommended partners and tap Send Request to connect.' }
    ],
    your_tickets: supportTickets
  });
});

router.post('/help-support', authenticateToken, (req, res) => {
  const { subject, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({
      success: false,
      message: 'subject and message are required'
    });
  }

  const ticketId = `TK_${Math.floor(1000 + Math.random() * 9000)}`;
  const ticket = {
    ticket_id: ticketId,
    user_id: req.user.id || 'usr_998877',
    subject,
    message,
    status: 'OPEN',
    created_at: new Date().toISOString()
  };

  supportTickets.push(ticket);

  return res.status(200).json({
    success: true,
    message: `Support ticket raised successfully. Ticket ID: ${ticketId}`,
    ticket_id: ticketId,
    ticket
  });
});

// 2. Terms & Conditions API — GET
router.get('/terms-and-conditions', (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      title: 'General Terms & Conditions',
      last_updated: '2026-01-01',
      content: 'By using WitMe App, you agree to our user safety policies, accurate profile information standard, and community engagement rules.'
    }
  });
});

// 3. Logout API — POST
router.post('/logout', authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// 4. Chat API — GET
router.get('/chat', authenticateToken, (req, res) => {
  const { conversation_id } = req.query;

  return res.status(200).json({
    success: true,
    conversation_id: conversation_id || 'conv_default',
    messages: [
      { id: 'msg_1', sender_id: 'usr_202', sender_name: 'Priya Sharma', text: 'Hey Amit! Are you ready for today’s activity?', timestamp: '2026-09-11T10:15:00Z' },
      { id: 'msg_2', sender_id: req.user.id || 'usr_998877', sender_name: req.user.name || 'Amit', text: 'Yes, excited for it!', timestamp: '2026-09-11T10:17:00Z' }
    ]
  });
});

// 5. Call API — GET / POST
router.get('/call', authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    recent_calls: [
      { call_id: 'call_101', partner_name: 'Priya Sharma', call_type: 'VIDEO', duration: '05:32', timestamp: '2026-09-10T18:00:00Z' }
    ]
  });
});

router.post('/call', authenticateToken, (req, res) => {
  const { receiver_id, call_type = 'VIDEO' } = req.body;

  if (!receiver_id) {
    return res.status(400).json({
      success: false,
      message: 'receiver_id is required'
    });
  }

  const callId = `call_${Date.now()}`;

  return res.status(200).json({
    success: true,
    message: 'Call initiated successfully',
    call_id: callId,
    call_type,
    channel_name: `channel_${callId}`,
    agora_rtc_token: 'mock_agora_rtc_token_string_for_webrtc_calling',
    created_at: new Date().toISOString()
  });
});

module.exports = router;
