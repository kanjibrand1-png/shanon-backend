const SuperAdmin = require('../models/SuperAdmin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { deleteImageByUrl } = require('./uploadController');

// Get all super admins
exports.getAllSuperAdmins = async (req, res) => {
  try {
    const admins = await SuperAdmin.find().populate('createdBy', 'username email').select('-password');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new super admin
exports.createSuperAdmin = async (req, res) => {
  try {
    const { username, email, password, image = null, status = 'active' } = req.body;
    
    // Check if super admin with same email already exists
    const existingSuperAdmin = await SuperAdmin.findOne({ email });
    if (existingSuperAdmin) {
      return res.status(400).json({ error: 'Super admin with this email already exists' });
    }
    
    // Clean image field - convert empty string to null
    const cleanImage = image === '' ? null : image;
    
    const admin = new SuperAdmin({ 
      username, 
      email, 
      password,
      image: cleanImage,
      status,
      createdBy: req.user.id // Track which super admin created this one
    });
    await admin.save();
    
    // Return admin data without password
    const { password: _, ...adminData } = admin.toObject();
    console.log('Created super admin with image:', adminData.image); // Debug log
    res.status(201).json(adminData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Login super admin
exports.loginSuperAdmin = async (req, res) => {
  try {
    // Set CORS headers explicitly for login
    res.header('Access-Control-Allow-Origin', 'https://www.dev.shanon-technologies.com');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, cache-control');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    const { email, password } = req.body;
    const admin = await SuperAdmin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check if super admin is active
    if (admin.status !== 'active') {
      return res.status(401).json({ error: 'Account is deactivated. Please contact another super admin.' });
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

// Update super admin profile
exports.updateSuperAdmin = async (req, res) => {
  try {
    const { username, email, image, status } = req.body;
    const superAdmin = await SuperAdmin.findById(req.params.id);
    
    if (!superAdmin) {
      return res.status(404).json({ error: 'Super admin not found' });
    }
    
    // Only allow super admins to update their own profile or if they're updating another super admin
    if (superAdmin._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }
    
    // Debug logging to see what we're receiving
    console.log('🔍 Update request received:');
    console.log('  - Current image in DB:', superAdmin.image);
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
    if (cleanImage && cleanImage !== superAdmin.image && superAdmin.image) {
      console.log('🗑️ Deleting old image:', superAdmin.image);
      await deleteImageByUrl(superAdmin.image);
    }
    
    const updatedSuperAdmin = await SuperAdmin.findByIdAndUpdate(
      req.params.id,
      { username, email, image: cleanImage, status, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    const { password: _, ...adminData } = updatedSuperAdmin.toObject();
    console.log('✅ Updated super admin with image:', adminData.image);
    res.json(adminData);
  } catch (err) {
    console.error('❌ Error updating super admin:', err);
    res.status(400).json({ error: err.message });
  }
};

// Delete super admin (Super Admin only)
exports.deleteSuperAdmin = async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findById(req.params.id);
    
    if (!superAdmin) {
      return res.status(404).json({ error: 'Super admin not found' });
    }
    
    // Prevent self-deletion
    if (superAdmin._id.toString() === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    
    // Check if this super admin has created any other super admins or admins
    const createdSuperAdmins = await SuperAdmin.countDocuments({ createdBy: superAdmin._id });
    const createdAdmins = await Admin.countDocuments({ createdBy: superAdmin._id });
    
    if (createdSuperAdmins > 0 || createdAdmins > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete super admin who has created other users. Please reassign or delete their created users first.' 
      });
    }
    
    await SuperAdmin.findByIdAndDelete(req.params.id);
    res.json({ message: 'Super admin deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Toggle super admin status (Super Admin only)
exports.toggleSuperAdminStatus = async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findById(req.params.id);
    
    if (!superAdmin) {
      return res.status(404).json({ error: 'Super admin not found' });
    }
    
    // Prevent self-deactivation
    if (superAdmin._id.toString() === req.user.id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }
    
    const newStatus = superAdmin.status === 'active' ? 'inactive' : 'active';
    
    const updatedSuperAdmin = await SuperAdmin.findByIdAndUpdate(
      req.params.id,
      { status: newStatus, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    const { password: _, ...adminData } = updatedSuperAdmin.toObject();
    res.json({
      message: `Super admin ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      admin: adminData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
