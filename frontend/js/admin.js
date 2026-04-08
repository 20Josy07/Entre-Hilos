import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const API_URL = '/api';
let adminToken = null;
let editingId = null;

document.addEventListener('DOMContentLoaded', () => {
    const authGuardContainer = document.getElementById('admin-auth-guard');
    const mainContentContainer = document.getElementById('admin-main-content');
    const profileBtn = document.getElementById('profile-btn');
    const userDropdown = document.getElementById('user-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    const userAvatar = document.getElementById('user-avatar');
    const adminNameEl = document.getElementById('admin-name');
    
    const productForm = document.getElementById('add-product-form');
    const productsTableBody = document.getElementById('products-table-body');
    const ordersTableBody = document.getElementById('orders-table-body');
    const submitBtn = document.getElementById('submit-btn');

    const menuInventory = document.getElementById('menu-inventory');
    const menuOrders = document.getElementById('menu-orders');
    const sectionInventory = document.getElementById('section-inventory');
    const sectionOrders = document.getElementById('section-orders');
    const pendingOrdersBadge = document.getElementById('pending-orders-badge');

    function switchTab(tab) {
        if (tab === 'inventory') {
            sectionInventory.classList.remove('hidden');
            sectionOrders.classList.add('hidden');
            menuInventory.classList.add('bg-white/10', 'border-white/10');
            menuInventory.classList.remove('text-white/60');
            menuOrders.classList.remove('bg-white/10', 'border-white/10');
            menuOrders.classList.add('text-white/60');
            document.querySelector('header h1').textContent = 'Inventario Central';
        } else {
            sectionInventory.classList.add('hidden');
            sectionOrders.classList.remove('hidden');
            menuOrders.classList.add('bg-white/10', 'border-white/10');
            menuOrders.classList.remove('text-white/60');
            menuInventory.classList.remove('bg-white/10', 'border-white/10');
            menuInventory.classList.add('text-white/60');
            document.querySelector('header h1').textContent = 'Gestión de Pedidos';
            loadOrders();
        }
    }

    menuInventory.addEventListener('click', (e) => { e.preventDefault(); switchTab('inventory'); });
    menuOrders.addEventListener('click', (e) => { e.preventDefault(); switchTab('orders'); });

    // 1. AUTHENTICATION GUARD & PROFILE
    onAuthStateChanged(auth, async (user) => {
        if (!user || user.isAnonymous) {
            window.location.href = "/login.html";
            return;
        }

        try {
            // VERIFICACIÓN DE ROL: Consultar via Backend (bypassa Client Security Rules)
            adminToken = await user.getIdToken();
            const response = await fetch('/api/users/profile', {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });

            let userData = null;
            if (response.ok) {
                const result = await response.json();
                userData = result.data;
            }

            if (!userData || userData.esAdmin !== true) {
                // No es administrador: Cerrar sesión y expulsar
                console.warn("Acceso no autorizado intentado por:", user.email);
                
                await Swal.fire({
                    title: 'Acceso Denegado',
                    text: 'No tienes permisos de administrador para ingresar a esta sección.',
                    icon: 'error',
                    confirmButtonColor: '#673c2a',
                    confirmButtonText: 'Entendido'
                });
                
                await signOut(auth);
                window.location.href = "/index.html";
                return;
            }
            
            // Si es administrador, continuar
            authGuardContainer.classList.add('hidden');
            mainContentContainer.classList.remove('hidden');
            
            renderUserProfile(user, userData);
            loadProducts();
        } catch (error) {
            console.error("Error en verificación de admin:", error);
            window.location.href = "/login.html";
        }
    });

    /**
     * Renderiza el avatar e información del perfil admin usando datos ya cargados
     */
    function renderUserProfile(user, userData) {
        if (!userAvatar || !user) return;
        let initials = "";

        try {
            // 1. Usar datos de Firestore
            if (userData) {
                const firstName = userData.first_name || '';
                const lastName = userData.last_name || '';
                
                if (firstName) {
                    if (adminNameEl) adminNameEl.textContent = `${firstName} ${lastName}`.trim();
                    initials = (firstName[0] + (lastName ? lastName[0] : '')).toUpperCase();
                }
            }
            
            // 2. Auth DisplayName Fallback
            if (!initials && user.displayName) {
                const parts = user.displayName.split(' ');
                initials = (parts[0][0] + (parts.length > 1 ? parts[1][0] : '')).toUpperCase();
                if (adminNameEl) adminNameEl.textContent = user.displayName;
            }

            // 3. Email Fallback
            if (!initials && user.email) {
                initials = user.email[0].toUpperCase();
                if (adminNameEl) adminNameEl.textContent = user.email.split('@')[0];
            }

            if (!initials) initials = "A"; // Default Admin

            userAvatar.innerHTML = `<span class="tracking-tighter">${initials}</span>`;
            
        } catch (err) {
            console.error("Error rendering admin profile:", err);
            if (user.email) {
                userAvatar.innerHTML = `<span class="tracking-tighter">${user.email[0].toUpperCase()}</span>`;
            }
        }
    }

    // Dropdown Control
    if (profileBtn && userDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });
        document.addEventListener('click', () => userDropdown.classList.add('hidden'));
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const result = await Swal.fire({
                title: '¿Cerrar Sesión?',
                text: "Estás por salir del panel administrativo.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#673c2a',
                cancelButtonColor: '#eedfc9',
                cancelButtonTextColor: '#673c2a',
                confirmButtonText: 'Sí, salir',
                cancelButtonText: 'Cancelar',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-[2rem] border-0 shadow-2xl',
                    confirmButton: 'rounded-xl px-8 py-3 font-bold uppercase tracking-wider text-xs',
                    cancelButton: 'rounded-xl px-8 py-3 font-bold uppercase tracking-wider text-xs text-tierra-900'
                }
            });

            if (result.isConfirmed) {
                try {
                    await signOut(auth);
                    window.location.href = "/index.html";
                } catch (error) {
                    console.error("Admin logout error:", error);
                    window.location.href = "/index.html";
                }
            }
        });
    }

    // ====== UI HELPERS =======
    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
        
        toast.className = `flex items-center w-full max-w-xs p-4 text-white ${bgColor} rounded-xl shadow-lg transform transition-all duration-300 translate-x-full opacity-0`;
        toast.innerHTML = `<div class="ml-3 text-sm font-bold tracking-wide">${message}</div>`;
        toastContainer.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
            toast.classList.add('translate-x-0', 'opacity-100');
        });

        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ====== PRODUCTS LOGIC =======
    window.loadProducts = async () => {
        try {
            const response = await fetch(`${API_URL}/products`);
            const { data: products } = await response.json();
            renderProductsTable(products);
        } catch (error) {
            showToast('Fallo al cargar productos', 'error');
        }
    };

    function renderProductsTable(products) {
        productsTableBody.innerHTML = '';
        const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

        products.forEach(product => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-tierra-50/50 transition-colors";
            tr.innerHTML = `
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <img class="h-10 w-10 rounded-xl object-cover mr-4 shadow-sm border border-tierra-100" src="${product.image_url || 'https://via.placeholder.com/50'}">
                        <div class="flex flex-col">
                            <span class="font-bold text-tierra-900">${product.name}</span>
                            <span class="text-[10px] text-tierra-500 uppercase tracking-widest">Colección EH</span>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 font-bold text-tierra-800">${formatter.format(product.price)}</td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${product.stock > 0 ? 'bg-tierra-200 text-tierra-800' : 'bg-red-100 text-red-800'} shadow-sm">
                        ${product.stock} disp.
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <button class="edit-btn p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-all mr-2" data-id="${product.id}" data-raw='${JSON.stringify(product).replace(/'/g, "&apos;")}' title="Editar">
                        <svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button class="delete-btn p-2 text-red-500 hover:bg-red-100 rounded-lg transition-all" data-id="${product.id}" title="Borrar">
                        <svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            `;
            productsTableBody.appendChild(tr);
        });

        productsTableBody.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => deleteProduct(btn.dataset.id)));
        productsTableBody.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => editProduct(JSON.parse(btn.dataset.raw))));
    }

    async function deleteProduct(id) {
        if (!confirm('¿Deseas eliminar esta pieza?')) return;
        try {
            await fetch(`${API_URL}/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            showToast('Producto eliminado');
            loadProducts();
        } catch (error) { showToast('Error al borrar', 'error'); }
    }

    function editProduct(product) {
        editingId = product.id;
        document.getElementById('name').value = product.name;
        document.getElementById('description').value = product.description || '';
        document.getElementById('price').value = product.price;
        document.getElementById('stock').value = product.stock;
        document.getElementById('image_url').value = product.image_url || '';
        submitBtn.textContent = 'Actualizar Pieza';
        document.getElementById('cancel-edit-btn').classList.remove('hidden');
    }

    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            editingId = null;
            productForm.reset();
            pendingBase64 = null;
            document.getElementById('image-preview').classList.add('hidden');
            document.getElementById('file-label').textContent = 'Haz clic o arrastra una imagen';
            submitBtn.textContent = 'Crear Producto';
            cancelBtn.classList.add('hidden');
        });
    }

    // Image Preview Logic + Base64 Conversion
    const imageFileInput = document.getElementById('image-file');
    const imagePreviewContainer = document.getElementById('image-preview');
    const fileLabel = document.getElementById('file-label');
    let pendingBase64 = null; // Stores the compressed base64 ready to save

    /**
     * Compresses an image File using Canvas and returns a base64 JPEG string.
     * Max dimension: 800px. Quality: 80%.
     */
    function compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const MAX = 800;
                    let { width, height } = img;
                    if (width > MAX || height > MAX) {
                        if (width > height) { height = (height * MAX) / width; width = MAX; }
                        else { width = (width * MAX) / height; height = MAX; }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    }

    if (imageFileInput) {
        imageFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                fileLabel.textContent = 'Comprimiendo...';
                try {
                    pendingBase64 = await compressImage(file);
                    fileLabel.textContent = file.name;
                    imagePreviewContainer.querySelector('img').src = pendingBase64;
                    imagePreviewContainer.classList.remove('hidden');
                } catch {
                    fileLabel.textContent = 'Error al leer imagen';
                    pendingBase64 = null;
                }
            }
        });
    }

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        try {
            // If a file was selected, use its base64. Otherwise fall back to URL field.
            const imageUrl = pendingBase64 || document.getElementById('image_url').value.trim();

            if (!imageUrl) {
                throw new Error("Debes proporcionar una URL o subir una imagen.");
            }

            const payload = {
                name: document.getElementById('name').value,
                description: document.getElementById('description').value,
                price: parseFloat(document.getElementById('price').value),
                stock: parseInt(document.getElementById('stock').value),
                image_url: imageUrl
            };

            const url = editingId ? `${API_URL}/products/${editingId}` : `${API_URL}/products`;
            const method = editingId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Fallo al conectar con el servidor");

            showToast(editingId ? 'Pieza actualizada' : 'Nueva pieza creada');
            productForm.reset();
            pendingBase64 = null;
            imagePreviewContainer.classList.add('hidden');
            fileLabel.textContent = 'Haz clic o arrastra una imagen';
            editingId = null;
            submitBtn.textContent = 'Crear Producto';
            if(cancelBtn) cancelBtn.classList.add('hidden');
            loadProducts();
        } catch (error) { 
            console.error(error);
            showToast(error.message || 'Error al guardar', 'error'); 
        } finally {
            submitBtn.disabled = false;
        }
    });

    // ====== ORDERS LOGIC =======
    let expandedOrderId = null;

    window.loadOrders = async (silent = false) => {
        try {
            if (!silent) {
                ordersTableBody.innerHTML = '<tr><td colspan="5" class="p-10 text-center text-tierra-400">Consultando pedidos...</td></tr>';
            }
            const res = await fetch(`${API_URL}/orders`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            const { data: orders } = await res.json();
            renderOrdersTable(orders);
            
            // Update badge (already implemented)
            const pending = orders.filter(o => o.status === 'Pendiente').length;
            if (pending > 0) {
                pendingOrdersBadge.textContent = pending;
                pendingOrdersBadge.classList.remove('hidden');
            } else {
                pendingOrdersBadge.classList.add('hidden');
            }
        } catch (error) { 
            if (!silent) showToast('Error al cargar pedidos', 'error'); 
        }
    };

    function renderOrdersTable(orders) {
        ordersTableBody.innerHTML = '';
        const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

        if (orders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="5" class="p-10 text-center text-tierra-500">Aún no hay pedidos registrados.</td></tr>';
            return;
        }

        orders.forEach(order => {
            const date = order.created_at ? new Date(order.created_at._seconds * 1000).toLocaleDateString() : 'Hoy';
            const tr = document.createElement('tr');
            const isPending = order.status === 'Pendiente';
            const isExpanded = expandedOrderId === order.id;
            
            tr.className = `cursor-pointer transition-all hover:bg-tierra-50/50 ${isExpanded ? 'bg-tierra-50 shadow-inner' : ''}`;
            tr.innerHTML = `
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <svg class="w-4 h-4 text-tierra-400 transform transition-transform ${isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                        <div>
                            <span class="block font-bold text-tierra-900 uppercase">#${order.id.slice(-6)}</span>
                            <span class="text-[10px] text-tierra-400 font-medium">${date}</span>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="text-xs font-medium text-tierra-600">${order.items.length} piezas</span>
                </td>
                <td class="px-6 py-4 font-bold text-tierra-800">${formatter.format(order.total)}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isPending ? 'bg-amber-100 text-amber-700' : (order.status === 'Confirmado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}">
                        ${order.status}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <span class="text-xs text-tierra-400 underline hover:text-tierra-700">${isExpanded ? 'Cerrar' : 'Ver Detalle'}</span>
                </td>
            `;

            tr.addEventListener('click', () => {
                expandedOrderId = isExpanded ? null : order.id;
                renderOrdersTable(orders); // Re-render to show/hide detail
            });

            ordersTableBody.appendChild(tr);

            // DETAIL ROW (Expansion)
            if (isExpanded) {
                const detailTr = document.createElement('tr');
                detailTr.className = "bg-tierra-50/30";
                detailTr.innerHTML = `
                    <td colspan="5" class="px-8 py-6 border-b border-tierra-100/50 animate-fade-in">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <!-- Left: Items Info -->
                            <div>
                                <h4 class="text-xs font-bold text-tierra-400 uppercase tracking-widest mb-4">Artículos del Pedido</h4>
                                <div class="space-y-3">
                                    ${order.items.map(item => `
                                        <div class="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-tierra-50">
                                            <img src="${item.image_url || 'https://via.placeholder.com/60'}" class="w-12 h-12 object-cover rounded-xl shadow-inner">
                                            <div class="flex-grow">
                                                <p class="text-sm font-bold text-tierra-900">${item.product_name}</p>
                                                <p class="text-[10px] text-tierra-500">${formatter.format(item.price)} x ${item.quantity}</p>
                                            </div>
                                            <span class="text-sm font-bold text-tierra-800">${formatter.format(item.price * item.quantity)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <!-- Right: Customer & Actions -->
                            <div class="flex flex-col justify-between pt-4 border-t lg:border-t-0 lg:border-l border-tierra-100 lg:pl-8">
                                <div>
                                    <h4 class="text-xs font-bold text-tierra-400 uppercase tracking-widest mb-2">Información de Contacto</h4>
                                    <p class="text-tierra-900 font-medium flex items-center gap-2">
                                        <svg class="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                        ${order.customer_email}
                                    </p>
                                    <p class="text-[10px] text-tierra-400 mt-1">ID Usuario: ${order.user_id}</p>
                                    
                                    ${order.shipping_info ? `
                                        <div class="mt-6 p-4 bg-white rounded-2xl border border-tierra-100 shadow-sm">
                                            <h5 class="text-[10px] font-bold text-tierra-600 uppercase tracking-widest mb-3">Dirección de Envío</h5>
                                            <p class="text-sm font-bold text-tierra-900">${order.shipping_info.nombre}</p>
                                            <p class="text-xs text-tierra-700 mt-1">${order.shipping_info.direccion}</p>
                                            <p class="text-xs text-tierra-700">${order.shipping_info.ciudad}</p>
                                            <div class="mt-3 pt-3 border-t border-tierra-50 flex items-center gap-2">
                                                <a href="https://wa.me/${order.shipping_info.telefono.toString().replace(/\s+/g, '')}" target="_blank" class="flex items-center gap-2 group decoration-green-200 hover:text-green-600 transition-colors">
                                                    <svg class="w-4 h-4 text-green-500 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412 0 6.556-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.143c1.559.925 3.125 1.411 4.717 1.412 5.511 0 9.993-4.482 9.993-9.992 0-2.667-1.038-5.174-2.924-7.061-1.886-1.887-4.39-2.924-7.062-2.924-5.51 0-9.993 4.482-9.993 9.992 0 1.762.459 3.44 1.329 4.892l-.934 3.41 3.49-.916h.383zm11.367-5.1c-.247-.124-1.464-.722-1.692-.804-.228-.082-.394-.124-.559.124-.166.247-.641.804-.785.969-.145.164-.29.185-.537.062-.247-.124-1.045-.385-1.99-1.23-.735-.656-1.232-1.465-1.378-1.712-.145-.247-.015-.38.11-.502.112-.11.247-.29.37-.434.124-.145.165-.247.247-.412.082-.164.042-.31-.02-.434-.062-.124-.559-1.348-.765-1.841-.2-.482-.404-.417-.559-.424l-.475-.008c-.165 0-.434.062-.661.31-.228.247-.868.846-.868 2.064 0 1.219.889 2.396 1.012 2.56.124.165 1.747 2.668 4.233 3.743 2.486 1.074 2.486.716 2.939.674.453-.041 1.464-.598 1.671-1.176.206-.577.206-1.071.144-1.176-.061-.103-.227-.165-.475-.29z"/></svg>
                                                    <span class="text-xs font-bold text-tierra-800 underline decoration-green-200 underline-offset-4">${order.shipping_info.telefono}</span>
                                                </a>
                                            </div>
                                            ${order.shipping_info.notes ? `<p class="mt-2 text-[10px] text-amber-600 italic">Nota: ${order.shipping_info.notes}</p>` : ''}
                                        </div>
                                    ` : `
                                        <p class="mt-4 text-xs text-tierra-400 italic">No hay datos de envío disponibles.</p>
                                    `}
                                </div>
                                
                                <div class="mt-8">
                                    <h4 class="text-xs font-bold text-tierra-400 uppercase tracking-widest mb-4">Actualizar Estado del Pedido</h4>
                                    <div class="flex flex-wrap gap-2">
                                        ${['Confirmado', 'En Preparación', 'Enviado', 'Entregado', 'Cancelado'].map(status => {
                                            const isActive = order.status === status;
                                            const colors = getStatusColors(status);
                                            return `
                                                <button class="status-update-btn flex-1 min-w-[120px] px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border 
                                                    ${isActive ? `${colors.bg} ${colors.text} ${colors.border}` : 'bg-white text-tierra-400 border-tierra-200 hover:border-tierra-400'}"
                                                    data-id="${order.id}" data-status="${status}">
                                                    ${status}
                                                </button>
                                            `;
                                        }).join('')}
                                    </div>
                                    <p class="text-[10px] text-tierra-400 mt-4 italic">
                                        * Al marcar como <span class="font-bold underline">Confirmado</span> por primera vez, se descontará automáticamente el stock del catálogo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </td>
                `;
                ordersTableBody.appendChild(detailTr);
                
                // Add event listeners within the expanded panel
                detailTr.querySelectorAll('.status-update-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        updateOrderStatus(order.id, btn.dataset.status);
                    });
                });
            }
        });
    }

    // Helper for status colors (matching the user page for consistency)
    function getStatusColors(status) {
        switch (status) {
            case 'Pendiente': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' };
            case 'Confirmado': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' };
            case 'En Preparación': return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' };
            case 'Enviado': return { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' };
            case 'Entregado': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' };
            case 'Cancelado': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' };
            default: return { bg: 'bg-tierra-50', text: 'text-tierra-600', border: 'border-tierra-100' };
        }
    }

    async function updateOrderStatus(id, status) {
        if (status === 'Confirmado' && !confirm('¿Deseas confirmar este pedido? Esto descontará el stock (si el pedido estaba pendiente).')) return;
        if (status === 'Cancelado' && !confirm('¿Estás seguro de cancelar este pedido?')) return;
        
        try {
            const res = await fetch(`${API_URL}/orders/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
                body: JSON.stringify({ status })
            });
            
            if (!res.ok) throw new Error("Fallo al actualizar el estado");
            
            showToast(`Pedido actualizado a: ${status}`);
            loadOrders(true); // Silent reload to keep the order expanded
            loadProducts(); 
        } catch (error) { 
            console.error(error);
            showToast('Error al actualizar pedido', 'error'); 
        }
    }

    // Refresh loaders globally
    window.loadProducts = loadProducts;
    window.loadOrders = loadOrders;
});
