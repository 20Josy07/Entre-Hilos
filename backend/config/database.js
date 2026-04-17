const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

if (!admin.apps.length) {
    try {
        // Production on Netlify: Use the environment variable.
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("Firebase initialized using environment variable.");
        }
        // Local Development: Read the file manually to avoid bundler errors
        else if (!process.env.NETLIFY) {
            const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');
            if (fs.existsSync(serviceAccountPath)) {
                const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                console.log("Firebase initialized using local serviceAccountKey.json.");
            } else {
                 console.warn("⚠️ For local development, serviceAccountKey.json was not found.");
            }
        } else {
             console.warn("⚠️ Firebase credentials not found on Netlify. Ensure FIREBASE_SERVICE_ACCOUNT is set.");
        }
    } catch (error) {
        console.error("Fatal error initializing Firebase:", error.message);
    }
}

const db = admin.firestore() || null;

if (!db) {
  console.error("Firestore database is not available. Initialization may have failed.");
}

module.exports = db;
