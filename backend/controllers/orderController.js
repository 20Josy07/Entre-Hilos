const db = require('../config/database');
const admin = require('firebase-admin');

const orderController = {
    // Admin: Get all orders
    getAllOrders: async (req, res) => {
        try {
            if (!db) throw new Error("Base de datos no inicializada");
            
            const snapshot = await db.collection('orders').orderBy('created_at', 'desc').get();
            const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            res.json({ data: orders });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // User: Get their own orders from their personal history
    getMyOrders: async (req, res) => {
        try {
            const uid = req.user.uid;
            if (!db) throw new Error("Base de datos no inicializada");
            
            // Fetch from user-specific history subcollection
            const snapshot = await db.collection('users').doc(uid).collection('history')
                .get();
                
            const orders = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => {
                    const timeA = a.created_at ? (a.created_at.seconds || 0) : 0;
                    const timeB = b.created_at ? (b.created_at.seconds || 0) : 0;
                    return timeB - timeA;
                });

            res.json({ data: orders });
        } catch (error) {
            console.error("Error in getMyOrders:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // User: Place an order (Saves to Global and User History)
    createOrder: async (req, res) => {
        try {
            const uid = req.user.uid;
            const email = req.user.email;
            if (!db) throw new Error("Base de datos no inicializada");

            const cartRef = db.collection('carts').doc(uid);
            const cartDoc = await cartRef.get();

            if (!cartDoc.exists || !cartDoc.data().items || cartDoc.data().items.length === 0) {
                return res.status(400).json({ error: 'El carrito está vacío.' });
            }

            const cartData = cartDoc.data();
            const orderId = db.collection('orders').doc().id; // Generate shared ID

            const { shipping_info } = req.body;
            console.log("Creando pedido con info de envío:", shipping_info);
            const newOrder = {
                user_id: uid,
                customer_email: email || 'No registrado',
                items: cartData.items,
                total: cartData.total,
                status: 'Pendiente', 
                shipping_info: shipping_info || null,
                created_at: admin.firestore.FieldValue.serverTimestamp()
            };

            await db.runTransaction(async (transaction) => {
                // 1. Write to Global Orders (for Admin)
                transaction.set(db.collection('orders').doc(orderId), newOrder);
                
                // 2. Write to User History (for Client)
                transaction.set(db.collection('users').doc(uid).collection('history').doc(orderId), newOrder);
                
                // 3. Clear Cart
                transaction.delete(cartRef);
            });

            res.status(201).json({ message: 'Pedido realizado con éxito', orderId });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Admin: Confirm or Update Order Status (Dual Sync)
    updateOrderStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body; 
            const allowedStatuses = ['Pendiente', 'Confirmado', 'En Preparación', 'Enviado', 'Entregado', 'Cancelado'];
            
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({ error: 'Estado de pedido no válido' });
            }

            const orderRef = db.collection('orders').doc(id);
            
            await db.runTransaction(async (transaction) => {
                const orderDoc = await transaction.get(orderRef);
                if (!orderDoc.exists) throw new Error("Pedido no encontrado");
                
                const order = orderDoc.data();
                const uid = order.user_id;
                const currentStatus = order.status;

                // Sync status and timestamps
                const updates = { 
                    status: status, 
                    updated_at: admin.firestore.FieldValue.serverTimestamp() 
                };

                // 1. Handle Stock reduction (once only)
                if (currentStatus === 'Pendiente' && status === 'Confirmado') {
                    for (const item of order.items) {
                        const productRef = db.collection('products').doc(item.product_id);
                        const productDoc = await transaction.get(productRef);
                        if (productDoc.exists) {
                            const currentStock = productDoc.data().stock || 0;
                            const newStock = Math.max(0, currentStock - item.quantity);
                            transaction.update(productRef, { stock: newStock });
                        }
                    }
                }
                
                // 2. Update Global Copy
                transaction.update(orderRef, updates);

                // 3. Update User History Copy (if UID exists)
                if (uid) {
                    const userOrderRef = db.collection('users').doc(uid).collection('history').doc(id);
                    transaction.update(userOrderRef, updates);
                }
            });

            res.json({ message: `Pedido actualizado a ${status} exitosamente` });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = orderController;
