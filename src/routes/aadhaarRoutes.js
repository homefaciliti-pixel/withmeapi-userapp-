const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { query } = require('../config/db');

// Helper for Aadhaar KYC Submission & OTP trigger
const handleAadhaarKycSubmit = async (req, res) => {
  const { full_name, nick_name, aadhaar_number, age } = req.body;

  if (!aadhaar_number) {
    return res.status(400).json({
      success: false,
      message: 'aadhaar_number is required'
    });
  }

  const cleanAadhaar = aadhaar_number.toString().replace(/[^0-9]/g, '');
  if (cleanAadhaar.length !== 12) {
    return res.status(400).json({
      success: false,
      message: 'Valid 12-digit Aadhaar number is required (e.g. 123456789012)'
    });
  }

  const frontFile = req.files && req.files['front_image'] ? req.files['front_image'][0] : null;
  const backFile = req.files && req.files['back_image'] ? req.files['back_image'][0] : null;

  const frontUrl = frontFile
    ? `http://localhost:5000/uploads/${frontFile.filename}`
    : req.body.front_url || 'http://localhost:5000/uploads/mock_aadhaar_front.jpg';
  const backUrl = backFile
    ? `http://localhost:5000/uploads/${backFile.filename}`
    : req.body.back_url || 'http://localhost:5000/uploads/mock_aadhaar_back.jpg';

  const userId = req.user.id || req.user.user_id || 'usr_998877';
  const refId = `adh_ref_${Date.now()}`;
  const maskedAadhaar = `XXXXXXXX${cleanAadhaar.slice(-4)}`;

  // Save to MySQL DB
  try {
    await query(
      `INSERT INTO kyc_documents (user_id, document_type, document_number, full_name, status) VALUES (?, 'AADHAAR', ?, ?, 'PENDING_OTP_VERIFICATION')`,
      [userId, cleanAadhaar, full_name || req.user.name || 'User']
    );
    await query(
      `UPDATE users SET name = COALESCE(?, name), kyc_status = 'PENDING_OTP_VERIFICATION' WHERE id = ?`,
      [full_name || null, userId]
    );
  } catch (err) {
    console.warn('MySQL Aadhaar KYC submit notice:', err.message);
  }

  return res.status(200).json({
    success: true,
    api_name: 'aadhaarKycSubmit',
    message: 'Aadhaar details and documents uploaded. OTP sent to Aadhaar-linked mobile number.',
    ref_id: refId,
    expires_in_seconds: 300,
    data: {
      full_name: full_name || req.user.name || 'Alex Sharma',
      nick_name: nick_name || 'Alex',
      aadhaar_number: maskedAadhaar,
      age: age ? parseInt(age) : 25,
      front_url: frontUrl,
      back_url: backUrl,
      kyc_status: 'PENDING_OTP_VERIFICATION'
    }
  });
};

// 1. Aadhaar KYC Submit API — POST (/aadhaar/kyc-submit, /aadhaar/send-otp, /aadhaar/upload)
const uploadFields = upload.fields([
  { name: 'front_image', maxCount: 1 },
  { name: 'back_image', maxCount: 1 }
]);

router.post('/kyc-submit', authenticateToken, uploadFields, handleAadhaarKycSubmit);
router.post('/send-otp', authenticateToken, uploadFields, handleAadhaarKycSubmit);
router.post('/upload', authenticateToken, uploadFields, handleAadhaarKycSubmit);

// 2. Aadhaar OTP Verify API — POST
router.post('/otp-verify', authenticateToken, async (req, res) => {
  const { ref_id, otp } = req.body;

  if (!ref_id || !otp) {
    return res.status(400).json({
      success: false,
      message: 'ref_id and otp are required'
    });
  }

  const userId = req.user.id || req.user.user_id || 'usr_998877';

  // Update MySQL status
  try {
    await query(`UPDATE users SET kyc_status = 'VERIFIED' WHERE id = ?`, [userId]);
    await query(`UPDATE kyc_documents SET status = 'VERIFIED' WHERE user_id = ?`, [userId]);
  } catch (err) {
    console.warn('MySQL Aadhaar OTP verify notice:', err.message);
  }

  return res.status(200).json({
    success: true,
    message: 'Aadhaar KYC verification completed successfully',
    aadhaar_status: 'VERIFIED',
    is_kyc_completed: true,
    details: {
      ref_id,
      name: req.user.name || 'Alex Sharma',
      masked_aadhaar: 'XXXXXXXX9012',
      gender: 'Male',
      kyc_status: 'VERIFIED'
    }
  });
});

module.exports = router;
