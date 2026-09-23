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

// Category Items Data Generator
const getCategoryItemsData = (categoryIdOrName = 'cat_01', baseUrl = 'https://withmeapi-userapp.onrender.com') => {
  const param = String(categoryIdOrName || 'cat_01').trim().toLowerCase();

  // 1. Coffee (cat_01, coffee, 1)
  if (param === 'cat_01' || param === 'coffee' || param === '1' || param.includes('coffee') || param.includes('cof')) {
    const coffeeItems = [
      {
        id: 'COF001',
        type: 'PROFILE',
        user_id: 'usr_203',
        name: 'Priya',
        full_name: 'Priya Sharma',
        age: 23,
        gender: 'Female',
        profile_image: `${baseUrl}/uploads/priya.jpg`,
        image: `${baseUrl}/uploads/priya.jpg`,
        avatar: `${baseUrl}/uploads/priya.jpg`,
        rating: 4.8,
        distance: '1.2 km',
        price: 999,
        currency: 'INR',
        interests: ['Coffee', 'Cafe', 'Travel'],
        category: 'Coffee',
        is_verified: true,
        is_favorite: false
      },
      {
        id: 'COF002',
        type: 'PROFILE',
        user_id: 'usr_201',
        name: 'Ananya',
        full_name: 'Ananya Verma',
        age: 24,
        gender: 'Female',
        profile_image: `${baseUrl}/uploads/ananya.jpg`,
        image: `${baseUrl}/uploads/ananya.jpg`,
        avatar: `${baseUrl}/uploads/ananya.jpg`,
        rating: 4.9,
        distance: '2.4 km',
        price: 349,
        currency: 'INR',
        interests: ['Coffee', 'Music', 'Books'],
        category: 'Coffee',
        is_verified: true,
        is_favorite: false
      },
      {
        id: 'COF003',
        type: 'PROFILE',
        user_id: 'usr_102',
        name: 'Anjali',
        full_name: 'Anjali Sharma',
        age: 24,
        gender: 'Female',
        profile_image: `${baseUrl}/uploads/anjali.jpg`,
        image: `${baseUrl}/uploads/anjali.jpg`,
        avatar: `${baseUrl}/uploads/anjali.jpg`,
        rating: 4.9,
        distance: '1.8 km',
        price: 499,
        currency: 'INR',
        interests: ['Coffee', 'Cafe', 'Events'],
        category: 'Coffee',
        is_verified: true,
        is_favorite: false
      },
      {
        id: 'COF004',
        type: 'PROFILE',
        user_id: 'usr_404',
        name: 'Riya',
        full_name: 'Riya Mehta',
        age: 26,
        gender: 'Female',
        profile_image: `${baseUrl}/uploads/riya.jpg`,
        image: `${baseUrl}/uploads/riya.jpg`,
        avatar: `${baseUrl}/uploads/riya.jpg`,
        rating: 4.8,
        distance: '3.1 km',
        price: 399,
        currency: 'INR',
        interests: ['Coffee', 'Art', 'Photography'],
        category: 'Coffee',
        is_verified: true,
        is_favorite: false
      },
      {
        id: 'COF005',
        type: 'PROFILE',
        user_id: 'usr_405',
        name: 'Neha',
        full_name: 'Neha Kapoor',
        age: 23,
        gender: 'Female',
        profile_image: `${baseUrl}/uploads/neha.jpg`,
        image: `${baseUrl}/uploads/neha.jpg`,
        avatar: `${baseUrl}/uploads/neha.jpg`,
        rating: 4.9,
        distance: '2.0 km',
        price: 299,
        currency: 'INR',
        interests: ['Coffee', 'Music', 'Cafe'],
        category: 'Coffee',
        is_verified: true,
        is_favorite: false
      },
      {
        id: 'COF006',
        type: 'PROFILE',
        user_id: 'usr_406',
        name: 'Sneha',
        full_name: 'Sneha Sharma',
        age: 25,
        gender: 'Female',
        profile_image: `${baseUrl}/uploads/sneha.jpg`,
        image: `${baseUrl}/uploads/sneha.jpg`,
        avatar: `${baseUrl}/uploads/sneha.jpg`,
        rating: 4.7,
        distance: '2.7 km',
        price: 349,
        currency: 'INR',
        interests: ['Coffee', 'Fitness', 'Gaming'],
        category: 'Coffee',
        is_verified: true,
        is_favorite: false
      }
    ];

    return {
      category_id: 'cat_01',
      category: 'Coffee',
      title: 'Coffee WithMe',
      image: `${baseUrl}/uploads/categories/coffee.png`,
      count: coffeeItems.length,
      items: coffeeItems
    };
  }

  // 2. Dinner (cat_02, dinner, 2)
  if (param === 'cat_02' || param === 'dinner' || param === '2' || param.includes('dinner')) {
    const dinnerItems = [
      {
        id: 'DIN001',
        type: 'PROFILE',
        user_id: 'usr_102',
        name: 'Anjali',
        full_name: 'Anjali Sharma',
        age: 24,
        gender: 'Female',
        profile_image: `${baseUrl}/uploads/anjali.jpg`,
        image: `${baseUrl}/uploads/anjali.jpg`,
        avatar: `${baseUrl}/uploads/anjali.jpg`,
        rating: 4.9,
        distance: '1.5 km',
        price: 499,
        currency: 'INR',
        interests: ['Dinner', 'Fine Dining', 'Food'],
        category: 'Dinner',
        is_verified: true,
        is_favorite: false
      },
      {
        id: 'DIN002',
        type: 'PROFILE',
        user_id: 'usr_203',
        name: 'Priya',
        full_name: 'Priya Sharma',
        age: 23,
        gender: 'Female',
        profile_image: `${baseUrl}/uploads/priya.jpg`,
        image: `${baseUrl}/uploads/priya.jpg`,
        avatar: `${baseUrl}/uploads/priya.jpg`,
        rating: 4.8,
        distance: '1.2 km',
        price: 499,
        currency: 'INR',
        interests: ['Dinner', 'Italian', 'Music'],
        category: 'Dinner',
        is_verified: true,
        is_favorite: false
      },
      {
        id: 'DIN003',
        type: 'PROFILE',
        user_id: 'usr_406',
        name: 'Sneha',
        full_name: 'Sneha Sharma',
        age: 25,
        gender: 'Female',
        profile_image: `${baseUrl}/uploads/sneha.jpg`,
        image: `${baseUrl}/uploads/sneha.jpg`,
        avatar: `${baseUrl}/uploads/sneha.jpg`,
        rating: 4.7,
        distance: '2.5 km',
        price: 499,
        currency: 'INR',
        interests: ['Dinner', 'Buffet', 'Cafe'],
        category: 'Dinner',
        is_verified: true,
        is_favorite: false
      }
    ];

    return {
      category_id: 'cat_02',
      category: 'Dinner',
      title: 'Dinner WithMe',
      image: `${baseUrl}/uploads/categories/dinner.png`,
      count: dinnerItems.length,
      items: dinnerItems
    };
  }

  // 3. Travel (cat_03, travel, 3)
  if (param === 'cat_03' || param === 'travel' || param === '3' || param.includes('travel')) {
    const travelItems = [
      {
        id: 'TRV001',
        type: 'PROFILE',
        user_id: 'usr_203',
        name: 'Priya',
        full_name: 'Priya Sharma',
        age: 23,
        gender: 'Female',
        profile_image: `${baseUrl}/uploads/priya.jpg`,
        image: `${baseUrl}/uploads/priya.jpg`,
        avatar: `${baseUrl}/uploads/priya.jpg`,
        rating: 4.8,
        distance: '1.2 km',
        price: 699,
        currency: 'INR',
        interests: ['Travel', 'Road Trips', 'Sightseeing'],
        category: 'Travel',
        is_verified: true,
        is_favorite: false
      },
      {
        id: 'TRV002',
        type: 'PROFILE',
        user_id: 'usr_404',
        name: 'Riya',
        full_name: 'Riya Mehta',
        age: 26,
        gender: 'Female',
        profile_image: `${baseUrl}/uploads/riya.jpg`,
        image: `${baseUrl}/uploads/riya.jpg`,
        avatar: `${baseUrl}/uploads/riya.jpg`,
        rating: 4.8,
        distance: '2.9 km',
        price: 699,
        currency: 'INR',
        interests: ['Travel', 'Trekking', 'Mountains'],
        category: 'Travel',
        is_verified: true,
        is_favorite: false
      }
    ];

    return {
      category_id: 'cat_03',
      category: 'Travel',
      title: 'Travel WithMe',
      image: `${baseUrl}/uploads/categories/travel.png`,
      count: travelItems.length,
      items: travelItems
    };
  }

  // 4. Movie (cat_04, movie, 4)
  if (param === 'cat_04' || param === 'movie' || param === '4' || param.includes('movie')) {
    const movieItems = [
      {
        id: 'MOV001',
        type: 'PROFILE',
        user_id: 'usr_405',
        name: 'Neha',
        full_name: 'Neha Kapoor',
        age: 23,
        gender: 'Female',
        profile_image: `${baseUrl}/uploads/neha.jpg`,
        image: `${baseUrl}/uploads/neha.jpg`,
        avatar: `${baseUrl}/uploads/neha.jpg`,
        rating: 4.9,
        distance: '2.1 km',
        price: 399,
        currency: 'INR',
        interests: ['Movie', 'Cinema', 'Popcorn'],
        category: 'Movie',
        is_verified: true,
        is_favorite: false
      },
      {
        id: 'MOV002',
        type: 'PROFILE',
        user_id: 'usr_406',
        name: 'Sneha',
        full_name: 'Sneha Sharma',
        age: 25,
        gender: 'Female',
        profile_image: `${baseUrl}/uploads/sneha.jpg`,
        image: `${baseUrl}/uploads/sneha.jpg`,
        avatar: `${baseUrl}/uploads/sneha.jpg`,
        rating: 4.7,
        distance: '2.6 km',
        price: 399,
        currency: 'INR',
        interests: ['Movie', 'Sci-Fi', 'Gaming'],
        category: 'Movie',
        is_verified: true,
        is_favorite: false
      }
    ];

    return {
      category_id: 'cat_04',
      category: 'Movie',
      title: 'Movie WithMe',
      image: `${baseUrl}/uploads/categories/movie.png`,
      count: movieItems.length,
      items: movieItems
    };
  }

  // 5. Event (cat_05, event, 5)
  if (param === 'cat_05' || param === 'event' || param === '5' || param.includes('event')) {
    const eventItems = [
      {
        id: 'EVT001',
        type: 'PROFILE',
        user_id: 'usr_102',
        name: 'Anjali',
        full_name: 'Anjali Sharma',
        age: 24,
        gender: 'Female',
        profile_image: `${baseUrl}/uploads/anjali.jpg`,
        image: `${baseUrl}/uploads/anjali.jpg`,
        avatar: `${baseUrl}/uploads/anjali.jpg`,
        rating: 4.9,
        distance: '1.7 km',
        price: 599,
        currency: 'INR',
        interests: ['Event', 'Live Music', 'Festivals'],
        category: 'Event',
        is_verified: true,
        is_favorite: false
      }
    ];

    return {
      category_id: 'cat_05',
      category: 'Event',
      title: 'Event WithMe',
      image: `${baseUrl}/uploads/categories/event.png`,
      count: eventItems.length,
      items: eventItems
    };
  }

  // 6. Conversation (cat_06, conversation, 6)
  if (param === 'cat_06' || param === 'conversation' || param === '6' || param.includes('conversation')) {
    const convItems = [
      {
        id: 'CNV001',
        type: 'PROFILE',
        user_id: 'usr_203',
        name: 'Priya',
        full_name: 'Priya Sharma',
        age: 23,
        gender: 'Female',
        profile_image: `${baseUrl}/uploads/priya.jpg`,
        image: `${baseUrl}/uploads/priya.jpg`,
        avatar: `${baseUrl}/uploads/priya.jpg`,
        rating: 4.8,
        distance: '1.2 km',
        price: 299,
        currency: 'INR',
        interests: ['Conversation', 'Philosophy', 'Reading'],
        category: 'Conversation',
        is_verified: true,
        is_favorite: false
      }
    ];

    return {
      category_id: 'cat_06',
      category: 'Conversation',
      title: 'Conversation WithMe',
      image: `${baseUrl}/uploads/categories/conversation.png`,
      count: convItems.length,
      items: convItems
    };
  }

  // Default fallback to Coffee
  return getCategoryItemsData('cat_01', baseUrl);
};

