const assert = require('assert');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { query } = require('../src/config/db');
const notificationService = require('../src/services/notificationService');
const chatService = require('../src/services/chatService');

let passedTests = 0;
let failedTests = 0;

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

async function runAuditFixesTests() {
  console.log('\n========================================================');
  console.log('🧪 VERIFICATION TEST SUITE: All 7 User Audit Fixes');
  console.log('========================================================\n');

  // 1. Amit Profile Image Verification
  console.log('--- 1. Amit Profile Image Verification ---');
  await itAsync('Amit (user 2305) has valid profile image and 3 gallery images in DB', async () => {
    const rows = await query('SELECT id, name, profile_image, profile_images FROM users WHERE id = ?', [2305]);
    assert(rows && rows.length > 0, 'User 2305 must exist');
    const u = rows[0];
    assert(u.profile_image && u.profile_image.includes('amit_1.jpg'), 'profile_image must point to amit_1.jpg');

    const photos = JSON.parse(u.profile_images);
    assert(Array.isArray(photos), 'profile_images must be array');
    assert(photos.length >= 3, 'Must have at least 3 photos');
    assert(photos.some(p => p.includes('amit_1.jpg')), 'Must contain amit_1.jpg');
    assert(photos.some(p => p.includes('amit_2.jpg')), 'Must contain amit_2.jpg');
    assert(photos.some(p => p.includes('amit_3.jpg')), 'Must contain amit_3.jpg');
  });

  await itAsync('Amit photo files exist in withme_uploaded_files table', async () => {
    const rows = await query('SELECT filename, size FROM withme_uploaded_files WHERE filename IN (?, ?, ?)', [
      'amit_1.jpg', 'amit_2.jpg', 'amit_3.jpg'
    ]);
    assert.strictEqual(rows.length, 3, 'All 3 amit photos must exist in withme_uploaded_files table');
    rows.forEach(r => assert(r.size > 100000, `${r.filename} must have real binary data > 100KB`));
  });

  await itAsync('Old base64 cached filename for Amit is mapped to real photo binary data in DB', async () => {
    const rows = await query('SELECT filename, size FROM withme_uploaded_files WHERE filename = ?', [
      'base64-1792144167755-640219276.jpeg'
    ]);
    assert.strictEqual(rows.length, 1, 'Alias row must exist');
    assert(rows[0].size > 100000, 'Alias row must contain actual image data');
  });

  // 2. Chat Process & Sender Profile Verification
  console.log('\n--- 2. Chat Process & Sender Profile Verification ---');
  await itAsync('findUser returns Amit name and amit_1.jpg photo for user 2305', async () => {
    const userInfo = await chatService.findUser('2305');
    assert(userInfo, 'Must find user 2305');
    assert(userInfo.name.includes('Amit'), `Name must be Amit, got ${userInfo.name}`);
    assert(userInfo.profile_image.includes('amit_1.jpg'), `Profile photo must be amit_1.jpg, got ${userInfo.profile_image}`);
  });

  await itAsync('saveMessage stores message and updates conversation time', async () => {
    const testMsg = 'Automated test message ' + Date.now();
    const saved = await chatService.saveMessage({
      conversationId: 37,
      senderId: '2305',
      receiverId: 'usr_203',
      message: testMsg,
      messageType: 'text',
      isDelivered: true
    });
    assert(saved && saved.id, 'Must return saved message');
    assert.strictEqual(saved.message, testMsg, 'Saved message text must match');
  });

  // 3. FCM Push Notification v1 Delivery Verification
  console.log('\n--- 3. Firebase Chat Notification Delivery Verification ---');
  await itAsync('Service account credentials file exists and project_id is withme24-b4e35', () => {
    const saPath = path.resolve(__dirname, '../src/config/firebase-service-account.json');
    assert(fs.existsSync(saPath), 'Service account file must exist');
    const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    assert.strictEqual(sa.project_id, 'withme24-b4e35', 'Project ID must match');
    assert(sa.private_key && sa.private_key.includes('BEGIN PRIVATE KEY'), 'Private key must be valid');
  });

  await itAsync('OAuth2 access token for Firebase HTTP v1 can be generated and delivers push', async () => {
    const sa = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/config/firebase-service-account.json'), 'utf8'));
    const testToken = 'dNCuau0gSD2FK5DydJasbH:APA91bHMETdP2hf2IFP9bgRYz4qbspq7LVmWT4s9j0FESuvB8sCvJzgRqCnidLzAt_1hvZknIw7jnOq3yP7EnDvrE_vLHm7c0IT5DoYgwK84IENdozXIb04';

    const result = await notificationService.sendFcmPushNotification(
      testToken,
      'Test Chat Notification',
      'Hello from automated test',
      { type: 'chat_message', user_name: 'Amit', user_photo_url: 'https://withmeapi-userapp.onrender.com/uploads/amit_1.jpg' }
    );
    assert(result, 'Must return result');
    assert.strictEqual(result.sent, true, 'Push notification must be accepted by Firebase (sent: true)');
  });

  // 4. Coffee Price Verification (999)
  console.log('\n--- 4. Coffee Price Verification (Must be 999) ---');
  await itAsync('withme_partners in Coffee category have price = 999 in DB', async () => {
    const rows = await query("SELECT COUNT(*) AS cnt FROM withme_partners WHERE (category = 'Coffee' OR activity = 'Coffee') AND price = 999");
    const totalCoffee = await query("SELECT COUNT(*) AS cnt FROM withme_partners WHERE (category = 'Coffee' OR activity = 'Coffee')");
    assert(Number(rows[0].cnt) > 0, 'Must have Coffee partners with price 999');
    assert.strictEqual(Number(rows[0].cnt), Number(totalCoffee[0].cnt), 'ALL Coffee partners must have price 999');
  });

  // 5. Priya Sharma 5 Images Verification
  console.log('\n--- 5. Priya Sharma 5 Images Verification ---');
  await itAsync('Priya Sharma (usr_203) has exactly 5 photos in withme_partners DB', async () => {
    const rows = await query("SELECT photos FROM withme_partners WHERE partner_id = 'usr_203' OR id = 391 LIMIT 1");
    assert(rows && rows.length > 0, 'Priya Sharma must exist');
    const photos = JSON.parse(rows[0].photos);
    assert.strictEqual(photos.length, 5, `Priya Sharma must have exactly 5 photos, found ${photos.length}`);
    photos.forEach(p => assert(p.includes('/uploads/priya'), `Photo must be a real priya photo URL: ${p}`));
  });

  // 6 & 7. Diverse Partner Profiles Verification
  console.log('\n--- 6 & 7. Distinct & Original Partner Profiles Verification ---');
  await itAsync('Multiple distinct partner names and images exist in Coffee category', async () => {
    const partners = await query("SELECT name, image FROM withme_partners WHERE category = 'Coffee' LIMIT 20");
    const uniqueNames = new Set(partners.map(p => p.name));
    const uniqueImages = new Set(partners.map(p => p.image));
    assert(uniqueNames.size >= 5, `Must have at least 5 distinct partner names, got ${uniqueNames.size}`);
    assert(uniqueImages.size >= 5, `Must have at least 5 distinct partner images, got ${uniqueImages.size}`);
  });

  console.log('\n========================================================');
  console.log(`📊 AUDIT FIXES SUMMARY: Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('========================================================\n');

  if (failedTests > 0) process.exit(1);
  else process.exit(0);
}

runAuditFixesTests().catch(err => {
  console.error('Fatal audit test error:', err);
  process.exit(1);
});
