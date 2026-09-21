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

// Detailed User Profiles Catalog Mock Store
const detailedProfilesCatalog = {
  usr_203: {
    id: 'usr_203',
    name: 'Priya Sharma',
    age: 25,
    gender: 'Female',
    verified: true,
    location: {
      city: 'Jaipur',
      state: 'Rajasthan',
      country: 'India'
    },
    rating: 4.8,
    total_reviews: 120,
    about: 'Friendly, outgoing and loves exploring new places and meeting people.',
    interests: [
      { name: 'Coffee', icon: 'coffee' },
      { name: 'Travel', icon: 'flight' },
      { name: 'Music', icon: 'music_note' }
    ],
    available_for: [
      { name: 'Coffee', icon: 'coffee', price: 299, currency: 'INR' },
      { name: 'Dinner', icon: 'restaurant', price: 499, currency: 'INR' },
      { name: 'Travel', icon: 'flight', price: 699, currency: 'INR' }
    ]
  },
  usr_404: {
    id: 'usr_404',
    name: 'Rohan Mehta',
    age: 26,
    gender: 'Male',
    verified: true,
    location: {
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India'
    },
    rating: 4.9,
    total_reviews: 145,
    about: 'Tech enthusiast, guitarist and outdoor trekker.',
    interests: [
      { name: 'Trekking', icon: 'hiking' },
      { name: 'Coding', icon: 'code' },
      { name: 'Guitar', icon: 'music_note' }
    ],
    available_for: [
      { name: 'Trekking', icon: 'hiking', price: 499, currency: 'INR' },
      { name: 'Coffee & Code', icon: 'coffee', price: 299, currency: 'INR' }
    ]
  }
};

// Handler for getProfile & Combined Profile Data
const handleGetProfile = async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1] ? authHeader.split(' ')[1] : 'mock_token_active';

  const userId = req.user.user_id || req.user.id || 'usr_998877';
  const rawPhone = (req.user.phone_number || '7250642635').toString();
  const userPhone = rawPhone.replace(/^\+91/, '');
  const userCountryCode = req.user.country_code || '+91';
  const userFullPhone = rawPhone.startsWith('+') ? rawPhone : `${userCountryCode}${userPhone}`;

  const imageList = [
    `${baseUrl}/uploads/profile1.jpg`,
    `${baseUrl}/uploads/profile2.jpg`,
    `${baseUrl}/uploads/profile3.jpg`
  ];

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
    profile_image: imageList[0],
    profile_images: imageList,
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
        profile_images: imageList,
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

  const detailedData = {
    location: {
      city: profileData.city || 'Mumbai',
      state: 'Maharashtra',
      country: 'India'
    },
    rating: 4.8,
    total_reviews: 120,
    about: profileData.bio || 'Friendly, outgoing and loves exploring new places and meeting people.',
    interests: [
      { name: 'Coffee', icon: 'coffee' },
      { name: 'Travel', icon: 'flight' },
      { name: 'Music', icon: 'music_note' }
    ],
    available_for: [
      { name: 'Coffee', icon: 'coffee', price: 299, currency: 'INR' },
      { name: 'Dinner', icon: 'restaurant', price: 499, currency: 'INR' },
      { name: 'Travel', icon: 'flight', price: 699, currency: 'INR' }
    ]
  };

  const combinedData = {
    ...profileData,
    ...detailedData,
    is_logged_in: true,
    token: token
  };

  return res.status(200).json({
    success: true,
    api_name: 'getProfileCombined',
    message: 'User profile and KYC details fetched successfully',
    data: combinedData,
    profile: profileData,
    detailed_profile: {
      id: profileData.user_id,
      name: profileData.name,
      age: 26,
      gender: profileData.gender,
      verified: profileData.is_photo_verified,
      location: detailedData.location,
      rating: detailedData.rating,
      total_reviews: detailedData.total_reviews,
      profile_image: profileData.profile_images,
      about: detailedData.about,
      interests: detailedData.interests,
      available_for: detailedData.available_for
    },
    interest_selection: {
      interested_in_gender: profileData.interested_in_gender || 'Female'
    },
    kyc_verification: {
      is_kyc_completed: profileData.is_kyc_completed,
      kyc_status: profileData.kyc_status
    }
  });
};

// 2.0 Combined All-In-One Profile & KYC GET API
router.get('/profile/all-in-one', authenticateToken, handleGetProfile);
router.get('/profile/combined', authenticateToken, handleGetProfile);
router.get('/profile/dashboard', authenticateToken, handleGetProfile);
router.get('/profile/full-details', authenticateToken, handleGetProfile);

