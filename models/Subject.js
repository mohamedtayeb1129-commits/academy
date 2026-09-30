const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Teacher = require("./Teacher");

const Subject  = sequelize.define("subjects",{
    id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        autoIncrement:true
    },
    label:{
        type:DataTypes.STRING,
    },
    teacher_id:{
        type:DataTypes.BIGINT,
        references:{
            model:Teacher,
            key:"id"
        }
    },
    
})
module.exports = Subject
