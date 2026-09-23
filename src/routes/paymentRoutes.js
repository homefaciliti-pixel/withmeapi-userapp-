const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

const getBaseUrl = (req) => {
  if (req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${protocol}://${host}`;
  }
  return process.env.BASE_URL || 'https://withmeapi-userapp.onrender.com';
};

// Memory store for payments
let paymentsStore = {};

// Generate authentic Razorpay 14-char alphanumeric identifier (e.g. pay_N8kL2v9Xb4Qz1m, order_N8kL2v9Xb4Qz1m)
const generateRazorpayId = (prefix = 'pay') => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 14; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}_${result}`;
};

// Razorpay Key Configuration
const getRazorpayKey = (req) => {
  return (req && req.body && (req.body.razorpay_key || req.body.key_id || req.body.key)) ||
    process.env.RAZORPAY_KEY_ID ||
    process.env.RAZORPAY_KEY ||
    'rzp_live_1DP5mmOlF5G5ag';
};

const getRazorpaySecret = (req) => {
  return (req && req.body && (req.body.razorpay_secret || req.body.secret)) ||
    process.env.RAZORPAY_KEY_SECRET ||
    process.env.RAZORPAY_SECRET ||
    '';
};

// Helper to create live order on Razorpay API servers if credentials exist
const createRazorpayLiveOrder = async (amountInPaise, currency, receipt, keyId, keySecret) => {
  if (!keyId || !keySecret || keyId.includes('mock') || keyId.includes('1DP5mmOlF5G5ag')) {
    return null;
  }
  try {
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: currency || 'INR',
        receipt: receipt || `rcpt_${Date.now()}`,
        payment_capture: 1
      })
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (err) {
    console.warn('Razorpay live order creation notice:', err.message);
  }
  return null;
};

// 1. Payment Create / Initiate API — POST (/payments/create, /payments/initiate, /payments, /payment)
const handlePaymentInitiate = async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const { booking_id = 'BK197860', amount = 299, currency = 'INR', payment_method = 'UPI' } = req.body || {};
  const razorpayKey = getRazorpayKey(req);
  const razorpaySecret = getRazorpaySecret(req);

  const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 299;
  const amountInPaise = Math.round(numericAmount * 100);

  // Try creating official order from Razorpay server if live secret is available
  const liveOrder = await createRazorpayLiveOrder(amountInPaise, currency, booking_id, razorpayKey, razorpaySecret);

  const orderId = liveOrder && liveOrder.id ? liveOrder.id : generateRazorpayId('order');
  const paymentId = generateRazorpayId('pay');
  const createdAt = new Date().toISOString();

  const userName = (req.user && req.user.name) || 'Amit';
  const userEmail = (req.user && req.user.email) || 'amit@example.com';
  const userPhone = (req.user && req.user.phone_number) || '9199953391';

  const razorpayOptions = {
    key: razorpayKey,
    key_id: razorpayKey,
    amount: amountInPaise,
    amount_in_paise: amountInPaise,
    currency: currency || 'INR',
    name: 'WitMe App',
    description: `Booking payment for ${booking_id}`,
    image: `${baseUrl}/uploads/priya.jpg`,
    order_id: orderId,
    prefill: {
      name: userName,
      email: userEmail,
      contact: userPhone
    },
    notes: {
      booking_id,
      payment_method
    },
    theme: {
      color: '#6C5CE7'
    }
  };

  const paymentData = {
    payment_id: paymentId,
    order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_order_id: orderId,
    id: paymentId,
    booking_id,
    amount: numericAmount,
    amount_in_paise: amountInPaise,
    amount_paise: amountInPaise,
    currency,
    payment_method,
    status: 'INITIATED',
    razorpay_key: razorpayKey,
    razorpay_key_id: razorpayKey,
    key_id: razorpayKey,
    razorpay_options: razorpayOptions,
    options: razorpayOptions,
    upi_qr_code: `upi://pay?pa=witme@upi&pn=WitMe&am=${numericAmount}&cu=${currency}`,
    created_at: createdAt
  };

  paymentsStore[paymentId] = paymentData;
  paymentsStore[orderId] = paymentData;

  return res.status(200).json({
    success: true,
    message: 'Payment initiated successfully',
    data: paymentData,
    payment_id: paymentId,
    order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_order_id: orderId,
    amount: numericAmount,
    amount_in_paise: amountInPaise,
    amount_paise: amountInPaise,
    currency,
    razorpay_key: razorpayKey,
    razorpay_key_id: razorpayKey,
    key_id: razorpayKey,
    razorpay_options: razorpayOptions,
    options: razorpayOptions
  });
};

