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

// 5. Product Details API — GET
router.get('/product-details/:id', authenticateToken, (req, res) => {
  const products = {
    prod_101: {
      product_id: 'prod_101',
      name: 'VIP Activity Access Pass',
      price: 499,
      currency: 'INR',
      validity_days: 30,
      features: ['Unlimited Partner Requests', 'Priority Live Stream Badge', 'Ad-free Experience']
    },
    prod_102: {
      product_id: 'prod_102',
      name: 'Premium Activity Explorer Pass',
      price: 999,
      currency: 'INR',
      validity_days: 90,
      features: ['All VIP Features', 'Face Scan Verification Shield', 'Top Search Listing']
    }
  };

  const productId = req.params.id;
  const product = products[productId] || products['prod_101'];

  return res.status(200).json({
    success: true,
    data: product
  });
});

module.exports = router;
