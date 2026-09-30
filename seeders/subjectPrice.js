require("dotenv").config();

const sequelize = require("../config/db");
const SubjectPrice = require("../models/SubjectPrice");
async function createSubjectPrice (){
    try{
        await sequelize.sync();
    
    const data = [
        { level: 'ابتدائي', amount: 20 },
        { level:'اعدادي', amount: 20 },
        { level: 'ثانوي', amount: 20 },
        { level: 'باكالوريا', amount: 7 },
    ]
    for(const d of data){
        await SubjectPrice.create({label:d.level,amount:d.amount})
    }
    console.log("subject price created");
    process.exit();
    }catch(err){
        console.log(err);
        process.exit();
    }
}
createSubjectPrice()