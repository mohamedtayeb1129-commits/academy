const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Student  = sequelize.define("students",{
    id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        autoIncrement:true
    },
    name:{
        type:DataTypes.STRING,
    },
    last_name:{
        type:DataTypes.STRING,
    },
    father_name:{
        type:DataTypes.STRING,
    },
    mother_name:{
        type:DataTypes.STRING,
    },
    father_phone:{
        type:DataTypes.STRING,
    },
    mother_phone:{
        type:DataTypes.STRING,
    },
    phone:{
        type:DataTypes.STRING,
    },   
    stage:{
        type:DataTypes.STRING,
    },
    level:{
        type:DataTypes.STRING,
    },
    section:{
        type:DataTypes.STRING,
    },
    is_deleted:{
        type:DataTypes.BOOLEAN,
        defaultValue:false
    },
})
module.exports = Student
