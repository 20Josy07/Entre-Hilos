const db = require('../config/database');
const admin = require('firebase-admin');

const userController = {
    /**
     * Creates or updates a user profile.
     * Used during registration to bypass Firestore Security Rules.
     */
    upsertProfile: async (req, res) => {
        try {
            if (!db) throw new Error("Base de datos no inicializada");
            
            const uid = req.user.uid; // From verifyToken middleware
            const { first_name, last_name, phone, email } = req.body;

            const profileData = {
                first_name: first_name || '',
                last_name: last_name || '',
                phone: phone || '',
                email: email || req.user.email,
                esAdmin: false, // Default role for safety
                created_at: admin.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('users').doc(uid).set(profileData, { merge: true });

            res.status(200).json({ 
                message: 'Perfil guardado exitosamente',
                data: profileData
            });
        } catch (error) {
            console.error("Error en upsertProfile:", error);
            res.status(500).json({ error: error.message });
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
