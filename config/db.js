const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("connected to database");
  } catch (err) {
    console.log("unable to connect to database", err.message);
    throw err; // Re-throw to handle in app.js
  }
};

module.exports = connectDB;
