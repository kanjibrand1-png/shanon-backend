const jwt = require('jsonwebtoken');

// Middleware to check if user is a superadmin
const superAdminAuth = (req, res, next) => {
  console.log('Super admin auth check:', {
    hasAuthHeader: !!req.headers.authorization,
    userAgent: req.headers['user-agent']
  });

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expect 'Bearer <token>'
  
  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
    req.user = decoded;
    
    console.log('Auth successful, checking role:', req.user);
    
    // Check if user is a superadmin
    if (req.user.role !== 'superadmin') {
      console.log('Role check failed:', req.user.role);
      return res.status(403).json({ error: 'Super admin access required' });
    }
    
    console.log('Super admin access granted');
    next();
  } catch (err) {
    console.log('Auth failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = superAdminAuth;
