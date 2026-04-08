import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

// Global Registry
// In local dev (localhost) the backend runs on the same server.
// In production (Netlify), requests go to the Railway backend.
const RAILWAY_URL = 'https://COLOCA-TU-URL-DE-RAILWAY-AQUI.up.railway.app';
export const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '/api'
    : `${RAILWAY_URL}/api`;
export let currentUserToken = null;

/**
 * UI Helper for standardized SweetAlert2 notifications
 */
export const EntreHilosUI = {
    alert: (text, icon = 'info', title = '') => {
        return Swal.fire({
            title: title || (icon === 'error' ? '¡Vaya!' : 'Atención'),
            text,
            icon,
            confirmButtonColor: '#673c2a',
            confirmButtonText: 'Entendido',
            customClass: {
                popup: 'rounded-[2rem] border-0 shadow-2xl',
                confirmButton: 'rounded-xl px-8 py-3 font-bold uppercase tracking-wider text-xs'
            }
        });
    },
    confirm: (text, title = '¿Estás seguro?') => {
        return Swal.fire({
            title,
            text,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#673c2a',
            cancelButtonColor: '#eedfc9',
            cancelButtonTextColor: '#673c2a',
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            customClass: {
                popup: 'rounded-[2rem] border-0 shadow-2xl',
                confirmButton: 'rounded-xl px-8 py-3 font-bold uppercase tracking-wider text-xs',
                cancelButton: 'rounded-xl px-8 py-3 font-bold uppercase tracking-wider text-xs text-tierra-900'
            }
        });
    },
    toast: (text, icon = 'success') => {
        const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true
        });
        Toast.fire({ icon, title: text });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const authBtn = document.getElementById('auth-btn');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    const userDropdown = document.getElementById('user-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    const profileBtn = document.getElementById('profile-btn');
    const cartCountEl = document.getElementById('cart-count');

    // Global Auth State Observer
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUserToken = await user.getIdToken();
            if (authBtn) authBtn.classList.add('hidden');
            if (userProfile) userProfile.classList.remove('hidden');
            if (document.getElementById('my-orders-link')) document.getElementById('my-orders-link').classList.remove('hidden');
            
            // Fetch Profile for Initials (pass user object for fallbacks)
            loadUserProfile(user);
            
            // Sync Server Cart 
            loadServerCartData();
        } else {
            currentUserToken = null;
            if (authBtn) authBtn.classList.remove('hidden');
            if (userProfile) userProfile.classList.add('hidden');
            if (document.getElementById('my-orders-link')) document.getElementById('my-orders-link').classList.add('hidden');
            if (cartCountEl) cartCountEl.classList.add('opacity-0');
        }
    });

    async function loadUserProfile(user) {
        if (!userAvatar || !user) return;
        
        let initials = "";
        
        try {
            // 1. Try API Profile (Bypassing Client Security Rules)
            const idToken = await user.getIdToken();
            const response = await fetch('/api/users/profile', {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });

            if (response.ok) {
                const result = await response.json();
                const data = result.data;
                const first = data.first_name || '';
                const last = data.last_name || '';
                if (first) {
                    initials = (first[0] + (last ? last[0] : '')).toUpperCase();
                }
            }
            
            // 2. Auth DisplayName Fallback (In case API is slow or profile incomplete)
            if (!initials && user.displayName) {
                const parts = user.displayName.split(' ');
                initials = (parts[0][0] + (parts.length > 1 ? parts[1][0] : '')).toUpperCase();
            }
            
            // 3. Last Resort: Email
            if (!initials && user.email) {
                initials = user.email[0].toUpperCase();
            }
            
            // 4. Ultimate Fail: "U"
            if (!initials) initials = "U";

            userAvatar.innerHTML = `<span class="tracking-tighter">${initials}</span>`;
            
        } catch (err) {
            console.error("Error loading profile:", err);
            // Default to Email if Firestore fails
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
        
        // Close on click outside
        document.addEventListener('click', () => {
            userDropdown.classList.add('hidden');
        });
    }

    // Logout via Dropdown
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation(); // Avoid closing dropdown before confirm
            
            const result = await EntreHilosUI.confirm("¿Deseas cerrar tu sesión actual?", "Cerrar Sesión");
            if (result.isConfirmed) {
                try {
                    await signOut(auth);
                    window.location.href = "/index.html";
                } catch (err) {
                    console.error("Logout error:", err);
                    window.location.href = "/index.html"; 
                }
            }
        });
    }

    // Helper: Initial Cart count load
    async function loadServerCartData() {
        if (!currentUserToken || !cartCountEl) return;
        try {
            const res = await fetch(`${API_URL}/cart`, {
                headers: { 'Authorization': `Bearer ${currentUserToken}` }
            });
            const result = await res.json();
            
            if (result.data && result.data.items) {
                const totalItems = result.data.items.reduce((acc, current) => acc + current.quantity, 0);
                if (totalItems > 0) {
                    cartCountEl.textContent = totalItems;
                    cartCountEl.classList.remove('opacity-0');
                } else {
                    cartCountEl.classList.add('opacity-0');
                }
            }
        } catch (error) {
            console.error("No se pudo sincronizar el carrito:", error);
        }
    }

    document.addEventListener('cartUpdatedEvt', loadServerCartData);

    // Cart Button Redirection
    const cartBtn = document.getElementById('cart-button');
    if (cartBtn) {
        cartBtn.addEventListener('click', () => {
            if (!currentUserToken) {
                window.location.href = "/login.html";
            } else {
                window.location.href = "/carrito.html";
            }
        });
    }
});
