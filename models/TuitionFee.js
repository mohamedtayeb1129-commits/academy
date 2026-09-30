const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");


const TuitionFee  = sequelize.define("tuition_fee",{
    id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        autoIncrement:true
    },
    label:{
        type:DataTypes.STRING,
    },
    amount:{
        type:DataTypes.DOUBLE,
    },
})
module.exports = TuitionFee
