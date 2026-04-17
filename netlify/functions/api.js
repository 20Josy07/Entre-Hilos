const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const productRoutes = require('../../backend/routes/productRoutes');
const orderRoutes = require('../../backend/routes/orderRoutes');
const cartRoutes = require('../../backend/routes/cartRoutes');
const userRoutes = require('../../backend/routes/userRoutes');

// Load environment variables
dotenv.config();

// NOTE: The Firebase connection is now handled automatically within the database config file.
// No explicit connection call is needed here.

const app = express();

// Middleware
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://entre-hilos-store.netlify.app',
    process.env.ALLOWED_ORIGIN
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin not permitted: ${origin}`));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '5mb' }));

// Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/users', userRoutes);

// API Test Route
app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to Entre Hilos API' });
});

module.exports.handler = serverless(app);
