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
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) DEFAULT 'User',
        email VARCHAR(100) DEFAULT NULL,
        gender VARCHAR(20) DEFAULT NULL,
        dob VARCHAR(20) DEFAULT NULL,
        bio TEXT DEFAULT NULL,
        city VARCHAR(100) DEFAULT NULL,
        kyc_status VARCHAR(50) DEFAULT 'NOT_STARTED',
        profile_image VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

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

    // 4. Partner Requests Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS partner_requests (
        id VARCHAR(64) PRIMARY KEY,
        sender_id VARCHAR(64) NOT NULL,
        receiver_id VARCHAR(64) NOT NULL,
        activity_id VARCHAR(64) DEFAULT NULL,
        message TEXT,
        status VARCHAR(20) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

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
