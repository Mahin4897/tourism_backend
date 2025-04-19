const {Sequelize,DataTypes} = require('sequelize');
require('dotenv').config();
const sequelizedb = new Sequelize(
    process.env.DATABASE_NAME,
    process.env.DATABASE_USER, 
    process.env.DATABASE_PASSWORD, {
        host: process.env.DATABASE_HOST,
        dialect: 'mysql',
        port: process.env.DATABASE_PORT
});

const user = sequelizedb.define('user', {
    first_name: {
        type: DataTypes.STRING,
        allowNull: false

    },
    last_name: {
        type: DataTypes.STRING,
        allowNull: false

    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        isEmail: true,
        isUnique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    usertype: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue:"guest",

    }
});
const token=sequelizedb.define('token',{
    token: {
        type: DataTypes.STRING,
        allowNull: false
    }
})
const otp=sequelizedb.define('otp',{
    otp: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        isEmail: true,
    },
})


try {
  sequelizedb.sync();
  console.log("Table created successfully!");
} catch (error) {
  console.error("Unable to create table:", error);
}

module.exports = { sequelizedb,user,token,otp };