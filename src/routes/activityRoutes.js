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

// 1. Planning Today List / Selection API — GET
router.get('/planning-today', authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    data: [
      { id: 'plan_1', title: 'Coffee & Afternoon Networking', time: '16:00', location: 'Bandras Cafe', status: 'AVAILABLE' },
      { id: 'plan_2', title: 'Evening Gym & Fitness Partner', time: '18:30', location: 'Cult.fit Studio', status: 'SELECTED' },
      { id: 'plan_3', title: 'Night Live Acoustic Session', time: '21:00', location: 'Online Live Room', status: 'AVAILABLE' }
    ]
  });
});

// 2. Search API — GET
router.get('/search', authenticateToken, (req, res) => {
  const { q = '', location = '', category = '' } = req.query;

  const results = [
    { type: 'activity', id: 'act_10', title: `Fitness Club in ${location || 'Mumbai'}`, category: category || 'Sports' },
    { type: 'partner', id: 'usr_301', name: 'Kavya Singh', interests: ['Trekking', 'Photography'], city: location || 'Mumbai' }
  ];

  return res.status(200).json({
    success: true,
    query: { q, location, category },
    count: results.length,
    results
  });
});

// 3. Popular Activities List API — GET
router.get('/popular-activities', authenticateToken, (req, res) => {
  const baseUrl = getBaseUrl(req);
  const popularActivities = [
    { id: 'act_top1', name: 'Weekend Trekking & Camping', category: 'Outdoor', participants_count: 1420, rating: 4.9, banner: `${baseUrl}/uploads/trek.jpg` },
    { id: 'act_top2', name: 'Board Game & Coffee Night', category: 'Social', participants_count: 890, rating: 4.8, banner: `${baseUrl}/uploads/games.jpg` },
    { id: 'act_top3', name: 'Morning Badminton Doubles', category: 'Sports', participants_count: 650, rating: 4.7, banner: `${baseUrl}/uploads/badminton.jpg` }
  ];

  return res.status(200).json({
    success: true,
    count: popularActivities.length,
    activities: popularActivities
  });
});

// 4. Recommended Partner List API — GET
router.get('/recommended-partners', authenticateToken, (req, res) => {
  const baseUrl = getBaseUrl(req);
  return res.status(200).json({
    success: true,
    partners: [
      {
        user_id: 'usr_404',
        name: 'Rohan Mehta',
        age: 26,
        rating: 4.8,
        price: 499,
        currency: 'INR',
        match_score: '94%',
        interests: ['Trekking', 'Coding'],
        location: 'Mumbai',
        profile_image: `${baseUrl}/uploads/rohan.jpg`
      },
      {
        user_id: 'usr_405',
        name: 'Neha Kapoor',
        age: 23,
        rating: 4.9,
        price: 299,
        currency: 'INR',
        match_score: '89%',
        interests: ['Music', 'Coffee'],
        location: 'Mumbai',
        profile_image: `${baseUrl}/uploads/neha.jpg`
      },
      {
        user_id: 'usr_406',
        name: 'Aarav Sharma',
        age: 25,
        rating: 4.7,
        price: 399,
        currency: 'INR',
        match_score: '85%',
        interests: ['Fitness', 'Gaming'],
        location: 'Delhi',
        profile_image: `${baseUrl}/uploads/aarav.jpg`
      }
    ]
  });
});

// Mock detailed user profile catalog for product-details endpoint
const userProductDetailsMap = {
  usr_201: {
    id: 'usr_201',
    name: 'Ananya Verma',
    age: 24,
    gender: 'Female',
    verified: true,
    location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
    rating: 4.9,
    total_reviews: 150,
    about: 'Loves music, coffee meetups, and weekend trekking trips.'
  },
  usr_203: {
    id: 'usr_203',
    name: 'Priya Sharma',
    age: 25,
    gender: 'Female',
    verified: true,
    location: { city: 'Jaipur', state: 'Rajasthan', country: 'India' },
    rating: 4.8,
    total_reviews: 120,
    about: 'Friendly, outgoing and loves exploring new places and meeting people.'
  }
};

// 5. Product Details API — GET (/activities/product-details/:id and /activities/product-details)
const handleProductDetails = (req, res) => {
  const baseUrl = getBaseUrl(req);
  const targetId = req.params.id || req.query.id || 'usr_203';
  const profileInfo = userProductDetailsMap[targetId] || {
    id: targetId,
    name: 'Priya Sharma',
    age: 25,
    gender: 'Female',
    verified: true,
    location: { city: 'Jaipur', state: 'Rajasthan', country: 'India' },
    rating: 4.8,
    total_reviews: 120,
    about: 'Friendly, outgoing and loves exploring new places and meeting people.'
  };

  const imagesList = [
    `${baseUrl}/uploads/priya.jpg`,
    `${baseUrl}/uploads/ananya.jpg`,
    `${baseUrl}/uploads/user101.jpg`
  ];

  return res.status(200).json({
    success: true,
    message: 'Profile details fetched successfully',
    data: {
      id: profileInfo.id,
      name: profileInfo.name,
      age: profileInfo.age,
      gender: profileInfo.gender,
      verified: profileInfo.verified,
      location: profileInfo.location,
      rating: profileInfo.rating,
      total_reviews: profileInfo.total_reviews,
      profile_image: imagesList[0],
      profile_images: imagesList,
      about: profileInfo.about,
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
    }
  });
};

router.get('/product-details/:id', authenticateToken, handleProductDetails);
router.get('/product-details', authenticateToken, handleProductDetails);

module.exports = router;
