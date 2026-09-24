const { query } = require('../config/db');

async function setupWithMePartnersTable() {
  try {
    console.log('Creating dedicated withme_partners table in MySQL...');
    await query(`
      CREATE TABLE IF NOT EXISTS withme_partners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        partner_id VARCHAR(50) UNIQUE,
        user_id VARCHAR(50),
        name VARCHAR(150) NOT NULL,
        full_name VARCHAR(150),
        email VARCHAR(150),
        mobile_number VARCHAR(30) UNIQUE,
        phone_number VARCHAR(30),
        country_code VARCHAR(10) DEFAULT '+91',
        password VARCHAR(255),
        gender VARCHAR(20) DEFAULT 'Female',
        age INT DEFAULT 24,
        city VARCHAR(100) DEFAULT 'Jaipur',
        state VARCHAR(100) DEFAULT 'Rajasthan',
        locality VARCHAR(150) DEFAULT 'Vaishali Nagar',
        address TEXT,
        profile_photo_url TEXT,
        image TEXT,
        category VARCHAR(100) DEFAULT 'Coffee',
        activity VARCHAR(100) DEFAULT 'Coffee',
        rating DECIMAL(3,2) DEFAULT 4.80,
        total_reviews INT DEFAULT 120,
        price INT DEFAULT 1,
        currency VARCHAR(10) DEFAULT 'INR',
        about TEXT,
        interests TEXT,
        photos TEXT,
        available_for TEXT,
        aadhar_number VARCHAR(50),
        aadhar_front_url TEXT,
        aadhar_back_url TEXT,
        kyc_status VARCHAR(50) DEFAULT 'VERIFIED',
        is_approved TINYINT(1) DEFAULT 1,
        is_verified TINYINT(1) DEFAULT 1,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('withme_partners table created successfully!');

    // Check count of existing WithMe partners
    const countRes = await query('SELECT COUNT(*) as count FROM withme_partners');
    console.log(`Current WithMe partners in withme_partners table: ${countRes[0].count}`);

    process.exit(0);
  } catch (err) {
    console.error('Setup withme_partners table error:', err);
    process.exit(1);
  }
}

setupWithMePartnersTable();
