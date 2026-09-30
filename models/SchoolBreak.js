const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const SchoolBreak = sequelize.define(
  "school_break",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },

    school_year_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    label: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    type: {
      type: DataTypes.ENUM(
        "summer",
        "exceptional"
      ),
      allowNull: false,
    },
  },
  {
    tableName: "school_breaks",
    timestamps: true,
  }
);

module.exports = SchoolBreak;