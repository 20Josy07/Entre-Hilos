const db = require('../config/database');
const admin = require('firebase-admin');

const userController = {
    /**
     * Creates or updates a user profile.
     * Used during registration to bypass Firestore Security Rules.
     */
    upsertProfile: async (req, res) => {
        // 1. Log entry and database status
        console.log("Entering upsertProfile...");
        if (!db) {
            console.error("Database not initialized!");
            return res.status(500).json({ error: "La conexión con la base de datos no se ha establecido." });
        }
        console.log("Database connection appears to be valid.");

        try {
            // 2. Log UID from middleware
            const uid = req.user ? req.user.uid : null;
            if (!uid) {
                console.error("UID not found in request. Middleware may have failed.");
                return res.status(401).json({ error: "Usuario no autenticado. No se encontró UID." });
            }
            console.log(`UID: ${uid} found. Proceeding with profile creation.`);

            const { first_name, last_name, phone, email } = req.body;

            const profileData = {
                first_name: first_name || '',
                last_name: last_name || '',
                phone: phone || '',
                email: email || req.user.email,
                esAdmin: false, // Default role for safety
                created_at: admin.firestore.FieldValue.serverTimestamp()
            };

            // 3. Log data before writing to Firestore
            console.log("Attempting to write the following data to Firestore:", JSON.stringify(profileData, null, 2));

            await db.collection('users').doc(uid).set(profileData, { merge: true });

            console.log(`Successfully created or updated profile for UID: ${uid}`);
            res.status(200).json({ 
                message: 'Perfil guardado exitosamente',
                data: profileData
            });
        } catch (error) {
            // 4. Detailed error logging
            console.error("--- Detailed Error in upsertProfile ---");
            console.error("Timestamp:", new Date().toISOString());
            console.error("Error Message:", error.message);
            console.error("Error Code:", error.code);
            console.error("Stack Trace:", error.stack);
            console.error("-----------------------------------------");
            res.status(500).json({ error: "No se pudo crear el perfil en la base de datos." });
        }
    },

    /**
     * Gets the profile of the currently authenticated user.
     */
    getSelfProfile: async (req, res) => {
        try {
            if (!db) throw new Error("Base de datos no inicializada");
            
            const uid = req.user.uid;
            const userDoc = await db.collection('users').doc(uid).get();

            if (!userDoc.exists) {
                return res.status(404).json({ error: 'Perfil no encontrado' });
            }

            res.json({ data: userDoc.data() });
        } catch (error) {
            console.error("Error en getSelfProfile:", error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = userController;
