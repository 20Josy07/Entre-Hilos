const admin = require("firebase-admin");

// Prevent re-initialization in serverless environments
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
    // Local Development: Use the local service account file.
    // process.env.NETLIFY is 'true' in Netlify's build and runtime environment.
    else if (!process.env.NETLIFY) {
      try {
        const serviceAccount = require("../../serviceAccountKey.json");
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("Firebase initialized using local serviceAccountKey.json.");
      } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
          console.error("Error: serviceAccountKey.json not found for local development.");
          console.log("Please ensure the file is in your project's root directory.");
        } else {
          // Rethrow other errors during local initialization.
          throw e;
        }
      }
    } else {
      // This will be logged on Netlify if the environment variable is missing.
      console.warn("⚠️ Firebase credentials not found. Ensure FIREBASE_SERVICE_ACCOUNT is set in Netlify environment variables.");
    }
  } catch (error) {
    console.error("Fatal error initializing Firebase:", error.message);
  }
}

// Export the initialized firestore instance.
const db = admin.firestore ? admin.firestore() : null;

if (!db) {
  console.error("Firestore database is not available. Initialization may have failed.");
}

module.exports = db;
