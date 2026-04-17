import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
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
            // Step 1: Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Step 2: Get the ID token to authenticate with our backend
            const token = await user.getIdToken();

            // Step 3: Send data to our backend to create the Firestore profile
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
                // If backend fails, show the detailed error
                const errorMessage = result.detailed_error || result.error || 'Ocurrió un error desconocido en el servidor.';
                throw new Error(errorMessage);
            }
            
            // Step 4: Only redirect AFTER the backend profile is created successfully
            console.log("User and profile created successfully! Redirecting...");
            window.location.href = '/index.html';

        } catch (error) {
            console.error("Registration process failed:", error);
            regError.textContent = error.message; // Display the specific error message
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
            // Redirect after successful login
            window.location.href = '/index.html';
        } catch (error) {
            console.error("Login Error:", error);
            let displayMessage = 'Ocurrió un error al iniciar sesión.';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                displayMessage = 'Correo o contraseña incorrectos.';
            } else if (error.code === 'auth/invalid-email') {
                displayMessage = 'El formato del correo electrónico no es válido.';
            } else {
                displayMessage = error.message; // Show other auth errors
            }
            loginError.textContent = displayMessage;
            loginErrorContainer.classList.remove('hidden');
        }
    });

    // --- Guest Login Logic ---
    document.getElementById('btn-guest-login').addEventListener('click', () => {
        window.location.href = '/catalogo.html';
    });
});
