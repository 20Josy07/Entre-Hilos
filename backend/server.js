const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');
const userRoutes = require('./routes/userRoutes');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies

// Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/users', userRoutes);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Test Route
app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to Entre Hilos API' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
