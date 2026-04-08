const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');

// POST /api/users (Create/Update profile)
router.post('/', verifyToken, userController.upsertProfile);

// GET /api/users/profile (Get self profile)
router.get('/profile', verifyToken, userController.getSelfProfile);

module.exports = router;
