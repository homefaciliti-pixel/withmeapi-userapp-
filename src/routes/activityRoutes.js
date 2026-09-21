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

// Helper to get data for all sections
const getCombinedActivitiesData = (req) => {
  const baseUrl = getBaseUrl(req);
  const { q = '', location = '', category = '' } = req.query || {};

  const planning_today = [
    { id: 'cat_01', title: 'Coffee', image: `${baseUrl}/uploads/categories/coffee.png` },
    { id: 'cat_02', title: 'Dinner', image: `${baseUrl}/uploads/categories/dinner.png` },
    { id: 'cat_03', title: 'Travel', image: `${baseUrl}/uploads/categories/travel.png` },
    { id: 'cat_04', title: 'Movie', image: `${baseUrl}/uploads/categories/movie.png` },
    { id: 'cat_05', title: 'Event', image: `${baseUrl}/uploads/categories/event.png` },
    { id: 'cat_06', title: 'Conversation', image: `${baseUrl}/uploads/categories/conversation.png` }
  ];

  const search = [
    {
      type: 'partner',
      id: 'usr_301',
      name: 'Priya',
      city: location || 'Jaipur',
      rating: 4.8,
      price: 999,
      currency: 'INR',
      price_type: 'session',
      image: `${baseUrl}/uploads/priya.jpg`,
      is_verified: true,
      interests: ['Coffee', 'Travel'],
      status: 'available'
    },
    {
      type: 'partner',
      id: 'usr_302',
      name: 'Anjali',
      city: location || 'Jaipur',
      rating: 4.9,
      price: 1199,
      currency: 'INR',
      price_type: 'session',
      image: `${baseUrl}/uploads/ananya.jpg`,
      is_verified: true,
      interests: ['Coffee', 'Events'],
      status: 'available'
    },
    {
      type: 'partner',
      id: 'usr_303',
      name: 'Rohan',
      city: location || 'Mumbai',
      rating: 4.7,
      price: 899,
      currency: 'INR',
      price_type: 'session',
      image: `${baseUrl}/uploads/rohan.jpg`,
      is_verified: true,
      interests: ['Coffee', 'Coding'],
      status: 'available'
    }
  ];

  const popular_activities = [
    {
      id: 'act_top1',
      title: 'Coffee WithMe',
      name: 'Coffee WithMe',
      category: 'Social',
      participants_count: 1420,
      rating: 4.9,
      price: 299,
      currency: 'INR',
      banner: `${baseUrl}/uploads/categories/coffee.png`,
      image: `${baseUrl}/uploads/categories/coffee.png`,
      thumbnail: `${baseUrl}/uploads/categories/coffee.png`
    },
    {
      id: 'act_top2',
      title: 'Dinner WithMe',
      name: 'Dinner WithMe',
      category: 'Dining',
      participants_count: 1150,
      rating: 4.8,
      price: 499,
      currency: 'INR',
      banner: `${baseUrl}/uploads/categories/dinner.png`,
      image: `${baseUrl}/uploads/categories/dinner.png`,
      thumbnail: `${baseUrl}/uploads/categories/dinner.png`
    },
    {
      id: 'act_top3',
      title: 'Movie WithMe',
      name: 'Movie WithMe',
      category: 'Entertainment',
      participants_count: 980,
      rating: 4.8,
      price: 399,
      currency: 'INR',
      banner: `${baseUrl}/uploads/categories/movie.png`,
      image: `${baseUrl}/uploads/categories/movie.png`,
      thumbnail: `${baseUrl}/uploads/categories/movie.png`
    },
    {
      id: 'act_top4',
      title: 'Travel WithMe',
      name: 'Travel WithMe',
      category: 'Outdoor',
      participants_count: 890,
      rating: 4.9,
      price: 699,
      currency: 'INR',
      banner: `${baseUrl}/uploads/categories/travel.png`,
      image: `${baseUrl}/uploads/categories/travel.png`,
      thumbnail: `${baseUrl}/uploads/categories/travel.png`
    },
    {
      id: 'act_top5',
      title: 'Event WithMe',
      name: 'Event WithMe',
      category: 'Events',
      participants_count: 750,
      rating: 4.7,
      price: 499,
      currency: 'INR',
      banner: `${baseUrl}/uploads/categories/event.png`,
      image: `${baseUrl}/uploads/categories/event.png`,
      thumbnail: `${baseUrl}/uploads/categories/event.png`
    },
    {
      id: 'act_top6',
      title: 'Conversation WithMe',
      name: 'Conversation WithMe',
      category: 'Social',
      participants_count: 620,
      rating: 4.7,
      price: 199,
      currency: 'INR',
      banner: `${baseUrl}/uploads/categories/conversation.png`,
      image: `${baseUrl}/uploads/categories/conversation.png`,
      thumbnail: `${baseUrl}/uploads/categories/conversation.png`
    }
  ];

  const recommended_partners = [
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
      profile_image: `${baseUrl}/uploads/rohan.jpg`,
      image: `${baseUrl}/uploads/rohan.jpg`,
      avatar: `${baseUrl}/uploads/rohan.jpg`
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
      profile_image: `${baseUrl}/uploads/neha.jpg`,
      image: `${baseUrl}/uploads/neha.jpg`,
      avatar: `${baseUrl}/uploads/neha.jpg`
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
      profile_image: `${baseUrl}/uploads/aarav.jpg`,
      image: `${baseUrl}/uploads/aarav.jpg`,
      avatar: `${baseUrl}/uploads/aarav.jpg`
    }
  ];

  return {
    planning_today,
    search,
    popular_activities,
    recommended_partners
  };
};

