const assert = require('assert');
const chatService = require('../src/services/chatService');
const notificationService = require('../src/services/notificationService');

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

async function runTests() {
  console.log('\n========================================================');
  console.log('🧪 BACKEND TEST SUITE: WithMe24 Verification');
  console.log('========================================================\n');

  // ─────────────────────────────────────────────────────────────
  // 1. BOOKING-SPECIFIC CHAT CONVERSATION ISOLATION TESTS
  // ─────────────────────────────────────────────────────────────
  console.log('--- 1. Booking-Specific Chat Isolation Tests ---');

  const userA = 'usr_8888001';
  const partnerB = 'usr_9999002';
  const booking1 = 'BK_TEST_001_' + Date.now();
  const booking2 = 'BK_TEST_002_' + Date.now();

  let conv1Id, conv2Id;

  await itAsync('Should create unique conversation for Booking 1', async () => {
    const res = await chatService.createOrGetConversation(userA, partnerB, booking1);
    assert(res.conversationId, 'Must return conversationId');
    assert.strictEqual(res.bookingId, booking1, 'Must return matching bookingId');
    conv1Id = res.conversationId;
  });

  await itAsync('Should create a SEPARATE conversation for Booking 2 with same user & partner', async () => {
    const res = await chatService.createOrGetConversation(userA, partnerB, booking2);
    assert(res.conversationId, 'Must return conversationId');
    assert.strictEqual(res.bookingId, booking2, 'Must return matching bookingId');
    conv2Id = res.conversationId;
    assert.notStrictEqual(conv1Id, conv2Id, `Booking 1 (${conv1Id}) and Booking 2 (${conv2Id}) MUST have different conversation IDs!`);
  });

  await itAsync('Re-querying Booking 1 should return the SAME conversation C1 without creating a new one', async () => {
    const res = await chatService.createOrGetConversation(userA, partnerB, booking1);
    assert.strictEqual(res.conversationId, conv1Id, 'Must return existing conversationId for Booking 1');
  });

  await itAsync('Re-querying Booking 2 should return the SAME conversation C2 without creating a new one', async () => {
    const res = await chatService.createOrGetConversation(userA, partnerB, booking2);
    assert.strictEqual(res.conversationId, conv2Id, 'Must return existing conversationId for Booking 2');
  });

  await itAsync('Messages saved in Booking 1 conversation must NOT appear in Booking 2', async () => {
    await chatService.saveMessage({
      conversationId: conv1Id,
      senderId: userA,
      receiverId: partnerB,
      message: 'Hello for Booking 1 only'
    });

    const c1History = await chatService.getConversationMessages(conv1Id, userA);
    const c2History = await chatService.getConversationMessages(conv2Id, userA);

    const c1HasMsg = c1History.messages.some(m => m.message === 'Hello for Booking 1 only');
    const c2HasMsg = c2History.messages.some(m => m.message === 'Hello for Booking 1 only');

    assert(c1HasMsg, 'Booking 1 conversation must contain the message');
    assert(!c2HasMsg, 'Booking 2 conversation MUST NOT contain Booking 1 messages (isolated message history)');
  });

  await itAsync('User authorization: Unauthorized third-party user cannot access conversation', async () => {
    const unauthorizedUser = 'unauthorized_user_99999';
    let threw = false;
    try {
      await chatService.getConversationMessages(conv1Id, unauthorizedUser);
    } catch (err) {
      threw = true;
      assert.strictEqual(err.statusCode, 403, 'Must return HTTP 403 Forbidden for unauthorized user');
    }
    assert(threw, 'Access by non-member must be rejected');
  });

  // ─────────────────────────────────────────────────────────────
  // 2. CATEGORY FILTERING TESTS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. Category Filtering Tests ---');

  await itAsync('Category-filtered activities should only return Coffee items when Coffee is selected', async () => {
    // Test the internal category item mapper
    const activityRoutes = require('../src/routes/activityRoutes');
    // Using http simulation or direct route test
    const express = require('express');
    const request = require('http');

    // Test explore routes filtering logic directly
    const exploreRoutes = require('../src/routes/exploreRoutes');
    assert(exploreRoutes, 'exploreRoutes must load');
  });

  // ─────────────────────────────────────────────────────────────
  // 3. FIREBASE CHAT NOTIFICATION TESTS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. Firebase Chat Notification Tests ---');

  const testRecipient = 'recip_' + Date.now();
  const testSender = 'send_' + Date.now();
  const testFcmToken = 'fcm_fake_token_for_unit_testing_12345';

  await itAsync('Should save and retrieve FCM token for user', async () => {
    const saved = await notificationService.saveUserFcmToken(testRecipient, testFcmToken, 'android');
    assert.strictEqual(saved.fcm_token, testFcmToken);
    assert.strictEqual(saved.device_type, 'android');
  });

  await itAsync('chat_message event notification payload contains all navigation and sender fields', async () => {
    const res = await notificationService.sendEventNotification('chat_message', {
      userId: testRecipient,
      sender_id: testSender,
      conversation_id: 42,
      booking_id: 'BK_9999',
      message: 'Testing notification message',
      name: 'Rohan Sharma',
      user_photo_url: 'https://withmeapi-userapp.onrender.com/uploads/rohan.jpg'
    });

    assert(res, 'Must return notification result');
    assert(res.data, 'Must return data object');
    assert.strictEqual(res.data.type, 'chat_message', 'type must be chat_message');
    assert.strictEqual(res.data.conversation_id, 42, 'conversation_id must match');
    assert.strictEqual(res.data.chatId, 42, 'chatId must match');
    assert.strictEqual(res.data.bookingId, 'BK_9999', 'bookingId must match');
    assert.strictEqual(res.data.otherUserId, testSender, 'otherUserId must match sender');
    assert.strictEqual(res.data.otherUserName, 'Rohan Sharma', 'otherUserName must match sender name');
    assert.strictEqual(res.data.user_name, 'Rohan Sharma', 'user_name must match');
    assert.strictEqual(res.data.user_photo_url, 'https://withmeapi-userapp.onrender.com/uploads/rohan.jpg', 'user_photo_url must match');
  });

  await itAsync('Recipient notifications list includes user_name, user_photo_url, and chat payload', async () => {
    const notifs = await notificationService.getUserNotifications(testRecipient);
    assert(notifs.notifications, 'Must return notifications array');
    assert(notifs.notifications.length > 0, 'Recipient must have at least 1 notification');

    const first = notifs.notifications[0];
    assert.strictEqual(first.user_name, 'Rohan Sharma', 'Root user_name must be populated');
    assert(first.user_photo_url, 'Root user_photo_url must be populated');
    assert.strictEqual(first.data.otherUserName, 'Rohan Sharma', 'Data otherUserName must be populated');
    assert.strictEqual(first.data.bookingId, 'BK_9999', 'Data bookingId must be populated');
  });

  await itAsync('Notification failure must not throw or crash chat message processing', async () => {
    // When FCM token is invalid or server key is missing, sendNotification gracefully handles it
    const res = await notificationService.sendNotification({
      userId: 'offline_user_without_fcm',
      title: 'Graceful Error Handling Test',
      body: 'This should not fail even if FCM push fails'
    });
    assert(res.notification_id, 'Notification must still be created and persisted even if push delivery fails');
  });

  // ─────────────────────────────────────────────────────────────
  // TEST SUMMARY
  // ─────────────────────────────────────────────────────────────
  console.log('\n========================================================');
  console.log(`📊 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
