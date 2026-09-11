const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// 1. Send OTP API
router.post('/send-otp', (req, res) => {
  const { country_code = '+91', phone_number } = req.body;

  if (!phone_number) {
    return res.status(400).json({
      success: false,
      message: 'phone_number is required'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'OTP sent successfully',
    data: {
      phone_number: `${country_code}${phone_number}`,
      otp_id: `otp_${Date.now()}`,
      otp_code_for_demo: '123456',
      expires_in_seconds: 300
    }
  });
});

// 2. Verify OTP API
router.post('/verify-otp', (req, res) => {
  const { phone_number, otp_code } = req.body;

  if (!phone_number || !otp_code) {
    return res.status(400).json({
      success: false,
      message: 'phone_number and otp_code are required'
    });
  }

  // Demo validation: any 6 digit OTP or '123456'
  const userPayload = {
    user_id: 'usr_998877',
    phone_number,
    name: 'Alex Sharma'
  };

  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

  return res.status(200).json({
    success: true,
    message: 'OTP verified successfully',
    token,
    user: {
      ...userPayload,
      is_profile_complete: false,
      kyc_status: 'NOT_STARTED'
    }
  });
});

// 3. Resend OTP API
router.post('/resend-otp', (req, res) => {
  const { phone_number } = req.body;

  if (!phone_number) {
    return res.status(400).json({
      success: false,
      message: 'phone_number is required'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'OTP resent successfully',
    data: {
      phone_number,
      otp_code_for_demo: '123456'
    }
  });
});

// 4. Country Code List API
router.get('/country-codes', (req, res) => {
  return res.status(200).json({
    success: true,
    data: [
      { name: 'India', code: 'IN', dial_code: '+91', flag: '🇮🇳' },
      { name: 'United States', code: 'US', dial_code: '+1', flag: '🇺🇸' },
      { name: 'United Arab Emirates', code: 'AE', dial_code: '+971', flag: '🇦🇪' },
      { name: 'United Kingdom', code: 'GB', dial_code: '+44', flag: '🇬🇧' },
      { name: 'Canada', code: 'CA', dial_code: '+1', flag: '🇨🇦' },
      { name: 'Australia', code: 'AU', dial_code: '+61', flag: '🇦🇺' }
    ]
  });
});

// 5. Terms of Service API
router.get('/terms-of-service', (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      title: 'Terms of Service',
      version: '1.0',
      last_updated: '2026-01-01',
      content: 'Welcome to WitMe User App. By creating an account or using our application, you agree to follow our community guidelines, uphold respectful interaction, and comply with all applicable safety standards.'
    }
  });
});

// 6. Privacy Policy API
router.get('/privacy-policy', (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      title: 'Privacy Policy',
      version: '1.0',
      last_updated: '2026-01-01',
      content: 'At WitMe, we prioritize your privacy. We collect phone numbers for authentication, biometric data strictly for KYC verification, and user activity preferences to provide personalized activity recommendations.'
    }
  });
});

module.exports = router;
