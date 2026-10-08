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
  const termsText = `WITHME24 — Terms & Conditions
Last Updated: 2026-10-08

Welcome to WITHME24.
These Terms & Conditions ("Terms") govern your access to and use of the WITHME24 application and related services.
By creating an account or using WITHME24, you agree to these Terms.
If you do not agree with these Terms, please do not use the Platform.

1. About WITHME24
WITHME24 is an experience-based platform that allows users to discover hosts and experiences, view experience information, select available dates and times, and make bookings.
Hosts/partners may list and provide experiences through the Platform.
WITHME24 may provide the technology platform connecting users and hosts.

2. Eligibility
You must meet the minimum age requirement applicable to the Platform.
If WITHME24 is 18+:
You must be at least 18 years old to create an account or use WITHME24.
You are responsible for providing accurate information about your age and identity.

3. Account Registration
When creating an account, you agree to:
- Provide accurate information
- Provide a valid mobile number/email where required
- Keep your account information updated
- Protect your login credentials
- Not share your account with another person
- Not impersonate another person
You are responsible for activity conducted through your account.

4. Profile Information
Users and hosts may create profiles containing information such as:
- Name
- Photograph
- Age
- Location
- Bio
- Interests
- Experience information
You agree that information you provide must be accurate and must not intentionally mislead other users.

5. Host and Experience Listings
Hosts may provide information about their experiences, including:
- Experience title
- Description
- Location
- Date/time availability
- Pricing, where applicable
- Participant limits
- Other relevant information
Hosts are responsible for ensuring that their listings are accurate and lawful.
WITHME24 may remove or restrict listings that violate these Terms or applicable law.

6. Booking Process
The general booking flow may include:
Host/Event → Experience Details → Date/Time → Location → Participants → Booking → Payment → Confirmation
Availability and booking confirmation may depend on the information displayed at the time of booking.
Users should review booking information before confirming a booking.

7. Payment
Where payments are enabled, users may be required to pay the applicable amount shown during the booking process.
Payment status may be displayed in the application.
If the current version uses a mock/static payment system:
The current version of WITHME24 may display a mock/static payment flow for testing purposes. Such mock transactions do not represent actual payments or financial transactions.
For future real payments, separate payment, refund, cancellation, and transaction terms should be added before enabling live payments.

8. Cancellation and Refunds
Cancellation and refund eligibility, where applicable, will depend on the booking terms displayed at the time of booking.
WITHME24 may establish specific cancellation/refund rules for different experiences.
Any applicable refund will be processed according to the applicable policy and payment provider rules.

9. User Conduct
You agree not to:
- Harass, threaten, abuse, or intimidate others
- Create fake accounts
- Impersonate another person
- Provide fraudulent information
- Scam or defraud another user
- Upload illegal content
- Attempt unauthorized access to the Platform
- Misuse another user's personal information
- Circumvent Platform security
- Use the Platform for unlawful purposes

10. Strictly Prohibited Activities
WITHME24 strictly prohibits using the Platform to facilitate or promote:
- Human trafficking
- Child exploitation
- Sexual exploitation
- Prostitution or sexual services
- Forced labor
- Criminal activities
- Illegal services
- Fraud or scams
- Sale or distribution of illegal goods
- Threats or violence
- Other activities prohibited under applicable law
Any account involved in such activities may be immediately suspended or terminated.
Where required by law, information may be provided to appropriate authorities.

11. Safety
Users are responsible for exercising reasonable judgment when interacting with other users or attending an experience.
Users should:
- Meet at appropriate/public locations where appropriate
- Follow applicable safety instructions
- Avoid sharing unnecessary sensitive information
- Report suspicious or unsafe behavior
- Contact appropriate emergency services in an emergency
WITHME24 should not be represented as a replacement for emergency services or law enforcement.

12. Reporting and Blocking
Where these features are available, users may report or block other users or content that violates these Terms.
Reports may be reviewed and appropriate action may include:
- Content removal
- Account restrictions
- Account suspension
- Account termination
- Referral to appropriate authorities where legally required

13. Intellectual Property
The WITHME24 name, logo, software, design, graphics, trademarks, and other platform materials are owned by or licensed to WITHME24 unless otherwise stated.
You may not copy, reproduce, modify, distribute, or commercially exploit these materials without authorization.

14. User Content
You retain responsibility for content you submit to WITHME24.
By submitting content, you confirm that:
- You have the necessary rights to submit it.
- It does not violate applicable law.
- It does not infringe another person's rights.
- It does not contain prohibited or abusive material.
You grant WITHME24 the limited rights necessary to host, display, process, and provide the content as part of the Platform.

15. Privacy
Your use of WITHME24 is also governed by our Privacy Policy.
The Privacy Policy explains how we collect and process personal information.

16. Account Suspension and Termination
WITHME24 may suspend, restrict, or terminate an account if:
- The user violates these Terms.
- The user provides false information.
- The user engages in fraudulent activity.
- The user creates a safety risk.
- The user uses the Platform for illegal activity.
- The user abuses another user.
- Required by law or legitimate legal process.
Users may also request account deletion according to the applicable account deletion process.

17. Availability of the Platform
We aim to keep WITHME24 available and functional, but we do not guarantee uninterrupted availability.
The Platform may occasionally be unavailable because of:
- Maintenance
- Updates
- Technical issues
- Network problems
- Third-party service failures
- Security incidents
- Events outside our reasonable control

18. Third-Party Services
WITHME24 may integrate third-party services such as payment providers, hosting providers, analytics services, maps, notifications, or authentication services.
Third-party services may have their own terms and privacy policies.

19. Limitation of Liability
To the extent permitted by applicable law, WITHME24 will not be responsible for losses resulting from circumstances beyond our reasonable control or from a user's violation of these Terms.
Nothing in these Terms is intended to exclude liability that cannot legally be excluded under applicable law.

20. Changes to These Terms
We may update these Terms from time to time.
Updated Terms will be published through the Platform or our website.
Your continued use of WITHME24 after updated Terms become effective means that you accept the updated Terms, subject to applicable law.

21. Governing Law
These Terms shall be governed by the applicable laws of India.
Any disputes shall be subject to the jurisdiction of the courts having appropriate jurisdiction, subject to applicable law.

22. Contact Us
WITHME24
Email: officalwithme24@withme24.com
Website: www.withme24.com
Address: WITHME24`;

  return res.status(200).json({
    success: true,
    data: {
      title: 'WITHME24 — Terms & Conditions',
      app_name: 'WITHME24',
      last_updated: '2026-10-08',
      version: '1.0',
      support_email: 'officalwithme24@withme24.com',
      website: 'www.withme24.com',
      content: termsText
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
