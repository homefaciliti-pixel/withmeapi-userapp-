const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
  host: process.env.MYSQL_HOST || 'homefaciliti.com',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'homef4fw_homefaci',
  password: process.env.MYSQL_PASSWORD || 'Xnj3*t%F36RDK+!',
  database: process.env.MYSQL_DATABASE || 'homef4fw_homefaci',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000
};

console.log(`Connecting to MySQL database '${dbConfig.database}' on host '${dbConfig.host}:${dbConfig.port}'...`);

const pool = mysql.createPool(dbConfig);

// Database initialization & table creation script
const initializeDatabaseTables = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database connected successfully!');

    // 1. Users Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        phone_number VARCHAR(20) UNIQUE,
        name VARCHAR(100) DEFAULT 'User',
        email VARCHAR(100) DEFAULT NULL,
        gender VARCHAR(20) DEFAULT NULL,
        dob VARCHAR(20) DEFAULT NULL,
        bio TEXT DEFAULT NULL,
        city VARCHAR(100) DEFAULT NULL,
        kyc_status VARCHAR(50) DEFAULT 'NOT_VERIFIED',
        profile_image VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure pre-existing database tables get updated columns if missing
    const alterStatements = [
      'ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) DEFAULT NULL',
      'ALTER TABLE users ADD COLUMN dob VARCHAR(20) DEFAULT NULL',
      'ALTER TABLE users ADD COLUMN bio TEXT DEFAULT NULL',
      'ALTER TABLE users ADD COLUMN city VARCHAR(100) DEFAULT NULL',
      "ALTER TABLE users ADD COLUMN interested_in_gender VARCHAR(20) DEFAULT 'Female'",
      'ALTER TABLE users ADD COLUMN profile_image VARCHAR(255) DEFAULT NULL',
      "ALTER TABLE users MODIFY COLUMN kyc_status VARCHAR(50) DEFAULT 'NOT_VERIFIED'"
    ];

    for (const sql of alterStatements) {
      try {
        await connection.query(sql);
      } catch (err) {
        // Ignore column already exists warnings
      }
    }

    // 2. OTP Store Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS otp_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone_number VARCHAR(20) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        otp_id VARCHAR(64) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. KYC Documents Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS kyc_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        document_type VARCHAR(50) NOT NULL,
        document_number VARCHAR(100) NOT NULL,
        full_name VARCHAR(100),
        status VARCHAR(50) DEFAULT 'PENDING_VERIFICATION',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. Partner Requests Table (Shared between User App & Partner App)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS partner_requests (
        id VARCHAR(64) PRIMARY KEY,
        request_id VARCHAR(64),
        booking_id VARCHAR(64),
        sender_id VARCHAR(64) NOT NULL,
        sender_name VARCHAR(100),
        sender_phone VARCHAR(20),
        sender_avatar VARCHAR(255),
        receiver_id VARCHAR(64) NOT NULL,
        partner_id VARCHAR(64),
        partner_name VARCHAR(100),
        activity_id VARCHAR(64) DEFAULT NULL,
        activity_name VARCHAR(100) DEFAULT 'Coffee',
        date VARCHAR(50) DEFAULT NULL,
        time VARCHAR(50) DEFAULT NULL,
        location VARCHAR(255) DEFAULT NULL,
        message TEXT,
        price DECIMAL(10,2) DEFAULT 1.00,
        currency VARCHAR(10) DEFAULT 'INR',
        status VARCHAR(20) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure partner_requests columns exist if table was previously created with fewer columns
    const requestAlterStatements = [
      'ALTER TABLE partner_requests ADD COLUMN request_id VARCHAR(64) DEFAULT NULL',
      'ALTER TABLE partner_requests ADD COLUMN booking_id VARCHAR(64) DEFAULT NULL',
      'ALTER TABLE partner_requests ADD COLUMN sender_name VARCHAR(100) DEFAULT NULL',
      'ALTER TABLE partner_requests ADD COLUMN sender_phone VARCHAR(20) DEFAULT NULL',
      'ALTER TABLE partner_requests ADD COLUMN sender_avatar VARCHAR(255) DEFAULT NULL',
      'ALTER TABLE partner_requests ADD COLUMN partner_id VARCHAR(64) DEFAULT NULL',
      'ALTER TABLE partner_requests ADD COLUMN partner_name VARCHAR(100) DEFAULT NULL',
      "ALTER TABLE partner_requests ADD COLUMN activity_name VARCHAR(100) DEFAULT 'Coffee'",
      'ALTER TABLE partner_requests ADD COLUMN date VARCHAR(50) DEFAULT NULL',
      'ALTER TABLE partner_requests ADD COLUMN time VARCHAR(50) DEFAULT NULL',
      'ALTER TABLE partner_requests ADD COLUMN location VARCHAR(255) DEFAULT NULL',
      'ALTER TABLE partner_requests ADD COLUMN price DECIMAL(10,2) DEFAULT 1.00',
      "ALTER TABLE partner_requests ADD COLUMN currency VARCHAR(10) DEFAULT 'INR'",
      "ALTER TABLE partner_requests ADD COLUMN status VARCHAR(20) DEFAULT 'Pending'",
      'ALTER TABLE partner_requests ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    ];

    for (const sql of requestAlterStatements) {
      try {
        await connection.query(sql);
      } catch (err) {
        // Ignore column already exists
      }
    }

    // 5. Partner Bookings Table (Shared between User App & Partner App)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS partner_bookings (
        booking_id VARCHAR(64) PRIMARY KEY,
        request_id VARCHAR(64),
        user_id VARCHAR(64) NOT NULL,
        user_name VARCHAR(100),
        user_image VARCHAR(255),
        user_phone VARCHAR(20),
        partner_id VARCHAR(64) NOT NULL,
        partner_name VARCHAR(100),
        partner_image VARCHAR(255),
        activity VARCHAR(100) DEFAULT 'Coffee',
        date VARCHAR(50),
        time VARCHAR(50),
        location VARCHAR(255),
        price DECIMAL(10,2) DEFAULT 1.00,
        currency VARCHAR(10) DEFAULT 'INR',
        status VARCHAR(20) DEFAULT 'Upcoming',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure partner_bookings columns exist
    const bookingAlterStatements = [
      'ALTER TABLE partner_bookings ADD COLUMN request_id VARCHAR(64) DEFAULT NULL',
      'ALTER TABLE partner_bookings ADD COLUMN user_name VARCHAR(100) DEFAULT NULL',
      'ALTER TABLE partner_bookings ADD COLUMN user_image VARCHAR(255) DEFAULT NULL',
      'ALTER TABLE partner_bookings ADD COLUMN user_phone VARCHAR(20) DEFAULT NULL',
      'ALTER TABLE partner_bookings ADD COLUMN partner_name VARCHAR(100) DEFAULT NULL',
      'ALTER TABLE partner_bookings ADD COLUMN partner_image VARCHAR(255) DEFAULT NULL',
      "ALTER TABLE partner_bookings ADD COLUMN activity VARCHAR(100) DEFAULT 'Coffee'",
      'ALTER TABLE partner_bookings ADD COLUMN date VARCHAR(50) DEFAULT NULL',
      'ALTER TABLE partner_bookings ADD COLUMN time VARCHAR(50) DEFAULT NULL',
      'ALTER TABLE partner_bookings ADD COLUMN location VARCHAR(255) DEFAULT NULL',
      'ALTER TABLE partner_bookings ADD COLUMN price DECIMAL(10,2) DEFAULT 1.00',
      "ALTER TABLE partner_bookings ADD COLUMN currency VARCHAR(10) DEFAULT 'INR'",
      "ALTER TABLE partner_bookings ADD COLUMN status VARCHAR(20) DEFAULT 'Upcoming'",
      'ALTER TABLE partner_bookings ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    ];

    for (const sql of bookingAlterStatements) {
      try {
        await connection.query(sql);
      } catch (err) {
        // Ignore column already exists
      }
    }

    connection.release();
    console.log('✅ MySQL Database tables verified and initialized successfully.');
  } catch (error) {
    console.warn('⚠️ MySQL Database connection note:', error.message);
  }
};

module.exports = {
  pool,
  query: async (sql, params) => {
    try {
      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (err) {
      console.error('MySQL Query Error:', err.message);
      throw err;
    }
  },
  initializeDatabaseTables
};
