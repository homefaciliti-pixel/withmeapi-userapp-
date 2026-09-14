const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// 1. Aadhaar Send OTP API — POST
router.post('/send-otp', authenticateToken, (req, res) => {
  const { aadhaar_number } = req.body;

  if (!aadhaar_number || aadhaar_number.length !== 12) {
    return res.status(400).json({
      success: false,
      message: 'Valid 12-digit Aadhaar number is required'
    });
  }

  const refId = `adh_ref_${Date.now()}`;

  return res.status(200).json({
    success: true,
    message: 'OTP sent to mobile number registered with Aadhaar',
    ref_id: refId,
    expires_in_seconds: 300
  });
});

// 2. Aadhaar OTP Verify API — POST
router.post('/otp-verify', authenticateToken, (req, res) => {
  const { ref_id, otp } = req.body;

  if (!ref_id || !otp) {
    return res.status(400).json({
      success: false,
      message: 'ref_id and otp are required'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Aadhaar verification completed successfully',
    aadhaar_status: 'VERIFIED',
    details: {
      ref_id,
      name: req.user.name || 'Alex Sharma',
      masked_aadhaar: 'XXXXXXXX9012',
      gender: 'Male',
      dob: '1998-05-15',
      address: 'Mumbai, Maharashtra - 400001'
    }
  });
});

// 3. Upload Aadhaar Document API — POST
router.post(
  '/upload',
  authenticateToken,
  upload.fields([
    { name: 'front_image', maxCount: 1 },
    { name: 'back_image', maxCount: 1 }
  ]),
  (req, res) => {
    const frontFile = req.files && req.files['front_image'] ? req.files['front_image'][0] : null;
    const backFile = req.files && req.files['back_image'] ? req.files['back_image'][0] : null;

    return res.status(200).json({
      success: true,
      message: 'Aadhaar documents uploaded successfully',
      front_url: frontFile ? `/uploads/${frontFile.filename}` : '/uploads/mock_aadhaar_front.jpg',
      back_url: backFile ? `/uploads/${backFile.filename}` : '/uploads/mock_aadhaar_back.jpg',
      status: 'UNDER_REVIEW'
    });
  }
);

module.exports = router;
