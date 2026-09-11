const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

// Mock User Database Store
let userProfiles = {
  usr_998877: {
    id: 'usr_998877',
    name: 'Alex Sharma',
    phone: '+919876543210',
    email: 'alex.sharma@example.com',
    gender: 'Male',
    dob: '1998-05-15',
    bio: 'Enthusiastic explorer and tech lover',
    interests: ['Travel', 'Music', 'Fitness', 'Coding'],
    city: 'Mumbai',
    kyc_status: 'VERIFIED',
    profile_image: 'http://localhost:5000/uploads/default_avatar.jpg'
  }
};

// 1. Profile API — GET
router.get('/profile', authenticateToken, (req, res) => {
  const userId = req.user.id || req.user.user_id || 'usr_998877';
  const profile = userProfiles[userId] || {
    id: userId,
    name: req.user.name || 'User',
    phone: req.user.phone_number || '+919876543210',
    email: 'user@example.com',
    kyc_status: 'NOT_STARTED'
  };

  return res.status(200).json({
    success: true,
    data: profile
  });
});

// 2. Profile Edit API — POST / PUT
const handleProfileEdit = (req, res) => {
  const userId = req.user.id || req.user.user_id || 'usr_998877';
  const existingProfile = userProfiles[userId] || {};

  const updatedProfile = {
    ...existingProfile,
    id: userId,
    ...req.body,
    updated_at: new Date().toISOString()
  };

  userProfiles[userId] = updatedProfile;

  return res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: updatedProfile
  });
};

router.post('/profile/edit', authenticateToken, handleProfileEdit);
router.put('/profile/edit', authenticateToken, handleProfileEdit);

// 3. KYC Verification API — POST
router.post('/kyc/verify', authenticateToken, (req, res) => {
  const { document_type, document_number, full_name, dob } = req.body;

  if (!document_type || !document_number) {
    return res.status(400).json({
      success: false,
      message: 'document_type and document_number are required'
    });
  }

  const userId = req.user.id || req.user.user_id || 'usr_998877';
  if (userProfiles[userId]) {
    userProfiles[userId].kyc_status = 'PENDING_VERIFICATION';
  }

  return res.status(200).json({
    success: true,
    message: 'KYC documents submitted successfully for verification',
    status: 'PENDING_VERIFICATION',
    kyc_id: `kyc_${Date.now()}`,
    submitted_data: {
      document_type,
      document_number_masked: document_number.slice(-4).padStart(document_number.length, '*'),
      full_name,
      dob
    }
  });
});

module.exports = router;
