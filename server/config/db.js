const mongoose = require("mongoose");

const connectDB = async (mongoURI) => {
  try {
    // Disable buffering so queries throw an error immediately if disconnected
    mongoose.set("bufferCommands", false);

    // Connect to MongoDB Atlas
    const conn = await mongoose.connect(mongoURI, {
      dbName: "fishonitory",
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    // Log the successful connection
    console.log(`>>> MongoDB Atlas Connected: ${conn.connection.host} <<<`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
