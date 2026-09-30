const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Student = require('./Student');
const Package = require('./Package');

const StudentPackage = sequelize.define(
  'student_package',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    student_id: {
         type: DataTypes.BIGINT,
         allowNull: false,
         references:{
           key:"id",
           model:Student
         }
    },
     package_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references:{
        key:"id",
        model:Package
      }
    },
  },
  {
    tableName: 'student_package',
    timestamps: true,
  }
);

module.exports = StudentPackage;