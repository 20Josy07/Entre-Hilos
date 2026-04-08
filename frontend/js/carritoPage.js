import { API_URL, currentUserToken, EntreHilosUI } from './app.js';
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const cartLoading = document.getElementById('cart-loading');
    const cartEmpty = document.getElementById('cart-empty');
    const cartContainer = document.getElementById('cart-container');
    const cartItems = document.getElementById('cart-items');
    const subtotalDisplay = document.getElementById('subtotal-display');
    const totalDisplay = document.getElementById('total-display');
    const checkoutBtn = document.getElementById('checkout-btn');

    let cartData = { items: [], total: 0 };
    const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

    // 1. Wait for Auth to sync Token
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "/login.html";
            return;
        }
        fetchCart();
    });

    async function fetchCart() {
        if (!currentUserToken) {
            setTimeout(fetchCart, 500);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/cart`, {
                headers: { 'Authorization': `Bearer ${currentUserToken}` }
            });
            const result = await res.json();
            
            cartData = result.data || { items: [], total: 0 };
            renderCart();
        } catch (error) {
            console.error("Error cargando el carrito:", error);
            showEmpty();
        }
    }

    function renderCart() {
        cartLoading.classList.add('hidden');
        if (!cartData.items || cartData.items.length === 0) {
            showEmpty();
            return;
        }

        cartEmpty.classList.add('hidden');
        cartContainer.classList.remove('hidden', 'opacity-0');
        cartContainer.classList.add('animate-fade-in');
        
        cartItems.innerHTML = '';
        cartData.items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = "flex items-center gap-6 p-6 rounded-3xl bg-white border border-tierra-100 shadow-sm animate-fade-in";
            const imageUrl = item.image_url || 'https://images.unsplash.com/photo-1573408301145-b98c46544c64?ixlib=rb-4.0.3&w=150';
            
            itemEl.innerHTML = `
                <img src="${imageUrl}" class="w-24 h-24 rounded-2xl object-cover shadow-sm bg-tierra-50" alt="${item.product_name}">
                <div class="flex-grow">
                    <h3 class="font-bold text-tierra-900 text-lg">${item.product_name}</h3>
                    <p class="text-tierra-500 font-medium">${formatter.format(item.price)}</p>
                </div>
                <div class="flex items-center gap-3">
                    <div class="flex items-center border border-tierra-200 rounded-xl bg-tierra-50">
                        <button class="qty-btn px-3 py-2 text-tierra-600 hover:text-tierra-900 transition-colors font-bold" data-id="${item.product_id}" data-action="decrease">−</button>
                        <span class="w-8 text-center font-bold text-tierra-900">${item.quantity}</span>
                        <button class="qty-btn px-3 py-2 text-tierra-600 hover:text-tierra-900 transition-colors font-bold" data-id="${item.product_id}" data-action="increase">+</button>
                    </div>
                    <button class="remove-btn p-3 text-red-300 hover:text-red-500 transition-colors" data-id="${item.product_id}">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            `;
            cartItems.appendChild(itemEl);
        });

        subtotalDisplay.textContent = formatter.format(cartData.total);
        totalDisplay.textContent = formatter.format(cartData.total);

        // Events
        document.querySelectorAll('.qty-btn').forEach(btn => btn.addEventListener('click', handleQuantity));
        document.querySelectorAll('.remove-btn').forEach(btn => btn.addEventListener('click', (e) => updateQuantity(e.target.closest('button').dataset.id, 0)));
    }

    async function updateQuantity(productId, quantity) {
        try {
            const item = cartData.items.find(i => i.product_id === productId);
            await fetch(`${API_URL}/cart/item`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${currentUserToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    product_id: productId, 
                    quantity,
                    product_name: item.product_name,
                    price: item.price,
                    image_url: item.image_url
                })
            });
            fetchCart();
            document.dispatchEvent(new Event('cartUpdatedEvt'));
        } catch (error) {
            console.error("Error updating quantity:", error);
        }
    }

    function handleQuantity(e) {
        const id = e.target.dataset.id;
        const action = e.target.dataset.action;
        const item = cartData.items.find(i => i.product_id === id);
        let newQty = item.quantity + (action === 'increase' ? 1 : -1);
        if (newQty < 0) newQty = 0;
        updateQuantity(id, newQty);
    }

    function showEmpty() {
        cartLoading.classList.add('hidden');
        cartContainer.classList.add('hidden');
        cartEmpty.classList.remove('hidden');
    }

    let currentStep = 1;

    // STEP 2: PREFILL AND TRANSITION
    async function prefillShippingInfo() {
        const user = auth.currentUser;
        if (!user || user.isAnonymous) return;

        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                if (data.first_name) {
                    document.getElementById('shipping-name').value = `${data.first_name} ${data.last_name || ''}`.trim();
                }
                if (data.phone) document.getElementById('shipping-phone').value = data.phone;
                if (data.address) document.getElementById('shipping-address').value = data.address;
                if (data.city) document.getElementById('shipping-city').value = data.city;
                
                // Show a small feedback if prefilled
                if (data.address) {
                    console.log("Dirección pre-llenada desde el perfil.");
                }
            }
        } catch (err) {
            console.error("Error prefilling shipping info:", err);
        }
    }

    checkoutBtn.addEventListener('click', async () => {
        if (cartData.items.length === 0) return;

        if (currentStep === 1) {
            // Pre-fill before showing Step 2
            await prefillShippingInfo();

            document.getElementById('cart-view').classList.add('hidden');
            document.getElementById('shipping-view').classList.remove('hidden');
            
            document.getElementById('step-2-indicator').classList.remove('opacity-40');
            document.getElementById('step-2-badge').classList.add('bg-tierra-900', 'text-white', 'shadow-lg');
            document.getElementById('step-2-badge').classList.remove('bg-white', 'border-tierra-200', 'text-tierra-400');
            document.getElementById('step-2-indicator').querySelectorAll('span:last-child').forEach(s => {
                s.classList.remove('text-tierra-400');
                s.classList.add('text-tierra-900');
            });
            
            checkoutBtn.textContent = 'Finalizar Pedido';
            currentStep = 2;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // STEP 2: VALIDATE AND SUBMIT
        const shippingInfo = {
            nombre: document.getElementById('shipping-name').value.trim(),
            telefono: document.getElementById('shipping-phone').value.trim(),
            direccion: document.getElementById('shipping-address').value.trim(),
            ciudad: document.getElementById('shipping-city').value.trim(),
            notas: document.getElementById('shipping-notes').value.trim()
        };

        if (!shippingInfo.nombre || !shippingInfo.telefono || !shippingInfo.direccion || !shippingInfo.ciudad) {
            EntreHilosUI.alert("Por favor rellena todos los datos de envío obligatorios.", 'warning');
            return;
        }

        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = `<svg class="w-6 h-6 animate-spin mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Procesando Pedido...`;

        try {
            const res = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${currentUserToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ shipping_info: shippingInfo })
            });

            if (!res.ok) throw new Error("No se pudo crear el pedido");

            // Update user profile with latest address
            const user = auth.currentUser;
            if (user && !user.isAnonymous) {
                await updateDoc(doc(db, "users", user.uid), {
                    address: shippingInfo.direccion,
                    city: shippingInfo.ciudad,
                    phone: shippingInfo.telefono
                });
            }

            // Success View
            document.getElementById('step-2-indicator').parentElement.classList.add('hidden');
            cartContainer.innerHTML = `
                <div class="lg:col-span-3 text-center py-20 bg-white rounded-[3rem] border border-tierra-100 shadow-2xl animate-fade-in relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-10 opacity-5"><svg class="w-64 h-64" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path></svg></div>
                    <div class="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"><svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div>
                    <h2 class="text-4xl font-bold text-tierra-900 mb-6">¡Orden Recibida!</h2>
                    <p class="text-xl text-tierra-600 mb-10 max-w-2xl mx-auto px-6">Tu pedido ha sido registrado con éxito. <br><span class="text-sm font-medium opacity-70 italic text-tierra-500">Pronto recibirás noticias en tu WhatsApp/Email sobre el estado de tu pieza.</span></p>
                    <a href="/pedidos.html" class="inline-flex items-center gap-3 bg-tierra-900 text-white px-12 py-5 rounded-full font-bold text-lg hover:bg-tierra-800 transition-all shadow-xl hover:-translate-y-1">Ver Mis Pedidos <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg></a>
                </div>
            `;
            document.dispatchEvent(new Event('cartUpdatedEvt'));
        } catch (error) {
            console.error("Error Checkout:", error);
            EntreHilosUI.alert("Hubo un problema al registrar tu pedido. Por favor intenta de nuevo.", 'error');
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = "Finalizar Pedido";
        }
    });

    const backToCartBtn = document.getElementById('back-to-cart-btn');
    if (backToCartBtn) {
        backToCartBtn.addEventListener('click', () => {
            currentStep = 1;
            document.getElementById('cart-view').classList.remove('hidden');
            document.getElementById('shipping-view').classList.add('hidden');
            document.getElementById('step-2-indicator').classList.add('opacity-40');
            document.getElementById('step-2-badge').classList.remove('bg-tierra-900', 'text-white', 'shadow-lg');
            document.getElementById('step-2-badge').classList.add('bg-white', 'border-tierra-200', 'text-tierra-400');
            document.getElementById('step-2-indicator').querySelectorAll('span:last-child').forEach(s => {
                s.classList.add('text-tierra-400');
                s.classList.remove('text-tierra-900');
            });
            checkoutBtn.textContent = 'Proceder al Pago Seguro';
        });
    }

    const btnClear = document.getElementById('btn-clear-shipping');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            document.getElementById('shipping-address').value = '';
            document.getElementById('shipping-city').value = '';
            document.getElementById('shipping-notes').value = '';
            console.log("Formulario de dirección limpiado.");
        });
    }
});
