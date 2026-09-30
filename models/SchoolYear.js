const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const SchoolYear = sequelize.define(
  "school_year",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },

    label: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM("active", "closed"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    tableName: "school_years",
    timestamps: true,
  }
);

module.exports = SchoolYear;