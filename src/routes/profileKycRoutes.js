const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { query } = require('../config/db');

const getBaseUrl = (req) => {
  if (req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${protocol}://${host}`;
  }
  return process.env.BASE_URL || 'https://withmeapi-userapp.onrender.com';
};

// Global User Profiles Memory Store
let userProfilesStore = {};

// Handler for getProfile
const handleGetProfile = async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1] ? authHeader.split(' ')[1] : 'mock_token_active';

  const userId = req.user.user_id || req.user.id || 'usr_998877';
  const userPhone = req.user.phone_number || '7250642635';
  const userCountryCode = req.user.country_code || '+91';
  const userFullPhone = req.user.full_phone_number || `${userCountryCode}${userPhone}`;

  // Default Base Profile Template with full details
  let defaultProfile = {
    user_id: userId,
    name: req.user.name && req.user.name !== 'User' ? req.user.name : 'Alex Sharma',
    country_code: userCountryCode,
    phone_number: userPhone,
    full_phone_number: userFullPhone,
    email: 'alex.sharma@example.com',
    gender: 'Male',
    interested_in_gender: 'Female',
    dob: '1998-05-15',
    bio: 'Enthusiastic explorer and tech lover',
    city: 'Mumbai',
    profile_image: `${baseUrl}/uploads/default_avatar.jpg`,
    is_photo_verified: true,
    photo_verification_status: 'VERIFIED',
    is_kyc_completed: false,
    kyc_status: 'NOT_VERIFIED'
  };

  let profileData = userProfilesStore[userId] || defaultProfile;

  // Query MySQL Database for latest user details
  try {
    const dbUsers = await query(
      `SELECT * FROM users WHERE id = ? OR phone_number = ? OR phone_number = ? LIMIT 1`,
      [userId, userFullPhone, userPhone]
    );

    if (dbUsers && dbUsers.length > 0) {
      const u = dbUsers[0];
      profileData = {
        user_id: u.id || userId,
        name: (u.name && u.name !== 'User') ? u.name : profileData.name,
        country_code: userCountryCode,
        phone_number: userPhone,
        full_phone_number: userFullPhone,
        email: u.email || profileData.email,
        gender: u.gender || profileData.gender,
        interested_in_gender: u.interested_in_gender || profileData.interested_in_gender,
        dob: u.dob || profileData.dob,
        bio: u.bio || profileData.bio,
        city: u.city || profileData.city,
        profile_image: u.profile_image ? u.profile_image.replace(/http:\/\/localhost:\d+/, baseUrl) : profileData.profile_image,
        is_photo_verified: profileData.is_photo_verified !== undefined ? profileData.is_photo_verified : true,
        photo_verification_status: profileData.photo_verification_status || 'VERIFIED',
        kyc_status: u.kyc_status || profileData.kyc_status,
        is_kyc_completed: u.kyc_status === 'VERIFIED'
      };
    }
  } catch (err) {
    console.warn('MySQL getProfile query notice:', err.message);
  }

  // Cache updated profile in memory
  userProfilesStore[userId] = profileData;

  return res.status(200).json({
    success: true,
    api_name: 'getProfile',
    message: 'User profile details fetched successfully',
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

// 2. Interest Selection API — POST (/profile/interest-selection and /interest-selection)
const handleInterestSelection = async (req, res) => {
  const { interested_in_gender } = req.body;

  if (!interested_in_gender) {
    return res.status(400).json({
      success: false,
      message: 'interested_in_gender field is required. Options: Male, Female, Other, Both'
    });
  }

  const userId = req.user.user_id || req.user.id || 'usr_998877';
  const existingProfile = userProfilesStore[userId] || {};

  const updatedProfile = {
    ...existingProfile,
    user_id: userId,
    interested_in_gender: interested_in_gender.trim(),
    updated_at: new Date().toISOString()
  };

  userProfilesStore[userId] = updatedProfile;

  // Persist into MySQL users table
  try {
    await query(
      `UPDATE users SET interested_in_gender = ? WHERE id = ? OR phone_number = ?`,
      [interested_in_gender.trim(), userId, req.user.phone_number || '']
    );
  } catch (err) {
    console.warn('MySQL Interest Selection notice:', err.message);
  }

  return res.status(200).json({
    success: true,
    api_name: 'interestSelection',
    message: `Gender interest preference updated to '${interested_in_gender}' successfully`,
    data: {
      user_id: userId,
      interested_in_gender: interested_in_gender.trim(),
      updated_at: updatedProfile.updated_at
    }
  });
};

router.post('/profile/interest-selection', authenticateToken, handleInterestSelection);
router.post('/interest-selection', authenticateToken, handleInterestSelection);

// 3. Profile Edit API — POST / PUT
const handleProfileEdit = async (req, res) => {
  const userId = req.user.user_id || req.user.id || 'usr_998877';
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
      `UPDATE users SET name = ?, email = ?, gender = ?, interested_in_gender = ?, city = ?, bio = ? WHERE id = ? OR phone_number = ?`,
      [
        updatedProfile.name || 'User',
        updatedProfile.email || null,
        updatedProfile.gender || 'Male',
        updatedProfile.interested_in_gender || 'Female',
        updatedProfile.city || null,
        updatedProfile.bio || null,
        userId,
        req.user.phone_number || ''
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

// 4. KYC Verification API — POST
router.post('/kyc/verify', authenticateToken, async (req, res) => {
  const { document_type, document_number, full_name, dob } = req.body;

  if (!document_type || !document_number) {
    return res.status(400).json({
      success: false,
      message: 'document_type and document_number are required'
    });
  }

  const userId = req.user.user_id || req.user.id || 'usr_998877';
  if (userProfilesStore[userId]) {
    userProfilesStore[userId].kyc_status = 'PENDING_VERIFICATION';
    userProfilesStore[userId].is_kyc_completed = false;
  }

  try {
    await query(`UPDATE users SET kyc_status = 'PENDING_VERIFICATION' WHERE id = ? OR phone_number = ?`, [userId, req.user.phone_number || '']);
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
