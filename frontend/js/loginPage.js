import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { firebaseApp } from './firebase-config.js';

const API_URL = '/.netlify/functions/api';

document.addEventListener('DOMContentLoaded', () => {
    const auth = getAuth(firebaseApp);

    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    const loginError = document.getElementById('login-error');
    const loginErrorContainer = document.getElementById('login-error-container');
    const regError = document.getElementById('reg-error');
    const regErrorContainer = document.getElementById('reg-error-container');

    // --- Tab Switching Logic ---
    tabLogin.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabLogin.classList.add('border-tierra-600', 'text-tierra-900');
        tabLogin.classList.remove('font-medium', 'text-tierra-500', 'border-transparent');
        tabRegister.classList.add('font-medium', 'text-tierra-500', 'border-transparent');
        tabRegister.classList.remove('border-tierra-600', 'text-tierra-900');
    });

    tabRegister.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        tabRegister.classList.add('border-tierra-600', 'text-tierra-900');
        tabRegister.classList.remove('font-medium', 'text-tierra-500', 'border-transparent');
        tabLogin.classList.add('font-medium', 'text-tierra-500', 'border-transparent');
        tabLogin.classList.remove('border-tierra-600', 'text-tierra-900');
    });

    // --- Firebase Auth State Observer ---
    onAuthStateChanged(auth, user => {
        if (user) {
            console.log("User is logged in, redirecting...");
            window.location.href = '/index.html'; 
        }
    });

    // --- Registration Logic ---
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        regErrorContainer.classList.add('hidden');
        
        const firstName = document.getElementById('reg-first-name').value;
        const lastName = document.getElementById('reg-last-name').value;
        const phone = document.getElementById('reg-phone').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        try {
            // 1. Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Get the ID token
            const token = await user.getIdToken();

            // 3. Send data to your backend to create a profile in Firestore
            const response = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    first_name: firstName,
                    last_name: lastName,
                    phone: phone,
                    email: email
                })
            });

            const result = await response.json();

            if (!response.ok) {
                // **CRITICAL CHANGE HERE**
                // Display the detailed error from the backend if available
                const errorMessage = result.detailed_error || result.error || 'Ocurrió un error desconocido en el servidor.';
                throw new Error(errorMessage);
            }
            
            // If everything is OK, redirect (the onAuthStateChanged will handle it)
            console.log("Profile created successfully on backend!");

        } catch (error) {
            console.error("Registration Error:", error);
            let displayMessage = 'Ocurrió un error durante el registro.';
            
            // Use the specific error message from the backend or Firebase Auth
            displayMessage = error.message; 

            regError.textContent = displayMessage;
            regErrorContainer.classList.remove('hidden');
        }
    });

    // --- Login Logic ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginErrorContainer.classList.add('hidden');
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Redirect is handled by onAuthStateChanged
        } catch (error) {
            console.error("Login Error:", error);
            let displayMessage = 'Ocurrió un error al iniciar sesión.';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                displayMessage = 'Correo o contraseña incorrectos.';
            } else if (error.code === 'auth/invalid-email') {
                displayMessage = 'El formato del correo electrónico no es válido.';
            } else {
                displayMessage = 'Error: ' + error.message;
            }
            loginError.textContent = displayMessage;
            loginErrorContainer.classList.remove('hidden');
        }
    });

    // --- Guest Login Logic ---
    document.getElementById('btn-guest-login').addEventListener('click', () => {
        // Just go back to the catalog or main page
        window.location.href = '/catalogo.html';
    });
});
