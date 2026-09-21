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
      name: 'Riya',
      city: location || 'Mumbai',
      rating: 4.7,
      price: 899,
      currency: 'INR',
      price_type: 'session',
      image: `${baseUrl}/uploads/riya.jpg`,
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
      name: 'Riya Mehta',
      age: 26,
      rating: 4.8,
      price: 499,
      currency: 'INR',
      match_score: '94%',
      interests: ['Trekking', 'Coding'],
      location: 'Mumbai',
      profile_image: `${baseUrl}/uploads/riya.jpg`,
      image: `${baseUrl}/uploads/riya.jpg`,
      avatar: `${baseUrl}/uploads/riya.jpg`
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
      name: 'Sneha Sharma',
      age: 25,
      rating: 4.7,
      price: 399,
      currency: 'INR',
      match_score: '85%',
      interests: ['Fitness', 'Gaming'],
      location: 'Delhi',
      profile_image: `${baseUrl}/uploads/sneha.jpg`,
      image: `${baseUrl}/uploads/sneha.jpg`,
      avatar: `${baseUrl}/uploads/sneha.jpg`
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
// Dynamic helper to resolve partner details by ID or Name
const getPartnerProfileById = (targetId = '101', baseUrl = 'https://withmeapi-userapp.onrender.com') => {
  const cleanId = String(targetId).trim().toLowerCase();

  // 1. Priya (IDs: 101, usr_101, usr_203, usr_301, priya)
  if (cleanId === '101' || cleanId === 'usr_101' || cleanId === 'usr_203' || cleanId === 'usr_301' || cleanId.includes('priya')) {
    return {
      id: 'usr_203',
      partner_id: 101,
      name: 'Priya Sharma',
      age: 23,
      gender: 'Female',
      verified: true,
      city: 'Jaipur',
      location: { city: 'Jaipur', state: 'Rajasthan', country: 'India' },
      rating: 4.8,
      total_reviews: 120,
      about: 'Friendly, outgoing and loves exploring new places, coffee meetups, and meeting people.',
      profile_image: `${baseUrl}/uploads/priya.jpg`,
      image: `${baseUrl}/uploads/priya.jpg`,
      avatar: `${baseUrl}/uploads/priya.jpg`,
      profile_images: [
        `${baseUrl}/uploads/priya.jpg`,
        `${baseUrl}/uploads/priya2.jpg`,
        `${baseUrl}/uploads/priya3.jpg`
      ],
      photos: [
        `${baseUrl}/uploads/priya.jpg`,
        `${baseUrl}/uploads/priya2.jpg`,
        `${baseUrl}/uploads/priya3.jpg`
      ],
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
  }

  // 2. Anjali (IDs: 102, usr_102, usr_302, anjali)
  if (cleanId === '102' || cleanId === 'usr_102' || cleanId === 'usr_302' || cleanId.includes('anjali')) {
    return {
      id: 'usr_102',
      partner_id: 102,
      name: 'Anjali Sharma',
      age: 24,
      gender: 'Female',
      verified: true,
      city: 'Jaipur',
      location: { city: 'Jaipur', state: 'Rajasthan', country: 'India' },
      rating: 4.9,
      total_reviews: 135,
      about: 'Loves social gatherings, food dates, and music events.',
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
      interests: [
        { name: 'Coffee', icon: 'coffee' },
        { name: 'Events', icon: 'event' },
        { name: 'Dinner', icon: 'restaurant' }
      ],
      available_for: [
        { name: 'Coffee', icon: 'coffee', price: 299, currency: 'INR' },
        { name: 'Dinner', icon: 'restaurant', price: 499, currency: 'INR' },
        { name: 'Event', icon: 'event', price: 599, currency: 'INR' }
      ]
    };
  }

  // 3. Riya Mehta (IDs: 103, usr_103, usr_202, usr_303, usr_404, riya, rohan)
  if (cleanId === '103' || cleanId === 'usr_103' || cleanId === 'usr_202' || cleanId === 'usr_303' || cleanId === 'usr_404' || cleanId.includes('riya') || cleanId.includes('rohan')) {
    return {
      id: 'usr_404',
      partner_id: 103,
      name: 'Riya Mehta',
      age: 26,
      gender: 'Female',
      verified: true,
      city: 'Mumbai',
      location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
      rating: 4.8,
      total_reviews: 145,
      about: 'Tech enthusiast, guitarist, and outdoor trekking partner.',
      profile_image: `${baseUrl}/uploads/riya.jpg`,
      image: `${baseUrl}/uploads/riya.jpg`,
      avatar: `${baseUrl}/uploads/riya.jpg`,
      profile_images: [
        `${baseUrl}/uploads/riya.jpg`,
        `${baseUrl}/uploads/neha.jpg`
      ],
      photos: [
        `${baseUrl}/uploads/riya.jpg`,
        `${baseUrl}/uploads/neha.jpg`
      ],
      interests: [
        { name: 'Trekking', icon: 'hiking' },
        { name: 'Coding', icon: 'code' },
        { name: 'Guitar', icon: 'music_note' }
      ],
      available_for: [
        { name: 'Coffee & Code', icon: 'coffee', price: 299, currency: 'INR' },
        { name: 'Trekking', icon: 'hiking', price: 499, currency: 'INR' },
        { name: 'Travel', icon: 'flight', price: 699, currency: 'INR' }
      ]
    };
  }

  // 4. Neha Kapoor (IDs: 104, usr_104, usr_405, neha)
  if (cleanId === '104' || cleanId === 'usr_104' || cleanId === 'usr_405' || cleanId.includes('neha')) {
    return {
      id: 'usr_405',
      partner_id: 104,
      name: 'Neha Kapoor',
      age: 23,
      gender: 'Female',
      verified: true,
      city: 'Mumbai',
      location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
      rating: 4.9,
      total_reviews: 110,
      about: 'Passionate about acoustic music, fashion, and cafe conversations.',
      profile_image: `${baseUrl}/uploads/neha.jpg`,
      image: `${baseUrl}/uploads/neha.jpg`,
      avatar: `${baseUrl}/uploads/neha.jpg`,
      profile_images: [
        `${baseUrl}/uploads/neha.jpg`,
        `${baseUrl}/uploads/kavya.jpg`
      ],
      photos: [
        `${baseUrl}/uploads/neha.jpg`,
        `${baseUrl}/uploads/kavya.jpg`
      ],
      interests: [
        { name: 'Music', icon: 'music_note' },
        { name: 'Coffee', icon: 'coffee' }
      ],
      available_for: [
        { name: 'Coffee', icon: 'coffee', price: 299, currency: 'INR' },
        { name: 'Movie', icon: 'movie', price: 399, currency: 'INR' }
      ]
    };
  }

  // 5. Sneha Sharma (IDs: 105, usr_105, usr_406, sneha, aarav)
  if (cleanId === '105' || cleanId === 'usr_105' || cleanId === 'usr_406' || cleanId.includes('sneha') || cleanId.includes('aarav')) {
    return {
      id: 'usr_406',
      partner_id: 105,
      name: 'Sneha Sharma',
      age: 25,
      gender: 'Female',
      verified: true,
      city: 'Delhi',
      location: { city: 'Delhi', state: 'Delhi NCR', country: 'India' },
      rating: 4.7,
      total_reviews: 95,
      about: 'Fitness lover, gamer, and movie enthusiast.',
      profile_image: `${baseUrl}/uploads/sneha.jpg`,
      image: `${baseUrl}/uploads/sneha.jpg`,
      avatar: `${baseUrl}/uploads/sneha.jpg`,
      profile_images: [
        `${baseUrl}/uploads/sneha.jpg`,
        `${baseUrl}/uploads/kavya.jpg`
      ],
      photos: [
        `${baseUrl}/uploads/sneha.jpg`,
        `${baseUrl}/uploads/kavya.jpg`
      ],
      interests: [
        { name: 'Fitness', icon: 'fitness_center' },
        { name: 'Gaming', icon: 'sports_esports' }
      ],
      available_for: [
        { name: 'Movie', icon: 'movie', price: 399, currency: 'INR' },
        { name: 'Dinner', icon: 'restaurant', price: 499, currency: 'INR' }
      ]
    };
  }

  // 6. Ananya Verma (IDs: 106, usr_106, usr_201, exp_1, ananya)
  if (cleanId === '106' || cleanId === 'usr_106' || cleanId === 'usr_201' || cleanId === 'exp_1' || cleanId.includes('ananya')) {
    return {
      id: 'usr_201',
      partner_id: 106,
      name: 'Ananya Verma',
      age: 24,
      gender: 'Female',
      verified: true,
      city: 'Mumbai',
      location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
      rating: 4.9,
      total_reviews: 150,
      about: 'Loves music, coffee meetups, and weekend trekking trips.',
      profile_image: `${baseUrl}/uploads/ananya.jpg`,
      image: `${baseUrl}/uploads/ananya.jpg`,
      avatar: `${baseUrl}/uploads/ananya.jpg`,
      profile_images: [
        `${baseUrl}/uploads/ananya.jpg`,
        `${baseUrl}/uploads/anjali.jpg`
      ],
      photos: [
        `${baseUrl}/uploads/ananya.jpg`,
        `${baseUrl}/uploads/anjali.jpg`
      ],
      interests: [
        { name: 'Coffee', icon: 'coffee' },
        { name: 'Trekking', icon: 'hiking' }
      ],
      available_for: [
        { name: 'Coffee', icon: 'coffee', price: 299, currency: 'INR' },
        { name: 'Dinner', icon: 'restaurant', price: 499, currency: 'INR' }
      ]
    };
  }

  // Default Fallback: Priya Sharma
  return {
    id: targetId || 'usr_203',
    partner_id: 101,
    name: 'Priya Sharma',
    age: 23,
    gender: 'Female',
    verified: true,
    city: 'Jaipur',
    location: { city: 'Jaipur', state: 'Rajasthan', country: 'India' },
    rating: 4.8,
    total_reviews: 120,
    about: 'Friendly, outgoing and loves exploring new places, coffee meetups, and meeting people.',
    profile_image: `${baseUrl}/uploads/priya.jpg`,
    image: `${baseUrl}/uploads/priya.jpg`,
    avatar: `${baseUrl}/uploads/priya.jpg`,
    profile_images: [
      `${baseUrl}/uploads/priya.jpg`,
      `${baseUrl}/uploads/priya2.jpg`,
      `${baseUrl}/uploads/priya3.jpg`
    ],
    photos: [
      `${baseUrl}/uploads/priya.jpg`,
      `${baseUrl}/uploads/priya2.jpg`,
      `${baseUrl}/uploads/priya3.jpg`
    ],
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
};

// 5. Product Details API — GET (/activities/product-details/:id and /activities/product-details)
const handleProductDetails = (req, res) => {
  const baseUrl = getBaseUrl(req);
  const targetId = req.params.id || req.query.id || 'usr_203';
  const partnerProfile = getPartnerProfileById(targetId, baseUrl);

  return res.status(200).json({
    success: true,
    message: 'Profile details fetched successfully',
    data: partnerProfile
  });
};

router.get('/product-details/:id', authenticateToken, handleProductDetails);
router.get('/product-details', authenticateToken, handleProductDetails);

module.exports = router;
