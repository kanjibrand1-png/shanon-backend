const { validationResult } = require("express-validator");
const DemoRequest = require("../models/demoRequest");
const nodemailer = require("nodemailer");
const { OpenAI } = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function isSpamOrUnsafe(text) {
  const result = await openai.moderations.create({ input: text });
  return result.results[0].flagged;
}

exports.createDemoRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formatted = errors.array().map(err => ({
        message: err.msg,
        field: err.param,
      }));
      return res.status(400).json({ errors: formatted });
    }

    const isSpam = await isSpamOrUnsafe(req.body.message);
    if (isSpam) {
      return res.status(400).json({
        message: "Your message appears unsafe or spammy. Please revise and try again.",
      });
    }

    const request = new DemoRequest(req.body);
    await request.save();

    await Promise.all([
      sendEmailToTeam(request),
      sendEmailToClient(request),
    ]);

    res.status(201).json({ message: "Demo request submitted successfully." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmailToTeam = async (request) => {
  const mailOptions = {
    from: `"Demo Request" <${process.env.EMAIL_FROM}>`,
    to: process.env.TEAM_EMAIL,
    subject: "New Demo Request Received",
    html: `
      <h3>New Demo Request</h3>
      <p><strong>First Name:</strong> ${request.firstName}</p>
      <p><strong>Last Name:</strong> ${request.lastName}</p>
      <p><strong>Email:</strong> ${request.email}</p>
      <p><strong>Company:</strong> ${request.company}</p>
      <p><strong>Country:</strong> ${request.country}</p>
      <p><strong>Phone:</strong> ${request.phone}</p>
      <p><strong>Message:</strong><br/>${request.message}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent to team");
  } catch (error) {
    console.error("Error sending email to team:", error.message);
  }
};

const sendEmailToClient = async (request) => {
  const mailOptions = {
    from: `"Shanon Technologies" <${process.env.EMAIL_FROM}>`,
    to: request.email,
    subject: "Thank you for your demo request",
    html: `
      <p>Hi ${request.firstName},</p>
      <p>Thank you for your interest in our product! We have received your demo request and our team will get back to you as soon as possible.</p>
      <p>Best regards,<br/>Shanon Technologies</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Thank you email sent to client");
  } catch (error) {
    console.error("Error sending email to client:", error.message);
  }
};
