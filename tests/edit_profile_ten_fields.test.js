const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../src/middleware/authMiddleware');

async function runTests() {
  console.log('\n========================================================');
  console.log('🧪 EDIT PROFILE 10-FIELDS VERIFICATION TEST SUITE');
  console.log('========================================================\n');

  const app = express();
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  const testPhone = '7250642635';
  const testUserId = 2326;
  const authToken = jwt.sign(
    {
      id: testUserId,
      user_id: `usr_${testPhone}`,
      name: 'User',
      phone_number: testPhone,
      full_phone_number: `+91${testPhone}`
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const profileKycRoutes = require('../src/routes/profileKycRoutes');
  app.use('/api/v1', profileKycRoutes);
  app.use('/profile', profileKycRoutes);

  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let passed = 0;
  let failed = 0;

  function assert(condition, desc) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  try {
    // TEST 1: Update Profile with all 10 fields (JSON format with base64 image + attempt to edit mobile_number)
    console.log('--- 1. Edit Profile with all 10 fields ---');
    const dummyBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

    const editPayload = {
      full_name: 'Rahul Sharma',                 // 1- Full Name
      age: 25,                                  // 2- Age
      mobile_number: '9876543210',              // 3- Mobile Number (client attempts to edit - MUST BE IGNORED)
      phone_number: '9876543210',               // 3- Mobile Number alias (MUST BE IGNORED)
      email: 'rahul.sharma@example.com',        // 4- Email
      city: 'Delhi',                            // 5- City
      gender: 'Male',                           // 6- Gender
      about: 'Passionate developer and fitness enthusiast.', // 7- About
      nickname: 'Rahul',                        // 8- Nick Name
      dob: '2001-03-20',                        // 9- Dob
      upload_image: dummyBase64                 // 10- Upload Image
    };

    const editRes = await fetch(`${baseUrl}/api/v1/profile/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(editPayload)
    });

    const editJson = await editRes.json();
    assert(editRes.status === 200, `POST /api/v1/profile/edit returns 200 OK (got ${editRes.status})`);
    assert(editJson.success === true, 'Profile update returns success: true');

    // 1- Full Name check
    assert(editJson.full_name === 'Rahul Sharma' && editJson.name === 'Rahul Sharma', '1. Full Name returned as Rahul Sharma');

    // 2- Age check
    assert(editJson.age === 25, '2. Age returned correctly as 25');

    // 3- Mobile Number - uneditable check
    assert(
      String(editJson.mobile_number) === String(testPhone) &&
      String(editJson.mobile_number) !== '9876543210',
      `3. Mobile Number is uneditable: preserved original registered number (${testPhone}) and rejected 9876543210`
    );
    assert(editJson.is_mobile_editable === false && editJson.phone_uneditable === true, '3. Flag is_mobile_editable is false and phone_uneditable is true');

    // 4- Email check
    assert(editJson.email === 'rahul.sharma@example.com', '4. Email returned as rahul.sharma@example.com');

    // 5- City check
    assert(editJson.city === 'Delhi', '5. City returned as Delhi');

    // 6- Gender check
    assert(editJson.gender === 'Male', '6. Gender returned as Male');

    // 7- About check
    assert(editJson.about === 'Passionate developer and fitness enthusiast.' && editJson.bio === 'Passionate developer and fitness enthusiast.', '7. About/bio returned correctly');

    // 8- Nick Name check
    assert(editJson.nickname === 'Rahul' && editJson.nick_name === 'Rahul', '8. Nick Name returned as Rahul');

    // 9- Dob check
    assert(editJson.dob === '2001-03-20' && editJson.date_of_birth === '2001-03-20', '9. Dob returned as 2001-03-20');

    // 10- Upload Image check
    assert(
      editJson.profile_image && editJson.profile_image.includes('/uploads/profile-'),
      `10. Upload Image processed base64 into /uploads/ URL: ${editJson.profile_image}`
    );

    // TEST 2: GET Profile verification
    console.log('\n--- 2. GET Profile returns all 10 fields ---');
    const getRes = await fetch(`${baseUrl}/api/v1/profile`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const getJson = await getRes.json();
    assert(getRes.status === 200, `GET /api/v1/profile returns 200 OK`);
    assert(getJson.full_name === 'Rahul Sharma', 'GET: 1. full_name matches updated value');
    assert(getJson.age === 25, `GET: 2. age is present (${getJson.age})`);
    assert(getJson.phone_number === testPhone && getJson.mobile_number === testPhone, 'GET: 3. phone_number remains unedited registered number');
    assert(getJson.is_mobile_editable === false && getJson.phone_uneditable === true, 'GET: 3. is_mobile_editable is false');
    assert(getJson.email === 'rahul.sharma@example.com', 'GET: 4. email matches');
    assert(getJson.city === 'Delhi', 'GET: 5. city matches');
    assert(getJson.gender === 'Male', 'GET: 6. gender matches');
    assert(getJson.about === 'Passionate developer and fitness enthusiast.', 'GET: 7. about matches');
    assert(getJson.nickname === 'Rahul', 'GET: 8. nickname matches');
    assert(getJson.dob === '2001-03-20', 'GET: 9. dob matches');
    assert(Boolean(getJson.profile_image && getJson.profile_image.includes('/uploads/')), 'GET: 10. profile_image matches');

    // TEST 3: Dynamic Age calculation from DOB
    console.log('\n--- 3. Dynamic Age Calculation when only DOB is supplied ---');
    const dobOnlyPayload = {
      dob: '2000-01-01',
      age: '' // empty, should auto calculate
    };
    const dobRes = await fetch(`${baseUrl}/profile/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(dobOnlyPayload)
    });
    const dobJson = await dobRes.json();
    assert(dobRes.status === 200, 'POST /profile/update with DOB returns 200');
    const expectedAge = new Date().getFullYear() - 2000;
    assert(dobJson.age === expectedAge || dobJson.age === expectedAge - 1, `Auto-calculated age for 2000-01-01 is ${dobJson.age} (expected ~${expectedAge})`);

  } finally {
    server.close();
  }

  console.log('\n========================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
