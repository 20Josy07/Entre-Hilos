const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken } = require('../middleware/auth');

// GET /api/products (Public - visible for all store users)
router.get('/', productController.getAllProducts);

// GET /api/products/:id (Public - single product details)
router.get('/:id', productController.getProductById);

// POST /api/products (Admin Protected)
router.post('/', verifyToken, productController.createProduct);

// PUT /api/products/:id (Admin Protected)
router.put('/:id', verifyToken, productController.updateProduct);

// DELETE /api/products/:id (Admin Protected)
router.delete('/:id', verifyToken, productController.deleteProduct);

module.exports = router;
