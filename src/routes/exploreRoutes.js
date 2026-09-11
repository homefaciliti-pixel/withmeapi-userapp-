const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

const exploreFeed = [
  { id: 'exp_1', type: 'LIVE', title: 'Acoustic Music Session', host: 'Rohan Mehta', viewers_count: 320, thumbnail: 'http://localhost:5000/uploads/live1.jpg' },
  { id: 'exp_2', type: 'PROFILE', name: 'Ananya Verma', age: 24, gender: 'Female', distance: '2.4 km away', interests: ['Music', 'Coffee'], avatar: 'http://localhost:5000/uploads/ananya.jpg' },
  { id: 'exp_3', type: 'ACTIVITY', title: 'Weekend Hiking Club', category: 'Outdoor', distance: '5.1 km away', date: 'This Sunday' }
];

// 1. Explore API — GET
router.get('/explore', authenticateToken, (req, res) => {
  const page = parseInt(req.query.page || '1');
  const limit = parseInt(req.query.limit || '10');

  return res.status(200).json({
    success: true,
    page,
    limit,
    count: exploreFeed.length,
    items: exploreFeed
  });
});

// 2. Filter API — POST
router.post('/filter', authenticateToken, (req, res) => {
  const { gender, min_age = 18, max_age = 50, max_distance_km = 20, interests = [] } = req.body;

  let filtered = exploreFeed;

  if (gender) {
    filtered = filtered.filter(item => item.gender === gender || item.type !== 'PROFILE');
  }

  return res.status(200).json({
    success: true,
    applied_filters: { gender, min_age, max_age, max_distance_km, interests },
    count: filtered.length,
    filtered_results: filtered
  });
});

module.exports = router;
