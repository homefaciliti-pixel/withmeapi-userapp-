const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const getBaseUrl = (req) => {
  if (req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${protocol}://${host}`;
  }
  return process.env.BASE_URL || 'https://withmeapi-userapp.onrender.com';
};

// 1. Who Viewed Your Live / Interest API — GET & POST
router.get('/viewed-interest', authenticateToken, (req, res) => {
  const baseUrl = getBaseUrl(req);
  const { type } = req.query; // 'viewers' or 'interests'

  const liveViewers = [
    { user_id: 'usr_101', name: 'Sara Khan', profile_pic: `${baseUrl}/uploads/user101.jpg`, viewed_at: '2026-09-11T10:30:00Z', type: 'LIVE_VIEWER' },
    { user_id: 'usr_102', name: 'Rohan Verma', profile_pic: `${baseUrl}/uploads/user102.jpg`, viewed_at: '2026-09-11T11:00:00Z', type: 'EXPRESSED_INTEREST' }
  ];

  let filtered = liveViewers;
  if (type === 'viewers') {
    filtered = liveViewers.filter(item => item.type === 'LIVE_VIEWER');
  } else if (type === 'interests') {
    filtered = liveViewers.filter(item => item.type === 'EXPRESSED_INTEREST');
  }

  return res.status(200).json({
    success: true,
    count: filtered.length,
    data: filtered
  });
});

router.post('/viewed-interest', authenticateToken, (req, res) => {
  const { target_user_id, action = 'EXPRESS_INTEREST' } = req.body;

  if (!target_user_id) {
    return res.status(400).json({
      success: false,
      message: 'target_user_id is required'
    });
  }

  return res.status(200).json({
    success: true,
    message: `Successfully performed action: ${action} for user ${target_user_id}`
  });
});

// 2. Profile Photo Upload API — POST
router.post('/photo-upload', authenticateToken, upload.single('photo'), (req, res) => {
  const baseUrl = getBaseUrl(req);
  const photoFile = req.file;

  const photoUrl = photoFile
    ? `${baseUrl}/uploads/${photoFile.filename}`
    : `${baseUrl}/uploads/default_uploaded_photo.jpg`;

  return res.status(200).json({
    success: true,
    message: 'Profile photo uploaded successfully',
    photo_url: photoUrl
  });
});

// 3. Face Scan Recognition API — POST
router.post('/face-scan', authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Face scan liveness and recognition verification successful',
    data: {
      is_live_person: true,
      match_confidence: 0.985,
      verification_status: 'SUCCESS',
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;
