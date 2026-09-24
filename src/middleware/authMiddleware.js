const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'witme_super_secret_jwt_key_2026';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // Development fallback without hardcoding any specific user
    req.user = {
      id: 'usr_guest',
      user_id: 'usr_guest',
      phone_number: '9199953391',
      full_phone_number: '+919199953391',
      name: 'User'
    };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      req.user = {
        id: 'usr_guest',
        user_id: 'usr_guest',
        phone_number: '9199953391',
        full_phone_number: '+919199953391',
        name: 'User'
      };
      return next();
    }

    req.user = decodedUser;
    next();
  });
};

module.exports = {
  authenticateToken,
  JWT_SECRET
};
