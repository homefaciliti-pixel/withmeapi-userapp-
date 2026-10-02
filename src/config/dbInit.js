const { query } = require('./db');

async function initAllWithMeTables() {
  console.log('[WithMe DB] Initializing dedicated WithMe tables...');

  // 1. withme_partners
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

  // 2. withme_partner_requests
  await query(`
    CREATE TABLE IF NOT EXISTS withme_partner_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id VARCHAR(50) UNIQUE,
      booking_id VARCHAR(50),
      user_id VARCHAR(50),
      partner_id VARCHAR(50),
      sender_name VARCHAR(150),
      sender_phone VARCHAR(30),
      sender_avatar TEXT,
      activity VARCHAR(100) DEFAULT 'Coffee',
      date VARCHAR(50),
      time VARCHAR(50),
      location TEXT,
      message TEXT,
      price INT DEFAULT 1,
      status VARCHAR(50) DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 3. withme_partner_bookings
  await query(`
    CREATE TABLE IF NOT EXISTS withme_partner_bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id VARCHAR(50) UNIQUE,
      user_id VARCHAR(50),
      partner_id VARCHAR(50),
      customer_name VARCHAR(150),
      customer_phone VARCHAR(30),
      activity VARCHAR(100) DEFAULT 'Coffee',
      date VARCHAR(50),
      time VARCHAR(50),
      duration INT DEFAULT 1,
      location TEXT,
      price INT DEFAULT 1,
      currency VARCHAR(10) DEFAULT 'INR',
      payment_status VARCHAR(50) DEFAULT 'PAID',
      status VARCHAR(50) DEFAULT 'CONFIRMED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 4. withme_otps
  await query(`
    CREATE TABLE IF NOT EXISTS withme_otps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mobile_number VARCHAR(30),
      otp VARCHAR(10),
      type VARCHAR(50) DEFAULT 'registration',
      purpose VARCHAR(100),
      status VARCHAR(20) DEFAULT '0',
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 5. withme_users
  await query(`
    CREATE TABLE IF NOT EXISTS withme_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) UNIQUE,
      name VARCHAR(150),
      email VARCHAR(150),
      phone_number VARCHAR(30) UNIQUE,
      gender VARCHAR(20),
      age INT,
      city VARCHAR(100),
      profile_image TEXT,
      kyc_status VARCHAR(50) DEFAULT 'PENDING',
      status VARCHAR(50) DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 6. conversations
  await query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      type ENUM('private') DEFAULT 'private',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 7. conversation_members
  await query(`
    CREATE TABLE IF NOT EXISTS conversation_members (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      conversation_id BIGINT UNSIGNED NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_member (conversation_id, user_id),
      INDEX idx_user (user_id),
      INDEX idx_conversation (conversation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 8. messages
  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      conversation_id BIGINT UNSIGNED NOT NULL,
      sender_id VARCHAR(64) NOT NULL,
      receiver_id VARCHAR(64) NOT NULL,
      message_type ENUM('text') DEFAULT 'text',
      message TEXT NOT NULL,
      is_delivered TINYINT(1) DEFAULT 0,
      is_read TINYINT(1) DEFAULT 0,
      is_deleted TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_conversation_created (conversation_id, created_at),
      INDEX idx_receiver_read (receiver_id, is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 9. user_blocks
  await query(`
    CREATE TABLE IF NOT EXISTS user_blocks (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      blocker_id VARCHAR(64) NOT NULL,
      blocked_id VARCHAR(64) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_block (blocker_id, blocked_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 10. withme_notifications
  await query(`
    CREATE TABLE IF NOT EXISTS withme_notifications (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      notification_id VARCHAR(64) UNIQUE,
      user_id VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      data_payload TEXT,
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('[WithMe DB] All separate withme_* and chat tables verified/created successfully!');
}

module.exports = { initAllWithMeTables };

if (require.main === module) {
  initAllWithMeTables()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
