const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Subscription = require("./Subscription");

const Payment  = sequelize.define("payments",{
    id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        autoIncrement:true
    },
    amount:{
        type:DataTypes.DOUBLE,
    },
    status:{
        type:DataTypes.ENUM("payé","non payé"),
    },
    date:{
        type:DataTypes.DATE,
        defaultValue:DataTypes.NOW
    },
    
    subscription_id:{
        type:DataTypes.BIGINT,
        references:{
            model:Subscription,
            key:"id"
        }
    },
    
})
module.exports = Payment