// Category Items Handler for GET requests
const handleCategoryDetailsOrList = (req, res) => {
  const baseUrl = getBaseUrl(req);
  const requestedCat = req.params.id || req.params.category || req.query.category || req.query.id || req.query.category_id || req.query.type || 'cat_01';
  const data = getCategoryItemsData(requestedCat, baseUrl);

  return res.status(200).json({
    success: true,
    message: `${data.category} activity profiles fetched successfully`,
    category_id: data.category_id,
    category: data.category,
    title: data.title,
    image: data.image,
    count: data.count,
    items: data.items,
    data: {
      category_id: data.category_id,
      category: data.category,
      title: data.title,
      image: data.image,
      count: data.count,
      items: data.items
    }
  });
};

// 5.0 All-In-One Combined Activities API — GET (/api/v1/activities/all-in-one, /api/v1/activities/combined, /api/v1/activities/dashboard, /api/v1/activities)
const handleCombinedActivities = (req, res) => {
  // If client passes category filter e.g. /activities?category=Coffee or /activities?id=cat_01
  if (req.query && (req.query.category || req.query.category_id)) {
    return handleCategoryDetailsOrList(req, res);
  }

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

router.get('/category/:id/items', authenticateToken, handleCategoryDetailsOrList);
router.get('/category/:id/partners', authenticateToken, handleCategoryDetailsOrList);
router.get('/category/:id', authenticateToken, handleCategoryDetailsOrList);
router.get('/category-details/:id', authenticateToken, handleCategoryDetailsOrList);
router.get('/category-details', authenticateToken, handleCategoryDetailsOrList);
router.get('/category', authenticateToken, handleCategoryDetailsOrList);
router.get('/items', authenticateToken, handleCategoryDetailsOrList);
router.get('/list', authenticateToken, (req, res) => {
  if (req.query && (req.query.category || req.query.category_id || req.query.id || req.query.type)) {
    return handleCategoryDetailsOrList(req, res);
  }
  return handleCombinedActivities(req, res);
});
router.get('/coffee', authenticateToken, (req, res) => {
  req.params.id = 'cat_01';
  return handleCategoryDetailsOrList(req, res);
});
router.get('/dinner', authenticateToken, (req, res) => {
  req.params.id = 'cat_02';
  return handleCategoryDetailsOrList(req, res);
});
router.get('/travel', authenticateToken, (req, res) => {
  req.params.id = 'cat_03';
  return handleCategoryDetailsOrList(req, res);
});
router.get('/movie', authenticateToken, (req, res) => {
  req.params.id = 'cat_04';
  return handleCategoryDetailsOrList(req, res);
});
router.get('/event', authenticateToken, (req, res) => {
  req.params.id = 'cat_05';
  return handleCategoryDetailsOrList(req, res);
});
router.get('/conversation', authenticateToken, (req, res) => {
  req.params.id = 'cat_06';
  return handleCategoryDetailsOrList(req, res);
});

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
        `${baseUrl}/uploads/priya3.jpg`,
        `${baseUrl}/uploads/priya4.jpg`
      ],
      photos: [
        `${baseUrl}/uploads/priya.jpg`,
        `${baseUrl}/uploads/priya2.jpg`,
        `${baseUrl}/uploads/priya3.jpg`,
        `${baseUrl}/uploads/priya4.jpg`
      ],
      interests: [
        { name: 'Coffee', icon: 'coffee' },
        { name: 'Travel', icon: 'flight' },
        { name: 'Music', icon: 'music_note' }
      ],
      available_for: [
        { name: 'Coffee', icon: 'coffee', price: 999, currency: 'INR' },
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
      `${baseUrl}/uploads/priya3.jpg`,
      `${baseUrl}/uploads/priya4.jpg`
    ],
    photos: [
      `${baseUrl}/uploads/priya.jpg`,
      `${baseUrl}/uploads/priya2.jpg`,
      `${baseUrl}/uploads/priya3.jpg`,
      `${baseUrl}/uploads/priya4.jpg`
    ],
    interests: [
      { name: 'Coffee', icon: 'coffee' },
      { name: 'Travel', icon: 'flight' },
      { name: 'Music', icon: 'music_note' }
    ],
    available_for: [
      { name: 'Coffee', icon: 'coffee', price: 999, currency: 'INR' },
      { name: 'Dinner', icon: 'restaurant', price: 499, currency: 'INR' },
      { name: 'Travel', icon: 'flight', price: 699, currency: 'INR' }
    ]
  };
};

