// routes/subscriptionRoutes.js
const express = require("express");
const { body, validationResult } = require("express-validator");

const {
  subscribe,
  unsubscribe,
  sendEmailToSubscribers,
} = require("../controllers/subscriptionController");

const router = express.Router();
const rateLimit = require("express-rate-limit");

const subscribeLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hrs
  max: 5, // max 5 requests per IP per day
  handler: (req, res) => {
    return res.status(429).json({
      message: "Too many requests from this IP, please try again tomorrow.",
    });
  },
});

router.post(
  "/subscribe",
  subscribeLimiter,
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address.")
      .normalizeEmail(),
  ],
  subscribe
);

router.post(
  "/unsubscribe",
  subscribeLimiter,
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address.")
      .normalizeEmail(),
  ],
  unsubscribe
);

router.post("/send-to-all", async (req, res) => {
  const { subject, message } = req.body;

  try {
    await sendEmailToSubscribers(subject, message);
    res.json({ message: "Emails sent successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to send emails" });
  }
});

module.exports = router;
