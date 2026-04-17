const db = require('../config/database');
const admin = require('firebase-admin');

const userController = {
    upsertProfile: async (req, res) => {
        console.log("Entering upsertProfile...");
        if (!db) {
            console.error("Database not initialized! Check server logs for startup errors.");
            return res.status(500).json({ error: "Error Crítico: La conexión con la base de datos no se ha establecido." });
        }

        try {
            const uid = req.user.uid;
            console.log(`UID: ${uid} found. Proceeding with profile creation.`);

            const { first_name, last_name, phone, email } = req.body;
            const profileData = {
                first_name: first_name || '',
                last_name: last_name || '',
                phone: phone || '',
                email: email || req.user.email,
                esAdmin: false,
                created_at: admin.firestore.FieldValue.serverTimestamp()
            };

            console.log("Attempting to write data to Firestore for UID:", uid);
            await db.collection('users').doc(uid).set(profileData, { merge: true });

            console.log(`Successfully created/updated profile for UID: ${uid}`);
            res.status(200).json({ 
                message: 'Perfil guardado exitosamente',
                data: profileData
            });
        } catch (error) {
            console.error("--- Detailed Error in upsertProfile ---");
            console.error("Timestamp:", new Date().toISOString());
            console.error("Firebase Error Code:", error.code);
            console.error("Error Message:", error.message);
            console.error("Stack Trace:", error.stack);
            console.error("-----------------------------------------");

            // Create a more informative error message for the client.
            const clientMessage = `Error del servidor al guardar el perfil. Causa: ${error.message} (Código: ${error.code || 'UNKNOWN'}). Por favor, revise los permisos de la cuenta de servicio y asegúrese de que Firestore esté activado en su proyecto de Firebase.`

            res.status(500).json({
                error: "No se pudo crear el perfil en la base de datos.",
                detailed_error: clientMessage
            });
        }
    },

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
