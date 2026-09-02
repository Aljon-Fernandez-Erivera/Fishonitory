const mongoose = require('mongoose');

const connectDB = async (mongoURI) => {
  try {
    // Disable buffering so queries throw an error immediately if disconnected instead of hanging 10s
    mongoose.set('bufferCommands', false);

    const conn = await mongoose.connect(mongoURI, {
      dbName: 'fishonitory',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`>>> MongoDB Atlas Connected: ${conn.connection.host} <<<`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
