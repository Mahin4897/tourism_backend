const express =require('express')
const router=express.Router()
const jwt=require("jsonwebtoken")
const bcrypt=require('bcrypt');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const body_parser=require("body-parser")
const {user,token,otp}=require("../database/db")
const {accesstoken,refreshtoken,auth}=require("../middleware/auth")
const otpGenerator = require('otp-generator')
const transporter=require('../functions/nodemail');
router.use(body_parser.json());
const app = express();
app.use(cookieParser());

//This is the route for registration of the user
router.post('/register', async (req, res) => {
    try {
      const { first_name, last_name, email, password, phone } = req.body;
  
      if (!first_name || !last_name || !email || !password || !phone) {
        return res.status(400).json({ message: 'All fields are required.' });
      }
  
      const isuser = await user.findOne({ where: { email } });
  
      if (isuser) {
        console.log("User already exists:", isuser.email);
        return res.status(400).json({ message: 'User already exists' });
      }
  
      const hashedPassword = bcrypt.hashSync(password, 10);
  
      const newUser = await user.create({
        first_name,
        last_name,
        email,
        password: hashedPassword,
        phone,
      });
  
      console.log("User created:", newUser.email);
      return res.status(200).json({ message: 'User created successfully' });
    } catch (error) {
      console.error("Error during registration:", error);
      return res.status(500).json({ message: 'Server error, try again later.' });
    }
});

//This is the route for login of the user
router.post('/login',async (req,res)=>{
    const isuser=await user.findOne({where:{email:req.body.email}});
    if(isuser===null){
        res.status(400).json({message:'user not found'});
    }
    else{
        const ismatch=bcrypt.compareSync(req.body.password,isuser.password);
        console.log(isuser.email)
        if(ismatch){
            const rtoken=refreshtoken(isuser.email)
            const atoken=accesstoken(isuser.email)
            const  rtk = await token.create(
                {
                    token:rtoken
                }
            )
            //Set tokens as HTTP-only cookies
            res.cookie('accesstoken', atoken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Set to true if using HTTPS
                sameSite: 'Strict', // Adjust as needed
                maxAge: 15 * 60 * 1000, // 15 minutes
            })
            //Set refresh token as HTTP-only cookie
            res.cookie('refreshtoken', rtoken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Set to true if using HTTPS
                sameSite: 'Strict', // Adjust as needed
                maxAge: 60 * 60 * 24 * 15 // 15 Days
            })

            res.status(200).json({
                message:'user logged in successfully',
                refreshtoken:rtoken,
                accesstoken:atoken
            });
        }
        else{
            res.status(400).json({message:'password is incorrect'});
        }
    }
})


//This is the route for Token verification
router.post('/refresh',async (req,res)=>{
    if(req.cookies.refreshtoken!=null){
        const rtoken=await token.findOne({where:{token:req.cookies.refreshtoken}})
        console.log(rtoken)
        if(rtoken==null){
            res.status(403).json({message:'Unauthorized'});
        } else {
            jwt.verify(req.cookies.refreshtoken,process.env.JWT_SECRET,(err,decoded)=>{
                if(err){
                    return res.status(400).json({message:'invalid token'});
                }
                else{
                   const atoken=accesstoken(decoded.email)
                   res.cookie('accesstoken', atoken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production', // Set to true if using HTTPS
                    sameSite: 'Strict', // Adjust as needed
                    maxAge: 15 * 60 * 1000, // 15 minutes
                    })
                    res.status(200).json({
                        message:'Access Token Generated Successfully',
                        accesstoken:atoken
                    });
                }
            })
        }
    }
    
})

// Route to get user profile
router.get('/user', auth, async (req, res) => {
    try {
        const userData = await user.findOne({
            where: { email: req.email },
            attributes: ['first_name', 'last_name', 'email', 'phone']
        });

        if (!userData) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(userData);
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

//This is the route for Logging out the user
router.post('/logout',async (req,res)=>{
        const rtoken=req.cookies.refreshtoken
        const istoken=token.findOne({where:{token:rtoken}})
        if(istoken!=null){
            await token.destroy({where:{token:rtoken}})
            res.clearCookie('refreshtoken')
            res.clearCookie('accesstoken')
            res.status(200).json({message:"Logged out"})
            console.log("Logged out")
        }else{
            res.status(400).json({message:"Token Invalid"})

        }

})

//This is the route for user's reset password request
router.post('/resetrequest',async (req,res)=>{
    const email=req.body.email
    const ot=otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
    const isuser=user.findOne({where:{email:email}})
    const isotp=otp.findOne({where:{otp:ot}})
    if(isotp!=null){
        if(isuser!=null){
            const otp1=otp.create({
                otp:ot,
                email:email
            })
            const info = await transporter.sendMail({
                to: email, // list of receivers
                subject: "otp", // Subject line
                text: "otp", // plain text body
                html: ot, // html body
              });
              setTimeout(function A() {
                return res.status(200).json({ message: "OTP sent successfully." });
            }, 3000);
        }
    }
})

//This is the page for user password reset verification
router.post("/resetpassword", async (req, res) => {
    const { otp: rotp, password } = req.body;
  
    const isotp = await otp.findOne({ where: { otp: rotp } });
    if (!isotp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }
  
    const email = isotp.email;
    const isuser = await user.findOne({ where: { email } });
    if (!isuser) {
      return res.status(404).json({ message: "User not found." });
    }
  
    isuser.password = bcrypt.hashSync(password, 10);
    await isuser.save();
    await otp.destroy({ where: { otp: rotp } });
  
    res.status(200).json({ message: "Password reset successful." });
  });

module.exports=router