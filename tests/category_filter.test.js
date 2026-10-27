const assert = require('assert');
const express = require('express');
const http = require('http');

const exploreRoutes = require('../src/routes/exploreRoutes');
const activityRoutes = require('../src/routes/activityRoutes');

const app = express();
app.use(express.json());

// Mock auth middleware for test by setting req.user
app.use((req, res, next) => {
  req.user = { user_id: 'usr_test_101', id: 'usr_test_101', name: 'Test User' };
  next();
});

app.use('/api/v1', exploreRoutes);
app.use('/api/v1/activities', activityRoutes);

function makeRequest(server, path) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const req = http.get(`http://localhost:${port}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
  });
}

async function runCategoryTests() {
  console.log('\n========================================================');
  console.log('🧪 CATEGORY FILTERING ENDPOINT TESTS');
  console.log('========================================================\n');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));

  try {
    // 1. Test /explore without category filter
    const allExplore = await makeRequest(server, '/api/v1/explore');
    assert.strictEqual(allExplore.status, 200);
    assert(allExplore.body.items.length > 0, 'Unfiltered explore should return items');
    console.log(`  ✅ PASS: Unfiltered explore returns ${allExplore.body.items.length} items (preserved default behavior)`);

    // 2. Test /explore with category=coffee
    const coffeeExplore = await makeRequest(server, '/api/v1/explore?category=coffee');
    assert.strictEqual(coffeeExplore.status, 200);
    assert(coffeeExplore.body.items.length > 0, 'Filtered explore should return coffee items');
    
    // Verify EVERY returned item is coffee-related
    for (const item of coffeeExplore.body.items) {
      const cat = (item.category || '').toLowerCase();
      const act = (item.activity || '').toLowerCase();
      const interests = (item.interests || []).map(i => String(i).toLowerCase());
      const isCoffee = cat.includes('coffee') || act.includes('coffee') || interests.some(i => i.includes('coffee'));
      assert(isCoffee, `Item '${item.name}' with category '${item.category}' must be coffee-related!`);
    }
    console.log(`  ✅ PASS: /explore?category=coffee returns strictly Coffee listings (${coffeeExplore.body.items.length} items verified)`);

    // 3. Test /activities/coffee endpoint
    const coffeeActivities = await makeRequest(server, '/api/v1/activities/coffee');
    assert.strictEqual(coffeeActivities.status, 200);
    assert(coffeeActivities.body.items.length > 0, 'Coffee activities must return items');
    for (const item of coffeeActivities.body.items) {
      const cat = (item.category || '').toLowerCase();
      const interests = (item.interests || []).map(i => String(i).toLowerCase());
      const isCoffee = cat.includes('coffee') || interests.some(i => i.includes('coffee'));
      assert(isCoffee, `Activity item '${item.name}' must be coffee-related!`);
    }
    console.log(`  ✅ PASS: /activities/coffee returns strictly Coffee items (${coffeeActivities.body.items.length} items verified)`);

    // 4. Test /activities/dinner endpoint - verify it does NOT return Coffee-only hardcoded items
    const dinnerActivities = await makeRequest(server, '/api/v1/activities/dinner');
    assert.strictEqual(dinnerActivities.status, 200);
    assert(dinnerActivities.body.items.length > 0, 'Dinner activities must return items');
    for (const item of dinnerActivities.body.items) {
      const cat = (item.category || '').toLowerCase();
      const interests = (item.interests || []).map(i => String(i).toLowerCase());
      const isDinner = cat.includes('dinner') || interests.some(i => i.includes('dinner'));
      assert(isDinner, `Dinner item '${item.name}' must be dinner-related!`);
    }
    console.log(`  ✅ PASS: /activities/dinner returns strictly Dinner items (${dinnerActivities.body.items.length} items verified)`);

    // 5. Test Activity Category Aliases: /activities/category/act_top1 (Coffee alias)
    const actTop1 = await makeRequest(server, '/api/v1/activities/category/act_top1');
    assert.strictEqual(actTop1.status, 200);
    assert.strictEqual(actTop1.body.category_id, 'cat_01');
    assert(actTop1.body.items.length > 0, 'act_top1 should resolve to cat_01 and return items');
    console.log(`  ✅ PASS: /activities/category/act_top1 resolves to cat_01 Coffee (${actTop1.body.items.length} items verified)`);

    // 6. Test Activity Category Aliases: /activities/category/act_top2 (Dinner alias)
    const actTop2 = await makeRequest(server, '/api/v1/activities/category/act_top2');
    assert.strictEqual(actTop2.status, 200);
    assert.strictEqual(actTop2.body.category_id, 'cat_02');
    assert(actTop2.body.items.length > 0, 'act_top2 should resolve to cat_02 and return items');
    console.log(`  ✅ PASS: /activities/category/act_top2 resolves to cat_02 Dinner (${actTop2.body.items.length} items verified)`);

    // 7. Test Activity Category Aliases: /activities/category/withme24_offers (Offers alias)
    const offersRes = await makeRequest(server, '/api/v1/activities/category/withme24_offers');
    assert.strictEqual(offersRes.status, 200);
    assert.strictEqual(offersRes.body.category_id, 'cat_07');
    assert(offersRes.body.items.length > 0, 'withme24_offers should resolve to cat_07 and return items');
    console.log(`  ✅ PASS: /activities/category/withme24_offers resolves to cat_07 Offers (${offersRes.body.items.length} items verified)`);

    console.log('\n========================================================');
    console.log('📊 CATEGORY TESTS: ALL 7 SUITES PASSED');
    console.log('========================================================\n');
    process.exit(0);
  } finally {
    server.close();
  }
}

runCategoryTests().catch(err => {
  console.error('Category test failed:', err);
  process.exit(1);
});
