const bcrypt = require('bcryptjs');
const db = require('./config/db');

function seed() {
  const admin = db.prepare('SELECT * FROM users WHERE user_id = ?').get('admin');
  if (!admin) {
    db.prepare(`
      INSERT INTO users (user_id, email, password, is_admin, status)
      VALUES (?, ?, ?, 1, 'active')
    `).run('admin', 'admin@paypilot.com', bcrypt.hashSync('Admin@123', 10));
    console.log('Seeded admin user -> userId: admin | password: Admin@123');
  }
}

module.exports = seed;
