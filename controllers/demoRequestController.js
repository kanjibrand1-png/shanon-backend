const DemoRequest = require('../models/demoRequest');
const nodemailer = require('nodemailer');

// Create Demo Request
exports.createDemoRequest = async (req, res) => {
  try {
    const request = new DemoRequest(req.body);
    await request.save();

    // Send email to internal team
    await sendEmailToTeam(request);

    res.status(201).json({ message: 'Demo request submitted successfully.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Send email to internal team when new request is submitted
const sendEmailToTeam = async (request) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"Demo Request" <${process.env.EMAIL_FROM}>`,
    to: process.env.TEAM_EMAIL, // the internal team email address
    subject: 'New Demo Request Received',
    html: `
      <h3>New Demo Request</h3>
      <p><strong>First Name:</strong> ${request.firstName}</p>
      <p><strong>Last Name:</strong> ${request.lastName}</p>
      <p><strong>Email:</strong> ${request.email}</p>
      <p><strong>Company:</strong> ${request.company}</p>
      <p><strong>Country:</strong> ${request.country}</p>
      <p><strong>Phone:</strong> ${request.phone}</p>
      <p><strong>Message:</strong><br/> ${request.message}</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent to team:', info.response);
  } catch (error) {
    console.error('Error sending email to team:', error.message);
  }
};
