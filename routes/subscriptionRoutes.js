// routes/subscriptionRoutes.js
const express = require("express");
const {
  subscribe,
  unsubscribe,
  sendEmailToSubscribers,
} = require("../controllers/subscriptionController");

const router = express.Router();

router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);

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
