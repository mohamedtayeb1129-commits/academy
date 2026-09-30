require("dotenv").config();

const sequelize = require("../config/db");
const bcrypt = require("bcryptjs");
const TuitionFee = require("../models/TuitionFee");
const { types } = require("pg");
async function createAdmin (){
    try{
        await sequelize.sync();
    
    const data = [
        { level: 'ابتدائي', amount: 30 },
        { level:'اعدادي', amount: 40 },
        { level: 'ثانوي', amount: 45 },
        { level: 'باكالوريا', amount: 50 },
    ]
    for(const d of data){
        await TuitionFee.create({label:d.level,amount:d.amount})
    }
    console.log("price created");
    process.exit();
    }catch(err){
        console.log(err);
        process.exit();
    }
}
createAdmin()