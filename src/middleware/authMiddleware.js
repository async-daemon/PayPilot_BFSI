const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../services/authService');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    req.isAdmin = payload.isAdmin;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.isAdmin) return res.status(403).json({ message: 'Admin access required.' });
  next();
}

module.exports = { requireAuth, requireAdmin };
