const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Teacher = require("./Teacher");

const Purchase = sequelize.define("purchases", {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
   
    item: {
        type: DataTypes.STRING,
    },
    total_price: {
        type: DataTypes.DECIMAL(10, 2),
    },
    unit_price: {
        type: DataTypes.DECIMAL(10, 2),
    },
    quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    is_deleted:{
        type:DataTypes.BOOLEAN,
        defaultValue:false
    }
})

module.exports = Purchase