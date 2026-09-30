const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");


const SubjectPrice  = sequelize.define("subject_price",{
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
module.exports = SubjectPrice
