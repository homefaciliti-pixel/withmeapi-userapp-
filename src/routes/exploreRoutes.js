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

// Pools of unique placeholder images for partners without real photos (all served from /uploads/)
// Amit and Priya photos are strictly reserved for their own profiles and NEVER used here
const FEMALE_PLACEHOLDER_POOL = [
  'ananya.jpg', 'anjali.jpg', 'riya.jpg', 'neha.jpg', 'sneha.jpg',
  'kavya.jpg', 'pooja.jpg', 'tanvi.jpg', 'isha.jpg', 'nancy.jpg',
  'janvi.jpg', 'rashi.jpg', 'ayesha.jpg', 'divya.jpg', 'aarti.jpg',
  'rita.jpg', 'rachana.jpg', 'payal.jpg', 'simran.jpg', 'sonal.jpg',
  'megha.jpg', 'shreya.jpg', 'kritika.jpg', 'pallavi.jpg', 'aditi.jpg',
  'trisha.jpg', 'live1.jpg'
];

const MALE_PLACEHOLDER_POOL = [
  'aarav.jpg', 'rohan.jpg', 'ajith.jpg', 'kashyap.jpg', 'varsha_m.jpg',
  'user101.jpg', 'user102.jpg', 'profile1.jpg', 'profile2.jpg', 'profile3.jpg'
];

function isGenericPlaceholder(url) {
  if (!url || typeof url !== 'string') return true;
  const clean = url.toLowerCase().trim();
  return (
    clean === '' ||
    clean === 'null' ||
    clean === 'undefined' ||
    clean.includes('photo_1.jpg') ||
    clean.includes('example.com') ||
    clean.includes('default.jpg') ||
    clean.includes('placeholder.jpg') ||
    clean.includes('no_image.jpg') ||
    clean.includes('no-image.jpg') ||
    clean.includes('avatar.jpg')
  );
}

function getUniquePartnerPlaceholder(nameOrId, baseUrl, gender = '') {
  const isMale = String(gender || '').toLowerCase().startsWith('m');
  const pool = isMale ? MALE_PLACEHOLDER_POOL : FEMALE_PLACEHOLDER_POOL;
  const key = String(nameOrId || 'partner').toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) & 0xfffffff;
  }
  const idx = Math.abs(hash) % pool.length;
  return `${baseUrl}/uploads/${pool[idx]}`;
}

// Helper to format partner image — NEVER returns null
const formatPartnerPhoto = (photo, baseUrl = 'https://withmeapi-userapp.onrender.com', nameOrId = '', gender = '') => {
  if (!photo || photo === '' || photo === 'null' || photo === 'undefined') {
    return getUniquePartnerPlaceholder(nameOrId, baseUrl, gender);
  }
  if (Array.isArray(photo)) {
    photo = photo.find(p => p && typeof p === 'string' && p.trim() !== '' && !isGenericPlaceholder(p)) || photo[0];
  }
  if (typeof photo === 'object' && photo !== null) {
    photo = photo.url || photo.uri || photo.path || photo.profile_image || photo.image || photo.profile_photo_url;
  }
  if (typeof photo !== 'string' || !photo.trim()) {
    return getUniquePartnerPlaceholder(nameOrId, baseUrl, gender);
  }
  photo = photo.trim();

  // Generic placeholder detected — use deterministic unique gender-matched photo
  if (isGenericPlaceholder(photo)) {
    return getUniquePartnerPlaceholder(nameOrId, baseUrl, gender);
  }

  if (photo.startsWith('http://') || photo.startsWith('https://')) {
    if (photo.includes('localhost') || photo.includes('127.0.0.1') || photo.includes('10.0.2.2')) {
      const urlPath = photo.substring(photo.indexOf('/', photo.indexOf('://') + 3));
      return `${baseUrl}${urlPath}`;
    }
    return photo;
  }

  if (photo.startsWith('/uploads/')) {
    return `${baseUrl}${photo}`;
  }
  if (photo.startsWith('uploads/')) {
    return `${baseUrl}/${photo}`;
  }
  if (photo.startsWith('/')) {
    return `${baseUrl}${photo}`;
  }
  return `${baseUrl}/uploads/${photo}`;
};

