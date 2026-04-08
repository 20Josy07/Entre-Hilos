const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { verifyToken } = require('../middleware/auth');

// MIddleware Layer: Every route inside /api/cart MUST pass verification
router.use(verifyToken);

// Routes
router.get('/', cartController.getCart);
router.post('/item', cartController.updateCartItem);
router.delete('/clear', cartController.clearCart);

module.exports = router;
