const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken } = require('../middleware/auth');

// POST /api/orders (User: Place Order)
router.post('/', verifyToken, orderController.createOrder);

// GET /api/orders/mine (User: View their history)
router.get('/mine', verifyToken, orderController.getMyOrders);

// GET /api/orders (Admin: View all)
router.get('/', verifyToken, orderController.getAllOrders);

// PUT /api/orders/:id/status (Admin: Update Status)
router.put('/:id/status', verifyToken, orderController.updateOrderStatus);

module.exports = router;
