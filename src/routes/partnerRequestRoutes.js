const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

const getBaseUrl = (req) => {
  if (req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${protocol}://${host}`;
  }
  return process.env.BASE_URL || 'https://withmeapi-userapp.onrender.com';
};

// Approved partners list generator
const getApprovedPartnersList = (baseUrl, requestedBookingId) => [
  {
    id: 101,
    booking_id: requestedBookingId || 'BK197860',
    request_id: 'req_101',
    user_id: 'usr_101',
    partner_id: 101,
    name: 'Priya',
    full_name: 'Priya Sharma',
    city: 'Jaipur',
    rating: 4.8,
    price: 1,
    currency: 'INR',
    price_type: 'session',
    activity: 'Coffee',
    profile_image: `${baseUrl}/uploads/priya.jpg`,
    image: `${baseUrl}/uploads/priya.jpg`,
    avatar: `${baseUrl}/uploads/priya.jpg`,
    profile_images: [
      `${baseUrl}/uploads/priya.jpg`,
      `${baseUrl}/uploads/priya2.jpg`,
      `${baseUrl}/uploads/priya3.jpg`,
      `${baseUrl}/uploads/priya4.jpg`
    ],
    photos: [
      `${baseUrl}/uploads/priya.jpg`,
      `${baseUrl}/uploads/priya2.jpg`,
      `${baseUrl}/uploads/priya3.jpg`,
      `${baseUrl}/uploads/priya4.jpg`
    ],
    is_verified: true,
    is_approved: true,
    approval_status: 'approved',
    interests: ['Coffee', 'Travel'],
    status: 'approved',
    is_accepted: true,
    request_accepted: true,
    is_request_accepted: true,
    accepted: true,
    request_status: 'accepted'
  },
  {
    id: 102,
    booking_id: requestedBookingId ? `${requestedBookingId}_102` : 'BK197861',
    request_id: 'req_102',
    user_id: 'usr_102',
    partner_id: 102,
    name: 'Anjali',
    full_name: 'Anjali Sharma',
    city: 'Jaipur',
    rating: 4.9,
    price: 1199,
    currency: 'INR',
    price_type: 'session',
    activity: 'Dinner',
    profile_image: `${baseUrl}/uploads/anjali.jpg`,
    image: `${baseUrl}/uploads/anjali.jpg`,
    avatar: `${baseUrl}/uploads/anjali.jpg`,
    profile_images: [
      `${baseUrl}/uploads/anjali.jpg`,
      `${baseUrl}/uploads/ananya.jpg`
    ],
    photos: [
      `${baseUrl}/uploads/anjali.jpg`,
      `${baseUrl}/uploads/ananya.jpg`
    ],
    is_verified: true,
    is_approved: true,
    approval_status: 'approved',
    interests: ['Coffee', 'Events'],
    status: 'approved',
    is_accepted: true,
    request_accepted: true,
    is_request_accepted: true,
    accepted: true,
    request_status: 'accepted'
  },
  {
    id: 103,
    booking_id: requestedBookingId ? `${requestedBookingId}_103` : 'BK197862',
    request_id: 'req_103',
    user_id: 'usr_103',
    partner_id: 103,
    name: 'Riya',
    full_name: 'Riya Mehta',
    city: 'Mumbai',
    rating: 4.8,
    price: 999,
    currency: 'INR',
    price_type: 'session',
    activity: 'Music & Coffee',
    profile_image: `${baseUrl}/uploads/riya.jpg`,
    image: `${baseUrl}/uploads/riya.jpg`,
    avatar: `${baseUrl}/uploads/riya.jpg`,
    profile_images: [
      `${baseUrl}/uploads/riya.jpg`,
      `${baseUrl}/uploads/sneha.jpg`
    ],
    photos: [
      `${baseUrl}/uploads/riya.jpg`,
      `${baseUrl}/uploads/sneha.jpg`
    ],
    is_verified: true,
    is_approved: true,
    approval_status: 'approved',
    interests: ['Music', 'Coffee'],
    status: 'approved',
    is_accepted: true,
    request_accepted: true,
    is_request_accepted: true,
    accepted: true,
    request_status: 'accepted'
  }
];

