const mongoose = require('mongoose');
const SuperAdmin = require('./models/SuperAdmin');
require('dotenv').config();

const createFirstSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Check if any super admin already exists
    const existingSuperAdmin = await SuperAdmin.findOne();
    if (existingSuperAdmin) {
      console.log('A super admin already exists. Skipping creation.');
      process.exit(0);
    }

    // Create the first super admin
    const superAdminData = {
      username: 'admin',
      email: 'admin@shanon-technologies.com',
      password: 'admin123', // This will be hashed by the pre-save middleware
      status: 'active',
      role: 'superadmin'
    };

    const superAdmin = new SuperAdmin(superAdminData);
    await superAdmin.save();

    console.log('First super admin created successfully!');
    console.log('Email:', superAdminData.email);
    console.log('Password:', superAdminData.password);
    console.log('Please change the password after first login.');

    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  }
};

createFirstSuperAdmin();
