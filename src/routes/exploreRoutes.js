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

// 1. Explore API — GET
router.get('/explore', authenticateToken, (req, res) => {
  const baseUrl = getBaseUrl(req);
  const page = parseInt(req.query.page || '1');
  const limit = parseInt(req.query.limit || '10');

  const exploreFeed = [
    {
      user_id: 'usr_201',
      id: 'exp_1',
      type: 'PROFILE',
      name: 'Ananya Verma',
      age: 24,
      gender: 'Female',
      interests: ['Music', 'Coffee', 'Trekking'],
      rating: 4.9,
      price: 299,
      currency: 'INR',
      distance: '2.4 km away',
      image: `${baseUrl}/uploads/ananya.jpg`,
      avatar: `${baseUrl}/uploads/ananya.jpg`,
      profile_image: `${baseUrl}/uploads/ananya.jpg`
    },
    {
      user_id: 'usr_202',
      id: 'exp_2',
      type: 'LIVE',
      title: 'Acoustic Music Session',
      host: 'Rohan Mehta',
      name: 'Rohan Mehta',
      age: 26,
      gender: 'Male',
      interests: ['Guitar', 'Singing', 'Music'],
      rating: 4.8,
      price: 499,
      currency: 'INR',
      viewers_count: 320,
      distance: '1.8 km away',
      image: `${baseUrl}/uploads/live1.jpg`,
      avatar: `${baseUrl}/uploads/rohan.jpg`,
      thumbnail: `${baseUrl}/uploads/live1.jpg`
    },
    {
      user_id: 'usr_203',
      id: 'exp_3',
      type: 'ACTIVITY',
      title: 'Weekend Hiking Club',
      name: 'Priya Sharma',
      age: 23,
      gender: 'Female',
      interests: ['Hiking', 'Outdoors', 'Fitness'],
      rating: 4.7,
      price: 399,
      currency: 'INR',
      category: 'Outdoor',
      distance: '5.1 km away',
      date: 'This Sunday',
      image: `${baseUrl}/uploads/priya.jpg`,
      avatar: `${baseUrl}/uploads/priya.jpg`,
      profile_image: `${baseUrl}/uploads/priya.jpg`
    }
  ];

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
  const baseUrl = getBaseUrl(req);
  const { gender, min_age = 18, max_age = 50, max_distance_km = 20, interests = [] } = req.body;

  const exploreFeed = [
    {
      user_id: 'usr_201',
      id: 'exp_1',
      type: 'PROFILE',
      name: 'Ananya Verma',
      age: 24,
      gender: 'Female',
      interests: ['Music', 'Coffee', 'Trekking'],
      rating: 4.9,
      price: 299,
      currency: 'INR',
      distance: '2.4 km away',
      image: `${baseUrl}/uploads/ananya.jpg`,
      avatar: `${baseUrl}/uploads/ananya.jpg`,
      profile_image: `${baseUrl}/uploads/ananya.jpg`
    },
    {
      user_id: 'usr_202',
      id: 'exp_2',
      type: 'LIVE',
      title: 'Acoustic Music Session',
      host: 'Rohan Mehta',
      name: 'Rohan Mehta',
      age: 26,
      gender: 'Male',
      interests: ['Guitar', 'Singing', 'Music'],
      rating: 4.8,
      price: 499,
      currency: 'INR',
      viewers_count: 320,
      distance: '1.8 km away',
      image: `${baseUrl}/uploads/live1.jpg`,
      avatar: `${baseUrl}/uploads/rohan.jpg`,
      thumbnail: `${baseUrl}/uploads/live1.jpg`
    }
  ];

  let filtered = exploreFeed;
  if (gender) {
    filtered = filtered.filter(item => item.gender === gender);
  }

  return res.status(200).json({
    success: true,
    applied_filters: { gender, min_age, max_age, max_distance_km, interests },
    count: filtered.length,
    filtered_results: filtered
  });
});

module.exports = router;
