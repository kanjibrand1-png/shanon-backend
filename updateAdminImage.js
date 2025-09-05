const mongoose = require('mongoose');
const SuperAdmin = require('./models/SuperAdmin');
require('dotenv').config();

const updateAdminImage = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Find the admin
    const admin = await SuperAdmin.findOne({ email: 'admin@shanon-technologies.com' });
    
    if (!admin) {
      console.log('Admin not found');
      process.exit(1);
    }

    console.log('Current admin data:', {
      username: admin.username,
      email: admin.email,
      image: admin.image,
      status: admin.status
    });

    // Option 1: Set a default image path (if you have a default image)
    // admin.image = '/uploads/default-admin-avatar.png';
    
    // Option 2: Clear the image field to use placeholder
    admin.image = null;

    await admin.save();
    console.log('Admin image field updated successfully!');
    console.log('New admin data:', {
      username: admin.username,
      email: admin.email,
      image: admin.image,
      status: admin.status
    });

    process.exit(0);
  } catch (error) {
    console.error('Error updating admin image:', error);
    process.exit(1);
  }
};

updateAdminImage();