// 5.0 All-In-One Combined Activities API — GET (/api/v1/activities/all-in-one, /api/v1/activities/combined, /api/v1/activities/dashboard, /api/v1/activities)
const handleCombinedActivities = (req, res) => {
  const combinedData = getCombinedActivitiesData(req);
  return res.status(200).json({
    success: true,
    message: 'Combined activities data fetched successfully',
    planning_today: combinedData.planning_today,
    search: combinedData.search,
    popular_activities: combinedData.popular_activities,
    recommended_partners: combinedData.recommended_partners,
    data: combinedData
  });
};

router.get('/all-in-one', authenticateToken, handleCombinedActivities);
router.get('/combined', authenticateToken, handleCombinedActivities);
router.get('/dashboard', authenticateToken, handleCombinedActivities);
router.get('/', authenticateToken, handleCombinedActivities);

// 1. Planning Today List / Selection API — GET
router.get('/planning-today', authenticateToken, (req, res) => {
  const baseUrl = getBaseUrl(req);
  const categories = [
    {
      id: 'cat_01',
      title: 'Coffee',
      image: `${baseUrl}/uploads/categories/coffee.png`
    },
    {
      id: 'cat_02',
      title: 'Dinner',
      image: `${baseUrl}/uploads/categories/dinner.png`
    },
    {
      id: 'cat_03',
      title: 'Travel',
      image: `${baseUrl}/uploads/categories/travel.png`
    },
    {
      id: 'cat_04',
      title: 'Movie',
      image: `${baseUrl}/uploads/categories/movie.png`
    },
    {
      id: 'cat_05',
      title: 'Event',
      image: `${baseUrl}/uploads/categories/event.png`
    },
    {
      id: 'cat_06',
      title: 'Conversation',
      image: `${baseUrl}/uploads/categories/conversation.png`
    }
  ];

  return res.status(200).json({
    success: true,
    count: categories.length,
    categories,
    data: categories
  });
});

// 2. Search API — GET
router.get('/search', authenticateToken, (req, res) => {
  const { q = '', location = '', category = '' } = req.query;
  const combinedData = getCombinedActivitiesData(req);

  return res.status(200).json({
    success: true,
    message: 'Search results found',
    query: {
      q,
      location,
      category
    },
    count: combinedData.search.length,
    results: combinedData.search
  });
});

// 3. Popular Activities List API — GET
router.get('/popular-activities', authenticateToken, (req, res) => {
  const combinedData = getCombinedActivitiesData(req);

  return res.status(200).json({
    success: true,
    count: combinedData.popular_activities.length,
    activities: combinedData.popular_activities
  });
});

// 4. Recommended Partner List API — GET
router.get('/recommended-partners', authenticateToken, (req, res) => {
  const combinedData = getCombinedActivitiesData(req);

  return res.status(200).json({
    success: true,
    partners: combinedData.recommended_partners
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
    `${baseUrl}/uploads/priya2.jpg`,
    `${baseUrl}/uploads/priya3.jpg`
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