// 5. Product Details API — GET (/activities/product-details/:id, /activities/product-details, /activities/available-for/:id, /activities/available-for)
const handleProductDetails = (req, res) => {
  const baseUrl = getBaseUrl(req);
  const targetId = req.params.id || req.query.id || req.query.userId || 'usr_203';
  const partnerProfile = getPartnerProfileById(targetId, baseUrl);

  return res.status(200).json({
    success: true,
    message: 'Profile details fetched successfully',
    available_for: partnerProfile.available_for,
    data: partnerProfile,
    id: partnerProfile.id,
    name: partnerProfile.name,
    age: partnerProfile.age,
    gender: partnerProfile.gender,
    verified: partnerProfile.verified,
    location: partnerProfile.location,
    rating: partnerProfile.rating,
    total_reviews: partnerProfile.total_reviews,
    profile_image: partnerProfile.profile_image,
    profile_images: partnerProfile.profile_images,
    photos: partnerProfile.photos,
    about: partnerProfile.about,
    interests: partnerProfile.interests
  });
};

const handleAvailableForOnly = (req, res) => {
  const baseUrl = getBaseUrl(req);
  const targetId = req.params.id || req.query.id || req.query.userId || 'usr_203';
  const partnerProfile = getPartnerProfileById(targetId, baseUrl);

  return res.status(200).json({
    success: true,
    message: 'Available activities options fetched successfully',
    available_for: partnerProfile.available_for,
    data: {
      userId: partnerProfile.id,
      name: partnerProfile.name,
      available_for: partnerProfile.available_for
    }
  });
};

router.get('/product-details/:id', authenticateToken, handleProductDetails);
router.get('/product-details', authenticateToken, handleProductDetails);
router.get('/available-for/:id', authenticateToken, handleAvailableForOnly);
router.get('/available-for', authenticateToken, handleAvailableForOnly);

module.exports = router;
