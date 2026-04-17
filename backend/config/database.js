const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// A single initialization check for the entire module
if (!admin.apps.length) {
    try {
        // ROBUST LOGIC: Prioritize the environment variable meant for production (Netlify).
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            console.log("Found FIREBASE_SERVICE_ACCOUNT. Attempting to initialize Firebase for production...");
            try {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                console.log("Firebase Admin SDK initialized successfully using environment variable.");
            } catch (e) {
                // This will catch errors from JSON.parse() if the variable is malformed.
                throw new Error(`FATAL: Could not parse FIREBASE_SERVICE_ACCOUNT. Check if it's a valid JSON string. Parse Error: ${e.message}`);
            }
        }
        // FALLBACK: If the environment variable is not found, try the local file for development.
        else {
            console.log("FIREBASE_SERVICE_ACCOUNT not found. Falling back to local serviceAccountKey.json...");
            const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');
            if (fs.existsSync(serviceAccountPath)) {
                const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                console.log("Firebase initialized successfully using local serviceAccountKey.json.");
            } else {
                // This is the critical failure point if neither method works.
                 console.error("CRITICAL: Could not initialize Firebase Admin SDK. No FIREBASE_SERVICE_ACCOUNT env var found and no local serviceAccountKey.json exists.");
            }
        }
    } catch (error) {
        // Log the fatal error to the console for visibility in Netlify logs.
        console.error("--- FIREBASE INITIALIZATION FAILED ---");
        console.error(error.message);
        console.error("----------------------------------------");
    }
}

// Export the initialized Firestore database instance, or null if initialization failed.
const db = admin.apps.length ? admin.firestore() : null;

if (!db) {
  console.error("CRITICAL: Firestore database is not available because Firebase Admin SDK initialization failed. Check logs above.");
}

module.exports = db;
