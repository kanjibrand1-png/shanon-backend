const express = require('express');
const mongoose = require('mongoose');
const demoRoutes = require('./routes/demoRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
require('dotenv').config();
const app = express();
const cors = require('cors');

app.use(express.json());
app.use('/api/demo', demoRoutes);
app.use('/api/subscription', subscriptionRoutes);

const allowedOrigins = [
  'http://localhost:4028',
  'https://shannon-vhdz.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Connect DB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error(err);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
