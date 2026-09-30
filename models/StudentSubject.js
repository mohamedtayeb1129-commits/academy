const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Student = require("./Student");

const StudentSubject  = sequelize.define("student_subject",{
    id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        autoIncrement:true
    },
    label:{
        type:DataTypes.STRING,
    },
    student_id:{
        type:DataTypes.BIGINT,
        references:{
            model:Student,
            key:"id"
        }
    },
    
})
module.exports = StudentSubject
