const mongoose = require("mongoose");
const config = require("../config");

const connectDB = async () => {
  mongoose
    .connect(config.mongoURI)
    .then(() => console.log("Connected to Mongo."))
    .catch((err) => {
      console.log("Failed to connect to DB:", err);
      process.exit(1);
    });

  mongoose.set("sanitizeFilter", true);
};

const closeDBConn = async () => {
  await mongoose.connection.close();
};

module.exports = { connectDB, closeDBConn };