// Fetch real registered partners from dedicated MySQL table `withme_partners`
// categoryFilter is optional — when supplied only matching partners are returned from DB
const fetchExploreDbPartners = async (baseUrl, categoryFilter = '') => {
  try {
    let sql = `
      SELECT id, partner_id, user_id, name, full_name, email, mobile_number, phone_number, city, state, locality, address, image, profile_photo_url, gender, age, rating, total_reviews, category, activity, price, currency, about, interests, photos, available_for, status, is_approved, is_verified
      FROM withme_partners
      WHERE (status IS NULL OR status NOT IN ('DELETED','REJECTED','SUSPENDED','DUPLICATE_DELETED')) AND is_approved = 1 AND is_verified = 1
    `;
    const params = [];

    // Push category filter into the SQL query instead of relying only on JS-side filter.
    // This avoids returning all partners and discarding them in JS when the DB has many rows.
    if (categoryFilter) {
      sql += ` AND (
        LOWER(category) LIKE ? OR
        LOWER(activity) LIKE ? OR
        LOWER(interests) LIKE ?
      )`;
      const likeTerm = `%${categoryFilter}%`;
      params.push(likeTerm, likeTerm, likeTerm);
    }

    sql += ` ORDER BY id DESC LIMIT 100`;

    const rows = await query(sql, params);

    if (!rows || rows.length === 0) return [];

    // Deduplicate partners by normalized name so duplicates never appear
    const seenNames = new Set();
    const uniqueRows = [];
    for (const r of rows) {
      const normName = String(r.name || r.full_name || '').toLowerCase().trim();
      if (normName && seenNames.has(normName)) {
        continue;
      }
      if (normName) seenNames.add(normName);
      uniqueRows.push(r);
    }

    return uniqueRows.map((r, index) => {
      const nameOrId = r.name || r.full_name || r.partner_id || String(r.id);
      const gender = r.gender ? (r.gender.charAt(0).toUpperCase() + r.gender.slice(1).toLowerCase()) : ''; 
      const rawPhoto = r.image || r.profile_photo_url;
      const photoUrl = formatPartnerPhoto(rawPhoto, baseUrl, nameOrId, gender);
      const city = r.city ? r.city.trim() : ''; 
      const partnerCategory = r.category || r.activity || ''; 
      const isCoffee = partnerCategory.toLowerCase().includes('coffee');

      let parsedInterests = [];
      try {
        if (r.interests) parsedInterests = typeof r.interests === 'string' ? JSON.parse(r.interests) : r.interests;
      } catch (e) {}

      let parsedPhotos = [];
      try {
        const rawP = r.photos || r.profile_images || r.images || [];
        const photoValues = typeof rawP === 'string' ? JSON.parse(rawP) : rawP;
        if (Array.isArray(photoValues)) {
          parsedPhotos = photoValues
            .map(p => {
              const pUrl = typeof p === 'string' ? p : (p && (p.url || p.uri || p.path || p.image));
              if (!pUrl || isGenericPlaceholder(pUrl)) return null;
              return formatPartnerPhoto(pUrl, baseUrl, nameOrId, gender);
            })
            .filter(Boolean);
        }
      } catch (e) {}
      // Include the primary image once, then preserve the uploaded gallery order (max 5 images).
      const allPhotos = (!isGenericPlaceholder(rawPhoto) && photoUrl)
        ? [photoUrl, ...parsedPhotos]
        : (parsedPhotos.length > 0 ? parsedPhotos : [photoUrl]);
      parsedPhotos = [...new Set(allPhotos.filter(Boolean))].slice(0, 5);
      const primaryPhoto = photoUrl || parsedPhotos[0] || getUniquePartnerPlaceholder(nameOrId, baseUrl, gender);

      return {
        user_id: r.user_id || `usr_${r.id}`,
        id: `exp_db_${r.id}`,
        partner_id: r.id,
        type: index % 2 === 0 ? 'PROFILE' : 'ACTIVITY',
        title: `${partnerCategory} WithMe`,
        activity: partnerCategory,
        name: (r.name || r.full_name || 'Partner').trim(),
        full_name: (r.full_name || r.name || 'Partner').trim(),
        age: r.age || null,
        gender: gender,
        interests: parsedInterests,
        rating: r.rating == null ? null : parseFloat(r.rating),
        price: (r.price && Number(r.price) > 1) ? Number(r.price) : (isCoffee ? 999 : 499),
        currency: 'INR',
        category: partnerCategory,
        distance: '1.5 km away',
        location: city,
        image: primaryPhoto,
        avatar: primaryPhoto,
        profile_image: primaryPhoto,
        profile_images: parsedPhotos,
        photos: parsedPhotos
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

  const rawCat = (req.query.category_id || req.query.categoryId || req.query.id || req.query.category || req.query.activity || req.query.type || '').trim().toLowerCase();
  let categoryFilter = rawCat;
  if (rawCat === 'cat_01' || rawCat === '1') categoryFilter = 'coffee';
  else if (rawCat === 'cat_02' || rawCat === '2') categoryFilter = 'dinner';
  else if (rawCat === 'cat_03' || rawCat === '3') categoryFilter = 'travel';
  else if (rawCat === 'cat_04' || rawCat === '4') categoryFilter = 'movie';
  else if (rawCat === 'cat_05' || rawCat === '5') categoryFilter = 'event';
  else if (rawCat === 'cat_06' || rawCat === '6') categoryFilter = 'conversation';
  else if (rawCat === 'cat_07' || rawCat === '7' || rawCat.includes('offer')) categoryFilter = 'offers';

  // Pass categoryFilter into DB query so only matching partners are fetched
  const dbPartners = await fetchExploreDbPartners(baseUrl, categoryFilter);

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
      price: 999,
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
        `${baseUrl}/uploads/priya1.jpg`,
        `${baseUrl}/uploads/priya2.jpg`,
        `${baseUrl}/uploads/priya3.jpg`,
        `${baseUrl}/uploads/priya4.jpg`
      ],
      photos: [
        `${baseUrl}/uploads/priya.jpg`,
        `${baseUrl}/uploads/priya1.jpg`,
        `${baseUrl}/uploads/priya2.jpg`,
        `${baseUrl}/uploads/priya3.jpg`,
        `${baseUrl}/uploads/priya4.jpg`
      ]
    },
    {
      user_id: 'usr_102',
      id: 'exp_4',
      type: 'PROFILE',
      name: 'Anjali Sharma',
      age: 24,
      gender: 'Female',
      interests: ['Dinner', 'Fine Dining', 'Food'],
      rating: 4.9,
      price: 499,
      currency: 'INR',
      category: 'Dinner',
      distance: '1.5 km away',
      image: `${baseUrl}/uploads/anjali.jpg`,
      avatar: `${baseUrl}/uploads/anjali.jpg`,
      profile_image: `${baseUrl}/uploads/anjali.jpg`
    },
    {
      user_id: 'usr_305',
      id: 'exp_5',
      type: 'PROFILE',
      name: 'Sneha Verma',
      age: 23,
      gender: 'Female',
      interests: ['Offers', 'Special Deal', 'Discount'],
      rating: 4.9,
      price: 1,
      currency: 'INR',
      category: 'Offers',
      distance: '1.1 km away',
      image: `${baseUrl}/uploads/sneha.jpg`,
      avatar: `${baseUrl}/uploads/sneha.jpg`,
      profile_image: `${baseUrl}/uploads/sneha.jpg`
    }
  ];

  // Apply strict category filtering
  let items;
  if (categoryFilter) {
    if (categoryFilter === 'offers' || categoryFilter === 'offer') {
      items = dbPartners.filter(item => {
        const cat = (item.category || '').toLowerCase();
        const act = (item.activity || '').toLowerCase();
        return cat.includes('offer') || act.includes('offer');
      });
    } else {
      // Filter both dbPartners and default feed for the exact category
      const combined = dbPartners;
      items = combined.filter(item => {
        if (item.category && item.category.toLowerCase().includes(categoryFilter)) return true;
        if (item.activity && item.activity.toLowerCase().includes(categoryFilter)) return true;
        if (item.interests && item.interests.some(i => i.toLowerCase().includes(categoryFilter))) return true;
        return false;
      });
    }
  } else {
    // No category filter — return full default feed / all partners
    items = dbPartners;
  }

  return res.status(200).json({
    success: true,
    page,
    limit,
    count: items.length,
    category_filter: categoryFilter || null,
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

  const exploreFeed = dbPartners.length > 0 ? dbPartners : defaultExploreFeed;

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
