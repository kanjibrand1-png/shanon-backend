const { validationResult } = require("express-validator");
const DemoRequest = require("../models/demoRequest");
const nodemailer = require("nodemailer");


exports.createDemoRequest = async (req, res) => {
  try {
    console.log('Request body:', req.body);

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
    console.log('Saving demo request:', request);
    await request.save();
    console.log('Demo request saved successfully');

    await Promise.all([sendEmailToTeam(request), sendEmailToClient(request)]);

    res.status(201).json({
      message: "Demo request submitted successfully.",
    });
  } catch (err) {
    console.error('Error creating demo request:', err);
    res.status(500).json({
      message: "An unexpected error occurred while processing your demo request.",
    });
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
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to send email to team:", error.message);
    }
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
  } catch (error) {}
};
