const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");

require("dotenv").config();
const body_parser = require("body-parser");
const { user, token, otp } = require("../database/db");
const { accesstoken, refreshtoken, auth } = require("../middleware/auth");
const otpGenerator = require("otp-generator");
const transporter = require("../functions/nodemail");
const { Cookies } = require("nodemailer/lib/fetch");
require("dotenv").config();
router.use(body_parser.json());
router.use(cookieParser());

router.post("/register", async (req, res) => {
  console.log(req.body.first_name);
  const isuser = await user.findOne({ where: { email: req.body.email } });
  if (isuser === null) {
    const us = user.create({
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 10),
      phone: req.body.phone,
    });
    const ot = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
    });
    const otp1 = otp.create({
      otp: ot,
      email: req.body.email,
    });
    const link = `localhost:3000/${ot}`;
    const info = await transporter.sendMail({
      to: req.body.email, // list of receivers
      subject: "Verify your Email", // Subject line
      text: "Verification Link", // plain text body
      html: `<a href=${link}>Click here</a>`, // html body
    });

    res.status(200).json({ message: "user created successfully" });
  } else {
    res.status(400).json({ message: "user already exist" });
    console.log(isuser.email);
  }
});
router.get("/:otp",async(req,res)=>{
  const rotp =req.params['otp']
  const isotp = await otp.findOne({
    where: { otp: rotp }
  });
  const email = isotp.email;
  const isuser = await user.findOne({ where: { email: email } });
  if (isotp != null) {
    if (isuser != null) {
      isuser.isvalid=true
      await isuser.save();
      await otp.destroy({ where: { email: email } });
      res.status(200).json({message:"user verified"})
    }
  } else {
    res.json({ message: "failed" });
  }
})

router.post("/login", async (req, res) => {
  console.log(req.body.email)
  const isuser = await user.findOne({
    where: {
      email: req.body.email,
      isvalid: true,
    },
  });
  if (isuser === null) {
    res.status(400).json({ message: "user not found" });
  } else {
    const ismatch = bcrypt.compareSync(req.body.password, isuser.password);
    console.log(isuser.email);
    if (ismatch) {
      const rtoken = refreshtoken(isuser.email);
      const atoken = accesstoken(isuser.email);
      const rtk = token.create({
        token: rtoken,
      });
      //Set tokens as HTTP-only cookies
      res.cookie("accesstoken", atoken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
        sameSite: "Strict", // Adjust as needed
        maxAge: 15 * 60 * 1000, // 15 minutes
      });
      //Set refresh token as HTTP-only cookie
      res.cookie("refreshtoken", rtoken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
        sameSite: "Strict", // Adjust as needed
        maxAge: 60 * 60 * 24 * 15, // 15 Days
      });
      res.status(200).json({ message: "logged In" });
    } else {
      res.status(400).json({ message: "password is incorrect" });
    }
  }
});
router.post("/refresh", async (req, res) => {
  const cookie = req.cookies;
  const rtoken = cookie.refreshtoken;
  if (rtoken != null) {
    const rtoken = await token.findOne({
      where: { token: req.body.refreshtoken },
    });
    console.log(rtoken);
    if (rtoken == null) {
      res.status(400).json({ message: "unathorized" });
    } else {
      jwt.verify(
        req.body.refreshtoken,
        process.env.JWT_SECRET,
        (err, decoded) => {
          if (err) {
            res.status(400).json({ message: "invalid token" });
          } else {
            const atoken = accesstoken(decoded.email);
            res.cookie("accesstoken", atoken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
              sameSite: "Strict", // Adjust as needed
              maxAge: 15 * 60 * 1000, // 15 minutes
            });
          }
        }
      );
    }
  }
});
router.post("/logout", async (req, res) => {
  const cookie=req.cookies
  const rtoken = cookie.refreshtoken;
  const istoken = token.findOne({ where: { token: rtoken } });
  if (istoken != null) {
    await token.destroy({ where: { token: rtoken } });
    res.clearCookie("refreshtoken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
      sameSite: "Strict", // Adjust as needed
    });
    res.clearCookie("accesstoken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
      sameSite: "Strict", // Adjust as needed
    });
    res.status(200).json({ message: "logged out" });
  } else {
    res.status(400).json({ message: "token invalid" });
  }
});

router.post("/resetrequest", async (req, res) => {
  const email = req.body.email;
  const ot = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
  });
  const isuser = user.findOne({ where: { email: email } });
  const isotp = otp.findOne({ where: { otp: ot } });
  if (isotp != null) {
    if (isuser != null) {
      const otp1 = otp.create({
        otp: ot,
        email: email,
      });
      const info = await transporter.sendMail({
        to: email, // list of receivers
        subject: "otp", // Subject line
        text: "otp", // plain text body
        html: ot, // html body
      });
    }
  }
});
router.post("/resetpassword", async (req, res) => {
  const rotp = req.body.otp;
  const password = req.body.password;
  const isotp = await otp.findOne({
    where: { otp: rotp },
    having: literal("TIMESTAMPDIFF(MINUTE, createdAt, NOW()) <= 5"),
  });
  const email = isotp.email;
  const isuser = await user.findOne({ where: { email: email } });
  if (isotp != null) {
    if (isuser != null) {
      (isuser.password = bcrypt.hashSync(password, 10)),
        res.status(100).json({ message: "password reset successful" });
      await isuser.save();
      await otp.destroy({ where: { email: email } });
    }
  } else {
    res.json({ message: "failed" });
  }
});

// router.get("/mail",async(req,res)=>{
//     const info = await transporter.sendMail({
//         to: "marufrahmanmahin@protonmail.com", // list of receivers
//         subject: "otp", // Subject line
//         text: "otp", // plain text body
//         html: "<h1>Test</h1>", // html body
//       });
// })
// router.get("/test" ,(req,res)=>{
//   res.cookie("token", 1234, {
//               httpOnly: true,
//               secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
//               sameSite: "Strict", // Adjust as needed
//               maxAge: 15 * 60 * 1000, // 15 minutes
//             });
//             res.status(200).json({message:"cookie sent"})

// });
// router.get("/testtoken" ,(req,res)=>{

//   const cookies = req.cookies
//   const token = cookies.token;
//   if(!token){
//          res.status(401).json({ message: 'Unauthorized' });
//   }else{
//     res.json({message:token})
//   }

// });

module.exports = router;
