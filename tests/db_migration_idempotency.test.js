const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { initializeDatabaseTables, ensureColumnExists, ensureIndexExists, ensureTableColumns, query } = require('../src/config/db');

let passedTests = 0;
let failedTests = 0;

async function test(desc, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

async function runDbMigrationIdempotencyTests() {
  console.log('\n========================================================');
  console.log('🧪 DATABASE MIGRATION IDEMPOTENCY TEST SUITE');
  console.log('========================================================\n');

  // 1. Helper Functions
  console.log('--- 1. ensureColumnExists / ensureIndexExists Helpers ---');

  await test('ensureColumnExists returns false (no-op) when column already exists', async () => {
    // users.phone_number is known to exist
    const result = await ensureColumnExists(null, 'users', 'phone_number', 'VARCHAR(20) DEFAULT NULL');
    assert.strictEqual(result, false, 'Should return false when column already exists');
  });

  await test('ensureColumnExists does NOT throw ER_DUP_FIELDNAME on duplicate column', async () => {
    // Run twice — no error must be thrown
    for (let i = 0; i < 3; i++) {
      await ensureColumnExists(null, 'users', 'fcm_token', 'TEXT DEFAULT NULL');
    }
  });

  await test('ensureIndexExists returns false (no-op) when index already exists', async () => {
    // idx_booking_id is known to exist on conversations
    const result = await ensureIndexExists(null, 'conversations', 'idx_booking_id', 'booking_id');
    assert.strictEqual(result, false, 'Should return false when index already exists');
  });

  await test('ensureIndexExists does NOT throw ER_DUP_KEYNAME on duplicate index', async () => {
    // Run twice — no error must be thrown
    for (let i = 0; i < 3; i++) {
      await ensureIndexExists(null, 'conversations', 'idx_booking_id', 'booking_id');
    }
  });

  await test('ensureTableColumns processes all columns without ER_DUP_FIELDNAME errors', async () => {
    // Run against existing columns — all should silently skip
    await ensureTableColumns(null, 'users', [
      { name: 'phone_number',          definition: 'VARCHAR(20) DEFAULT NULL' },
      { name: 'nickname',              definition: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'dob',                   definition: 'VARCHAR(20) DEFAULT NULL' },
      { name: 'bio',                   definition: 'TEXT DEFAULT NULL' },
      { name: 'city',                  definition: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'interested_in_gender',  definition: 'VARCHAR(20) DEFAULT NULL' },
      { name: 'profile_image',         definition: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'fcm_token',             definition: 'TEXT DEFAULT NULL' },
      { name: 'device_type',           definition: "VARCHAR(20) DEFAULT 'android'" },
      { name: 'profile_images',        definition: 'TEXT DEFAULT NULL' },
      { name: 'interests',             definition: 'TEXT DEFAULT NULL' },
      { name: 'available_for',         definition: 'TEXT DEFAULT NULL' },
      { name: 'state',                 definition: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'country',               definition: "VARCHAR(100) DEFAULT 'India'" }
    ]);
  });

  // 2. initializeDatabaseTables Idempotency
  console.log('\n--- 2. initializeDatabaseTables Run Multiple Times ---');

  await test('initializeDatabaseTables completes without any errors on Run 1', async () => {
    await initializeDatabaseTables();
  });

  await test('initializeDatabaseTables completes without any errors on Run 2 (idempotent)', async () => {
    await initializeDatabaseTables();
  });

  await test('initializeDatabaseTables completes without any errors on Run 3 (fully repeatable)', async () => {
    await initializeDatabaseTables();
  });

  // 3. Verify All Required Columns Still Exist After Runs
  console.log('\n--- 3. Column & Index Existence After Multiple Init Runs ---');

  await test('users table has all required migration columns after repeated init', async () => {
    const rows = await query('SHOW COLUMNS FROM users');
    const colNames = rows.map(r => r.Field);
    const required = [
      'phone_number', 'nickname', 'dob', 'bio', 'city',
      'interested_in_gender', 'profile_image', 'fcm_token', 'device_type',
      'profile_images', 'interests', 'available_for', 'state', 'country'
    ];
    for (const col of required) {
      assert(colNames.includes(col), `users table must have column '${col}' — missing!`);
    }
  });

  await test('conversations table has booking_id column and idx_booking_id index after repeated init', async () => {
    const cols = await query('SHOW COLUMNS FROM conversations');
    const colNames = cols.map(c => c.Field);
    assert(colNames.includes('booking_id'), 'conversations.booking_id column must exist');

    const idxRows = await query("SHOW INDEX FROM conversations WHERE Key_name = 'idx_booking_id'");
    assert(idxRows && idxRows.length > 0, 'idx_booking_id index must exist on conversations');
  });

  await test('withme_notifications table has user_name and user_photo_url columns after repeated init', async () => {
    const rows = await query('SHOW COLUMNS FROM withme_notifications');
    const colNames = rows.map(r => r.Field);
    assert(colNames.includes('user_name'), 'withme_notifications must have user_name column');
    assert(colNames.includes('user_photo_url'), 'withme_notifications must have user_photo_url column');
  });

  // 4. No Console Error Flood (verify error codes are suppressed for expected dup errors)
  console.log('\n--- 4. No ER_DUP_FIELDNAME / ER_DUP_KEYNAME Errors Logged ---');

  await test('query() function does not log ER_DUP_FIELDNAME as a MySQL Query Note', async () => {
    // We test this by checking db.js query function suppresses expected dup errors
    const dbModule = require('../src/config/db');
    // Capture stderr  
    const original = console.error;
    const errors = [];
    console.error = (...args) => { errors.push(args.join(' ')); };
    
    // These should not produce console errors
    try {
      await dbModule.ensureColumnExists(null, 'users', 'fcm_token', 'TEXT DEFAULT NULL');
      await dbModule.ensureIndexExists(null, 'conversations', 'idx_booking_id', 'booking_id');
    } finally {
      console.error = original;
    }
    
    const dupErrors = errors.filter(e => e.includes('ER_DUP_FIELDNAME') || e.includes('ER_DUP_KEYNAME'));
    assert.strictEqual(dupErrors.length, 0, `Unexpected ER_DUP errors logged: ${dupErrors.join('; ')}`);
  });

  console.log('\n========================================================');
  console.log(`📊 DB MIGRATION IDEMPOTENCY TESTS: Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('========================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runDbMigrationIdempotencyTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error in DB migration idempotency tests:', err);
    process.exit(1);
  });
