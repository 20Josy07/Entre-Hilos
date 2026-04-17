const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

if (!admin.apps.length) {
    try {
        // NETLIFY (Production/Staging)
        if (process.env.NETLIFY) {
            console.log("Netlify environment detected. Attempting to initialize Firebase...");
            if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
                // This is a critical error. The app cannot run without credentials.
                throw new Error("FATAL: FIREBASE_SERVICE_ACCOUNT environment variable is NOT SET. The Firebase Admin SDK cannot be initialized.");
            }
            
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
        // LOCAL DEVELOPMENT
        else {
            console.log("Local environment detected. Looking for serviceAccountKey.json...");
            const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');
            if (fs.existsSync(serviceAccountPath)) {
                const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                console.log("Firebase initialized successfully using local serviceAccountKey.json.");
            } else {
                 console.warn("WARNING: For local development, serviceAccountKey.json was not found. Backend will not work.");
            }
        }
    } catch (error) {
        // Log the fatal error to the console for visibility in Netlify logs.
        console.error("--- FIREBASE INITIALIZATION FAILED ---");
        console.error(error.message);
        console.error("----------------------------------------");
        // The process should not continue if Firebase cannot be initialized.
    }
}

const db = admin.apps.length ? admin.firestore() : null;

if (!db) {
  console.error("CRITICAL: Firestore database is not available. Check initialization logs.");
}

module.exports = db;
