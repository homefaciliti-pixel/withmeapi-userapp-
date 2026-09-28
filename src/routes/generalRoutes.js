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

// 2.1 Child Safety Standards API — GET
const handleGeneralChildSafety = (req, res) => {
  const childSafetyData = {
    title: "WithMe24 — Child Safety Standards",
    app_name: "WithMe24",
    effective_date: "2026-09-26",
    last_updated: "2026-09-26",
    support_email: "officalwithme24@withme24.com",
    minimum_age: 18,
    sections: [
      {
        id: 1,
        title: "1. Adults Only",
        content: "WithMe24 is strictly intended for users who are 18 years of age or older. Users under the age of 18 are not permitted to register, create an account, or use WithMe24."
      },
      {
        id: 2,
        title: "2. Child Safety",
        content: "WithMe24 has zero tolerance for child sexual abuse and exploitation (CSAE) and child sexual abuse material (CSAM). We do not permit any content, behavior, or activity that sexually exploits or endangers children."
      },
      {
        id: 3,
        title: "3. Reporting",
        content: "Users can report inappropriate or abusive content or behavior through the reporting functionality available in the WithMe24 application. Reports involving child safety are taken seriously and may result in content removal, account suspension, or account termination."
      },
      {
        id: 4,
        title: "4. Enforcement",
        content: "WithMe24 may take appropriate action against accounts that violate our safety standards, including removing content and suspending or permanently terminating accounts."
      },
      {
        id: 5,
        title: "5. Contact",
        content: "For child-safety concerns or to report suspected child sexual exploitation, please contact us at: Email: officalwithme24@withme24.com"
      },
      {
        id: 6,
        title: "6. Age Restriction",
        content: "WithMe24 is an 18+ service. Individuals under 18 are not eligible to use the service."
      }
    ],
    html_content: `
      <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto;">
        <h1 style="color: #111;">WithMe24 — Child Safety Standards</h1>
        <p style="font-size: 14px; color: #666;"><strong>Last Updated:</strong> September 26, 2026</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        
        <h3>1. Adults Only</h3>
        <p>WithMe24 is strictly intended for users who are <strong>18 years of age or older</strong>. Users under the age of 18 are <strong>not permitted to register, create an account, or use WithMe24</strong>.</p>
        
        <h3>2. Child Safety</h3>
        <p>WithMe24 has zero tolerance for child sexual abuse and exploitation (CSAE) and child sexual abuse material (CSAM). We do not permit any content, behavior, or activity that sexually exploits or endangers children.</p>
        
        <h3>3. Reporting</h3>
        <p>Users can report inappropriate or abusive content or behavior through the reporting functionality available in the WithMe24 application. Reports involving child safety are taken seriously and may result in content removal, account suspension, or account termination.</p>
        
        <h3>4. Enforcement</h3>
        <p>WithMe24 may take appropriate action against accounts that violate our safety standards, including removing content and suspending or permanently terminating accounts.</p>
        
        <h3>5. Contact</h3>
        <p>For child-safety concerns or to report suspected child sexual exploitation, please contact us at:<br><strong>Email:</strong> <a href="mailto:officalwithme24@withme24.com">officalwithme24@withme24.com</a></p>
        <p>We review child-safety reports and take appropriate action in accordance with applicable laws and platform requirements.</p>
        
        <h3>6. Age Restriction</h3>
        <p>WithMe24 is an <strong>18+ service</strong>. Individuals under 18 are not eligible to use the service.</p>
      </div>
    `
  };

  if (req.query && (req.query.format === 'html' || req.query.type === 'html')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(childSafetyData.html_content);
  }

  return res.status(200).json({
    success: true,
    message: "Child Safety Standards policy fetched successfully",
    data: childSafetyData
  });
};

router.get('/child-safety', handleGeneralChildSafety);
router.get('/child-safety-standards', handleGeneralChildSafety);
router.get('/child-safety-policy', handleGeneralChildSafety);

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

// 6. Delete Account API — GET, DELETE & POST
const handleDeleteGeneralAccount = (req, res) => {
  const userId = (req.user && (req.user.user_id || req.user.id)) || (req.query && (req.query.user_id || req.query.id)) || (req.body && (req.body.user_id || req.body.id)) || 'usr_998877';
  const reason = (req.query && (req.query.reason || req.query.delete_reason)) || (req.body && (req.body.reason || req.body.delete_reason)) || 'User requested account deletion';

  return res.status(200).json({
    success: true,
    message: 'Account deleted successfully. All user data, active sessions, and profile records have been permanently removed.',
    data: {
      user_id: userId,
      status: 'DELETED',
      reason: reason,
      deleted_at: new Date().toISOString()
    }
  });
};

router.get('/delete-account', authenticateToken, handleDeleteGeneralAccount);
router.delete('/delete-account', authenticateToken, handleDeleteGeneralAccount);
router.post('/delete-account', authenticateToken, handleDeleteGeneralAccount);
router.get('/delete', authenticateToken, handleDeleteGeneralAccount);
router.delete('/delete', authenticateToken, handleDeleteGeneralAccount);
router.post('/delete', authenticateToken, handleDeleteGeneralAccount);

module.exports = router;
