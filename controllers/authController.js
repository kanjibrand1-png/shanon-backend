const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const SuperAdmin = require('../models/SuperAdmin');

// Verify JWT token and return user data
const verifyToken = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
    
    // Find user based on role
    let user;
    if (decoded.role === 'superadmin') {
      user = await SuperAdmin.findById(decoded.id).select('-password');
    } else if (decoded.role === 'admin') {
      user = await Admin.findById(decoded.id).select('-password');
    } else {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ error: 'User account is inactive' });
    }

    res.json({ 
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: decoded.role,
        status: user.status,
        image: user.image
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Token verification failed' });
  }
};

// Refresh JWT token
const refreshToken = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
    
    // Find user based on role
    let user;
    if (decoded.role === 'superadmin') {
      user = await SuperAdmin.findById(decoded.id).select('-password');
    } else if (decoded.role === 'admin') {
      user = await Admin.findById(decoded.id).select('-password');
    } else {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ error: 'User account is inactive' });
    }

    // Generate new token
    const newToken = jwt.sign(
      { id: user._id, role: decoded.role },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: '24h' }
    );

    res.json({ 
      token: newToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: decoded.role,
        status: user.status,
        image: user.image
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

module.exports = {
  verifyToken,
  refreshToken
};
