import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const ordersList = document.getElementById('orders-list');
const emptyState = document.getElementById('empty-orders');
const API_URL = '/api';

let syncInterval = null;
let firstLoad = true;
let previousStatuses = {};
let lastDataHash = "";

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user || user.isAnonymous) {
            window.location.href = "/login.html";
            return;
        }

        // Start Initial Load and Smart Polling
        startSmartSync(user);
    });
});

async function startSmartSync(user) {
    const fetchAndRender = async () => {
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_URL}/orders/mine`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error(`Status ${res.status}`);

            const result = await res.json();
            const orders = result.data || [];
            
            // Generate a simple hash to check for changes
            const currentHash = JSON.stringify(orders);
            
            if (currentHash !== lastDataHash) {
                if (orders.length === 0) {
                    ordersList.classList.add('hidden');
                    emptyState.classList.remove('hidden');
                } else {
                    ordersList.classList.remove('hidden');
                    emptyState.classList.add('hidden');
                    renderOrders(orders);
                    checkStatusChanges(orders);
                }
                lastDataHash = currentHash;
            }
            firstLoad = false;
        } catch (error) {
            console.error("Error sincronizando pedidos:", error);
            if (firstLoad) {
                ordersList.innerHTML = `<div class="bg-red-50 p-6 rounded-2xl text-red-700 text-center">Error al conectar con la tienda.</div>`;
            }
        }
    };

    // Immediate fetch
    await fetchAndRender();

    // Polling every 10 seconds for "Near Real-Time" feel
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(fetchAndRender, 10000);
}

function checkStatusChanges(orders) {
    orders.forEach(order => {
        const oldStatus = previousStatuses[order.id];
        if (oldStatus && oldStatus !== order.status) {
            if (order.status === 'Entregado') {
                triggerCelebration();
            }
        }
        previousStatuses[order.id] = order.status;
    });
}

function triggerCelebration() {
    const duration = 4 * 1000;
    const end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 7,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#ba7045', '#673c2a', '#e3c5a3']
        });
        confetti({
            particleCount: 7,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#ba7045', '#673c2a', '#e3c5a3']
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}

function getStatusContext(status) {
    const context = {
        'Pendiente': { msg: 'Tu pedido ha llegado al taller. Pronto un artesano lo revisará.', color: 'text-amber-600' },
        'Confirmado': { msg: '¡Pago confirmado! Estamos seleccionando los mejores materiales para tu pieza.', color: 'text-blue-600' },
        'En Preparación': { msg: 'Estamos preparando y empaquetando cuidadosamente tu pedido.', color: 'text-purple-600' },
        'Enviado': { msg: '¡Tu pieza está en camino! Prepara un lugar especial para ella.', color: 'text-tierra-600' },
        'Entregado': { msg: 'Esperamos que esta pieza de autor cuente historias en tu hogar.', color: 'text-green-600' },
        'Cancelado': { msg: 'Este pedido ha sido cancelado.', color: 'text-red-500' }
    };
    return context[status] || { msg: '', color: '' };
}

function renderOrders(orders) {
    const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

    orders.forEach((order, index) => {
        let orderCard = document.querySelector(`[data-order-id="${order.id}"]`);
        const ctx = getStatusContext(order.status);
        
        const steps = [
            { id: 'Pendiente', label: 'Recibido', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' },
            { id: 'Confirmado', label: 'Confirmado', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' },
            { id: 'En Preparación', label: 'Taller', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"></path></svg>' },
            { id: 'Enviado', label: 'En Camino', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>' },
            { id: 'Entregado', label: 'Entregado', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>' }
        ];

        const statusIndex = steps.findIndex(s => s.id === order.status);
        const isCancelled = order.status === 'Cancelado';

        if (orderCard) {
            // SILENT PATCHING: Only update the parts that change
            const statusMsg = orderCard.querySelector('.status-msg');
            const progressBar = orderCard.querySelector('.progress-bar');
            
            if (statusMsg) {
                statusMsg.textContent = ctx.msg;
                statusMsg.className = `status-msg text-xs font-medium ${ctx.color} italic`;
            }
            if (progressBar && !isCancelled) {
                const progressWidth = statusIndex >= 0 ? (statusIndex / (steps.length - 1)) * 100 : 0;
                progressBar.style.width = `${progressWidth}%`;
            }

            // Update status dots
            const dots = orderCard.querySelectorAll('.status-dot');
            dots.forEach((dot, idx) => {
                const isCompleted = idx <= statusIndex;
                const iCurrent = idx === statusIndex;
                const dotContainer = dot.parentElement;
                
                if (isCompleted) {
                    dotContainer.classList.add('bg-tierra-900', 'text-white', 'shadow-lg');
                    dotContainer.classList.remove('bg-white', 'border-2', 'border-tierra-100', 'text-tierra-300');
                } else {
                    dotContainer.classList.remove('bg-tierra-900', 'text-white', 'shadow-lg');
                    dotContainer.classList.add('bg-white', 'border-2', 'border-tierra-100', 'text-tierra-300');
                }

                if (iCurrent) {
                    dotContainer.classList.add('pulse-active', 'scale-110');
                } else {
                    dotContainer.classList.remove('pulse-active', 'scale-110');
                }
            });

            // Ensure correct DOM position (sorting)
            if (ordersList.children[index] !== orderCard) {
                ordersList.insertBefore(orderCard, ordersList.children[index]);
            }
        } else {
            // BUILDING NEW CARD (only if it doesn't exist)
            const newCard = document.createElement('div');
            newCard.setAttribute('data-order-id', order.id);
            newCard.className = `bg-white rounded-[3.5rem] border border-tierra-100 shadow-2xl overflow-hidden animate-fade-in group mb-12 last:mb-0 transition-all duration-500 hover:scale-[1.01]`;
            
            newCard.innerHTML = `
                <div class="px-8 py-10 lg:px-12 lg:py-14">
                    <div class="flex flex-col md:flex-row justify-between items-start gap-8 mb-16">
                        <div class="max-w-xs">
                            <div class="flex items-center gap-3 mb-3">
                                <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-tierra-400">Entre Hilos Oficial</span>
                                <span class="text-xs font-bold text-tierra-900 bg-tierra-50 px-2 py-1 rounded">#${order.id.slice(-8).toUpperCase()}</span>
                            </div>
                            <h3 class="text-3xl font-bold text-tierra-900 mb-2">Seguimiento</h3>
                            <p class="status-msg text-xs font-medium ${ctx.color} italic">${ctx.msg}</p>
                        </div>
                        
                        ${isCancelled ? `
                            <div class="px-6 py-3 rounded-2xl bg-red-50 text-red-700 border border-red-100 flex items-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                <span class="text-xs font-bold uppercase tracking-widest">Orden Cancelada</span>
                            </div>
                        ` : `
                            <div class="flex-grow max-w-2xl w-full">
                                <div class="relative flex justify-between">
                                    <div class="absolute top-5 left-0 w-full h-[2px] bg-tierra-100 -z-0"></div>
                                    <div class="progress-bar absolute top-5 left-0 h-[2px] bg-tierra-600 transition-all duration-1000 ease-in-out -z-0" style="width: ${statusIndex >= 0 ? (statusIndex / (steps.length - 1)) * 100 : 0}%"></div>
                                    
                                    ${steps.map((step, idx) => {
                                        const isCompleted = idx <= statusIndex;
                                        const isCurrent = idx === statusIndex;
                                        return `
                                            <div class="flex flex-col items-center relative z-10 w-1/5">
                                                <div class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${isCompleted ? 'bg-tierra-900 text-white shadow-lg' : 'bg-white border-2 border-tierra-100 text-tierra-300'} ${isCurrent ? 'pulse-active scale-110' : ''}">
                                                    <span class="status-dot">${step.icon}</span>
                                                </div>
                                                <span class="text-[9px] font-bold uppercase tracking-widest mt-3 transition-colors ${isCompleted ? 'text-tierra-900' : 'text-tierra-300'} text-center px-1">
                                                    ${step.label}
                                                </span>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `}
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-10 border-t border-tierra-100/50">
                        <div class="lg:col-span-8">
                            <h4 class="text-[10px] font-bold text-tierra-300 uppercase tracking-widest mb-8">Piezas en este pedido</h4>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                ${order.items.map(item => `
                                    <div class="flex items-center gap-5 p-5 rounded-[2.5rem] bg-tierra-50/30 border border-transparent hover:border-tierra-100 hover:bg-white hover:shadow-2xl transition-all duration-500 group/item">
                                        <div class="relative shrink-0 overflow-hidden rounded-2xl">
                                            <img src="${item.image_url || 'https://via.placeholder.com/100'}" class="w-20 h-20 object-cover group-hover/item:scale-110 transition-transform duration-700 animate-float">
                                            <div class="absolute inset-0 bg-black/5 group-hover/item:bg-transparent transition-colors"></div>
                                            <span class="absolute top-1 right-1 bg-tierra-900 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-white/20">${item.quantity}</span>
                                        </div>
                                        <div class="overflow-hidden">
                                            <p class="font-bold text-tierra-900 truncate text-sm leading-tight mb-1">${item.product_name}</p>
                                            <p class="text-[10px] text-tierra-400 font-bold uppercase tracking-widest">Pieza de Autor</p>
                                            <p class="text-sm font-bold text-tierra-700 mt-2">${formatter.format(item.price)}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="lg:col-span-4">
                            <div class="bg-tierra-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden h-full flex flex-col justify-between">
                                <div class="absolute top-0 right-0 p-8 opacity-[0.03]">
                                    <svg class="w-32 h-32" fill="currentColor" viewBox="0 24 24"><path d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"></path></svg>
                                </div>
                                
                                <div>
                                    <h4 class="text-[10px] font-bold text-tierra-400 uppercase tracking-[0.3em] mb-8">Resumen de Joyas</h4>
                                    <div class="space-y-4 mb-10">
                                        <div class="flex justify-between text-sm opacity-60"><span>Subtotal</span><span>${formatter.format(order.total)}</span></div>
                                        <div class="flex justify-between text-sm opacity-60"><span>Envío Especial</span><span class="text-tierra-300 italic">Bonificado</span></div>
                                        <div class="border-t border-white/10 pt-4 flex justify-between items-center"><span class="font-bold">Total</span><span class="text-3xl font-bold font-serif">${formatter.format(order.total)}</span></div>
                                    </div>
                                </div>

                                <div class="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
                                    <p class="text-[9px] font-bold text-tierra-500 uppercase tracking-widest mb-3">Canal de Notificación</p>
                                    <p class="text-xs font-medium text-tierra-100 truncate">${order.customer_email}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            ordersList.insertBefore(newCard, ordersList.children[index]);
        }
    });

    // Cleanup: Remove orders that no longer exist (optional but good for safety)
    const currentOrderIds = orders.map(o => o.id);
    Array.from(ordersList.children).forEach(child => {
        const id = child.getAttribute('data-order-id');
        if (id && !currentOrderIds.includes(id)) {
            child.remove();
        }
    });
}

function getStatusProgress(status) {
    const levels = {
        'Pendiente': 10,
        'Confirmado': 30,
        'En Preparación': 50,
        'Enviado': 80,
        'Entregado': 100,
        'Cancelado': 0
    };
    return levels[status] || 0;
}

function getStatusColors(status) {
    switch (status) {
        case 'Pendiente': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', dot: '#d97706' };
        case 'Confirmado': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', dot: '#2563eb' };
        case 'En Preparación': return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', dot: '#9333ea' };
        case 'Enviado': return { bg: 'bg-tierra-50', text: 'text-tierra-800', border: 'border-tierra-200', dot: '#804a33' };
        case 'Entregado': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', dot: '#16a34a' };
        case 'Cancelado': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', dot: '#dc2626' };
        default: return { bg: 'bg-tierra-50', text: 'text-tierra-600', border: 'border-tierra-100', dot: '#673c2a' };
    }
}
