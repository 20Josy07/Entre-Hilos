const admin = require('firebase-admin');

// CRITICAL FIX: Explicitly require the database config file.
// This ensures that the Firebase Admin SDK is initialized before this module tries to use it.
// Even though the exported 'db' isn't used here, loading the module executes the initialization code.
require('../config/database');

const verifyToken = async (req, res, next) => {
    // Check if firebase-admin is initialized. This is a sanity check.
    if (!admin.apps.length) {
        console.error("CRITICAL AUTH.JS: Firebase Admin SDK is still not initialized. The request will fail. Check module load order.");
        return res.status(500).json({ error: 'Server Configuration Error: Firebase Admin not initialized.' });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No valid token provided' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: Malformed token' });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken; // Attach user data to the request
        next(); // Proceed to the controller
    } catch (error) {
        console.error("Error verifying token:", error.message);
        
        if (error.code === 'auth/id-token-expired') {
            return res.status(403).json({ error: 'Unauthorized: Token has expired.' });
        }
        
        return res.status(403).json({ error: 'Unauthorized: Invalid or expired token' });
    }
};

module.exports = { verifyToken };
