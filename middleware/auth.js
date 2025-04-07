const jwt=require("jsonwebtoken")
require('dotenv').config();
function accesstoken(email){
    const token=jwt.sign({email:email},process.env.JWT_SECRET,{ expiresIn: '1d' })
    return token
}

function refreshtoken(email){
    const token=jwt.sign({email:email},process.env.JWT_SECRET)
    return token
}

function auth(res,req,next){
    const token=req.headers.authorization;
    jwt.verify(token,process.env.JWT_SECRET,(err,decoded)=>{
        if(err){
            res.status(400).json({message:'invalid token'});
        }
        else{
            req.decoded=decoded.email;
            next();
        }
    })

}
module.exports={accesstoken,refreshtoken,auth}