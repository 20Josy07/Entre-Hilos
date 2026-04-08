const db = require('../config/database');
const admin = require('firebase-admin');

const cartController = {
    // GET: Retrieve authenticated user's cart
    getCart: async (req, res) => {
        try {
            const uid = req.user.uid;
            if (!db) throw new Error("Database not initialized");

            const cartRef = db.collection('carts').doc(uid);
            const doc = await cartRef.get();

            if (!doc.exists) {
                return res.json({ data: { items: [], total: 0 } });
            }

            const cartData = doc.data();
            
            // Hydrate missing image_urls on the fly for old items
            if (cartData.items && cartData.items.length > 0) {
                const hydratedItems = await Promise.all(cartData.items.map(async (item) => {
                    if (!item.image_url) {
                        try {
                            const productDoc = await db.collection('products').doc(item.product_id).get();
                            if (productDoc.exists) {
                                return { ...item, image_url: productDoc.data().image_url };
                            }
                        } catch (e) {
                            console.error("Hydration error for item", item.product_id, e);
                        }
                    }
                    return item;
                }));
                cartData.items = hydratedItems;
            }

            res.json({ data: cartData });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // POST: Add or Update single item in cart (Handles quantities and addition)
    updateCartItem: async (req, res) => {
        try {
            const uid = req.user.uid;
            if (!db) throw new Error("Database not initialized");

            const { product_id, product_name, price, quantity, image_url } = req.body;

            if (!product_id || quantity === undefined) {
                return res.status(400).json({ error: 'Missing product data or quantity' });
            }

            const cartRef = db.collection('carts').doc(uid);
            let responseData;
            
            // Transaction to safely update array items inside NoSQL Document
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(cartRef);
                let cartData = { items: [], total: 0 };
                
                if (doc.exists) {
                    cartData = doc.data();
                }

                // Check if product belongs in cart
                const itemIndex = cartData.items.findIndex(item => item.product_id === product_id);

                // Fetch product details if image_url is missing to ensure consistency
                let finalImageUrl = image_url;
                if (!finalImageUrl) {
                    const productDoc = await transaction.get(db.collection('products').doc(product_id));
                    if (productDoc.exists) {
                        finalImageUrl = productDoc.data().image_url;
                    }
                }

                if (quantity <= 0) {
                    // Remove if quantity drops to 0 or below
                    if (itemIndex > -1) {
                        cartData.items.splice(itemIndex, 1);
                    }
                } else {
                    if (itemIndex > -1) {
                        // Change quantity directly
                        cartData.items[itemIndex].quantity = quantity;
                        // Backfill image if missing
                        if (!cartData.items[itemIndex].image_url) {
                            cartData.items[itemIndex].image_url = finalImageUrl;
                        }
                    } else {
                        // Push new product object
                        cartData.items.push({
                            product_id,
                            product_name,
                            price: parseFloat(price),
                            quantity: parseInt(quantity),
                            image_url: finalImageUrl || null
                        });
                    }
                }

                // Recalculate running total automatically
                cartData.total = cartData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                cartData.updated_at = admin.firestore.FieldValue.serverTimestamp();

                transaction.set(cartRef, cartData);
                responseData = cartData;
            });

            res.status(200).json({ message: 'Cart updated successfully', data: responseData });
            
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    },

    // DELETE: Wipe the user's cart (Usually triggered at successful Checkout callback)
    clearCart: async (req, res) => {
        try {
            const uid = req.user.uid;
            if (!db) throw new Error("Database not initialized");

            await db.collection('carts').doc(uid).delete();
            res.json({ message: 'Cart has been cleared' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = cartController;
