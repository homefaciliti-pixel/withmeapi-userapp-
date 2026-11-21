const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
  host: process.env.MYSQL_HOST || '119.18.54.79', // Direct IPv4 host fallback to prevent DNS IPv6 resolution timeout
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'homef4fw_homefaci',
  password: process.env.MYSQL_PASSWORD || 'Home1184#$%',
  database: process.env.MYSQL_DATABASE || 'homef4fw_homefaci',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 5000, // Fast 5s connection timeout to avoid hanging server requests
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: 'Z' // Consistent UTC timestamp handling to prevent timezone mismatch
};

console.log(`Connecting to MySQL database '${dbConfig.database}' on host '${dbConfig.host}:${dbConfig.port}'...`);

const pool = mysql.createPool(dbConfig);

/**
 * Safely ensure a column exists on a table without triggering ER_DUP_FIELDNAME.
 * Proactively checks column existence via SHOW COLUMNS.
 */
const ensureColumnExists = async (executor, tableName, columnName, columnDefinition) => {
  const runner = executor || pool;
  try {
    const cleanTable = String(tableName).replace(/[^a-zA-Z0-9_]/g, '');
    const cleanCol = String(columnName).replace(/[^a-zA-Z0-9_]/g, '');
    const [cols] = await runner.query(`SHOW COLUMNS FROM \`${cleanTable}\` LIKE '${cleanCol}'`);
    if (cols && cols.length > 0) {
      return false; // Already exists, skipped cleanly
    }

    await runner.query(`ALTER TABLE \`${cleanTable}\` ADD COLUMN \`${cleanCol}\` ${columnDefinition}`);
    return true; // Added successfully
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      return false; // Handled concurrent addition safely
    }
    console.error(`[DB Migration Error] Failed to ensure column \`${tableName}\`.\`${columnName}\`:`, err.message);
    throw err;
  }
};

/**
 * Safely ensure an index exists on a table without triggering ER_DUP_KEYNAME.
 * Proactively checks index existence via SHOW INDEX.
 */
const ensureIndexExists = async (executor, tableName, indexName, columnExpression) => {
  const runner = executor || pool;
  try {
    const cleanTable = String(tableName).replace(/[^a-zA-Z0-9_]/g, '');
    const cleanIdx = String(indexName).replace(/[^a-zA-Z0-9_]/g, '');
    const [idxs] = await runner.query(`SHOW INDEX FROM \`${cleanTable}\` WHERE Key_name = '${cleanIdx}'`);
    if (idxs && idxs.length > 0) {
      return false; // Already exists, skipped cleanly
    }

    await runner.query(`ALTER TABLE \`${cleanTable}\` ADD INDEX \`${cleanIdx}\` (${columnExpression})`);
    return true; // Added successfully
  } catch (err) {
    if (err.code === 'ER_DUP_KEYNAME') {
      return false; // Handled concurrent addition safely
    }
    console.error(`[DB Migration Error] Failed to ensure index \`${indexName}\` on \`${tableName}\`:`, err.message);
    throw err;
  }
};

/**
 * Safely ensure multiple columns exist on a table in a single inspection pass.
 */
