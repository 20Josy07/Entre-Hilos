const db = require('../config/database');
const admin = require('firebase-admin');

const productController = {
    // Get all products
    getAllProducts: async (req, res) => {
        try {
            if (!db) throw new Error("Base de datos no inicializada");
            
            const snapshot = await db.collection('products').get();
            const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            res.json({ data: products });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Get a specific product by ID
    getProductById: async (req, res) => {
        try {
            if (!db) throw new Error("Base de datos no inicializada");
            
            const productId = req.params.id;
            const doc = await db.collection('products').doc(productId).get();
            
            if (!doc.exists) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }
            
            res.json({ data: { id: doc.id, ...doc.data() } });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Create a new product
    createProduct: async (req, res) => {
        try {
            if (!db) throw new Error("Base de datos no inicializada");

            const { name, description, price, stock, image_url } = req.body;
            
            if (!name || price === undefined) {
                return res.status(400).json({ error: 'Name and price are required' });
            }

            const newProduct = {
                name,
                description: description || null,
                price: parseFloat(price),
                stock: parseInt(stock) || 0,
                image_url: image_url || null,
                created_at: admin.firestore.FieldValue.serverTimestamp()
            };
            
            const docRef = await db.collection('products').add(newProduct);
            
            res.status(201).json({
                message: 'Product created successfully',
                data: { id: docRef.id, ...newProduct }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Update an existing product
    updateProduct: async (req, res) => {
        try {
            if (!db) throw new Error("Base de datos no inicializada");
            
            const productId = req.params.id;
            const { name, description, price, stock, image_url } = req.body;
            
            if (!productId) {
                return res.status(400).json({ error: 'Product ID is required' });
            }

            const updateData = {};
            if (name !== undefined && name.trim() !== '') updateData.name = name;
            if (description !== undefined) updateData.description = description;
            if (price !== undefined) updateData.price = parseFloat(price);
            if (stock !== undefined) updateData.stock = parseInt(stock);
            if (image_url !== undefined) updateData.image_url = image_url;

            await db.collection('products').doc(productId).update(updateData);
            
            res.status(200).json({ message: 'Product updated successfully', data: { id: productId, ...updateData } });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Delete an existing product
    deleteProduct: async (req, res) => {
        try {
            if (!db) throw new Error("Base de datos no inicializada");
            
            const productId = req.params.id;
            if (!productId) {
                return res.status(400).json({ error: 'Product ID is required' });
            }

            await db.collection('products').doc(productId).delete();
            
            res.status(200).json({ message: 'Product deleted successfully', data: { id: productId } });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = productController;
