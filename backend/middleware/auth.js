const admin = require('firebase-admin');

// Check if firebase-admin is initialized. This is crucial.
if (!admin.apps.length) {
    console.error("CRITICAL AUTH.JS: Firebase Admin SDK is not initialized. The request will fail.");
}

const verifyToken = async (req, res, next) => {
    console.log("Entering verifyToken middleware...");
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error("verifyToken Error: No 'Bearer ' token found in Authorization header.");
        return res.status(401).json({ error: 'Unauthorized: No valid token provided' });
    }

    // Correctly split "Bearer <token>"
    const token = authHeader.split(' ')[1];

    if (!token) {
        console.error("verifyToken Error: Token is empty after splitting header.");
        return res.status(401).json({ error: 'Unauthorized: Malformed token' });
    }

    try {
        console.log("Attempting to verify token with Firebase Admin...");
        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log("Token verified successfully. Decoded UID:", decodedToken.uid);
        req.user = decodedToken; // Attach user data to the request
        next(); // Proceed to the controller
    } catch (error) {
        // --- Detailed Error Logging ---
        console.error("--- Detailed Auth Middleware Error ---");
        console.error("Timestamp:", new Date().toISOString());
        console.error("Error verifying token:", error.message);
        console.error("Error Code:", error.code);
        console.error("Full Error Object:", JSON.stringify(error, null, 2));
        console.error("--- End Detailed Auth Middleware Error ---");

        // Return a specific error message based on the type of error
        if (error.code === 'auth/id-token-expired') {
            return res.status(403).json({ error: 'Unauthorized: Token has expired.' });
        } 
        // This error happens if the SDK is not initialized
        else if (error.message.includes("app must be initialized")) {
            return res.status(500).json({ error: 'Server Configuration Error: Firebase Admin not initialized.' });
        }

        return res.status(403).json({ error: 'Unauthorized: Invalid or expired token' });
    }
};

module.exports = { verifyToken };
