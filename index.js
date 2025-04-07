const express=require("express")
const body_parser=require("body-parser")
const {sequelizedb}=require('./database/db')
const router = require('./routes/routes')
const app =express()
app.use(body_parser.json());

sequelizedb.authenticate().then(()=>{
    console.log('connection has been established successfully');
}).catch((error)=>{
    console.error('Unable to connect to the database:',error);
});
app.use('/',router)
app.listen(3000)