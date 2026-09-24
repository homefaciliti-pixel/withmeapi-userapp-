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

// Helper to fetch all registered partners from dedicated MySQL table `withme_partners`
const fetchRegisteredPartnersFromDb = async (baseUrl = 'https://withmeapi-userapp.onrender.com') => {
  try {
    const rows = await query(`
      SELECT id, partner_id, user_id, name, full_name, email, mobile_number, phone_number, city, state, locality, address, image, profile_photo_url, gender, age, rating, total_reviews, category, activity, price, currency, about, interests, photos, available_for, status, is_approved
      FROM withme_partners
      WHERE is_approved = 1 AND status = 'ACTIVE'
      ORDER BY id DESC
      LIMIT 100
    `);

    if (!rows || rows.length === 0) return [];

    return rows.map(r => {
      const photoUrl = formatPartnerPhoto(r.image || r.profile_photo_url, baseUrl);
      const gender = r.gender ? (r.gender.charAt(0).toUpperCase() + r.gender.slice(1).toLowerCase()) : 'Female';
      const city = r.city ? r.city.trim() : 'Jaipur';
      const locality = r.locality ? r.locality.trim() : 'Vaishali Nagar';
      const partnerCategory = r.category || r.activity || 'Coffee';

      let parsedInterests = ['Coffee', 'Travel', 'Music'];
      try {
        if (r.interests) parsedInterests = typeof r.interests === 'string' ? JSON.parse(r.interests) : r.interests;
      } catch (e) {}

      let parsedPhotos = [photoUrl, `${baseUrl}/uploads/priya.jpg`];
      try {
        if (r.photos) {
          const rawP = typeof r.photos === 'string' ? JSON.parse(r.photos) : r.photos;
          parsedPhotos = rawP.map(p => formatPartnerPhoto(typeof p === 'string' ? p : p.url, baseUrl));
        }
      } catch (e) {}

      let parsedAvailableFor = [
        { name: 'Coffee', icon: 'coffee', price: 1, currency: 'INR' },
        { name: 'Dinner', icon: 'restaurant', price: 499, currency: 'INR' },
        { name: 'Travel', icon: 'flight', price: 699, currency: 'INR' }
      ];
      try {
        if (r.available_for) parsedAvailableFor = typeof r.available_for === 'string' ? JSON.parse(r.available_for) : r.available_for;
      } catch (e) {}

      return {
        id: r.partner_id || `usr_${r.id}`,
        user_id: r.user_id || `usr_${r.id}`,
        partner_id: r.id,
        db_id: r.id,
        type: 'partner',
        name: (r.name || r.full_name || 'Partner').trim(),
        full_name: (r.full_name || r.name || 'Partner').trim(),
        gender: gender,
        age: r.age || 24,
        city: city,
        location: city,
        address: r.address || `${locality}, ${city}`,
        detailed_location: {
          city: city,
          state: r.state || 'Rajasthan',
          country: 'India',
          address: r.address || `${locality}, ${city}`
        },
        rating: parseFloat(r.rating || 4.8),
        total_reviews: parseInt(r.total_reviews || 120),
        match_score: '93%',
        distance: '1.5 km away',
        price: 1,
        currency: 'INR',
        price_type: 'session',
        activity: partnerCategory,
        category: partnerCategory,
        interests: parsedInterests,
        available_for: parsedAvailableFor,
        is_verified: true,
        is_approved: true,
        approval_status: 'approved',
        status: 'available',
        is_favorite: false,
        profile_image: photoUrl,
        image: photoUrl,
        avatar: photoUrl,
        profile_images: parsedPhotos,
        photos: parsedPhotos,
        about: r.about || `Friendly partner available in ${city}. Loves cafes and social meetups.`
      };
    });
  } catch (err) {
    console.warn('MySQL fetch registered withme partners notice:', err.message);
    return [];
  }
};

