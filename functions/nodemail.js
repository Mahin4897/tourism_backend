const nodemailer = require("nodemailer");
const {google}=require("googleapis");
const { refreshtoken } = require("../middleware/auth");
require('dotenv').config();

const oauth2client=new google.auth.OAuth2(process.env.CLIENT_ID,process.env.CLIENT_SECRET,process.env.REDIRECT_URL)
oauth2client.setCredentials({refresh_token:process.env.Mail_REFRESH_TOKEN})
const accesstoken =oauth2client.getAccessToken()
const transporter = nodemailer.createTransport({
    service:'gmail',
    auth: {
      type:'oAuth2',
      user: "marufrahmanmahin@gmail.com",
      clientId:process.env.CLIENT_ID,
      clientSecret:process.env.CLIENT_SECRET,
      refreshToken:process.env.Mail_REFRESH_TOKEN,
      accessToken:accesstoken
      
    },
  });

module.exports=transporter