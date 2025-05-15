const Subscription = require('../models/Subscription');
const nodemailer = require('nodemailer');

// Subscribe controller
exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;
    const existing = await Subscription.findOne({ email });

    if (existing) {
      existing.subscribed = true;
      await existing.save();
    } else {
      await Subscription.create({ email });
    }

    res.status(201).json({ message: 'Subscribed successfully.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Unsubscribe controller
exports.unsubscribe = async (req, res) => {
  try {
    const { email } = req.body;
    const sub = await Subscription.findOne({ email });
    if (!sub) return res.status(404).json({ error: 'Email not found' });

    sub.subscribed = false;
    await sub.save();

    res.json({ message: 'Unsubscribed successfully.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.sendEmailToSubscribers = async (subject, message) => {
  try {
    const subscribers = await Subscription.find({ subscribed: true });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      subject,
      text: message,
    };

    for (const user of subscribers) {
      await transporter.sendMail({ ...mailOptions, to: user.email });
    }

    console.log(`Email sent to ${subscribers.length} subscribed users.`);
  } catch (err) {
    console.error('Error sending emails to subscribers:', err);
  }
};