const ensureTableColumns = async (executor, tableName, columnDefs) => {
  const runner = executor || pool;
  try {
    const [existingColRows] = await runner.query(`SHOW COLUMNS FROM \`${tableName}\``);
    const existingCols = new Set((existingColRows || []).map(c => c.Field.toLowerCase()));

    for (const col of columnDefs) {
      if (!existingCols.has(col.name.toLowerCase())) {
        try {
          await runner.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${col.name}\` ${col.definition}`);
          existingCols.add(col.name.toLowerCase());
        } catch (err) {
          if (err.code === 'ER_DUP_FIELDNAME') {
            existingCols.add(col.name.toLowerCase());
            continue;
          }
          console.error(`[DB Migration Error] Failed to add column \`${tableName}\`.\`${col.name}\`:`, err.message);
          throw err;
        }
      }
    }
  } catch (err) {
    console.error(`[DB Migration Error] Error inspecting columns for table \`${tableName}\`:`, err.message);
    throw err;
  }
};

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

    // Ensure pre-existing database tables get updated columns if missing (idempotent)
    await ensureTableColumns(connection, 'users', [
      { name: 'phone_number', definition: 'VARCHAR(20) DEFAULT NULL' },
      { name: 'nickname', definition: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'dob', definition: 'VARCHAR(20) DEFAULT NULL' },
      { name: 'bio', definition: 'TEXT DEFAULT NULL' },
      { name: 'city', definition: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'interested_in_gender', definition: 'VARCHAR(20) DEFAULT NULL' },
      { name: 'profile_image', definition: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'fcm_token', definition: 'TEXT DEFAULT NULL' },
      { name: 'device_type', definition: "VARCHAR(20) DEFAULT 'android'" },
      { name: 'profile_images', definition: 'TEXT DEFAULT NULL' },
      { name: 'interests', definition: 'TEXT DEFAULT NULL' },
      { name: 'available_for', definition: 'TEXT DEFAULT NULL' },
      { name: 'state', definition: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'country', definition: "VARCHAR(100) DEFAULT 'India'" }
    ]);

    // Safe column modifications (MODIFY COLUMN is idempotent in MySQL)
    try {
      await connection.query("ALTER TABLE users MODIFY COLUMN kyc_status VARCHAR(50) DEFAULT 'NOT_VERIFIED'");
      await connection.query("ALTER TABLE users MODIFY COLUMN interested_in_gender VARCHAR(20) DEFAULT NULL");
    } catch (err) {
      console.warn('[DB Migration Notice] Error modifying users column types:', err.message);
    }

    // Migration: clear auto-defaulted 'Female' for users who never explicitly set it
    // Safe: only affects users whose KYC is not yet verified (they never went through interest selection)
    try {
      await connection.query(
        `UPDATE users SET interested_in_gender = NULL WHERE interested_in_gender = 'Female' AND (kyc_status IS NULL OR kyc_status IN ('NOT_VERIFIED', 'NOT_STARTED', ''))`
      );
    } catch (err) { /* ignore */ }

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

    // Ensure partner_requests columns exist if table was previously created with fewer columns (idempotent)
    await ensureTableColumns(connection, 'partner_requests', [
      { name: 'request_id', definition: 'VARCHAR(64) DEFAULT NULL' },
      { name: 'booking_id', definition: 'VARCHAR(64) DEFAULT NULL' },
      { name: 'sender_name', definition: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'sender_phone', definition: 'VARCHAR(20) DEFAULT NULL' },
      { name: 'sender_avatar', definition: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'partner_id', definition: 'VARCHAR(64) DEFAULT NULL' },
      { name: 'partner_name', definition: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'activity_name', definition: "VARCHAR(100) DEFAULT 'Coffee'" },
      { name: 'date', definition: 'VARCHAR(50) DEFAULT NULL' },
      { name: 'time', definition: 'VARCHAR(50) DEFAULT NULL' },
      { name: 'location', definition: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'price', definition: 'DECIMAL(10,2) DEFAULT 1.00' },
      { name: 'currency', definition: "VARCHAR(10) DEFAULT 'INR'" },
      { name: 'status', definition: "VARCHAR(20) DEFAULT 'Pending'" },
      { name: 'updated_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
    ]);

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

    // Ensure partner_bookings columns exist (idempotent)
    await ensureTableColumns(connection, 'partner_bookings', [
      { name: 'request_id', definition: 'VARCHAR(64) DEFAULT NULL' },
      { name: 'user_name', definition: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'user_image', definition: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'user_phone', definition: 'VARCHAR(20) DEFAULT NULL' },
      { name: 'partner_name', definition: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'partner_image', definition: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'activity', definition: "VARCHAR(100) DEFAULT 'Coffee'" },
      { name: 'date', definition: 'VARCHAR(50) DEFAULT NULL' },
      { name: 'time', definition: 'VARCHAR(50) DEFAULT NULL' },
      { name: 'location', definition: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'price', definition: 'DECIMAL(10,2) DEFAULT 1.00' },
      { name: 'currency', definition: "VARCHAR(10) DEFAULT 'INR'" },
      { name: 'status', definition: "VARCHAR(20) DEFAULT 'Upcoming'" },
      { name: 'updated_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
    ]);

    const { initAllWithMeTables } = require('./dbInit');
    await initAllWithMeTables();

    connection.release();
    console.log('✅ MySQL Database tables verified and initialized successfully.');
  } catch (error) {
    console.warn('⚠️ MySQL Database connection note:', error.message);
  }
};

module.exports = {
  pool,
  query: async (sql, params, retries = 1) => {
    try {
      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (err) {
      const isConnectionErr = err.code === 'ETIMEDOUT' || 
                              err.code === 'ECONNREFUSED' || 
                              err.code === 'ENOTFOUND' || 
                              err.code === 'PROTOCOL_CONNECTION_LOST' ||
                              (err.message && err.message.includes('ETIMEDOUT'));

      if (isConnectionErr && retries > 0) {
        console.warn(`[MySQL Retry] Retrying query due to ${err.code || err.message}...`);
        await new Promise(res => setTimeout(res, 500));
        try {
          const [retryRows] = await pool.execute(sql, params);
          return retryRows;
        } catch (retryErr) {
          err = retryErr;
        }
      }

      // Do not log expected duplicate errors as query errors
      if (err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_DUP_KEYNAME') {
        console.error(`MySQL Query Note [${err.code || 'ERR'}]:`, err.message);
      }

      // Graceful fallback for SELECT queries if database is temporarily unreachable/timed out
      if (isConnectionErr && typeof sql === 'string' && sql.trim().toUpperCase().startsWith('SELECT')) {
        console.warn(`[MySQL Fallback] Returning empty result set for SELECT query due to connection timeout.`);
        return [];
      }

      if (isConnectionErr) {
        return { affectedRows: 0, insertId: 0, warning: 'DB connection timed out' };
      }

      throw err;
    }
  },
  initializeDatabaseTables,
  ensureColumnExists,
  ensureIndexExists,
  ensureTableColumns
};
