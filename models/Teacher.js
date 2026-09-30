const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Teacher  = sequelize.define("teachers",{
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
    price_by_hour :{
        type: DataTypes.DECIMAL(10, 2),
    },
    status:{
        type:DataTypes.ENUM('نشط', 'في إجازة', 'غير نشط'),
    },
     is_deleted:{
        type:DataTypes.BOOLEAN,
        defaultValue:false
    },
})
module.exports = Teacher
