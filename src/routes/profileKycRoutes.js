const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { query } = require('../config/db');

// Mock Profile Store Fallback
let userProfilesStore = {
  usr_998877: {
    user_id: 'usr_998877',
    name: 'Alex Sharma',
    country_code: '+91',
    phone_number: '7250642635',
    full_phone_number: '+917250642635',
    email: 'alex.sharma@example.com',
    gender: 'Male',
    interested_in_gender: 'Female',
    dob: '1998-05-15',
    bio: 'Enthusiastic explorer and tech lover',
    interests: ['Travel', 'Music', 'Fitness', 'Coding'],
    city: 'Mumbai',
    profile_image: 'http://localhost:5000/uploads/default_avatar.jpg',
    is_photo_verified: true,
    photo_verification_status: 'VERIFIED',
    is_kyc_completed: false,
    kyc_status: 'NOT_VERIFIED'
  }
};

// Handler for getProfile
const handleGetProfile = async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1] ? authHeader.split(' ')[1] : 'mock_token_active';
  const userId = req.user.id || req.user.user_id || 'usr_998877';

  let profileData = userProfilesStore[userId] || {
    user_id: userId,
    name: req.user.name || 'User',
    country_code: req.user.country_code || '+91',
    phone_number: req.user.phone_number || '7250642635',
    full_phone_number: req.user.full_phone_number || '+917250642635',
    email: 'user@example.com',
    gender: 'Male',
    interested_in_gender: 'Female',
    dob: '1998-05-15',
    bio: 'Profile bio',
    city: 'Mumbai',
    profile_image: 'http://localhost:5000/uploads/default_avatar.jpg',
    is_photo_verified: false,
    photo_verification_status: 'NOT_VERIFIED',
    is_kyc_completed: false,
    kyc_status: 'NOT_VERIFIED'
  };

  // Try fetching profile from MySQL Database
  try {
    const dbUsers = await query(`SELECT * FROM users WHERE id = ? OR phone_number = ? LIMIT 1`, [userId, profileData.full_phone_number]);
    if (dbUsers && dbUsers.length > 0) {
      const u = dbUsers[0];
      profileData = {
        ...profileData,
        user_id: u.id,
        name: u.name || profileData.name,
        email: u.email || profileData.email,
        gender: u.gender || profileData.gender,
        interested_in_gender: u.interested_in_gender || profileData.interested_in_gender,
        dob: u.dob || profileData.dob,
        bio: u.bio || profileData.bio,
        city: u.city || profileData.city,
        profile_image: u.profile_image || profileData.profile_image,
        kyc_status: u.kyc_status || profileData.kyc_status,
        is_kyc_completed: u.kyc_status === 'VERIFIED'
      };
    }
  } catch (err) {
    console.warn('MySQL getProfile query notice:', err.message);
  }

  return res.status(200).json({
    success: true,
    api_name: 'getProfile',
    message: 'User profile fetched successfully',
    data: {
      ...profileData,
      is_logged_in: true,
      token: token
    }
  });
};

// 1. getProfile API — GET (/getProfile and /profile)
router.get('/getProfile', authenticateToken, handleGetProfile);
router.get('/profile', authenticateToken, handleGetProfile);

// 2. Profile Edit API — POST / PUT
const handleProfileEdit = async (req, res) => {
  const userId = req.user.id || req.user.user_id || 'usr_998877';
  const existingProfile = userProfilesStore[userId] || {};

  const updatedProfile = {
    ...existingProfile,
    user_id: userId,
    ...req.body,
    updated_at: new Date().toISOString()
  };

  userProfilesStore[userId] = updatedProfile;

  // Update MySQL database if available
  try {
    await query(
      `UPDATE users SET name = ?, email = ?, gender = ?, interested_in_gender = ?, city = ?, bio = ? WHERE id = ?`,
      [
        updatedProfile.name || 'User',
        updatedProfile.email || null,
        updatedProfile.gender || 'Male',
        updatedProfile.interested_in_gender || 'Female',
        updatedProfile.city || null,
        updatedProfile.bio || null,
        userId
      ]
    );
  } catch (err) {
    console.warn('MySQL Profile Update notice:', err.message);
  }

  return res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: updatedProfile
  });
};

router.post('/profile/edit', authenticateToken, handleProfileEdit);
router.put('/profile/edit', authenticateToken, handleProfileEdit);

// 3. KYC Verification API — POST
router.post('/kyc/verify', authenticateToken, async (req, res) => {
  const { document_type, document_number, full_name, dob } = req.body;

  if (!document_type || !document_number) {
    return res.status(400).json({
      success: false,
      message: 'document_type and document_number are required'
    });
  }

  const userId = req.user.id || req.user.user_id || 'usr_998877';
  if (userProfilesStore[userId]) {
    userProfilesStore[userId].kyc_status = 'PENDING_VERIFICATION';
    userProfilesStore[userId].is_kyc_completed = false;
  }

  try {
    await query(`UPDATE users SET kyc_status = 'PENDING_VERIFICATION' WHERE id = ?`, [userId]);
    await query(
      `INSERT INTO kyc_documents (user_id, document_type, document_number, full_name, status) VALUES (?, ?, ?, ?, 'PENDING_VERIFICATION')`,
      [userId, document_type, document_number, full_name]
    );
  } catch (err) {
    console.warn('MySQL KYC submission notice:', err.message);
  }

  return res.status(200).json({
    success: true,
    message: 'KYC documents submitted successfully for verification',
    status: 'PENDING_VERIFICATION',
    is_kyc_completed: false,
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
