const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Supervisor  = sequelize.define("supervisors",{
    id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        autoIncrement:true
    },
     cin:{
        type:DataTypes.STRING,
    },
    name:{
        type:DataTypes.STRING,
    },
    last_name:{
        type:DataTypes.STRING,
    },
    phone:{
        type:DataTypes.STRING,
    },
    role:{
        type:DataTypes.ENUM('قيم عام',
  'قيم الساحة',
  'مراقب الدراسة',
  'مسؤول الانضباط',
  'مقتصد',),
    },
    salary :{
        type:DataTypes.DECIMAL(10, 2),
    },
    status:{
        type:DataTypes.ENUM('نشط', 'في إجازة', 'غير نشط'),
    },
    is_deleted:{
        type:DataTypes.BOOLEAN,
        defaultValue:false
    },
})
module.exports = Supervisor
