const express = require('express');
const mongoose = require('mongoose');
const demoRoutes = require('./routes/demoRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
require('dotenv').config();
const app = express();
const cors = require('cors');

app.use(express.json());

app.use(cors({
  origin: ['https://shannon-vhdz.onrender.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/api/demo', demoRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.set('trust proxy', 1); 

// Connect DB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error(err);
});


const PORT = process.env.PORT;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});