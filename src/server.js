const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const seed = require('./seed');
const apiRoutes = require('./routes');

seed();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', apiRoutes);

app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ message: err.message || 'Something went wrong.' });
  next();
});

app.listen(PORT, () => {
  console.log(`PayPilot server running at http://localhost:${PORT}`);
});