// Helper to get data for all sections
const getCombinedActivitiesData = async (req) => {
  const baseUrl = getBaseUrl(req);
  const { q = '', location = '', category = '' } = req.query || {};

  // Fetch real registered partners from MySQL
  const dbPartners = await fetchRegisteredPartnersFromDb(baseUrl);

  const planning_today = [
    { id: 'cat_01', title: 'Coffee', image: `${baseUrl}/uploads/categories/coffee.png` },
    { id: 'cat_02', title: 'Dinner', image: `${baseUrl}/uploads/categories/dinner.png` },
    { id: 'cat_03', title: 'Travel', image: `${baseUrl}/uploads/categories/travel.png` },
    { id: 'cat_04', title: 'Movie', image: `${baseUrl}/uploads/categories/movie.png` },
    { id: 'cat_05', title: 'Event', image: `${baseUrl}/uploads/categories/event.png` },
    { id: 'cat_06', title: 'Conversation', image: `${baseUrl}/uploads/categories/conversation.png` }
  ];

  const defaultSearch = [
    {
      type: 'partner',
      id: 'usr_301',
      name: 'Priya',
      city: location || 'Jaipur',
      rating: 4.8,
      price: 1,
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
      price: 1,
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
      price: 1,
      currency: 'INR',
      price_type: 'session',
      image: `${baseUrl}/uploads/riya.jpg`,
      is_verified: true,
      interests: ['Coffee', 'Coding'],
      status: 'available'
    }
  ];

  const dbSearch = dbPartners.map(p => ({
    type: 'partner',
    id: p.id,
    user_id: p.user_id,
    name: p.name,
    city: p.city || location || 'Jaipur',
    rating: p.rating,
    price: 1,
    currency: 'INR',
    price_type: 'session',
    image: p.image,
    profile_image: p.profile_image,
    is_verified: true,
    interests: p.interests,
    status: 'available'
  }));

  const search = [...dbSearch, ...defaultSearch];

  const popular_activities = [
    {
      id: 'act_top1',
      title: 'Coffee WithMe',
      name: 'Coffee WithMe',
      category: 'Social',
      participants_count: 1420,
      rating: 4.9,
      price: 1,
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

  const defaultRecommended = [
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

  const dbRecommended = dbPartners.map(p => ({
    user_id: p.user_id,
    name: p.name,
    age: p.age,
    rating: p.rating,
    price: 1,
    currency: 'INR',
    match_score: p.match_score,
    interests: p.interests,
    location: p.city,
    profile_image: p.profile_image,
    image: p.image,
    avatar: p.avatar
  }));

  const recommended_partners = [...dbRecommended, ...defaultRecommended];

  return {
    planning_today,
    search,
    popular_activities,
    recommended_partners
  };
};

// Category Items Data Generator
const getCategoryItemsData = async (categoryIdOrName = 'cat_01', baseUrl = 'https://withmeapi-userapp.onrender.com') => {
  const param = String(categoryIdOrName || 'cat_01').trim().toLowerCase();
  const dbPartners = await fetchRegisteredPartnersFromDb(baseUrl);

  const mapDbPartnersToCategory = (catName, defaultPrice = 499) => {
    return dbPartners.map(p => ({
      id: p.id,
      type: 'PROFILE',
      user_id: p.user_id,
      name: p.name,
      full_name: p.full_name,
      age: p.age,
      gender: p.gender,
      profile_image: p.profile_image,
      image: p.image,
      avatar: p.avatar,
      rating: p.rating,
      distance: p.distance,
      price: (catName.toLowerCase() === 'coffee') ? 1 : defaultPrice,
      currency: 'INR',
      interests: p.interests,
      category: catName,
      is_verified: true,
      is_favorite: false
    }));
  };

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
        price: 1,
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
        price: 1,
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
        price: 1,
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
        price: 1,
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
        price: 1,
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
        price: 1,
        currency: 'INR',
        interests: ['Coffee', 'Fitness', 'Gaming'],
        category: 'Coffee',
        is_verified: true,
        is_favorite: false
      }
    ];

    const allItems = [...mapDbPartnersToCategory('Coffee', 1), ...coffeeItems];

    return {
      category_id: 'cat_01',
      category: 'Coffee',
      title: 'Coffee WithMe',
      image: `${baseUrl}/uploads/categories/coffee.png`,
      count: allItems.length,
      items: allItems
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

    const allItems = [...mapDbPartnersToCategory('Dinner', 499), ...dinnerItems];

    return {
      category_id: 'cat_02',
      category: 'Dinner',
      title: 'Dinner WithMe',
      image: `${baseUrl}/uploads/categories/dinner.png`,
      count: allItems.length,
      items: allItems
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

    const allItems = [...mapDbPartnersToCategory('Travel', 699), ...travelItems];

    return {
      category_id: 'cat_03',
      category: 'Travel',
      title: 'Travel WithMe',
      image: `${baseUrl}/uploads/categories/travel.png`,
      count: allItems.length,
      items: allItems
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

    const allItems = [...mapDbPartnersToCategory('Movie', 399), ...movieItems];

    return {
      category_id: 'cat_04',
      category: 'Movie',
      title: 'Movie WithMe',
      image: `${baseUrl}/uploads/categories/movie.png`,
      count: allItems.length,
      items: allItems
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

    const allItems = [...mapDbPartnersToCategory('Event', 499), ...eventItems];

    return {
      category_id: 'cat_05',
      category: 'Event',
      title: 'Event WithMe',
      image: `${baseUrl}/uploads/categories/event.png`,
      count: allItems.length,
      items: allItems
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
        price: 199,
        currency: 'INR',
        interests: ['Conversation', 'Philosophy', 'Reading'],
        category: 'Conversation',
        is_verified: true,
        is_favorite: false
      }
    ];

    const allItems = [...mapDbPartnersToCategory('Conversation', 199), ...convItems];

    return {
      category_id: 'cat_06',
      category: 'Conversation',
      title: 'Conversation WithMe',
      image: `${baseUrl}/uploads/categories/conversation.png`,
      count: allItems.length,
      items: allItems
    };
  }

  // Default fallback to Coffee
  return await getCategoryItemsData('cat_01', baseUrl);
};

// Category Items Handler for GET requests
const handleCategoryDetailsOrList = async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const requestedCat = req.params.id || req.params.category || req.query.category || req.query.id || req.query.category_id || req.query.type || 'cat_01';
  const data = await getCategoryItemsData(requestedCat, baseUrl);

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
const handleCombinedActivities = async (req, res) => {
  // If client passes category filter e.g. /activities?category=Coffee or /activities?id=cat_01
  if (req.query && (req.query.category || req.query.category_id)) {
    return handleCategoryDetailsOrList(req, res);
  }

  const combinedData = await getCombinedActivitiesData(req);
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
router.get('/list', authenticateToken, async (req, res) => {
  if (req.query && (req.query.category || req.query.category_id || req.query.id || req.query.type)) {
    return handleCategoryDetailsOrList(req, res);
  }
  return handleCombinedActivities(req, res);
});
router.get('/coffee', authenticateToken, async (req, res) => {
  req.params.id = 'cat_01';
  return handleCategoryDetailsOrList(req, res);
});
router.get('/dinner', authenticateToken, async (req, res) => {
  req.params.id = 'cat_02';
  return handleCategoryDetailsOrList(req, res);
});
router.get('/travel', authenticateToken, async (req, res) => {
  req.params.id = 'cat_03';
  return handleCategoryDetailsOrList(req, res);
});
router.get('/movie', authenticateToken, async (req, res) => {
  req.params.id = 'cat_04';
  return handleCategoryDetailsOrList(req, res);
});
router.get('/event', authenticateToken, async (req, res) => {
  req.params.id = 'cat_05';
  return handleCategoryDetailsOrList(req, res);
});
router.get('/conversation', authenticateToken, async (req, res) => {
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
router.get('/search', authenticateToken, async (req, res) => {
  const { q = '', location = '', category = '' } = req.query;
  const combinedData = await getCombinedActivitiesData(req);

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
router.get('/popular-activities', authenticateToken, async (req, res) => {
  const combinedData = await getCombinedActivitiesData(req);

  return res.status(200).json({
    success: true,
    count: combinedData.popular_activities.length,
    activities: combinedData.popular_activities
  });
});

// 4. Recommended Partner List API — GET
router.get('/recommended-partners', authenticateToken, async (req, res) => {
  const combinedData = await getCombinedActivitiesData(req);

  return res.status(200).json({
    success: true,
    partners: combinedData.recommended_partners
  });
});

// Mock detailed user profile catalog for product-details endpoint
// Dynamic helper to resolve partner details by ID or Name
const getPartnerProfileById = async (targetId = '101', baseUrl = 'https://withmeapi-userapp.onrender.com') => {
  const cleanId = String(targetId).trim().toLowerCase();
  const rawId = cleanId.replace(/^usr_/, '').trim();

  // Check MySQL withme_partners first for real registered partner details
  try {
    const isNum = !isNaN(rawId) && rawId !== '';
    let dbRows = [];
    if (isNum) {
      dbRows = await query('SELECT * FROM withme_partners WHERE id = ? OR partner_id = ? LIMIT 1', [parseInt(rawId), targetId]);
    }
    if (!dbRows || dbRows.length === 0) {
      dbRows = await query('SELECT * FROM withme_partners WHERE partner_id = ? OR user_id = ? OR name LIKE ? LIMIT 1', [targetId, targetId, `%${targetId}%`]);
    }

    if (dbRows && dbRows.length > 0) {
      const r = dbRows[0];
      const photoUrl = formatPartnerPhoto(r.image || r.profile_photo_url, baseUrl);
      const gender = r.gender ? (r.gender.charAt(0).toUpperCase() + r.gender.slice(1).toLowerCase()) : 'Female';
      const city = r.city ? r.city.trim() : 'Jaipur';
      const locality = r.locality ? r.locality.trim() : 'Vaishali Nagar';
      const partnerCategory = r.category || r.activity || 'Coffee';

      let parsedInterests = [
        { name: partnerCategory, icon: 'coffee' },
        { name: 'Travel', icon: 'flight' },
        { name: 'Music', icon: 'music_note' }
      ];
      try {
        if (r.interests) {
          const rawI = typeof r.interests === 'string' ? JSON.parse(r.interests) : r.interests;
          parsedInterests = rawI.map(i => typeof i === 'string' ? { name: i, icon: 'coffee' } : i);
        }
      } catch (e) {}

      let parsedPhotos = [photoUrl, `${baseUrl}/uploads/priya.jpg`];
      try {
        if (r.photos) {
          const rawP = typeof r.photos === 'string' ? JSON.parse(r.photos) : r.photos;
          parsedPhotos = rawP.map(p => formatPartnerPhoto(typeof p === 'string' ? p : p.url, baseUrl));
        }
      } catch (e) {}

      let parsedAvailableFor = [
        { name: 'Coffee', icon: 'coffee', price: 1, currency: 'INR' },
        { name: 'Dinner', icon: 'restaurant', price: 499, currency: 'INR' },
        { name: 'Travel', icon: 'flight', price: 699, currency: 'INR' }
      ];
      try {
        if (r.available_for) parsedAvailableFor = typeof r.available_for === 'string' ? JSON.parse(r.available_for) : r.available_for;
      } catch (e) {}

      return {
        id: r.partner_id || `usr_${r.id}`,
        partner_id: r.id,
        db_id: r.id,
        name: (r.name || r.full_name || 'Partner').trim(),
        full_name: (r.full_name || r.name || 'Partner').trim(),
        age: r.age || 24,
        gender: gender,
        verified: true,
        city: city,
        location: {
          city: city,
          state: r.state || 'Rajasthan',
          country: 'India',
          address: r.address || `${locality}, ${city}`
        },
        rating: parseFloat(r.rating || 4.8),
        total_reviews: parseInt(r.total_reviews || 120),
        about: r.about || `Friendly partner available in ${city}. Passionate about cafes, meetups, and activities.`,
        profile_image: photoUrl,
        image: photoUrl,
        avatar: photoUrl,
        profile_images: parsedPhotos,
        photos: parsedPhotos,
        interests: parsedInterests,
        available_for: parsedAvailableFor
      };
    }
  } catch (err) {
    console.warn('DB getPartnerProfileById notice:', err.message);
  }

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
        { name: 'Coffee', icon: 'coffee', price: 1, currency: 'INR' },
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
        { name: 'Coffee', icon: 'coffee', price: 1, currency: 'INR' },
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
        { name: 'Coffee & Code', icon: 'coffee', price: 1, currency: 'INR' },
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
        { name: 'Coffee', icon: 'coffee', price: 1, currency: 'INR' },
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
        { name: 'Coffee', icon: 'coffee', price: 1, currency: 'INR' },
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
      { name: 'Coffee', icon: 'coffee', price: 1, currency: 'INR' },
      { name: 'Dinner', icon: 'restaurant', price: 499, currency: 'INR' },
      { name: 'Travel', icon: 'flight', price: 699, currency: 'INR' }
    ]
  };
};

// 5. Product Details API — GET (/activities/product-details/:id, /activities/product-details, /activities/available-for/:id, /activities/available-for)
const handleProductDetails = async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const targetId = req.params.id || req.query.id || req.query.userId || 'usr_203';
  const partnerProfile = await getPartnerProfileById(targetId, baseUrl);

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

const handleAvailableForOnly = async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const targetId = req.params.id || req.query.id || req.query.userId || 'usr_203';
  const partnerProfile = await getPartnerProfileById(targetId, baseUrl);

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
