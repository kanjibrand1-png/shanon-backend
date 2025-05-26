const { validationResult } = require("express-validator");
const DemoRequest = require("../models/demoRequest");
const nodemailer = require("nodemailer");
const dns = require("dns").promises;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function isEmailDomainValid(email) {
  const domain = email.split("@")[1];
  try {
    const mxRecords = await dns.resolveMx(domain);
    return mxRecords && mxRecords.length > 0;
  } catch {
    return false;
  }
}
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

  await transporter.sendMail(mailOptions);
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

  return transporter.sendMail(mailOptions); 
};

exports.createDemoRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formatted = errors.array().map((err) => ({
        message: err.msg,
        field: err.param,
      }));
      return res.status(400).json({
        message: "Validation failed. Please check the input fields.",
        errors: formatted,
      });
    }

    const request = new DemoRequest(req.body);

    const isValidDomain = await isEmailDomainValid(request.email);
    if (!isValidDomain) {
      return res.status(400).json({
        message: "Invalid email domain. Please check your email address.",
      });
    }

    try {
      await sendEmailToClient(request);
    } catch (emailErr) {
      console.error("Email to client failed:", emailErr.message);
      return res.status(400).json({
        message: "Invalid or unreachable email address. Please check and try again.",
      });
    }

    await request.save();
    await sendEmailToTeam(request);

    res.status(201).json({
      message: "Demo request submitted successfully.",
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({
      message: "An unexpected error occurred while processing your demo request.",
    });
  }
};

