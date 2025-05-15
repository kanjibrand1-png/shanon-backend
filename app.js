const express = require('express');
const mongoose = require('mongoose');
const demoRoutes = require('./routes/demoRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use('/api/demo', demoRoutes);
app.use('/api/subscription', subscriptionRoutes);

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
