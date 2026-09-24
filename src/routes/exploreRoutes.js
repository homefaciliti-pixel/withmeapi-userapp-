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

// Helper to format partner image
const formatPartnerPhoto = (photo, baseUrl = 'https://withmeapi-userapp.onrender.com') => {
  if (!photo || photo === '' || photo === 'null') {
    return `${baseUrl}/uploads/priya.jpg`;
  }
  if (photo.startsWith('http://') || photo.startsWith('https://')) {
    return photo;
  }
  if (photo.startsWith('/uploads')) {
    return `${baseUrl}${photo}`;
  }
  return `${baseUrl}/uploads/${photo}`;
};

// Fetch real registered partners from MySQL
const fetchExploreDbPartners = async (baseUrl) => {
  try {
    const rows = await query(`
      SELECT id, name, email, mobile, phone_number, city, state, locality, address, image, gender, rating, totalReviews, category, subCategory, status, isApproved
      FROM node_partners
      WHERE name IS NOT NULL AND name != '' AND name != 'User'
      ORDER BY id DESC
      LIMIT 100
    `);

    if (!rows || rows.length === 0) return [];

    return rows.map((r, index) => {
      const photoUrl = formatPartnerPhoto(r.image, baseUrl);
      const gender = r.gender ? (r.gender.charAt(0).toUpperCase() + r.gender.slice(1).toLowerCase()) : 'Female';
      const city = r.city ? r.city.trim() : 'Jaipur';
      const partnerCategory = r.category || 'Coffee';
      const isCoffee = partnerCategory.toLowerCase().includes('coffee');

      return {
        user_id: `usr_${r.id}`,
        id: `exp_db_${r.id}`,
        partner_id: r.id,
        type: index % 2 === 0 ? 'PROFILE' : 'ACTIVITY',
        title: `${partnerCategory} WithMe`,
        activity: partnerCategory,
        name: r.name.trim(),
        full_name: r.name.trim(),
        age: 24,
        gender: gender,
        interests: [partnerCategory, 'Music', 'Travel'],
        rating: parseFloat(r.rating || 4.8),
        price: isCoffee ? 1 : 499,
        currency: 'INR',
        category: partnerCategory,
        distance: '1.5 km away',
        location: city,
        image: photoUrl,
        avatar: photoUrl,
        profile_image: photoUrl,
        profile_images: [photoUrl, `${baseUrl}/uploads/priya.jpg`],
        photos: [photoUrl, `${baseUrl}/uploads/priya.jpg`]
      };
    });
  } catch (err) {
    console.warn('DB explore partners notice:', err.message);
    return [];
  }
};

// 1. Explore API — GET
router.get('/explore', authenticateToken, async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const page = parseInt(req.query.page || '1');
  const limit = parseInt(req.query.limit || '10');
  const categoryFilter = (req.query.category || req.query.activity || req.query.type || '').trim().toLowerCase();

  const dbPartners = await fetchExploreDbPartners(baseUrl);

  const defaultExploreFeed = [
    {
      user_id: 'usr_201',
      id: 'exp_1',
      type: 'PROFILE',
      name: 'Ananya Verma',
      age: 24,
      gender: 'Female',
      interests: ['Music', 'Coffee', 'Trekking'],
      rating: 4.9,
      price: 1,
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
      price: 1,
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

  const exploreFeed = [...dbPartners, ...defaultExploreFeed];

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
router.post('/filter', authenticateToken, async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const { gender, min_age = 18, max_age = 50, max_distance_km = 20, interests = [] } = req.body;

  const dbPartners = await fetchExploreDbPartners(baseUrl);

  const defaultExploreFeed = [
    {
      user_id: 'usr_201',
      id: 'exp_1',
      type: 'PROFILE',
      name: 'Ananya Verma',
      age: 24,
      gender: 'Female',
      interests: ['Music', 'Coffee', 'Trekking'],
      rating: 4.9,
      price: 1,
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
      price: 1,
      currency: 'INR',
      category: 'Coffee',
      distance: '1.5 km away',
      date: 'Today',
      image: `${baseUrl}/uploads/priya.jpg`,
      avatar: `${baseUrl}/uploads/priya.jpg`,
      profile_image: `${baseUrl}/uploads/priya.jpg`
    }
  ];

  const exploreFeed = [...dbPartners, ...defaultExploreFeed];

  let filtered = exploreFeed;
  if (gender) {
    filtered = filtered.filter(item => item.gender && item.gender.toLowerCase() === gender.toLowerCase());
  }

  return res.status(200).json({
    success: true,
    applied_filters: { gender, min_age, max_age, max_distance_km, interests },
    count: filtered.length,
    filtered_results: filtered
  });
});

module.exports = router;
