const admin = require('firebase-admin');

const verifyToken = async (req, res, next) => {
    // Only protecting API routes, so format is 'Bearer <Firebase_ID_Token>'
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken; // Contains UID and email if logged in
        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error.message);
        return res.status(403).json({ error: 'Unauthorized: Invalid or expired token' });
    }
};

module.exports = { verifyToken };
