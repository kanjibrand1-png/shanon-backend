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

// CRITICAL: Handle OPTIONS requests FIRST before ANY other middleware
// This must be at the very top to prevent redirects from breaking CORS preflight
app.use((req, res, next) => {
  // Intercept ALL OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    console.log('[OPTIONS Handler] Intercepted OPTIONS request:', req.path, 'Origin:', req.headers.origin);
    
    const origin = req.headers.origin;
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://www.shanon-technologies.com',
      'https://shanon-technologies.com',
      'https://dev.shanon-technologies.com',
      'https://www.dev.shanon-technologies.com',
      'https://app.shanon-technologies.com'
    ];
    
    if (process.env.FRONT_URL) allowedOrigins.push(process.env.FRONT_URL);
    if (process.env.CORS_ORIGIN) allowedOrigins.push(process.env.CORS_ORIGIN);
    
    // Check if origin is allowed
    const isAllowed = !origin || allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(allowed => origin.includes(allowed));
    
    if (isAllowed) {
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
      res.header('Access-Control-Max-Age', '86400'); // 24 hours
      console.log('[OPTIONS Handler] Allowing OPTIONS request, returning 204');
      return res.sendStatus(204);
    } else {
      console.log('[OPTIONS Handler] Blocked origin:', origin);
      return res.sendStatus(403);
    }
  }
  next();
});

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

// Configure CORS - Must be before redirect middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://www.shanon-technologies.com',
      'https://shanon-technologies.com',
      'https://dev.shanon-technologies.com',
      'https://www.dev.shanon-technologies.com',  // In case of DNS issues
      'https://app.shanon-technologies.com'
    ];
    
    // Also check environment variables
    if (process.env.FRONT_URL) allowedOrigins.push(process.env.FRONT_URL);
    if (process.env.CORS_ORIGIN) allowedOrigins.push(process.env.CORS_ORIGIN);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(allowed => origin.includes(allowed))) {
      callback(null, true);
    } else {
      console.log('[CORS] Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
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

// Force HTTPS in production - MUST skip OPTIONS to avoid breaking CORS
app.use((req, res, next) => {
  // Skip HTTPS redirect for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  if (process.env.NODE_ENV === 'production') {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
  }
  next();
});

// Domain redirects (similar to Cloudflare Workers Routes)
// For Shanon Technologies website on LWS
// IMPORTANT: Must skip OPTIONS (preflight) and API routes to avoid breaking CORS
app.use((req, res, next) => {
  // Skip redirect for:
  // 1. OPTIONS requests (CORS preflight) - CRITICAL for CORS to work
  // 2. API routes - API should be accessible directly
  // 3. Static files and uploads
  if (req.method === 'OPTIONS' || 
      req.path.startsWith('/api') || 
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/debug-host') ||
      req.path.startsWith('/health')) {
    return next();
  }
  
  // Get hostname from various possible sources (Render proxy, direct, etc.)
  const hostname = (req.headers.host || req.hostname || req.get('host') || req.headers['x-forwarded-host'] || '').toLowerCase();
  
  // Remove port if present (e.g., www.shanon-technologies.com:443 -> www.shanon-technologies.com)
  const cleanHostname = hostname.split(':')[0].trim();
  
  // Debug logging to help troubleshoot
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Redirect Check] Hostname:', cleanHostname, '| Original:', hostname, '| Path:', req.path, '| Method:', req.method);
  }
  
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

// Serve static files from uploads directory with proper CORS
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path, stat) => {
    // Get origin from request to allow proper CORS
    const origin = res.req?.headers?.origin;
    const allowedOrigins = [
      'https://dev.shanon-technologies.com',
      'https://www.dev.shanon-technologies.com',
      'https://www.shanon-technologies.com',
      'https://shanon-technologies.com',
      'http://localhost:3000'
    ];
    
    // Check if origin is allowed
    if (origin && allowedOrigins.some(allowed => origin.includes(allowed))) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Access-Control-Allow-Credentials', 'true');
    } else if (process.env.FRONT_URL) {
      res.set('Access-Control-Allow-Origin', process.env.FRONT_URL);
    }
    
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
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
  
  // Set proper CORS headers for images
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://dev.shanon-technologies.com',
    'https://www.dev.shanon-technologies.com',
    'https://www.shanon-technologies.com',
    'https://shanon-technologies.com',
    'http://localhost:3000'
  ];
  
  // Set CORS headers
  if (origin && allowedOrigins.some(allowed => origin.includes(allowed))) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
  } else if (process.env.FRONT_URL) {
    res.set('Access-Control-Allow-Origin', process.env.FRONT_URL);
  }
  
  res.set({
    'Content-Type': getContentType(filename),
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
