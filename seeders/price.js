require("dotenv").config();

const sequelize = require("../config/db");
const bcrypt = require("bcryptjs");
const TuitionFee = require("../models/TuitionFee");
const { types } = require("pg");
async function createAdmin (){
    try{
        await sequelize.sync();
    
    const data = [
        { level: 'ابتدائي', amount: 30, brother_amount:20,is_brother_amount:true },
        { level:'اعدادي', amount: 40, brother_amount:20,is_brother_amount:true },
        { level: 'ثانوي', amount: 45, brother_amount:20,is_brother_amount:true },
        { level: 'باكالوريا', amount: 50, brother_amount:0,is_brother_amount:false },
    ]
    for(const d of data){
        await TuitionFee.create({label:d.level,amount:d.amount,brother_amount:d.brother_amount,is_brother_amount:d.is_brother_amount})
    }
    console.log("price created");
    process.exit();
    }catch(err){
        console.log(err);
        process.exit();
    }
}
createAdmin()