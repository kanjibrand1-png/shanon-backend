const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const demoRoutes = require("./routes/demoRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");

require("dotenv").config();
const app = express();
const cors = require("cors");

app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONT_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/api/demo", demoRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.set("trust proxy", 1);

const PORT = process.env.PORT;

// Start server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log(`Unable to run server`, err);
  });
