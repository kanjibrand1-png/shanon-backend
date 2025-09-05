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
      tls: {
        rejectUnauthorized: false
      }
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
      },
      tls: {
        rejectUnauthorized: false
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

// Get all subscribers (admin route)
exports.getAllSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscription.find()
      .sort({ createdAt: -1 })
      .select('-__v');
    
    res.json(subscribers);
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ error: 'Failed to fetch subscribers' });
  }
};

// Get subscriber statistics (admin route)
exports.getSubscriberStats = async (req, res) => {
  try {
    const totalSubscribers = await Subscription.countDocuments();
    const activeSubscribers = await Subscription.countDocuments({ subscribed: true });
    const unsubscribedClients = await Subscription.countDocuments({ subscribed: false });
    
    res.json({
      totalSubscribers,
      activeSubscribers,
      unsubscribedClients
    });
  } catch (error) {
    console.error('Error fetching subscriber statistics:', error);
    res.status(500).json({ error: 'Failed to fetch subscriber statistics' });
  }
};

// Delete subscriber (admin route)
exports.deleteSubscriber = async (req, res) => {
  try {
    const subscriber = await Subscription.findByIdAndDelete(req.params.id);
    
    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }
    
    res.json({
      success: true,
      message: 'Subscriber deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    res.status(500).json({ error: 'Failed to delete subscriber' });
  }
};

exports.sendEmailToSubscribers = async (subject, message) => {
  try {
    const subscribers = await Subscription.find({ subscribed: true });

    const transporter = nodemailer.createTransport({
      host: 'mail.shanon-technologies.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const newsletterHTML = generateNewsletterEmailHTML(subject, message);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      subject: `${subject} - Shanon Technologies Newsletter`,
      html: newsletterHTML,
    };

    for (const user of subscribers) {
      await transporter.sendMail({ ...mailOptions, to: user.email });
    }

    console.log(`Newsletter sent to ${subscribers.length} subscribed users.`);
  } catch (err) {
    console.error("Error sending emails to subscribers:", err);
    throw err;
  }
};

// Generate newsletter email HTML with the same design as other emails
const generateNewsletterEmailHTML = (subject, message) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject} - Shanon Technologies Newsletter</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 10px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 20px; background: #f9f9f9; }
        .newsletter-content { background-color: white; padding: 20px; margin: 15px 0; border-radius: 5px; }
        .cta-button { display: inline-block; background-color: #2a62aa; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 15px 0; }
        .footer { text-align: center; padding: 15px; color: #666; font-size: 11px; }
        .unsubscribe { text-align: center; margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; }
        
        @media only screen and (max-width: 600px) {
          .container { padding: 5px; }
          .header { padding: 15px; }
          .header h1 { font-size: 20px; }
          .content { padding: 15px; }
          .newsletter-content { padding: 15px; margin: 10px 0; }
          .footer { padding: 10px; font-size: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Shanon Technologies Newsletter</h1>
          <p>Stay updated with our latest news and innovations</p>
        </div>
        
        <div class="content">
          <div class="newsletter-content">
            <h2>${subject}</h2>
            <div style="white-space: pre-wrap; line-height: 1.8;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/shop" class="cta-button">
                Visit Our Shop
              </a>
            </div>
          </div>

          <div class="unsubscribe">
            <p style="margin: 0; color: #666; font-size: 12px;">
              You received this email because you're subscribed to our newsletter.
              <br>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/unsubscribe" style="color: #2a62aa; text-decoration: none;">
                Unsubscribe
              </a> | 
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="color: #2a62aa; text-decoration: none;">
                Visit Website
              </a>
            </p>
          </div>
        </div>
        
        <div class="footer">
          <p>© 2025 Shanon Technologies. All rights reserved.</p>
          <p>For any questions, contact us at ${process.env.TEAM_EMAIL || 'support@shanon-technologies.com'}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
