const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../frontend/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Save file to disk in frontend/uploads/
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Solo se permiten archivos de imagen.'));
        }
        cb(null, true);
    }
});

const uploadController = {
    multerMiddleware: upload.single('image'),

    /**
     * Saves the uploaded image to /frontend/uploads/ and returns a public URL.
     */
    uploadImage: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No se recibió ningún archivo.' });
            }

            // Return a path relative to the server root (served as static by Express)
            const publicUrl = `/uploads/${req.file.filename}`;

            res.status(200).json({
                message: 'Imagen subida exitosamente',
                url: publicUrl
            });
        } catch (error) {
            console.error("Error subiendo imagen:", error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = uploadController;
