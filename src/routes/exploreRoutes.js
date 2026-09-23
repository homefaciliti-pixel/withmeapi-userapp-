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
  const categoryFilter = (req.query.category || req.query.activity || req.query.type || '').trim().toLowerCase();

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
      price: 349,
      currency: 'INR',
      category: 'Coffee',
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
      host: 'Riya Mehta',
      name: 'Riya Mehta',
      age: 26,
      gender: 'Female',
      interests: ['Guitar', 'Singing', 'Music'],
      rating: 4.8,
      price: 499,
      currency: 'INR',
      category: 'Music',
      viewers_count: 320,
      distance: '1.8 km away',
      image: `${baseUrl}/uploads/live1.jpg`,
      avatar: `${baseUrl}/uploads/riya.jpg`,
      profile_image: `${baseUrl}/uploads/riya.jpg`,
      thumbnail: `${baseUrl}/uploads/live1.jpg`
    },
    {
      user_id: 'usr_203',
      id: 'exp_3',
      type: 'ACTIVITY',
      title: 'Coffee WithMe',
      activity: 'Coffee',
      name: 'Priya Sharma',
      age: 23,
      gender: 'Female',
      interests: ['Coffee', 'Travel', 'Music'],
      rating: 4.8,
      price: 999,
      currency: 'INR',
      category: 'Coffee',
      distance: '1.5 km away',
      date: 'Today',
      image: `${baseUrl}/uploads/priya.jpg`,
      avatar: `${baseUrl}/uploads/priya.jpg`,
      profile_image: `${baseUrl}/uploads/priya.jpg`,
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
      ]
    }
  ];

  let items = exploreFeed;
  if (categoryFilter) {
    items = exploreFeed.filter(item => {
      if (item.category && item.category.toLowerCase().includes(categoryFilter)) return true;
      if (item.activity && item.activity.toLowerCase().includes(categoryFilter)) return true;
      if (item.interests && item.interests.some(i => i.toLowerCase().includes(categoryFilter))) return true;
      return false;
    });
  }

  return res.status(200).json({
    success: true,
    page,
    limit,
    count: items.length,
    items: items,
    data: {
      items: items,
      count: items.length
    }
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
      host: 'Riya Mehta',
      name: 'Riya Mehta',
      age: 26,
      gender: 'Female',
      interests: ['Guitar', 'Singing', 'Music'],
      rating: 4.8,
      price: 499,
      currency: 'INR',
      viewers_count: 320,
      distance: '1.8 km away',
      image: `${baseUrl}/uploads/live1.jpg`,
      avatar: `${baseUrl}/uploads/riya.jpg`,
      profile_image: `${baseUrl}/uploads/riya.jpg`,
      thumbnail: `${baseUrl}/uploads/live1.jpg`
    },
    {
      user_id: 'usr_203',
      id: 'exp_3',
      type: 'ACTIVITY',
      title: 'Coffee WithMe',
      activity: 'Coffee',
      name: 'Priya Sharma',
      age: 23,
      gender: 'Female',
      interests: ['Coffee', 'Travel', 'Music'],
      rating: 4.8,
      price: 999,
      currency: 'INR',
      category: 'Coffee',
      distance: '1.5 km away',
      date: 'Today',
      image: `${baseUrl}/uploads/priya.jpg`,
      avatar: `${baseUrl}/uploads/priya.jpg`,
      profile_image: `${baseUrl}/uploads/priya.jpg`
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
