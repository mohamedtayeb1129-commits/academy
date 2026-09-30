const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Teacher = require("./Teacher");

const TeacherPayment = sequelize.define("teacher_payment", {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    teacher_id: {
        type: DataTypes.BIGINT,
        references: {
            model: Teacher,
            key: "id"
        }
    },
    month: {
        type: DataTypes.INTEGER,
    },
    year: {
        type: DataTypes.INTEGER,
    },
    hour_count: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM("payé", "non payé", "en attente"),
        defaultValue: "en attente"
    }
}, {
    timestamps: true,
    indexes: [
        { unique: true, fields: ["teacher_id", "month", "year"] }
    ]
});


module.exports = TeacherPayment