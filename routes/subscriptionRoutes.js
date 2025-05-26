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
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5,
  handler: (req, res) => {
    return res.status(429).json({
      message: "Too many requests from this IP, please try again tomorrow.",
    });
  },
  standardHeaders: true, 
  legacyHeaders: false,   
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

  if (!subject || !message) {
    return res.status(400).json({ error: "Both subject and message are required." });
  }

  try {
    await sendEmailToSubscribers(subject, message);
    res.json({ message: "Emails sent successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to send emails" });
  }
});


module.exports = router;
