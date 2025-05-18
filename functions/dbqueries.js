const { user, token, otp } = require("../database/db");

async function getuser(email) {
    try {
        const user1 = await user.findOne({ where: { email: email } });
        return user1;
    } catch (error) {
        console.error("Error fetching user:", error);
        return null;
    }
}
async function gettoken(tok) {
    try {
        const token1 = await token.findOne({ where: { token: tok } });
        return token1;
    } catch (error) {
        console.error("Error fetching token:", error);
        return null;
    }
}   
async function getotp(ot) {
    try {
        const otp1 = await otp.findOne({ where: { otp: ot } });
        return otp1;
    } catch (error) {
        console.error("Error fetching otp:", error);
        return null;
    }
}   

module.exports = { getuser, gettoken, getotp };