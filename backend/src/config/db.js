const mongoose = require('mongoose');

const seedAdmin = async () => {
  const User = require('../models/User');
  const EMAIL    = process.env.ADMIN_EMAIL    || 'admin@inflorescence.com';
  const PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await User.findOne({ role: 'admin' });

  if (existing) {
    // Migrate old email if it hasn't been updated yet
    if (existing.email !== EMAIL) {
      existing.email = EMAIL;
      await existing.save();
      console.log(`✅  Admin email updated to: ${EMAIL}`);
    } else {
      console.log(`ℹ️  Admin already exists (${existing.email}) — skipping seed.`);
    }
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