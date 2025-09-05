const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const SuperAdmin = require('./models/SuperAdmin');
require('dotenv').config();

const checkAndCreateAccounts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Check if super admin exists
    const existingSuperAdmin = await SuperAdmin.findOne({ email: 'admin@shanon-technologies.com' });
    if (!existingSuperAdmin) {
      console.log('Creating super admin...');
      const superAdmin = new SuperAdmin({
        username: 'admin',
        email: 'admin@shanon-technologies.com',
        password: 'admin123',
        status: 'active',
        role: 'superadmin'
      });
      await superAdmin.save();
      console.log('Super admin created successfully!');
    } else {
      console.log('Super admin already exists');
    }

    // Check if admin exists
    const existingAdmin = await Admin.findOne({ email: 'admin@shanon-technologies.com' });
    if (!existingAdmin) {
      console.log('Creating admin...');
      const superAdmin = await SuperAdmin.findOne({ email: 'admin@shanon-technologies.com' });
      if (!superAdmin) {
        console.error('Super admin not found, cannot create admin');
        return;
      }
      
      const admin = new Admin({
        username: 'admin',
        email: 'admin@shanon-technologies.com',
        password: 'admin123',
        status: 'active',
        role: 'admin',
        createdBy: superAdmin._id
      });
      await admin.save();
      console.log('Admin created successfully!');
    } else {
      console.log('Admin already exists');
    }

    // List all accounts
    console.log('\nAll SuperAdmins:');
    const superAdmins = await SuperAdmin.find();
    superAdmins.forEach(sa => {
      console.log(`- ${sa.email} (${sa.role})`);
    });

    console.log('\nAll Admins:');
    const admins = await Admin.find();
    admins.forEach(a => {
      console.log(`- ${a.email} (${a.role})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkAndCreateAccounts();
