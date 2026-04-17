const admin = require("firebase-admin");

// Check if Firebase app has already been initialized to prevent re-initialization errors
if (!admin.apps.length) {
  try {
    // In Production (Netlify), use the environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase initialized successfully using Environment Variable.");
    } else {
      // For local development, fallback to the local key file
      const serviceAccount = require('../../serviceAccountKey.json');
      admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase initialized successfully using local serviceAccountKey.json.");
    }
  } catch (error) {
    console.error("Error initializing Firebase:", error.message);
    // Log the environment variable existence for debugging
    console.log(`FIREBASE_SERVICE_ACCOUNT variable exists: ${!!process.env.FIREBASE_SERVICE_ACCOUNT}`);
  }
}

const db = admin.firestore();

module.exports = db;