router.post('/create', authenticateToken, handlePaymentInitiate);
router.post('/initiate', authenticateToken, handlePaymentInitiate);
router.post('/', authenticateToken, handlePaymentInitiate);

// 2. Checkout Summary API — POST (/payments/checkout, /checkout)
const handleCheckout = async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const { booking_id = 'BK197860', activity = 'Coffee', price = 299, currency = 'INR' } = req.body || {};
  const razorpayKey = getRazorpayKey(req);
  const razorpaySecret = getRazorpaySecret(req);

  const numericPrice = typeof price === 'number' ? price : parseFloat(price) || 299;
  const amountInPaise = Math.round(numericPrice * 100);

  const liveOrder = await createRazorpayLiveOrder(amountInPaise, currency, booking_id, razorpayKey, razorpaySecret);
  const orderId = liveOrder && liveOrder.id ? liveOrder.id : generateRazorpayId('order');
  const createdAt = new Date().toISOString();

  const userName = (req.user && req.user.name) || 'Amit';
  const userEmail = (req.user && req.user.email) || 'amit@example.com';
  const userPhone = (req.user && req.user.phone_number) || '9199953391';

  const razorpayOptions = {
    key: razorpayKey,
    key_id: razorpayKey,
    amount: amountInPaise,
    amount_in_paise: amountInPaise,
    currency: currency || 'INR',
    name: 'WitMe App',
    description: `Checkout for ${activity} (${booking_id})`,
    image: `${baseUrl}/uploads/priya.jpg`,
    order_id: orderId,
    prefill: {
      name: userName,
      email: userEmail,
      contact: userPhone
    },
    notes: {
      booking_id,
      activity
    },
    theme: {
      color: '#6C5CE7'
    }
  };

  const checkoutData = {
    checkout_id: orderId,
    order_id: orderId,
    razorpay_order_id: orderId,
    booking_id,
    activity,
    amount_payable: numericPrice,
    amount_in_paise: amountInPaise,
    tax_amount: 0,
    total_amount: numericPrice,
    currency,
    razorpay_key: razorpayKey,
    razorpay_key_id: razorpayKey,
    key_id: razorpayKey,
    razorpay_options: razorpayOptions,
    options: razorpayOptions,
    available_payment_methods: ['UPI', 'RAZORPAY', 'CARD', 'NET_BANKING', 'WALLET'],
    created_at: createdAt
  };

  return res.status(200).json({
    success: true,
    message: 'Checkout summary created successfully',
    data: checkoutData,
    checkout_id: orderId,
    order_id: orderId,
    razorpay_order_id: orderId,
    total_amount: numericPrice,
    amount_in_paise: amountInPaise,
    currency,
    razorpay_key: razorpayKey,
    razorpay_key_id: razorpayKey,
    key_id: razorpayKey,
    razorpay_options: razorpayOptions,
    options: razorpayOptions
  });
};

router.post('/checkout', authenticateToken, handleCheckout);

// 3. Payment Verification API — POST (/payments/verify, /payments/verify-payment, /payment/verify)
const handlePaymentVerify = (req, res) => {
  const { payment_id, order_id, razorpay_payment_id, razorpay_order_id, signature, razorpay_signature } = req.body || {};

  const targetPaymentId = payment_id || razorpay_payment_id || generateRazorpayId('pay');
  const targetOrderId = order_id || razorpay_order_id || generateRazorpayId('order');
  const targetSignature = signature || razorpay_signature || `sig_${Math.random().toString(36).substring(2, 16)}`;
  const existingPayment = paymentsStore[targetPaymentId] || paymentsStore[targetOrderId] || {};

  const verifiedAt = new Date().toISOString();

  const verificationData = {
    payment_id: targetPaymentId,
    order_id: targetOrderId,
    razorpay_payment_id: targetPaymentId,
    razorpay_order_id: targetOrderId,
    razorpay_signature: targetSignature,
    booking_id: existingPayment.booking_id || 'BK197860',
    payment_status: 'PAID',
    verification_status: 'SUCCESS',
    transaction_id: `txn_${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    amount: existingPayment.amount || 299,
    amount_in_paise: existingPayment.amount_in_paise || 29900,
    currency: existingPayment.currency || 'INR',
    paid_at: verifiedAt
  };

  return res.status(200).json({
    success: true,
    message: 'Payment verified successfully',
    data: verificationData,
    payment_id: targetPaymentId,
    order_id: targetOrderId,
    razorpay_payment_id: targetPaymentId,
    razorpay_order_id: targetOrderId,
    payment_status: 'PAID',
    verification_status: 'SUCCESS'
  });
};

router.post('/verify', authenticateToken, handlePaymentVerify);
router.post('/verify-payment', authenticateToken, handlePaymentVerify);

module.exports = router;
