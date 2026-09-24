const { query } = require('../config/db');

async function cleanAndSeed() {
  console.log('Cleaning unwanted partners from withme_partners table...');

  // Delete all unwanted / test partners
  await query(`
    DELETE FROM withme_partners 
    WHERE name LIKE '%Test User%' 
       OR name LIKE '%Tushar%' 
       OR name LIKE '%ANIL KUMAR%' 
       OR name LIKE '%Sudipta%' 
       OR name LIKE '%Rakesh%' 
       OR name LIKE '%suraj%' 
       OR name LIKE '%Gautam%'
       OR name LIKE '%Rahul%'
       OR mobile_number IN ('9134803423', '9179290768', '9172621575', '9193406762', '9136407943', '9197128653', '9876543210', '8355870129', '7814975687', '9732481833', '9024041486', '6201635382', '1919356630806', '9190637737')
  `);

  // Ensure top 6 verified WithMe companion models are present
  const partners = [
    {
      partner_id: 'usr_203',
      name: 'Priya Sharma',
      email: 'priya.sharma@withme.app',
      mobile_number: '9876500001',
      gender: 'Female',
      age: 23,
      city: 'Jaipur',
      locality: 'Malviya Nagar',
      image: '/uploads/priya.jpg',
      category: 'Coffee',
      rating: 4.8,
      total_reviews: 120,
      price: 1,
      about: 'Friendly, outgoing and loves exploring new places, coffee meetups, and meeting people.',
      interests: JSON.stringify(['Coffee', 'Travel', 'Music']),
      photos: JSON.stringify(['/uploads/priya.jpg', '/uploads/priya2.jpg', '/uploads/priya3.jpg', '/uploads/priya4.jpg'])
    },
    {
      partner_id: 'usr_201',
      name: 'Ananya Verma',
      email: 'ananya.verma@withme.app',
      mobile_number: '9876500002',
      gender: 'Female',
      age: 24,
      city: 'Jaipur',
      locality: 'C-Scheme',
      image: '/uploads/ananya.jpg',
      category: 'Coffee',
      rating: 4.9,
      total_reviews: 95,
      price: 1,
      about: 'Loves acoustic sessions, coffee dates, and deep conversations about books and cinema.',
      interests: JSON.stringify(['Coffee', 'Music', 'Books']),
      photos: JSON.stringify(['/uploads/ananya.jpg', '/uploads/priya.jpg'])
    },
    {
      partner_id: 'usr_102',
      name: 'Anjali Sharma',
      email: 'anjali.sharma@withme.app',
      mobile_number: '9876500003',
      gender: 'Female',
      age: 24,
      city: 'Jaipur',
      locality: 'Vaishali Nagar',
      image: '/uploads/anjali.jpg',
      category: 'Dinner',
      rating: 4.9,
      total_reviews: 135,
      price: 1,
      about: 'Loves social gatherings, food dates, dinner events and live music.',
      interests: JSON.stringify(['Dinner', 'Coffee', 'Events']),
      photos: JSON.stringify(['/uploads/anjali.jpg', '/uploads/ananya.jpg'])
    },
    {
      partner_id: 'usr_404',
      name: 'Riya Mehta',
      email: 'riya.mehta@withme.app',
      mobile_number: '9876500004',
      gender: 'Female',
      age: 26,
      city: 'Mumbai',
      locality: 'Bandra West',
      image: '/uploads/riya.jpg',
      category: 'Travel',
      rating: 4.8,
      total_reviews: 145,
      price: 1,
      about: 'Tech enthusiast, guitarist, and outdoor trekking partner.',
      interests: JSON.stringify(['Travel', 'Coffee', 'Music']),
      photos: JSON.stringify(['/uploads/riya.jpg', '/uploads/sneha.jpg'])
    },
    {
      partner_id: 'usr_405',
      name: 'Neha Kapoor',
      email: 'neha.kapoor@withme.app',
      mobile_number: '9876500005',
      gender: 'Female',
      age: 23,
      city: 'Mumbai',
      locality: 'Andheri West',
      image: '/uploads/neha.jpg',
      category: 'Movie',
      rating: 4.9,
      total_reviews: 110,
      price: 1,
      about: 'Passionate about cinema, movies, coffee chats and music concerts.',
      interests: JSON.stringify(['Movie', 'Coffee', 'Music']),
      photos: JSON.stringify(['/uploads/neha.jpg', '/uploads/riya.jpg'])
    },
    {
      partner_id: 'usr_406',
      name: 'Sneha Sharma',
      email: 'sneha.sharma@withme.app',
      mobile_number: '9876500006',
      gender: 'Female',
      age: 25,
      city: 'Delhi',
      locality: 'Hauz Khas',
      image: '/uploads/sneha.jpg',
      category: 'Conversation',
      rating: 4.7,
      total_reviews: 88,
      price: 1,
      about: 'Psychology reader, fitness lover and great listener for meaningful conversations.',
      interests: JSON.stringify(['Conversation', 'Coffee', 'Fitness']),
      photos: JSON.stringify(['/uploads/sneha.jpg', '/uploads/neha.jpg'])
    }
  ];

  for (const p of partners) {
    await query(`
      INSERT INTO withme_partners (
        partner_id, user_id, name, full_name, email, mobile_number, phone_number,
        gender, age, city, locality, address, profile_photo_url, image,
        category, activity, rating, total_reviews, price, currency, about, interests, photos,
        kyc_status, is_approved, is_verified, status
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, 'INR', ?, ?, ?,
        'VERIFIED', 1, 1, 'ACTIVE'
      )
      ON DUPLICATE KEY UPDATE
        name = VALUES(name), full_name = VALUES(full_name), email = VALUES(email),
        profile_photo_url = VALUES(profile_photo_url), image = VALUES(image),
        photos = VALUES(photos), price = 1, is_approved = 1, status = 'ACTIVE'
    `, [
      p.partner_id, p.partner_id, p.name, p.name, p.email, p.mobile_number, p.mobile_number,
      p.gender, p.age, p.city, p.locality, `${p.locality}, ${p.city}`, p.image, p.image,
      p.category, p.category, p.rating, p.total_reviews, p.price, p.about, p.interests, p.photos
    ]);
  }

  const cleanRows = await query('SELECT id, partner_id, name, gender, city, price, is_approved, status FROM withme_partners');
  console.log('✅ Clean withme_partners in MySQL:');
  console.table(cleanRows);
}

cleanAndSeed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
