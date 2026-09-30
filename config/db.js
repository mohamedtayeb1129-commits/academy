const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

// const sequelize = new Sequelize({
//     username:process.env.USERNAMEDB,
//     password:process.env.PASSWORDDB,
//     port:process.env.PORTDB,
//     database:process.env.DATABASE,
//     host:process.env.HOSTDB,
//     dialect:"postgres",
//     logging:false
//     }
// );
module.exports = sequelize;