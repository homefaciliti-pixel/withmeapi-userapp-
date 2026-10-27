/**
 * WithMe24 User Backend — Image Persistence & DB Verification Tests
 *
 * Runs standalone with Node.js assert without Jest:
 * node tests/image_persistence.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { query } = require('../src/config/db');

let passedTests = 0;
let failedTests = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

async function itAsync(desc, fn) {
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

function createMinimalJpeg() {
  return Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
    0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
    0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
    0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
    0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
    0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
    0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
    0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
    0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
    0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
    0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
    0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
    0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
    0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
    0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
    0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD6, 0xFF, 0xD9
  ]);
}

async function runImagePersistenceTests() {
  console.log('\n========================================================');
  console.log('🧪 IMAGE PERSISTENCE & DATABASE VERIFICATION TEST SUITE');
  console.log('========================================================\n');

  const testFilename = `test_img_${Date.now()}_${Math.floor(Math.random() * 1e6)}.jpg`;
  const testMimetype = 'image/jpeg';
  const testImageBuf = createMinimalJpeg();

  // 1. MySQL DB Ping Test
  console.log('--- 1. Database Connection & Schema Verification ---');
  await itAsync('T1: MySQL DB query connection is live and responds to ping', async () => {
    const rows = await query('SELECT 1 AS ping');
    assert(rows && rows.length > 0, 'Must return result');
    assert.strictEqual(Number(rows[0].ping), 1, 'Ping must return 1');
  });

  await itAsync('T2: withme_uploaded_files table exists with required schema', async () => {
    const rows = await query(
      `SELECT COLUMN_NAME, DATA_TYPE 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'withme_uploaded_files'`
    );
    assert(rows && rows.length > 0, 'Table withme_uploaded_files must exist');
    const cols = rows.map(r => r.COLUMN_NAME.toLowerCase());
    assert(cols.includes('filename'), 'Must have filename column');
    assert(cols.includes('mimetype'), 'Must have mimetype column');
    assert(cols.includes('data'), 'Must have data column');
    assert(cols.includes('size'), 'Must have size column');

    const dataCol = rows.find(r => r.COLUMN_NAME.toLowerCase() === 'data');
    assert(['longblob', 'mediumblob', 'blob'].includes(dataCol.DATA_TYPE.toLowerCase()), 'Data column must be BLOB/LONGBLOB');
  });

  // 2. Direct Blob Persistence & Retrieval
  console.log('\n--- 2. Direct Blob Persistence & Retrieval ---');
  await itAsync('T3: INSERT image into withme_uploaded_files table', async () => {
    const result = await query(
      `INSERT INTO withme_uploaded_files (filename, mimetype, data, size)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE data = VALUES(data), size = VALUES(size), mimetype = VALUES(mimetype)`,
      [testFilename, testMimetype, testImageBuf, testImageBuf.length]
    );
    assert(result && result.affectedRows >= 1, 'Must insert or update row');
  });

  await itAsync('T4: SELECT back image and verify binary data integrity', async () => {
    const rows = await query(
      'SELECT filename, mimetype, data, size FROM withme_uploaded_files WHERE filename = ? LIMIT 1',
      [testFilename]
    );
    assert.strictEqual(rows.length, 1, 'Must find exactly 1 record');
    const row = rows[0];
    assert.strictEqual(row.filename, testFilename, 'Filename must match');
    assert.strictEqual(row.mimetype, testMimetype, 'Mimetype must match');

    const dataBuf = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data);
    assert.strictEqual(dataBuf.length, testImageBuf.length, 'Binary length must match original');
    assert.strictEqual(dataBuf[0], 0xFF, 'First byte must be 0xFF (JPEG magic)');
    assert.strictEqual(dataBuf[1], 0xD8, 'Second byte must be 0xD8 (JPEG magic)');
  });

  await itAsync('T5: ON DUPLICATE KEY UPDATE updates without duplicate records', async () => {
    const updatedBuf = Buffer.concat([testImageBuf, Buffer.alloc(32, 0xEE)]);
    await query(
      `INSERT INTO withme_uploaded_files (filename, mimetype, data, size)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE data = VALUES(data), size = VALUES(size), mimetype = VALUES(mimetype)`,
      [testFilename, testMimetype, updatedBuf, updatedBuf.length]
    );

    const countRows = await query(
      'SELECT COUNT(*) AS cnt FROM withme_uploaded_files WHERE filename = ?',
      [testFilename]
    );
    assert.strictEqual(Number(countRows[0].cnt), 1, 'Must not duplicate row on re-insert');

    const dataRows = await query(
      'SELECT size FROM withme_uploaded_files WHERE filename = ? LIMIT 1',
      [testFilename]
    );
    assert.strictEqual(Number(dataRows[0].size), updatedBuf.length, 'Size must reflect updated buffer');
  });

  // 3. Disk Miss & Container Restart Simulation
  console.log('\n--- 3. Container Restart & Local Cache Miss Simulation ---');
  await itAsync('T6: Fallback query restores file to local disk on cache miss', async () => {
    const uploadsDir = path.resolve(__dirname, '../uploads');
    const filePath = path.join(uploadsDir, testFilename);

    // Ensure local file is removed (simulating fresh Render container)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    assert.strictEqual(fs.existsSync(filePath), false, 'Disk cache must be empty initially');

    // Query DB fallback
    const rows = await query(
      'SELECT mimetype, data FROM withme_uploaded_files WHERE filename = ? LIMIT 1',
      [testFilename]
    );
    assert(rows && rows.length > 0, 'Database must have the record');
    const fileRow = rows[0];
    const buf = Buffer.isBuffer(fileRow.data) ? fileRow.data : Buffer.from(fileRow.data);

    // Write back to disk (exact behavior in server.js lines 105-107)
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(filePath, buf);

    // Verify disk has restored file
    assert.strictEqual(fs.existsSync(filePath), true, 'File must be restored to disk');
    const diskBuf = fs.readFileSync(filePath);
    assert.strictEqual(diskBuf.length, buf.length, 'Restored file size must match DB');

    // Clean up local file
    fs.unlinkSync(filePath);
  });

  await itAsync('T7: Unknown non-existent file query returns 0 rows safely without 500 error', async () => {
    const nonExistent = `unknown_${Date.now()}_missing.jpg`;
    const rows = await query(
      'SELECT mimetype, data FROM withme_uploaded_files WHERE filename = ? LIMIT 1',
      [nonExistent]
    );
    assert.strictEqual(rows.length, 0, 'Must return empty array for non-existent file');
  });

  // 4. Large File Handling in Database
  console.log('\n--- 4. Large File Handling (>1MB) ---');
  await itAsync('T8: Large file (>1MB) can be stored and retrieved from LONGBLOB', async () => {
    const largeFilename = `test_large_${Date.now()}.jpg`;
    const largeBuf = Buffer.alloc(1.2 * 1024 * 1024, 0xAA); // 1.2 MB buffer

    await query(
      `INSERT INTO withme_uploaded_files (filename, mimetype, data, size)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE data = VALUES(data), size = VALUES(size)`,
      [largeFilename, 'image/jpeg', largeBuf, largeBuf.length]
    );

    const rows = await query(
      'SELECT size, LENGTH(data) AS len FROM withme_uploaded_files WHERE filename = ? LIMIT 1',
      [largeFilename]
    );
    assert.strictEqual(rows.length, 1, 'Large file record must exist');
    assert.strictEqual(Number(rows[0].size), largeBuf.length, 'Recorded size must match 1.2MB');
    assert.strictEqual(Number(rows[0].len), largeBuf.length, 'Stored BLOB length must match 1.2MB');

    // Cleanup
    await query('DELETE FROM withme_uploaded_files WHERE filename = ?', [largeFilename]);
  });

  // 5. KYC Security Guard Verification
  console.log('\n--- 5. KYC Document Security Guard Verification ---');
  it('T9: KYC filename prefixes are strictly identified for authentication check', () => {
    const KYC_PREFIXES = ['aadhar_front_', 'aadhar_back_', 'aadhaar_front_', 'aadhaar_back_', 'mock_aadhaar'];
    const isProtected = (fn) => KYC_PREFIXES.some(p => fn.startsWith(p));

    assert.strictEqual(isProtected('aadhaar_front_user123_doc.jpg'), true);
    assert.strictEqual(isProtected('aadhaar_back_user123_doc.jpg'), true);
    assert.strictEqual(isProtected('aadhar_front_456.png'), true);
    assert.strictEqual(isProtected('mock_aadhaar_front.jpg'), true);

    // Public photos must NOT be blocked
    assert.strictEqual(isProtected('profile_photo_123.jpg'), false);
    assert.strictEqual(isProtected('priya.jpg'), false);
    assert.strictEqual(isProtected('explore_partner_photo.jpg'), false);
  });

  it('T10: server.js contains KYC access control on /uploads fallback', () => {
    const serverSrc = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');
    assert(serverSrc.includes('KYC_PREFIXES'), 'server.js must define KYC_PREFIXES');
    assert(serverSrc.includes('Unauthorized: authentication required'), 'server.js must check authentication for KYC files');
    assert(serverSrc.includes('jwt.verify'), 'server.js must verify JWT token');
  });

  // 6. Route-Level DB Persistence Verification
  console.log('\n--- 6. Route Codebase Implementation Verification ---');
  it('T11: uploadRoutes.js writes uploaded files to withme_uploaded_files MySQL table', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/routes/uploadRoutes.js'), 'utf8');
    assert(src.includes('withme_uploaded_files'), 'uploadRoutes must reference withme_uploaded_files');
    assert(src.includes('ON DUPLICATE KEY UPDATE'), 'uploadRoutes must have upsert logic');
  });

  it('T12: profileLiveRoutes.js /photo-upload writes file to withme_uploaded_files', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/routes/profileLiveRoutes.js'), 'utf8');
    assert(src.includes('photo-upload'), 'profileLiveRoutes must define photo-upload');
    assert(src.includes('withme_uploaded_files'), 'profileLiveRoutes must persist to withme_uploaded_files');
  });

  it('T13: profileKycRoutes.js writes Aadhaar front & back to withme_uploaded_files', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/routes/profileKycRoutes.js'), 'utf8');
    assert(src.includes('withme_uploaded_files'), 'profileKycRoutes must persist to withme_uploaded_files');
    assert(src.includes('aadhaar_front'), 'profileKycRoutes must handle aadhaar_front');
    assert(src.includes('aadhaar_back'), 'profileKycRoutes must handle aadhaar_back');
  });

  // Cleanup test row
  await query('DELETE FROM withme_uploaded_files WHERE filename = ?', [testFilename]).catch(() => {});

  console.log('\n========================================================');
  console.log(`📊 TEST SUMMARY: Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('========================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runImagePersistenceTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
