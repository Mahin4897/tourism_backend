const express =require('express')
const router=express.Router()
const jwt=require("jsonwebtoken")
const bcrypt=require('bcrypt');
require('dotenv').config();
const body_parser=require("body-parser")
const {user,token,otp}=require("../database/db")
const {accesstoken,refreshtoken,auth}=require("../middleware/auth")
const otpGenerator = require('otp-generator')
const transporter=require('../functions/nodemail');
require('dotenv').config();
router.use(body_parser.json());


router.post('/register',async (req,res)=>{
    console.log(req.body.first_name);
    const isuser=await user.findOne({where:{email:req.body.email}});
    if(isuser===null){
      const us=user.create({
          first_name:req.body.first_name,
          last_name:req.body.last_name,
          email:req.body.email,
          password:bcrypt.hashSync(req.body.password,10),
          phone:req.body.phone
      });
      res.status(200).json({message:'user created successfully'});
      
    }
    else{
      res.status(400).json({message:'user already exist'});
      console.log(isuser.email);
    }
    
  })
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
            const rtk=token.create(
                {
                    token:rtoken
                }
            )
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
router.post('/refresh',async (req,res)=>{
    if(req.body.refreshtoken!=null){
        const rtoken=await token.findOne({where:{token:req.body.refreshtoken}})
        console.log(rtoken)
        if(rtoken==null){
            res.status(400).json({message:'unathorized'});
        }
        else{
            jwt.verify(req.body.refreshtoken,process.env.JWT_SECRET,(err,decoded)=>{
                    if(err){
                        res.status(400).json({message:'invalid token'});
                    }
                    else{
                       const atoken=accesstoken(decoded.email)
                       res.status(200).json({
                       accesstoken:atoken
                    });
                    }
                })
        }
    }
    
})
router.post('/logout',async (req,res)=>{
        const rtoken=req.body.refreshtoken
        const istoken=token.findOne({where:{token:rtoken}})
        if(istoken!=null){
            await token.destroy({where:{token:rtoken}})
            res.json({message:"logged out"})
        }else{
            res.status(400).json({message:"token invalid"})

        }

})

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
                return console.log('Hello World!');
            }, 3000);
        }
    }
})
router.post("/resetpassword",async(req,res)=>{
     const rotp=req.body.otp
     const password=req.body.password
     const isotp=await otp.findOne({where:{otp:rotp}})
     const email= isotp.email
     const isuser=await user.findOne({where:{email:email}})
     if(isotp!=null){
        if(isuser!=null){
            isuser.password=bcrypt.hashSync(password,10),
            res.status(100).json({message:"password reset successful"})
            await isuser.save()
            await otp.destroy({where:{otp:rotp}})
        }
     }else{
        res.json({message:"failed"})
     }


})

module.exports=router