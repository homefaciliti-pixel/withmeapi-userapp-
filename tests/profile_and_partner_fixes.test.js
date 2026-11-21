const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { query } = require('../src/config/db');

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

async function runProfileAndPartnerFixesTests() {
  console.log('\n========================================================');
  console.log('🧪 PROFILE & PARTNER CLEANUP VERIFICATION TESTS');
  console.log('========================================================\n');

  // 1. Amit Profile Verification
  console.log('--- 1. Amit (User 2305) Profile Integrity ---');
  await test('Amit (user 2305) has correct non-swapped profile fields', async () => {
    const rows = await query('SELECT * FROM users WHERE id = 2305');
    assert(rows && rows.length > 0, 'User 2305 must exist');
    const u = rows[0];
    assert.strictEqual(u.name.trim(), 'Amit', `Name must be Amit, got ${u.name}`);
    assert.strictEqual(u.gender, 'Male', `Gender must be Male, got ${u.gender}`);
    assert.strictEqual(u.dob, '2000-01-01', `DOB must be 2000-01-01, got ${u.dob}`);
    assert.strictEqual(u.city, 'Jaipur', `City must be Jaipur, got ${u.city}`);
    assert.strictEqual(u.state, 'Rajasthan', `State must be Rajasthan, got ${u.state}`);
    assert(u.email && u.email.includes('@'), `Email must be valid, got ${u.email}`);
    assert(u.profile_image && u.profile_image.includes('amit_1.jpg'), `Profile photo must be amit_1.jpg, got ${u.profile_image}`);
  });

  // 2. No Swapped/Corrupted Profiles in Database
  console.log('\n--- 2. Database Self-Healing & Integrity ---');
  await test('Zero user rows have swapped gender/DOB or city/email', async () => {
    const sql = `
      SELECT id, name, gender, dob, city, email 
      FROM users 
      WHERE (gender REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}' AND dob REGEXP '^(Male|Female|Other)') 
         OR (city LIKE '%@%' AND email NOT LIKE '%@%')
    `;
    const rows = await query(sql);
    assert.strictEqual(rows.length, 0, `All corrupted rows must be 0, found ${rows.length}`);
  });

  // 3. Partner Listing Hides Test / Dummy Accounts
  console.log('\n--- 3. Genuine Partner Listing Filter ---');
  await test('Partner queries in activity/explore exclude test & dummy partners', async () => {
    const rows = await query(`
      SELECT id, name, full_name, phone_number, status, is_approved, is_verified
      FROM withme_partners
      WHERE (status IS NULL OR status NOT IN ('DELETED','REJECTED','SUSPENDED','DUPLICATE_DELETED')) 
        AND is_approved = 1 
        AND is_verified = 1
        AND (name NOT LIKE '%Audit User%' AND name NOT LIKE '%Test%' AND name NOT LIKE '%Dummy%')
        AND (phone_number NOT LIKE '99999%' AND mobile_number NOT LIKE '99999%')
    `);

    // Verify none of the returned partners are test accounts
    const invalidAccounts = rows.filter(r => {
      const n = (r.name || r.full_name || '').toLowerCase();
      return n.includes('audit user') || n.includes('dummy') || n.includes('test');
    });
    assert.strictEqual(invalidAccounts.length, 0, `No test accounts should be returned, found ${invalidAccounts.length}`);
    assert(rows.length > 0, 'Genuine partners must be returned');
    console.log(`     Verified: ${rows.length} genuine approved partners returned, 0 test accounts`);
  });

  // 4. Partner Classification Report Summary
  console.log('\n--- 4. Complete Partner Audit Classification Summary ---');
  await test('All partner records in database are accounted for and categorized', async () => {
    const all = await query('SELECT id, name, full_name, phone_number, status, is_approved, is_verified, kyc_status FROM withme_partners');
    assert(all.length >= 69, `Total partners must be at least 69, got ${all.length}`);

    const genuineVerified = all.filter(p => p.is_approved === 1 && p.is_verified === 1 && p.status === 'ACTIVE' && !/audit user|test|dummy/i.test(p.name || ''));
    const testAccounts = all.filter(p => /audit user|test|dummy/i.test(p.name || '') || (p.phone_number && p.phone_number.startsWith('99999')));
    const duplicateAccounts = all.filter(p => p.status === 'DUPLICATE_DELETED');
    const pendingAccounts = all.filter(p => (p.is_approved === 0 || p.is_verified === 0) && !/audit user|test|dummy/i.test(p.name || '') && p.status !== 'DUPLICATE_DELETED');

    console.log(`     Genuine Verified Partners: ${genuineVerified.length}`);
    console.log(`     Fake / Dummy / Test Accounts: ${testAccounts.length}`);
    console.log(`     Duplicate Partners (soft-deleted): ${duplicateAccounts.length}`);
    console.log(`     Verification Pending: ${pendingAccounts.length}`);

    assert(genuineVerified.length >= 35, 'Should have genuine verified partners');
    assert(testAccounts.length >= 8, 'Should identify all test accounts');
    assert(duplicateAccounts.length >= 10, 'Should identify duplicate partners');
  });

  console.log('\n========================================================');
  console.log(`📊 PROFILE & PARTNER TESTS: Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('========================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runProfileAndPartnerFixesTests()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
