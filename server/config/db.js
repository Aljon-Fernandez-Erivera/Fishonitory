const mongoose = require("mongoose");

// LEGACY DATABASE CONNECTION CODE (saved for easy rollback):
// const connectDB = async (mongoURI) => {
//   try {
//     mongoose.set("bufferCommands", false);
//     const conn = await mongoose.connect(mongoURI, {
//       dbName: "fishonitory",
//       serverSelectionTimeoutMS: 5000,
//       socketTimeoutMS: 45000,
//     });
//     console.log(`>>> MongoDB Atlas Connected: ${conn.connection.host} <<<`);
//   } catch (error) {
//     console.error(`MongoDB Connection Error: ${error.message}`);
//     throw error;
//   }
// };

const connectDB = async (mongoURI) => {
  try {
    mongoose.set("bufferCommands", false);

    const conn = await mongoose.connect(mongoURI, {
      dbName: "fishonitory",
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      writeConcern: { w: "majority" },
    });

    console.log(`>>> MongoDB Atlas Connected: ${conn.connection.host} <<<`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
