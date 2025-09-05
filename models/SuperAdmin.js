const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const superAdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  image: { 
    type: String, 
    default: null, // Changed from '' to null for better frontend handling
    validate: {
      validator: function(v) {
        // Allow null, undefined, or non-empty strings
        return v === null || v === undefined || (typeof v === 'string' && v.trim() !== '');
      },
      message: 'Image must be null or a non-empty string'
    }
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  },
  role: { type: String, default: 'superadmin' },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'SuperAdmin' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hash password before saving
superAdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Update the updatedAt field before saving
superAdminSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Clean empty strings to null before saving
superAdminSchema.pre('save', function(next) {
  if (this.image === '') {
    this.image = null;
  }
  next();
});

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
