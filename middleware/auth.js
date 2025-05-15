const jwt=require("jsonwebtoken")
const cookieParser = require("cookie-parser");
const { user, token, otp } = require("../database/db");
const express=require("express")
const app=express()
app.use(cookieParser())
require('dotenv').config();
function accesstoken(email){
    const token=jwt.sign({email:email},process.env.JWT_SECRET,{ expiresIn: '1d' })
    return token
}

function refreshtoken(email){
    const token=jwt.sign({email:email},process.env.JWT_SECRET)
    return token
}
function auth(req, res, next) {
    const cookie = req.cookies;
    const token = cookie?.accesstoken;
    
    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('Token verification failed:', err.name);
            
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired' });
            }
            
            return res.status(403).json({ message: 'Invalid authentication' });
        }
        
        req.decoded = decoded.email;
        next();
    });
}
async function  adminauth(req, res, next) {
    const cookie = req.cookies;
    const token = cookie?.accesstoken;
    
    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
            console.error('Token verification failed:', err.name);
            
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired' });
            }
            
            return res.status(403).json({ message: 'Invalid authentication' });
        }
        
        req.decoded = decoded.email;
        
        try{
            const isuser =await user.findOne({ where: { email: decoded.email } });
            console.log(isuser);
            if (isuser.usertype === 'admin') {
                next();
            } else {
                res.status(403).json({ message: 'Access denied' });
            }
        }catch(err){

            res.status(400).json({message:"failed"})
        }
        
    });
}

// function auth(res,req,next){
//     const cookie = req.cookies
//     const token= cookie.accesstoken;
//     jwt.verify(token,process.env.JWT_SECRET,(err,decoded)=>{
//         if(err){
//             res.status(400).json({message:'invalid token'});
//         }
//         else{
//             req.decoded=decoded.email;
//             next();
//         }
//     })

// }
module.exports={accesstoken,refreshtoken,auth,adminauth}