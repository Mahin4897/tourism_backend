const nodemailer = require("nodemailer");
require('dotenv').config();
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for port 465, false for other ports
    auth: {
      user: "marufrahmanmahin@gmail.com",
      pass: process.env.GMAIL_SECRET,
    },
  });

module.exports=transporter