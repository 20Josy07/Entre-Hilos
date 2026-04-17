const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const dotenv = require('dotenv');
const productRoutes = require('../../backend/routes/productRoutes');
const orderRoutes = require('../../backend/routes/orderRoutes');
const cartRoutes = require('../../backend/routes/cartRoutes');
const userRoutes = require('../../backend/routes/userRoutes');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.ALLOWED_ORIGIN  // e.g. https://entre-hilos.netlify.app
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, Postman, same-origin)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origen no permitido: ${origin}`));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '5mb' })); // Parse JSON bodies (5mb for base64 images)

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
