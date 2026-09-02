const express = require('express');
const mongoose = require('mongoose');
const config = require('./server/config/config');

const app = express();

app.use(express.json());

// Connect to MongoDB Atlas Cloud
mongoose
  .connect(config.mongoURI)
  .then(() => {
    console.log("MongoDB Atlas connected successfully!");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});