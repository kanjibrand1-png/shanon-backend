const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { deleteImageByUrl } = require('./uploadController');

// Get all admins (Super Admin only)
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().populate('createdBy', 'username email');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new admin (Super Admin only)
exports.createAdmin = async (req, res) => {
  try {
    const { username, email, password, image = null, status = 'active' } = req.body;
    
    // Check if admin with same email already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin with this email already exists' });
    }

    // Clean image field - convert empty string to null
    const cleanImage = image === '' ? null : image;

    const admin = new Admin({ 
      username, 
      email, 
      password,
      image: cleanImage,
      status,
      createdBy: req.user.id // Set the creating super admin's ID
    });
    await admin.save();
    
    // Return admin data without password
    const { password: _, ...adminData } = admin.toObject();
    console.log('Created admin with image:', adminData.image); // Debug log
    res.status(201).json(adminData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Login admin
exports.loginAdmin = async (req, res) => {
  try {
    // CORS headers are handled by main middleware in app.js
    // No need to set them here - they're already configured globally
    
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check if admin is active
    if (admin.status !== 'active') {
      return res.status(401).json({ error: 'Account is deactivated. Please contact a super admin.' });
    }
    
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    // Generate JWT with longer expiration for better user experience
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: '24h' } // Extended to 24 hours for better multi-device support
    );
    const { password: _, ...adminData } = admin.toObject();
    res.json({ message: 'Login successful', token, user: adminData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete admin (Super Admin only)
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    await Admin.findByIdAndDelete(req.params.id);
    res.json({ message: 'Admin deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update admin (Super Admin only)
exports.updateAdmin = async (req, res) => {
  try {
    const { username, email, image, status } = req.body;
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    // Clean image field - convert empty string to null
    const cleanImage = image === '' ? null : image;
    
    // Delete old image if a new image is provided and it's different
    if (cleanImage && cleanImage !== admin.image && admin.image) {
      await deleteImageByUrl(admin.image);
    }
    
    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      { username, email, image: cleanImage, status, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    const { password: _, ...adminData } = updatedAdmin.toObject();
    console.log('Updated admin with image:', adminData.image); // Debug log
    res.json(adminData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update admin profile (Admin can update their own profile)
exports.updateAdminProfile = async (req, res) => {
  try {
    const { username, email, image, status } = req.body;
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    // Debug logging to see what we're receiving
    console.log('🔍 Admin profile update request received:');
    console.log('  - Current image in DB:', admin.image);
    console.log('  - New image from request:', image);
    console.log('  - Image type:', typeof image);
    console.log('  - Image length:', image ? image.length : 'N/A');
    
    // Clean image field - convert empty string to null, but preserve valid paths
    let cleanImage = image;
    if (image === '' || image === null || image === undefined) {
      cleanImage = null;
    }
    
    console.log('  - Cleaned image value:', cleanImage);
    
    // Delete old image if a new image is provided and it's different
    if (cleanImage && cleanImage !== admin.image && admin.image) {
      console.log('🗑️ Deleting old admin image:', admin.image);
      await deleteImageByUrl(admin.image);
    }
    
    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.user.id,
      { username, email, image: cleanImage, status, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    const { password: _, ...adminData } = updatedAdmin.toObject();
    console.log('✅ Updated admin profile with image:', adminData.image);
    res.json(adminData);
  } catch (err) {
    console.error('❌ Error updating admin profile:', err);
    res.status(400).json({ error: err.message });
  }
};

// Toggle admin status (Super Admin only)
exports.toggleAdminStatus = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    const newStatus = admin.status === 'active' ? 'inactive' : 'active';
    
    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      { status: newStatus, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    const { password: _, ...adminData } = updatedAdmin.toObject();
    res.json({
      message: `Admin ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      admin: adminData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
