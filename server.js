require('dotenv').config();

const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const OTPs = {}; // Store OTPs temporarily
const OTP_EXPIRATION_TIME = 60000; // 1 minute

// Function to generate a 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Function to send email
function sendEmail(email, otp) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: 'no-reply@gmail.com',
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP Code is ${otp}. The code is valid for 1 minute.`,
  };

  return transporter.sendMail(mailOptions);
}

// API to generate OTP and send email
app.post('/generate-otp', async (req, res) => {
  const { email } = req.body;

  if (!email.endsWith('@dso.org.sg')) {
    return res.status(400).json({ status: 'STATUS_EMAIL_INVALID' });
  }

  const otp = generateOTP();
  OTPs[email] = { otp, expiresAt: Date.now() + OTP_EXPIRATION_TIME };

  try {
    await sendEmail(email, otp);
    res.json({ status: 'STATUS_EMAIL_OK' });
  } catch (error) {
    console.log(error)
    res.status(500).json({ status: 'STATUS_EMAIL_FAIL' });
  }
});

// API to check OTP
app.post('/check-otp', (req, res) => {
  const { email, otp } = req.body;
  const storedOTP = OTPs[email];

  if (!storedOTP) {
    return res.status(400).json({ status: 'STATUS_OTP_FAIL' });
  }

  if (Date.now() > storedOTP.expiresAt) {
    delete OTPs[email];
    return res.status(400).json({ status: 'STATUS_OTP_TIMEOUT' });
  }

  if (storedOTP.otp === otp) {
    delete OTPs[email];
    res.json({ status: 'STATUS_OTP_OK' });
  } else {
    res.status(400).json({ status: 'STATUS_OTP_FAIL' });
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});