const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const crypto   = require('crypto');
const User     = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/institute_erp';
const EMAIL     = process.env.ADMIN_EMAIL || 'admin@inflorescence.com';
// Use env var if set, otherwise generate a secure random password
const PASSWORD  = process.env.ADMIN_SEED_PASSWORD || crypto.randomBytes(10).toString('hex');

const seed = async () => {
  try {
    const existing = await User.findOne({ role: 'admin' });

    if (existing) {
      console.log('ℹ️  Admin already exists (' + existing.email + ') — skipping seed.');
      process.exit(0);
    }

    console.log('👤 No admin found. Creating default admin...');
    const admin = await User.create({
      name: 'System Admin',
      email: EMAIL,
      password: PASSWORD,
      role: 'admin',
      joining_date: new Date(),
    });

    const ok = await admin.matchPassword(PASSWORD);
    if (!ok) throw new Error('Password hash verification failed after create!');

    console.log('');
    console.log('✅  Admin created successfully!');
    console.log('──────────────────────────────');
    console.log('   Email   : ' + EMAIL);
    console.log('   Password: ' + PASSWORD);
    console.log('──────────────────────────────');
    console.log('⚠️  Save this password — it will not be shown again!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
};

mongoose
  .connect(MONGO_URI)
  .then(() => seed())
  .catch(err => {
    console.error('❌ MongoDB connect failed:', err.message);
    process.exit(1);
  });
