const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// Intenta encontrar el archivo local de credenciales, o usa variables de entorno
const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');

try {
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase conectado exitosamente con el Service Account Key.");
    } else {
        // En Producción (Netlify), inyectaremos un JSON stringificado
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log("Firebase conectado usando Variables de Entorno.");
        } else {
            console.warn("⚠️ NO SE ENCONTRÓ serviceAccountKey.json ni FIREBASE_SERVICE_ACCOUNT. Firebase no se inicializó.");
        }
    }
} catch (error) {
    console.error("Error inicializando Firebase:", error.message);
}

const db = admin.firestore ? admin.firestore() : null;

module.exports = db;
