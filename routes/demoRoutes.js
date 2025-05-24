const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");
const { createDemoRequest } = require("../controllers/demoRequestController");

const demoRequestLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hrs
  max: 5,
  handler: (req, res) => {
    return res.status(429).json({
      message: "Too many requests from this IP, please try again tomorrow.",
    });
  },
});

router.post(
  "/",
  demoRequestLimiter,
  [
    body("firstName").trim().isLength({ min: 2 }).withMessage("First name is too short."),
    body("lastName").trim().isLength({ min: 2 }).withMessage("Last name is too short."),
    body("email").isEmail().withMessage("Invalid email").normalizeEmail(),
    body("company").optional().isLength({ min: 2 }).withMessage("Company name is too short."),
    body("country").optional().isLength({ min: 2 }).withMessage("Country name is too short."),
    body("phone").optional().matches(/^\+?[0-9\s\-().]{7,}$/).withMessage("Invalid phone number."),
    body("message").isLength({ min: 10 }).withMessage("Message is too short. Please include more context."),
  ],
  createDemoRequest
);

module.exports = router;
