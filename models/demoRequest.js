// models/DemoRequest.js
const mongoose = require('mongoose');

const demoRequestSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, required: true },
  company: String,
  country: String,
  phone: String,
  message: String
}, { timestamps: true });

module.exports = mongoose.model('demoRequest', demoRequestSchema);
