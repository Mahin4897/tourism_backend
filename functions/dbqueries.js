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
async function getuserbyid(id) {
  try {
    const user1 = await user.findOne({ where: { id: id } });
    return user1;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}
async function getallusers() {
  try {
    const users = await user.findAll({
      attributes: { exclude: ["password"] },
    });
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    return null;
  }
}
async function getvalidusers(email) {
  try {
    const users = await user.findOne({
      where: { email: email, isvalid: true },
    });
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    return null;
  }
}

module.exports = { getuser, gettoken, getotp, getuserbyid, getallusers, getvalidusers };
