const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

// Mock Activity Data
const popularActivities = [
  { id: 'act_top1', name: 'Weekend Trekking & Camping', category: 'Outdoor', participants_count: 1420, rating: 4.9, banner: 'http://localhost:5000/uploads/trek.jpg' },
  { id: 'act_top2', name: 'Board Game & Coffee Night', category: 'Social', participants_count: 890, rating: 4.8, banner: 'http://localhost:5000/uploads/games.jpg' },
  { id: 'act_top3', name: 'Morning Badminton Doubles', category: 'Sports', participants_count: 650, rating: 4.7, banner: 'http://localhost:5000/uploads/badminton.jpg' }
];

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
  return res.status(200).json({
    success: true,
    count: popularActivities.length,
    activities: popularActivities
  });
});

// 4. Recommended Partner List API — GET
router.get('/recommended-partners', authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    partners: [
      { user_id: 'usr_404', name: 'Rohan Mehta', match_score: '94%', interests: ['Trekking', 'Coding'], location: 'Mumbai' },
      { user_id: 'usr_405', name: 'Neha Kapoor', match_score: '89%', interests: ['Music', 'Coffee'], location: 'Mumbai' }
    ]
  });
});

// 5. Product Details API — GET
router.get('/product-details/:id', authenticateToken, (req, res) => {
  const productId = req.params.id;
  const product = products[productId] || products['prod_101'];

  return res.status(200).json({
    success: true,
    data: product
  });
});

module.exports = router;
