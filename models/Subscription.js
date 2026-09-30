const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Teacher = require("./Teacher");
const Student = require("./Student");
const SchoolYear = require("./SchoolYear");

const Subscription  = sequelize.define("subscriptions",{
    id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        autoIncrement:true
    },
    amount:{
        type:DataTypes.DOUBLE,
    },
    status:{
        type:DataTypes.ENUM("payé","en attente","non payé"),
        defaultValue:"payé"
    },
    is_offer: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
    },
    deactivated_by_break: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
},
school_year_id: {
  type: DataTypes.BIGINT,
  allowNull: false,
  references: {
    model: SchoolYear,
    key: "id",
  },
},
    student_id:{
        type:DataTypes.BIGINT,
        references:{
            model:Student,
            key:"id"
        }
    },
    
})
module.exports = Subscription