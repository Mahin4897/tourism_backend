const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const body_parser = require("body-parser");
const { body, validationResult } = require('express-validator');
const xss = require('xss');
const { user, token, otp } = require("../database/db");
const { getuser, gettoken, getotp , getuserbyid,getallusers,getvalidusers} = require("../functions/dbqueries");
const { accesstoken, refreshtoken, auth,adminauth } = require("../middleware/auth");
const otpGenerator = require("otp-generator");
const transporter = require("../functions/nodemail");
const { Cookies } = require("nodemailer/lib/fetch");
require("dotenv").config();
router.use(body_parser.json());
router.use(cookieParser());

/**
 * Handles user registration by creating a new user account
 * @route POST /register
 * @param {Object} req.body - User registration details
 * @param {string} req.body.first_name - User's first name
 * @param {string} req.body.last_name - User's last name
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password
 * @param {string} req.body.phone - User's phone number
 * @returns {Object} 200 status with success message if user created, 400 status if user already exists
 */
router.post("/register", [body('first_name').trim().notEmpty().withMessage("First Name Required")
  .isLength({ min: 3 }).withMessage("First Name must be at least 3 characters long"),
  body('last_name').trim().notEmpty().withMessage("Last Name Required")
  .isLength({ min: 3 }).withMessage("Last Name must be at least 3 characters long"),
  body('email').trim().notEmpty().withMessage("Email Required").isEmail().withMessage("Invalid Email").normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage("Password must be at least 8 characters long"),
  body('phone').trim().notEmpty().withMessage("Phone Number Required")
  .isMobilePhone('bn-BD').withMessage("Invalid Phone Number")
],async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const isuser = await getuser(req.body.email);
  if (isuser === null) {
    try {
      const us = await user.create({
      first_name: xss(req.body.first_name),
      last_name: xss(req.body.last_name),
      email: xss(req.body.email),
      password: bcrypt.hashSync(xss(req.body.password), 10),
      phone: xss(req.body.phone),
    });
    const ot = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
    });
    const otp1 = await otp.create({
      otp: ot,
      email: req.body.email,
    });
    const link = `localhost:3000/verify/${ot}`;
    const info = await transporter.sendMail({
      to: req.body.email, // list of receivers
      subject: "Verify your Email", // Subject line
      text: "Verification Link", // plain text body
      html: `<a href=${link}>Click here</a>`, // html body
    });
    res.status(200).json({ message: "user created successfully" });
      
    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({ message: "Registration failed due to server error" });
    }
    
  } else {
    res.status(400).json({ message: "user already exist" });
    console.log(isuser.email);
  }
});


/**
 * Handles user email verification via OTP
 * @route GET /verify/:otp
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} req.params.otp - One-time verification code
 * @returns {Object} 200 status with success message if user verified, otherwise failure message
 * @description Validates user's email by checking OTP and updating user's validation status
 */
router.get("/verify/:otp",async(req,res)=>{
  const rotp =req.params['otp']
  const isotp = await getotp(rotp);
  const email = isotp.email;
  const isuser = await getuser(email);
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

router.post("/login",[body('email').trim().notEmpty().withMessage("Email is required")
  .isEmail().withMessage("Invalid Email").normalizeEmail(),
  body('password').trim().notEmpty().withMessage("Passowrd is required")
  .isLength({ min: 8 }).withMessage("Password must be at least 8 characters long")
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const email=xss(req.body.email);
  const password=xss(req.body.password);
  const isuser = await getvalidusers(email);
  if (isuser === null) {
    res.status(400).json({ message: "user not found" });
  } else {
    const ismatch = bcrypt.compareSync(password, isuser.password);
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

router.get("/refresh", async (req, res) => {
  const cookie = req.cookies;
  const retoken = cookie.refreshtoken;
  if (retoken != null) {
    const rtoken = await gettoken(retoken);
    if (rtoken == null) {
      res.status(400).json({ message: "unathorized" });
    } else {
      jwt.verify(retoken, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
          res.status(400).json({ message: "invalid token" });
        } else {
          await token.destroy({ where: { token: retoken } });
          const atoken = accesstoken(decoded.email);
          const rtken = refreshtoken(decoded.email);
          res.cookie("accesstoken", atoken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
            sameSite: "Strict", // Adjust as needed
            maxAge: 15 * 60 * 1000, // 15 minutes
          });
          res.cookie("refreshtoken", rtken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
            sameSite: "Strict", // Adjust as needed
            maxAge: 60 * 60 * 24 * 15, // 15 Days
          });

          const rtk =await token.create({
            token: rtken,
          });
          res.status(200).json({ message: "token refreshed" });
        }
      });
    }
  } else {
    res.status(400).json({ message: "unathorized" });
  }
});
router.get("/logout", async (req, res) => {
  const cookie=req.cookies
  const rtoken = cookie.refreshtoken;
  if (rtoken != null) {
       const istoken = gettoken(rtoken);
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
}else{
  res.status(400).json({message:"unathorized"})
}
}
);

router.post("/resetrequest",[
  body('email').trim().notEmpty().withMessage("Email is required")
  .isEmail().withMessage("Invalid Email").normalizeEmail()
], 
async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const email = xss(req.body.email);
  const ot = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
  });
  const isuser = await getuser(email);
  const isotp = await getotp(ot);
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
router.post("/resetpassword",[
  body('otp').trim().notEmpty().withMessage("otp is required")
  .isLength({ min: 6, max: 6 }).withMessage("otp must be 6 digits"),
  body('password').trim().notEmpty().withMessage("password is required")
  .isLength({ min: 8 }).withMessage("password must be 8 characters long")
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const rotp = xss(req.body.otp);
  const password = xss(req.body.password);
  const isotp = await otp.findOne({
    where: { otp: rotp },
    having: literal("TIMESTAMPDIFF(MINUTE, createdAt, NOW()) <= 5"),
  });
  const email = isotp.email;
  const isuser = await getuser(email);
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

router.get("/profile",auth,async(req,res)=>{
  try{
  const isuser = await getuser(req.body.email)
    if(isuser!=null){
      res.status(200).json({message:"profile",data:isuser})
    }
  }catch(err){
    res.status(400).json({message:"failed"})
  }
  

})
router.get("/users",adminauth,async(req,res)=>{
  try{
    const users = await getallusers()
    if(users!=null){
    res.status(200).json({message:"users",data:users})
  }else{
    res.status(400).json({message:"failed"})
  }
  }catch(err){
    res.status(400).json({message:"failed"})
  }
})
router.post("/deleteuser/:id",adminauth,async(req,res)=>{
  const id=xss(req.params.id)
  try{
    const isuser=await getuserbyid(id)
    if(isuser!=null){
      await user.destroy({where:{id:id}})
      res.status(200).json({message:"user deleted"})
    }else{
      res.status(400).json({message:"user not found"})
    }
  }catch(err){
    res.status(400).json({message:"failed"})
  }
})




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
