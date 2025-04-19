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

function auth(req, res, next) {
    const token = req.cookies.accesstoken;
    if (!token) {
      return res.status(401).json({ message: 'Access token not found' });
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(400).json({ message: 'Invalid token' });
      } else {
        req.email = decoded.email;
        next();
      }
    });
  }
module.exports={accesstoken,refreshtoken,auth}