// 1. getProfile API — GET (/getProfile and /profile)
router.get('/getProfile', authenticateToken, handleGetProfile);
router.get('/profile', authenticateToken, handleGetProfile);

// 2. Profile Details API (With Profile Image List array & available_for) — GET
const handleDetailedProfileView = (req, res) => {
  const baseUrl = getBaseUrl(req);
  const targetId = req.params.id || req.query.id || 'usr_203';
  const catalog = detailedProfilesCatalog[targetId] || detailedProfilesCatalog['usr_203'];

  const profileImagesList = [
    `${baseUrl}/uploads/priya.jpg`,
    `${baseUrl}/uploads/ananya.jpg`,
    `${baseUrl}/uploads/user101.jpg`
  ];

  return res.status(200).json({
    success: true,
    message: 'Profile details fetched successfully',
    data: {
      id: catalog.id,
      name: catalog.name,
      age: catalog.age,
      gender: catalog.gender,
      verified: catalog.verified,
      location: catalog.location,
      rating: catalog.rating,
      total_reviews: catalog.total_reviews,
      profile_image: profileImagesList,
      about: catalog.about,
      interests: catalog.interests,
      available_for: catalog.available_for
    }
  });
};

router.get('/profile/details/:id', authenticateToken, handleDetailedProfileView);
router.get('/profile/details', authenticateToken, handleDetailedProfileView);
router.get('/user-details/:id', authenticateToken, handleDetailedProfileView);

// 3. Interest Selection API — POST (/profile/interest-selection and /interest-selection)
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

// 4. Combined Profile Edit / Update API (Handles Profile Fields, Interest Selection & KYC Submit in 1 Call) — POST / PUT
const handleProfileEditCombined = async (req, res) => {
  const userId = req.user.user_id || req.user.id || 'usr_998877';
  const existingProfile = userProfilesStore[userId] || {};

  const {
    name,
    email,
    gender,
    interested_in_gender,
    dob,
    bio,
    city,
    document_type,
    document_number,
    full_name
  } = req.body;

  let kycSubmitted = false;
  let kycDetails = null;

  const updatedInterestedIn = interested_in_gender ? interested_in_gender.trim() : existingProfile.interested_in_gender || 'Female';

  if (document_type && document_number) {
    kycSubmitted = true;
    kycDetails = {
      document_type,
      document_number_masked: document_number.slice(-4).padStart(document_number.length, '*'),
      full_name: full_name || name || existingProfile.name || 'User',
      status: 'PENDING_VERIFICATION'
    };

    try {
      await query(`UPDATE users SET kyc_status = 'PENDING_VERIFICATION' WHERE id = ? OR phone_number = ?`, [userId, req.user.phone_number || '']);
      await query(
        `INSERT INTO kyc_documents (user_id, document_type, document_number, full_name, status) VALUES (?, ?, ?, ?, 'PENDING_VERIFICATION')`,
        [userId, document_type, document_number, full_name || name || 'User']
      );
    } catch (err) {
      console.warn('MySQL Combined KYC notice:', err.message);
    }
  }

  const updatedProfile = {
    ...existingProfile,
    user_id: userId,
    ...(name && { name }),
    ...(email && { email }),
    ...(gender && { gender }),
    interested_in_gender: updatedInterestedIn,
    ...(dob && { dob }),
    ...(bio && { bio }),
    ...(city && { city }),
    ...(kycSubmitted && { kyc_status: 'PENDING_VERIFICATION', is_kyc_completed: false }),
    updated_at: new Date().toISOString()
  };

  userProfilesStore[userId] = updatedProfile;

  // Update MySQL database if available
  try {
    await query(
      `UPDATE users SET name = ?, email = ?, gender = ?, interested_in_gender = ?, city = ?, bio = ?${kycSubmitted ? ", kyc_status = 'PENDING_VERIFICATION'" : ''} WHERE id = ? OR phone_number = ?`,
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
    message: 'Profile details updated successfully',
    data: updatedProfile,
    ...(kycSubmitted && { kyc_submission: kycDetails })
  });
};

router.post('/profile/edit', authenticateToken, handleProfileEditCombined);
router.put('/profile/edit', authenticateToken, handleProfileEditCombined);
router.post('/profile/combined-update', authenticateToken, handleProfileEditCombined);
router.post('/profile/update-all', authenticateToken, handleProfileEditCombined);

// 5. KYC Verification API — POST
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