// 1. Send Request API — POST
router.post('/send', authenticateToken, (req, res) => {
  const baseUrl = getBaseUrl(req);
  const { receiver_id, activity_id, message, booking_id } = req.body;

  if (!receiver_id) {
    return res.status(400).json({
      success: false,
      message: 'receiver_id is required'
    });
  }

  const generatedBookingId = booking_id || `BK${Math.floor(100000 + Math.random() * 900000)}`;

  const newRequest = {
    request_id: `req_${Date.now()}`,
    booking_id: generatedBookingId,
    sender: {
      user_id: req.user.id || 'usr_998877',
      name: req.user.name || 'Amit',
      avatar: `${baseUrl}/uploads/profile.jpg`
    },
    receiver_id,
    activity_id: activity_id || 'act_general',
    message: message || 'Hello, I want to connect for an activity!',
    status: 'APPROVED',
    is_accepted: true,
    accepted: true,
    created_at: new Date().toISOString()
  };

  return res.status(200).json({
    success: true,
    message: 'Partner request sent and approved successfully',
    request_id: newRequest.request_id,
    booking_id: generatedBookingId,
    data: newRequest
  });
});

// Partner Request Details Resolver
const getPartnerRequestDetails = (targetId = '101', baseUrl = 'https://withmeapi-userapp.onrender.com', requestedBookingId) => {
  const cleanId = String(targetId || '101').trim().toLowerCase();
  const effectiveBookingId = requestedBookingId || 'BK197860';

  // 1. Priya (101, req_101, usr_101, usr_203, priya, BK197860)
  if (cleanId === '101' || cleanId === 'req_101' || cleanId === 'usr_101' || cleanId === 'usr_203' || cleanId.includes('priya') || cleanId.includes('197860')) {
    return {
      id: 101,
      request_id: 'req_101',
      booking_id: effectiveBookingId,
      user_id: 'usr_203',
      partner_id: 101,
      name: 'Priya',
      full_name: 'Priya Sharma',
      age: 23,
      gender: 'Female',
      city: 'Jaipur',
      location: {
        city: 'Jaipur',
        state: 'Rajasthan',
        country: 'India',
        address: 'Malviya Nagar, Jaipur, Rajasthan'
      },
      rating: 4.8,
      total_reviews: 120,
      price: 1,
      currency: 'INR',
      price_type: 'session',
      activity: 'Coffee',
      activity_id: 'cat_01',
      about: 'Friendly, outgoing and loves exploring new places, coffee meetups, and meeting people.',
      is_verified: true,
      is_approved: true,
      approval_status: 'approved',
      status: 'approved',
      is_accepted: true,
      request_accepted: true,
      is_request_accepted: true,
      accepted: true,
      request_status: 'accepted',
      profile_image: `${baseUrl}/uploads/priya.jpg`,
      image: `${baseUrl}/uploads/priya.jpg`,
      avatar: `${baseUrl}/uploads/priya.jpg`,
      profile_images: [
        `${baseUrl}/uploads/priya.jpg`,
        `${baseUrl}/uploads/priya2.jpg`,
        `${baseUrl}/uploads/priya3.jpg`,
        `${baseUrl}/uploads/priya4.jpg`
      ],
      photos: [
        `${baseUrl}/uploads/priya.jpg`,
        `${baseUrl}/uploads/priya2.jpg`,
        `${baseUrl}/uploads/priya3.jpg`,
        `${baseUrl}/uploads/priya4.jpg`
      ],
      interests: ['Coffee', 'Travel', 'Music'],
      available_for: [
        { name: 'Coffee', icon: 'coffee', price: 1, currency: 'INR' },
        { name: 'Dinner', icon: 'restaurant', price: 499, currency: 'INR' },
        { name: 'Travel', icon: 'flight', price: 699, currency: 'INR' }
      ],
      sender: {
        user_id: 'usr_998877',
        name: 'Amit',
        avatar: `${baseUrl}/uploads/profile.jpg`
      },
      message: 'Hello, I want to connect for a coffee meetup!',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // 2. Anjali (102, req_102, usr_102, anjali, BK197861)
  if (cleanId === '102' || cleanId === 'req_102' || cleanId === 'usr_102' || cleanId.includes('anjali') || cleanId.includes('197861')) {
    return {
      id: 102,
      request_id: 'req_102',
      booking_id: requestedBookingId ? `${requestedBookingId}_102` : 'BK197861',
      user_id: 'usr_102',
      partner_id: 102,
      name: 'Anjali',
      full_name: 'Anjali Sharma',
      age: 24,
      gender: 'Female',
      city: 'Jaipur',
      location: {
        city: 'Jaipur',
        state: 'Rajasthan',
        country: 'India',
        address: 'Vaishali Nagar, Jaipur, Rajasthan'
      },
      rating: 4.9,
      total_reviews: 135,
      price: 1199,
      currency: 'INR',
      price_type: 'session',
      activity: 'Dinner',
      activity_id: 'cat_02',
      about: 'Loves social gatherings, food dates, and music events.',
      is_verified: true,
      is_approved: true,
      approval_status: 'approved',
      status: 'approved',
      is_accepted: true,
      request_accepted: true,
      is_request_accepted: true,
      accepted: true,
      request_status: 'accepted',
      profile_image: `${baseUrl}/uploads/anjali.jpg`,
      image: `${baseUrl}/uploads/anjali.jpg`,
      avatar: `${baseUrl}/uploads/anjali.jpg`,
      profile_images: [
        `${baseUrl}/uploads/anjali.jpg`,
        `${baseUrl}/uploads/ananya.jpg`
      ],
      photos: [
        `${baseUrl}/uploads/anjali.jpg`,
        `${baseUrl}/uploads/ananya.jpg`
      ],
      interests: ['Coffee', 'Events', 'Dinner'],
      available_for: [
        { name: 'Dinner', icon: 'restaurant', price: 499, currency: 'INR' },
        { name: 'Coffee', icon: 'coffee', price: 1, currency: 'INR' },
        { name: 'Event', icon: 'event', price: 599, currency: 'INR' }
      ],
      sender: {
        user_id: 'usr_998877',
        name: 'Amit',
        avatar: `${baseUrl}/uploads/profile.jpg`
      },
      message: 'Looking forward to dinner and socializing!',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // 3. Riya (103, req_103, usr_103, usr_404, riya, BK197862)
  if (cleanId === '103' || cleanId === 'req_103' || cleanId === 'usr_103' || cleanId === 'usr_404' || cleanId.includes('riya') || cleanId.includes('197862')) {
    return {
      id: 103,
      request_id: 'req_103',
      booking_id: requestedBookingId ? `${requestedBookingId}_103` : 'BK197862',
      user_id: 'usr_404',
      partner_id: 103,
      name: 'Riya',
      full_name: 'Riya Mehta',
      age: 26,
      gender: 'Female',
      city: 'Mumbai',
      location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        address: 'Bandra West, Mumbai, Maharashtra'
      },
      rating: 4.8,
      total_reviews: 145,
      price: 999,
      currency: 'INR',
      price_type: 'session',
      activity: 'Music & Coffee',
      activity_id: 'cat_01',
      about: 'Tech enthusiast, guitarist, and outdoor trekking partner.',
      is_verified: true,
      is_approved: true,
      approval_status: 'approved',
      status: 'approved',
      is_accepted: true,
      request_accepted: true,
      is_request_accepted: true,
      accepted: true,
      request_status: 'accepted',
      profile_image: `${baseUrl}/uploads/riya.jpg`,
      image: `${baseUrl}/uploads/riya.jpg`,
      avatar: `${baseUrl}/uploads/riya.jpg`,
      profile_images: [
        `${baseUrl}/uploads/riya.jpg`,
        `${baseUrl}/uploads/sneha.jpg`
      ],
      photos: [
        `${baseUrl}/uploads/riya.jpg`,
        `${baseUrl}/uploads/sneha.jpg`
      ],
      interests: ['Music', 'Coffee', 'Trekking'],
      available_for: [
        { name: 'Coffee & Code', icon: 'coffee', price: 1, currency: 'INR' },
        { name: 'Trekking', icon: 'hiking', price: 499, currency: 'INR' },
        { name: 'Travel', icon: 'flight', price: 699, currency: 'INR' }
      ],
      sender: {
        user_id: 'usr_998877',
        name: 'Amit',
        avatar: `${baseUrl}/uploads/profile.jpg`
      },
      message: 'Let us jam and have coffee together!',
      created_at: new Date(Date.now() - 10800000).toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // Default fallback to Priya (101)
  return getPartnerRequestDetails('101', baseUrl, requestedBookingId);
};

// 4. Partner Request Details API — GET (/details/:id, /details, /:id, /request-details/:id, /view/:id)
const handlePartnerRequestDetails = (req, res) => {
  const baseUrl = getBaseUrl(req);
  const targetId = req.params.id || req.query.id || req.query.request_id || req.query.partner_id || req.query.user_id || req.query.booking_id || 'req_101';
  const requestedBookingId = req.query.booking_id || req.query.bookingId || 'BK197860';
  const details = getPartnerRequestDetails(targetId, baseUrl, requestedBookingId);

  return res.status(200).json({
    success: true,
    message: 'Partner request details fetched successfully',
    request_id: details.request_id,
    booking_id: details.booking_id,
    partner_id: details.partner_id,
    user_id: details.user_id,
    status: details.status,
    approval_status: details.approval_status,
    is_approved: details.is_approved,
    is_accepted: details.is_accepted,
    request_status: details.request_status,
    name: details.name,
    full_name: details.full_name,
    age: details.age,
    gender: details.gender,
    rating: details.rating,
    price: details.price,
    currency: details.currency,
    activity: details.activity,
    city: details.city,
    location: details.location,
    profile_image: details.profile_image,
    profile_images: details.profile_images,
    photos: details.photos,
    interests: details.interests,
    available_for: details.available_for,
    about: details.about,
    sender: details.sender,
    data: details,
    partner_details: details,
    request_details: details
  });
};

router.get('/details/:id', authenticateToken, handlePartnerRequestDetails);
router.get('/details', authenticateToken, handlePartnerRequestDetails);
router.get('/request-details/:id', authenticateToken, handlePartnerRequestDetails);
router.get('/request-details', authenticateToken, handlePartnerRequestDetails);
router.get('/view/:id', authenticateToken, handlePartnerRequestDetails);
router.get('/view', authenticateToken, handlePartnerRequestDetails);
router.get('/:id', authenticateToken, (req, res, next) => {
  // If param is a standard route word, pass to next
  const p = req.params.id.toLowerCase();
  if (p === 'list' || p === 'approved' || p === 'pending' || p === 'action' || p === 'approve-all') {
    return next();
  }
  return handlePartnerRequestDetails(req, res);
});

// 2. Request Partner List API — GET (/list, /, /approved, /pending)
const handlePartnerList = (req, res) => {
  const baseUrl = getBaseUrl(req);
  const type = (req.query.type || req.query.status || req.query.filter || '').toLowerCase();
  const requestedBookingId = req.query.booking_id || req.query.bookingId || 'BK197860';
  const approvedPartners = getApprovedPartnersList(baseUrl, requestedBookingId);

  // If client specifically requests pending list after all have been approved
  if (type === 'pending' || type === 'unapproved') {
    return res.status(200).json({
      success: true,
      message: 'All pending partners have been approved',
      booking_id: requestedBookingId,
      data: {
        booking_id: requestedBookingId,
        partners: [],
        pending_partners: [],
        approved_partners: approvedPartners
      },
      partners: [],
      pending_partners: [],
      approved_partners: approvedPartners,
      count: 0,
      requests: []
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Approved partners fetched successfully',
    booking_id: requestedBookingId,
    data: {
      booking_id: requestedBookingId,
      partners: approvedPartners,
      approved_partners: approvedPartners,
      pending_partners: []
    },
    partners: approvedPartners,
    approved_partners: approvedPartners,
    pending_partners: [],
    count: approvedPartners.length,
    requests: approvedPartners
  });
};

router.get('/list', authenticateToken, handlePartnerList);
router.get('/', authenticateToken, handlePartnerList);
router.get('/approved', authenticateToken, handlePartnerList);
router.get('/approved-partners', authenticateToken, handlePartnerList);
router.get('/pending', authenticateToken, handlePartnerList);
router.get('/pending-partners', authenticateToken, handlePartnerList);

// 3. Approve All / Partner Action API — POST (/action, /approve-all, /approve)
const handlePartnerAction = (req, res) => {
  const baseUrl = getBaseUrl(req);
  const { request_id, action = 'APPROVE' } = req.body;
  const approvedPartners = getApprovedPartnersList(baseUrl);

  return res.status(200).json({
    success: true,
    message: `All pending partners have been approved successfully (${action})`,
    request_id: request_id || 'all',
    status: 'APPROVED',
    is_accepted: true,
    data: {
      partners: approvedPartners,
      approved_partners: approvedPartners
    }
  });
};

router.post('/action', authenticateToken, handlePartnerAction);
router.post('/approve-all', authenticateToken, handlePartnerAction);
router.post('/approve', authenticateToken, handlePartnerAction);

module.exports = router;


