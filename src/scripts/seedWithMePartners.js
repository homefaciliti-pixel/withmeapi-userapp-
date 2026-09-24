const { query } = require('../config/db');

async function seedWithMePartners() {
  try {
    const check = await query('SELECT COUNT(*) as count FROM withme_partners');
    if (check[0].count > 0) {
      console.log(`withme_partners table already has ${check[0].count} partners.`);
      process.exit(0);
    }

    console.log('Seeding initial WithMe companion partners...');
    const partners = [
      {
        partner_id: 'usr_203',
        user_id: 'usr_203',
        name: 'Priya Sharma',
        full_name: 'Priya Sharma',
        email: 'priya.sharma@withme.app',
        mobile_number: '9876500001',
        phone_number: '9876500001',
        gender: 'Female',
        age: 23,
        city: 'Jaipur',
        state: 'Rajasthan',
        locality: 'Malviya Nagar',
        address: 'Malviya Nagar, Jaipur, Rajasthan',
        image: '/uploads/priya.jpg',
        profile_photo_url: '/uploads/priya.jpg',
        category: 'Coffee',
        activity: 'Coffee',
        rating: 4.80,
        total_reviews: 120,
        price: 1,
        currency: 'INR',
        about: 'Friendly, outgoing and loves exploring new places, coffee meetups, and meeting people.',
        interests: JSON.stringify(['Coffee', 'Travel', 'Music']),
        photos: JSON.stringify(['/uploads/priya.jpg', '/uploads/priya2.jpg', '/uploads/priya3.jpg', '/uploads/priya4.jpg']),
        available_for: JSON.stringify([
          { name: 'Coffee', icon: 'coffee', price: 1, currency: 'INR' },
          { name: 'Dinner', icon: 'restaurant', price: 499, currency: 'INR' },
          { name: 'Travel', icon: 'flight', price: 699, currency: 'INR' }
        ]),
        kyc_status: 'VERIFIED',
        is_approved: 1,
        is_verified: 1,
        status: 'ACTIVE'
      },
      {
        partner_id: 'usr_201',
        user_id: 'usr_201',
        name: 'Ananya Verma',
        full_name: 'Ananya Verma',
        email: 'ananya.verma@withme.app',
        mobile_number: '9876500002',
        phone_number: '9876500002',
        gender: 'Female',
        age: 24,
        city: 'Jaipur',
        state: 'Rajasthan',
        locality: 'Vaishali Nagar',
        address: 'Vaishali Nagar, Jaipur, Rajasthan',
        image: '/uploads/ananya.jpg',
        profile_photo_url: '/uploads/ananya.jpg',
        category: 'Coffee',
        activity: 'Coffee',
        rating: 4.90,
        total_reviews: 150,
        price: 1,
        currency: 'INR',
        about: 'Loves acoustic music, coffee meetups, and weekend trekking trips.',
        interests: JSON.stringify(['Coffee', 'Music', 'Books']),
        photos: JSON.stringify(['/uploads/ananya.jpg', '/uploads/anjali.jpg']),
        available_for: JSON.stringify([
          { name: 'Coffee', icon: 'coffee', price: 1, currency: 'INR' },
          { name: 'Dinner', icon: 'restaurant', price: 499, currency: 'INR' },
          { name: 'Music', icon: 'music_note', price: 399, currency: 'INR' }
        ]),
        kyc_status: 'VERIFIED',
        is_approved: 1,
        is_verified: 1,
        status: 'ACTIVE'
      },
      {
        partner_id: 'usr_102',
        user_id: 'usr_102',
        name: 'Anjali Sharma',
        full_name: 'Anjali Sharma',
        email: 'anjali.sharma@withme.app',
        mobile_number: '9876500003',
        phone_number: '9876500003',
        gender: 'Female',
        age: 24,
        city: 'Jaipur',
        state: 'Rajasthan',
        locality: 'C-Scheme',
        address: 'C-Scheme, Jaipur, Rajasthan',
        image: '/uploads/anjali.jpg',
        profile_photo_url: '/uploads/anjali.jpg',
        category: 'Dinner',
        activity: 'Dinner',
        rating: 4.90,
        total_reviews: 135,
        price: 1,
        currency: 'INR',
        about: 'Loves social gatherings, food dates, and music events.',
        interests: JSON.stringify(['Dinner', 'Coffee', 'Events']),
        photos: JSON.stringify(['/uploads/anjali.jpg', '/uploads/ananya.jpg']),
        available_for: JSON.stringify([
          { name: 'Coffee', icon: 'coffee', price: 1, currency: 'INR' },
          { name: 'Dinner', icon: 'restaurant', price: 499, currency: 'INR' },
          { name: 'Event', icon: 'event', price: 599, currency: 'INR' }
        ]),
        kyc_status: 'VERIFIED',
        is_approved: 1,
        is_verified: 1,
        status: 'ACTIVE'
      },
      {
        partner_id: 'usr_404',
        user_id: 'usr_404',
        name: 'Riya Mehta',
        full_name: 'Riya Mehta',
        email: 'riya.mehta@withme.app',
        mobile_number: '9876500004',
        phone_number: '9876500004',
        gender: 'Female',
        age: 26,
        city: 'Mumbai',
        state: 'Maharashtra',
        locality: 'Bandra West',
        address: 'Bandra West, Mumbai, Maharashtra',
        image: '/uploads/riya.jpg',
        profile_photo_url: '/uploads/riya.jpg',
        category: 'Travel',
        activity: 'Travel',
        rating: 4.80,
        total_reviews: 145,
        price: 1,
        currency: 'INR',
        about: 'Tech enthusiast, guitarist, and outdoor trekking partner.',
        interests: JSON.stringify(['Travel', 'Trekking', 'Coding', 'Music']),
        photos: JSON.stringify(['/uploads/riya.jpg', '/uploads/neha.jpg']),
        available_for: JSON.stringify([
          { name: 'Coffee', icon: 'coffee', price: 1, currency: 'INR' },
          { name: 'Trekking', icon: 'hiking', price: 499, currency: 'INR' },
          { name: 'Travel', icon: 'flight', price: 699, currency: 'INR' }
        ]),
        kyc_status: 'VERIFIED',
        is_approved: 1,
        is_verified: 1,
        status: 'ACTIVE'
      },
      {
        partner_id: 'usr_405',
        user_id: 'usr_405',
        name: 'Neha Kapoor',
        full_name: 'Neha Kapoor',
        email: 'neha.kapoor@withme.app',
        mobile_number: '9876500005',
        phone_number: '9876500005',
        gender: 'Female',
        age: 23,
        city: 'Mumbai',
        state: 'Maharashtra',
        locality: 'Andheri West',
        address: 'Andheri West, Mumbai, Maharashtra',
        image: '/uploads/neha.jpg',
        profile_photo_url: '/uploads/neha.jpg',
        category: 'Movie',
        activity: 'Movie',
        rating: 4.90,
        total_reviews: 110,
        price: 1,
        currency: 'INR',
        about: 'Passionate about acoustic music, fashion, and cafe conversations.',
        interests: JSON.stringify(['Movie', 'Music', 'Coffee']),
        photos: JSON.stringify(['/uploads/neha.jpg', '/uploads/kavya.jpg']),
        available_for: JSON.stringify([
          { name: 'Coffee', icon: 'coffee', price: 1, currency: 'INR' },
          { name: 'Movie', icon: 'movie', price: 399, currency: 'INR' }
        ]),
        kyc_status: 'VERIFIED',
        is_approved: 1,
        is_verified: 1,
        status: 'ACTIVE'
      },
      {
        partner_id: 'usr_406',
        user_id: 'usr_406',
        name: 'Sneha Sharma',
        full_name: 'Sneha Sharma',
        email: 'sneha.sharma@withme.app',
        mobile_number: '9876500006',
        phone_number: '9876500006',
        gender: 'Female',
        age: 25,
        city: 'Delhi',
        state: 'Delhi NCR',
        locality: 'Connaught Place',
        address: 'Connaught Place, New Delhi, Delhi',
        image: '/uploads/sneha.jpg',
        profile_photo_url: '/uploads/sneha.jpg',
        category: 'Conversation',
        activity: 'Conversation',
        rating: 4.70,
        total_reviews: 95,
        price: 1,
        currency: 'INR',
        about: 'Fitness lover, gamer, and engaging conversationalist.',
        interests: JSON.stringify(['Conversation', 'Fitness', 'Gaming', 'Coffee']),
        photos: JSON.stringify(['/uploads/sneha.jpg', '/uploads/kavya.jpg']),
        available_for: JSON.stringify([
          { name: 'Coffee', icon: 'coffee', price: 1, currency: 'INR' },
          { name: 'Conversation', icon: 'chat', price: 199, currency: 'INR' },
          { name: 'Dinner', icon: 'restaurant', price: 499, currency: 'INR' }
        ]),
        kyc_status: 'VERIFIED',
        is_approved: 1,
        is_verified: 1,
        status: 'ACTIVE'
      }
    ];

    for (const p of partners) {
      await query(`
        INSERT INTO withme_partners (
          partner_id, user_id, name, full_name, email, mobile_number, phone_number,
          gender, age, city, state, locality, address, image, profile_photo_url,
          category, activity, rating, total_reviews, price, currency, about,
          interests, photos, available_for, kyc_status, is_approved, is_verified, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name=VALUES(name), image=VALUES(image)
      `, [
        p.partner_id, p.user_id, p.name, p.full_name, p.email, p.mobile_number, p.phone_number,
        p.gender, p.age, p.city, p.state, p.locality, p.address, p.image, p.profile_photo_url,
        p.category, p.activity, p.rating, p.total_reviews, p.price, p.currency, p.about,
        p.interests, p.photos, p.available_for, p.kyc_status, p.is_approved, p.is_verified, p.status
      ]);
    }

    console.log(`Successfully seeded ${partners.length} initial WithMe companion partners!`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding WithMe partners failed:', err);
    process.exit(1);
  }
}

seedWithMePartners();
