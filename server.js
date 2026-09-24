const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const { initializeDatabaseTables } = require('./src/config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Core Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads folder serve
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Fallback image generator if an upload file or nested image is not found on disk
const zlib = require('zlib');
function generateFallback400Image(r = 108, g = 92, b = 231) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const width = 400, height = 400;
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2; // RGB
  ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;

  const ihdrChunk = createFallbackChunk('IHDR', ihdrData);
  const rawData = Buffer.alloc(height * (1 + width * 3));
  const cx = width / 2, cy = height / 2 - 20, radius = width / 4;

  for (let y = 0; y < height; y++) {
    const offset = y * (1 + width * 3);
    rawData[offset] = 0;
    for (let x = 0; x < width; x++) {
      const pixelOffset = offset + 1 + x * 3;
      const dx = x - cx, dy = y - cy;
      const distSq = dx * dx + dy * dy;

      const inCircle = distSq <= radius * radius;
      const inBody = (y > cy + radius * 0.5 && Math.abs(x - cx) < radius * 1.2 && y < cy + radius * 1.8);
      const isBorder = (x < 8 || x > width - 8 || y < 8 || y > height - 8);

      if (isBorder || inCircle || inBody) {
        rawData[pixelOffset] = 255;
        rawData[pixelOffset + 1] = 255;
        rawData[pixelOffset + 2] = 255;
      } else {
        rawData[pixelOffset] = Math.min(255, r + Math.floor(x * 50 / width));
        rawData[pixelOffset + 1] = Math.min(255, g + Math.floor(y * 50 / height));
        rawData[pixelOffset + 2] = b;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createFallbackChunk('IDAT', compressedData);
  const iendChunk = createFallbackChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createFallbackChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const buf = Buffer.concat([typeBuf, data]);
  const crc = crc32Fallback(buf);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([length, buf, crcBuf]);
}

function crc32Fallback(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) crc = (crc >>> 1) ^ 0xEDB88320;
      else crc = crc >>> 1;
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const fallbackImageBuf = generateFallback400Image();

app.use('/uploads', (req, res) => {
  res.setHeader('Content-Type', 'image/png');
  return res.status(200).send(fallbackImageBuf);
});

// Import Route Modules
const authRoutes = require('./src/routes/authRoutes');
const profileKycRoutes = require('./src/routes/profileKycRoutes');
const aadhaarRoutes = require('./src/routes/aadhaarRoutes');
const profileLiveRoutes = require('./src/routes/profileLiveRoutes');
const activityRoutes = require('./src/routes/activityRoutes');
const partnerRequestRoutes = require('./src/routes/partnerRequestRoutes');
const exploreRoutes = require('./src/routes/exploreRoutes');
const generalRoutes = require('./src/routes/generalRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');

// Bind Routes to Base API Path
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', profileKycRoutes);
app.use('/api/v1/kyc', profileKycRoutes);
app.use('/kyc', profileKycRoutes);
app.use('/profile', profileKycRoutes);
app.use('/api/v1/aadhaar', aadhaarRoutes);
app.use('/aadhaar', aadhaarRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/upload', uploadRoutes);
app.use('/file-upload', uploadRoutes);
app.use('/api/v1/profile-live', profileLiveRoutes);
app.use('/api/v1/activities', activityRoutes);
app.use('/activities', activityRoutes);
app.use('/api/v1/category', activityRoutes);
app.use('/category', activityRoutes);
app.use('/api/v1/categories', activityRoutes);
app.use('/categories', activityRoutes);
app.use('/api/v1/partner-request', partnerRequestRoutes);
app.use('/api/v1/partner-requests', partnerRequestRoutes);
app.use('/api/v1/partners', partnerRequestRoutes);
app.use('/api/v1/partner', partnerRequestRoutes);
app.use('/partner-request', partnerRequestRoutes);
app.use('/partner-requests', partnerRequestRoutes);
app.use('/partners', partnerRequestRoutes);
app.use('/partner', partnerRequestRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/bookings', bookingRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/payments', paymentRoutes);
app.use('/payment', paymentRoutes);
app.use('/checkout', paymentRoutes);
app.use('/api/v1', exploreRoutes);
app.use('/api/v1/general', generalRoutes);

// Documentation Serve Endpoints
const serveApiDocumentation = (req, res) => {
  const docPath = path.join(__dirname, 'API_DOCUMENTATION.txt');
  if (fs.existsSync(docPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.sendFile(docPath);
  }
  return res.status(404).send('Documentation file not found.');
};

app.get('/API_DOCUMENTATION.txt', serveApiDocumentation);
app.get('/api_documentation.txt', serveApiDocumentation);
app.get('/API_DOCUMENTATION', serveApiDocumentation);
app.get('/api_documentation', serveApiDocumentation);
app.get('/documentation.txt', serveApiDocumentation);
app.get('/documentation', serveApiDocumentation);
app.get('/docs', serveApiDocumentation);
app.get('/txt', serveApiDocumentation);
app.get('/api/v1/documentation', serveApiDocumentation);
app.get('/api/v1/docs', serveApiDocumentation);

// Health Check Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    app: 'WitMe User App REST API Server',
    version: '1.0.0',
    database: process.env.MYSQL_DATABASE || 'homef4fw_homefaci',
    sms_sender_id: process.env.SMS_SENDER_ID || 'HMFCLI',
    documentation_url: 'https://withmeapi-userapp.onrender.com/API_DOCUMENTATION.txt',
    documentation: 'See API_DOCUMENTATION.txt in root folder or visit /API_DOCUMENTATION.txt',
    timestamp: new Date().toISOString()
  });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found.`
  });
});

// Start Server with Port Fallback and DB Init
const startServer = (portToTry) => {
  const server = app.listen(portToTry, async () => {
    console.log(`=======================================================`);
    console.log(`🚀 WitMe User App API Server running on port ${portToTry}`);
    console.log(`📍 Base URL: http://localhost:${portToTry}/api/v1`);
    console.log(`🗄️ MySQL Database: ${process.env.MYSQL_DATABASE || 'homef4fw_homefaci'}`);
    console.log(`📱 SMS Sender ID: ${process.env.SMS_SENDER_ID || 'HMFCLI'}`);
    console.log(`📄 Documentation: http://localhost:${portToTry}/API_DOCUMENTATION.txt`);
    console.log(`=======================================================`);

    // Initialize DB tables
    await initializeDatabaseTables();
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${portToTry} is in use, trying port ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('Server error:', err);
    }
  });
};

startServer(PORT);
