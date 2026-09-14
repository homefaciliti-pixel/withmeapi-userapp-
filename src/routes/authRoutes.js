const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { sendOtpSms } = require('../services/smsService');
const { query } = require('../config/db');

// Helper to normalize phone and country code
const parsePhoneAndCountry = (countryCodeInput = '+91', phoneInput = '') => {
  let country_code = countryCodeInput.startsWith('+') ? countryCodeInput : `+${countryCodeInput.trim()}`;
  let phone_number = phoneInput.trim();

  if (phone_number.startsWith('+')) {
    if (phone_number.startsWith('+91')) {
      country_code = '+91';
      phone_number = phone_number.replace('+91', '');
    } else if (phone_number.startsWith('+1')) {
      country_code = '+1';
      phone_number = phone_number.replace('+1', '');
    }
  }

  const full_phone_number = `${country_code}${phone_number}`;

  return { country_code, phone_number, full_phone_number };
};

// 1. Send OTP API
router.post('/send-otp', async (req, res) => {
  const { country_code: rawCountryCode = '+91', phone_number: rawPhone } = req.body;

  if (!rawPhone) {
    return res.status(400).json({
      success: false,
      message: 'phone_number is required'
    });
  }

  const { country_code, phone_number, full_phone_number } = parsePhoneAndCountry(rawCountryCode, rawPhone);
  
  // Generate real random 4-digit OTP for SMS dispatch
  const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
  const otpId = `otp_${Date.now()}`;

  // 1. Save OTP in MySQL database
  try {
    await query(
      `INSERT INTO otp_logs (phone_number, otp_code, otp_id, status) VALUES (?, ?, ?, 'PENDING')`,
      [full_phone_number, generatedOtp, otpId]
    );
  } catch (err) {
    console.warn('Database OTP log notice:', err.message);
  }

  // 2. Dispatch real SMS via SMSGATEWAYHUB DLT Gateway Service
  const smsResult = await sendOtpSms(full_phone_number, generatedOtp);

  return res.status(200).json({
    success: true,
    message: 'OTP sent successfully to your mobile number via SMS',
    data: {
      country_code,
      phone_number,
      full_phone_number,
      otp_id: otpId,
      expires_in_seconds: 600
    }
  });
});

// 2. Verify OTP API
router.post('/verify-otp', async (req, res) => {
  const { country_code: rawCountryCode = '+91', phone_number: rawPhone, otp_code } = req.body;

  if (!rawPhone || !otp_code) {
    return res.status(400).json({
      success: false,
      message: 'phone_number and otp_code are required'
    });
  }

  const { country_code, phone_number, full_phone_number } = parsePhoneAndCountry(rawCountryCode, rawPhone);

  // Validate 4-digit OTP format
  const cleanOtp = otp_code.toString().trim();
  if (cleanOtp.length !== 4) {
    return res.status(400).json({
      success: false,
      message: 'Invalid OTP format. Please enter the 4-digit OTP received on your mobile phone.'
    });
  }

  // Strictly verify against MySQL database (No mock/bypass allowed)
  let isOtpValid = false;

  try {
    const validOtpRows = await query(
      `SELECT * FROM otp_logs WHERE (phone_number = ? OR phone_number = ?) AND otp_code = ? AND status = 'PENDING' ORDER BY id DESC LIMIT 1`,
      [phone_number, full_phone_number, cleanOtp]
    );

    if (validOtpRows && validOtpRows.length > 0) {
      isOtpValid = true;
      // Mark OTP as used
      await query(`UPDATE otp_logs SET status = 'VERIFIED' WHERE id = ?`, [validOtpRows[0].id]);
    }
  } catch (err) {
    console.warn('MySQL OTP Verification notice:', err.message);
  }

  if (!isOtpValid) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired 4-digit OTP code.'
    });
  }

  const userId = `usr_${Date.now()}`;
  let userPayload = {
    user_id: 'usr_998877',
    country_code,
    phone_number,
    full_phone_number,
    name: 'Alex Sharma'
  };

  // MySQL User Lookup / Registration
  try {
    const existingUsers = await query(`SELECT * FROM users WHERE phone_number = ? OR phone_number = ?`, [phone_number, full_phone_number]);
    if (existingUsers && existingUsers.length > 0) {
      userPayload = {
        user_id: existingUsers[0].id,
        country_code,
        phone_number: existingUsers[0].phone_number,
        full_phone_number,
        name: existingUsers[0].name
      };
    } else {
      await query(
        `INSERT INTO users (id, phone_number, name) VALUES (?, ?, 'User')`,
        [userId, full_phone_number]
      );
      userPayload.user_id = userId;
    }
  } catch (err) {
    console.warn('MySQL User Query notice:', err.message);
  }

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
router.post('/resend-otp', async (req, res) => {
  const { country_code: rawCountryCode = '+91', phone_number: rawPhone } = req.body;

  if (!rawPhone) {
    return res.status(400).json({
      success: false,
      message: 'phone_number is required'
    });
  }

  const { country_code, phone_number, full_phone_number } = parsePhoneAndCountry(rawCountryCode, rawPhone);
  const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
  const otpId = `otp_${Date.now()}`;

  try {
    await query(
      `INSERT INTO otp_logs (phone_number, otp_code, otp_id, status) VALUES (?, ?, ?, 'PENDING')`,
      [full_phone_number, generatedOtp, otpId]
    );
  } catch (err) {
    console.warn('Database OTP log notice:', err.message);
  }

  const smsResult = await sendOtpSms(full_phone_number, generatedOtp);

  return res.status(200).json({
    success: true,
    message: 'OTP resent successfully to your mobile number via SMS',
    data: {
      country_code,
      phone_number,
      full_phone_number,
      otp_id: otpId
    }
  });
});

// 4. Country Code List API — GET
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
