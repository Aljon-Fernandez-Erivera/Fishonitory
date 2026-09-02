const express = require('express');
const cors = require('cors');
const config = require('./server/config/config');
const connectDB = require('./server/config/db');

const app = express();

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true
  })
);

app.use(express.json());

console.log('Connecting to MongoDB Atlas...');

connectDB(config.mongoURI)
  .then(() => {
    // Mount routes ONLY after DB handshake completes
    const authRoutes = require('./server/routes/authRoutes');
    app.use('/api/auth', authRoutes);

    app.get('/', (req, res) => {
      res.send('Fishonitory Backend API is Running');
    });

    app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  });
