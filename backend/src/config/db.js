const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const seedAdmin = async () => {
  const User     = require('../models/User');
  const EMAIL    = process.env.ADMIN_EMAIL    || 'admin@inflorescence.com';
  const PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await User.findOne({ role: 'admin' });

  if (existing) {
    // A password changed from the UI must survive restarts, so don't touch an
    // admin that already exists. Set ADMIN_FORCE_SYNC=1 for one boot to reset
    // the credentials from env if you ever get locked out.
    if (process.env.ADMIN_FORCE_SYNC !== '1') {
      console.log(`✅  Admin exists — ${existing.email} (unchanged)`);
      return;
    }

    const salt   = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(PASSWORD, salt);
    await User.updateOne({ _id: existing._id }, { email: EMAIL, password: hashed });
    console.log(`⚠️  ADMIN_FORCE_SYNC=1 — admin reset from env: ${EMAIL}`);
    return;
  }

  await User.create({ name: 'System Admin', email: EMAIL, password: PASSWORD, role: 'admin' });
  console.log('');
  console.log('✅  Default admin created!');
  console.log('──────────────────────────────');
  console.log('   Email   : ' + EMAIL);
  console.log('   Password: ' + PASSWORD);
  console.log('──────────────────────────────');
};

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/institute_erp';
  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    await seedAdmin();
  } catch (error) {
    console.error(`❌ MongoDB Error (URI: ${uri}): ${error.message}`);
    console.log('🔄 Retrying in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
