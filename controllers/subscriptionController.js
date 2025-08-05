const Subscription = require("../models/Subscription");
const nodemailer = require("nodemailer");
const { validationResult } = require("express-validator");
const dns = require("dns").promises;

async function verifyEmailDomain(email) {
  const domain = email.split("@")[1];
  try {
    const addresses = await dns.resolveMx(domain);
    return addresses && addresses.length > 0;
  } catch (err) {
    return false;
  }
}

exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map((err) => ({
        message: err.msg,
        param: err.param,
        location: err.location,
      }));
      return res.status(400).json({ errors: formattedErrors });
    }

    const isDomainValid = await verifyEmailDomain(email);
    if (!isDomainValid) {
      return res.status(400).json({
        message: "Email domain does not exist or cannot receive emails.",
      });
    }

    let existing = await Subscription.findOne({ email });
    if (existing && existing.subscribed) {
      return res.status(409).json({ message: "Email is already subscribed." });
    }

    const transporter = nodemailer.createTransport({
      host: "mail.shanon-technologies.com", // ✅ Add this
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_FROM, // e.g., 'contact@shanon-technologies.com'
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const confirmationOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Thank you for your subscription",
      text: "Thank you for subscribing to Shanon Technologies' newsletter! We're excited to keep you updated with our latest news, insights, and innovations.",
    };

    try {
      await transporter.sendMail(confirmationOptions);
    } catch (emailErr) {
      return res.status(400).json({
        message:
          "Failed to send confirmation email. Please check the email address.",
      });
    }

    let isNewSubscription = false;
    if (existing) {
      existing.subscribed = true;
      await existing.save();
    } else {
      await Subscription.create({ email });
      isNewSubscription = true;
    }

    if (isNewSubscription) {
      const notifyOptions = {
        from: process.env.EMAIL_FROM,
        to: process.env.TEAM_EMAIL,
        subject: "New Newsletter Subscription",
        text: `A new user has subscribed with email: ${email}`,
      };

      try {
        await transporter.sendMail(notifyOptions);
      } catch (teamErr) {
        console.warn("Team notification failed:", teamErr.message);
      }
    }

    return res.status(201).json({ message: "Subscribed successfully." });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

exports.unsubscribe = async (req, res) => {
  try {
    const { email } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map((err) => ({
        message: err.msg,
        param: err.param,
        location: err.location,
      }));
      return res.status(400).json({ errors: formattedErrors });
    }

    const sub = await Subscription.findOne({ email });
    if (!sub) return res.status(404).json({ error: "Email not found" });

    sub.subscribed = false;
    await sub.save();

    const transporter = nodemailer.createTransport({
      host: 'mail.shanon-technologies.com', // ✅ Add this
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_FROM, // e.g., 'contact@shanon-technologies.com'
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: process.env.TEAM_EMAIL,
      subject: "Newsletter Unsubscription Notice",
      text: `The user with email: ${email} has unsubscribed from the newsletter.`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "Unsubscribed successfully." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.sendEmailToSubscribers = async (subject, message) => {
  try {
    const subscribers = await Subscription.find({ subscribed: true });

    const transporter = nodemailer.createTransport({
      host: 'mail.shanon-technologies.com', // ✅ Add this
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_FROM, // e.g., 'contact@shanon-technologies.com'
        pass: process.env.EMAIL_PASSWORD
      }
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
    console.error("Error sending emails to subscribers:", err);
  }
};
