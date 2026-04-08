const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { verifyToken } = require('../middleware/auth');

// POST /api/upload/image (Admin only: Upload image to Firebase Storage)
router.post('/image', verifyToken, uploadController.multerMiddleware, uploadController.uploadImage);

module.exports = router;
