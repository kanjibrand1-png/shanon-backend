// Load environment variables first
require('dotenv').config();

const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const path = require("path");

// Import existing routes
const demoRoutes = require("./routes/demoRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");

// Import new routes
const superAdminRoutes = require("./routes/superAdminRoutes");
const adminRoutes = require("./routes/adminRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const publicRoutes = require("./routes/publicRoutes");
const authRoutes = require("./routes/authRoutes");
const shippingRoutes = require("./routes/shippingRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const stockNotificationRoutes = require("./routes/stockNotificationRoutes");
const stripeRoutes = require("./routes/stripeRoutes");

const app = express();

// Trust proxy for rate limiting (needed for production deployments)
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());

// MongoDB injection protection
app.use(mongoSanitize());

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 login attempts per windowMs
  message: {
    error: 'Too many login attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure CORS
app.use(cors({
  origin: [
    'http://localhost:3000',  // Add this for local development
    'https://www.shanon-technologies.com',
    'https://shanon-technologies.com',
    'https://dev.shanon-technologies.com',  // Frontend subdomain
    'https://app.shanon-technologies.com'   // Backend subdomain
  ],
  credentials: true
}));

// Rate limiting middleware - DISABLED FOR DEVELOPMENT
// app.use('/api/auth', (req, res, next) => {
//   authLimiter(req, res, next);
// });

// app.use('/api/', apiLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  } else {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
  }
  next();
});

// Force HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
  }
  next();
});

// Domain redirects (similar to Cloudflare Workers Routes)
// For Shanon Technologies website on LWS
// IMPORTANT: This must run BEFORE API routes to catch www requests
app.use((req, res, next) => {
  // Get hostname from various possible sources (Render proxy, direct, etc.)
  const hostname = (req.headers.host || req.hostname || req.get('host') || req.headers['x-forwarded-host'] || '').toLowerCase();
  
  // Remove port if present (e.g., www.shanon-technologies.com:443 -> www.shanon-technologies.com)
  const cleanHostname = hostname.split(':')[0].trim();
  
  // Debug logging to help troubleshoot
  console.log('[Redirect Check] Hostname:', cleanHostname, '| Original:', hostname, '| Path:', req.path);
  
  // Redirect www.shanon-technologies.com to dev.shanon-technologies.com
  // Preserves path and query string (like Cloudflare dynamic redirect)
  if (cleanHostname === 'www.shanon-technologies.com' || 
      cleanHostname.includes('www.shanon-technologies.com')) {
    const path = req.path || '/';
    const query = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const redirectUrl = `https://dev.shanon-technologies.com${path}${query}`;
    
    console.log('[Redirect] Redirecting www to dev:', redirectUrl);
    return res.redirect(301, redirectUrl);
  }
  
  // Add more redirect rules here as needed
  // Example: redirect other subdomains
  // if (cleanHostname === 'old-subdomain.shanon-technologies.com') {
  //   const path = req.path || '/';
  //   const query = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  //   const redirectUrl = `https://new-subdomain.shanon-technologies.com${path}${query}`;
  //   return res.redirect(301, redirectUrl);
  // }
  
  next();
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    const allowedOrigin = process.env.FRONT_URL || process.env.CORS_ORIGIN || '*';
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', allowedOrigin);
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
  }
}));

// API routes
app.use("/api/demo", demoRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/subscribers", subscriptionRoutes);

// New routes
app.use('/api/superadmins', superAdminRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/stock-notifications', stockNotificationRoutes);
app.use('/api/stripe', stripeRoutes);

// Debug route to check hostname (for troubleshooting redirects)
app.get('/debug-host', (req, res) => {
  res.json({
    host: req.headers.host,
    hostname: req.hostname,
    getHost: req.get('host'),
    xForwardedHost: req.headers['x-forwarded-host'],
    url: req.url,
    path: req.path
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Shanon Technologies Backend API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    hostname: req.headers.host || req.hostname,
    corsOrigins: [
      process.env.FRONT_URL,
      process.env.CORS_ORIGIN,
      'https://www.shanon-technologies.com',
      'https://shanon-technologies.com'
    ].filter(Boolean)
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Specific route for image serving with proper headers and validation
app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  
  // Validate filename to prevent directory traversal attacks
  if (!filename || !/^[a-zA-Z0-9\-_\.]+$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const fileExtension = path.extname(filename).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }
  
  const imagePath = path.join(__dirname, 'uploads', filename);
  
  // Set proper headers for images
  const allowedOrigin = process.env.FRONT_URL || process.env.CORS_ORIGIN || '*';
  res.set({
    'Content-Type': getContentType(filename),
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
  });
  
  res.sendFile(imagePath, (err) => {
    if (err) {
      console.error('Error serving image:', err);
      res.status(404).json({ error: 'Resource not found' });
    }
  });
});

// Helper function to determine content type
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };
  return contentTypes[ext] || 'application/octet-stream';
}

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log(`Unable to run server`, err);
  });
