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

// Fallback image handler if an upload file is not found on disk
app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename || 'Image';
  const label = filename.split('.')[0].replace(/_/g, ' ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#6C5CE7"/>
    <circle cx="200" cy="160" r="60" fill="#FFFFFF" opacity="0.8"/>
    <path d="M100,320 C100,240 140,220 200,220 C260,220 300,240 300,320 Z" fill="#FFFFFF" opacity="0.8"/>
    <text x="50%" y="370" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${label}</text>
  </svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  return res.status(200).send(svg);
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

// Bind Routes to Base API Path
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', profileKycRoutes);
app.use('/api/v1/aadhaar', aadhaarRoutes);
app.use('/api/v1/profile-live', profileLiveRoutes);
app.use('/api/v1/activities', activityRoutes);
app.use('/api/v1/partner-request', partnerRequestRoutes);
app.use('/api/v1', exploreRoutes);
app.use('/api/v1/general', generalRoutes);

// Health Check Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    app: 'WitMe User App REST API Server',
    version: '1.0.0',
    database: process.env.MYSQL_DATABASE || 'homef4fw_homefaci',
    sms_sender_id: process.env.SMS_SENDER_ID || 'HMFCLI',
    documentation: 'See API_DOCUMENTATION.txt in root folder',
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
