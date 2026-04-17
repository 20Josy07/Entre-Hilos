import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { app as firebaseApp } from './firebase-config.js';

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
    if (tabLogin && tabRegister && loginForm && registerForm) {
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
    }

    // --- Registration Logic ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            regErrorContainer.classList.add('hidden');
            
            const firstName = document.getElementById('reg-first-name').value;
            const lastName = document.getElementById('reg-last-name').value;
            const phone = document.getElementById('reg-phone').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                const token = await user.getIdToken();

                const response = await fetch(`${API_URL}/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        first_name: firstName, last_name: lastName, phone: phone, email: email
                    })
                });

                if (!response.ok) {
                    // **FIXED: ROBUST ERROR HANDLING**
                    // Read the body as text ONCE to avoid the 'body stream already read' error.
                    const errorBody = await response.text();
                    let errorMessage = errorBody; // Default to the raw text body
                    try {
                        // Try to parse it as JSON to find a more specific error message.
                        const result = JSON.parse(errorBody);
                        errorMessage = result.detailed_error || result.error || JSON.stringify(result);
                    } catch (e) {
                        // If parsing fails, it wasn't JSON. The raw text in errorMessage is correct.
                        console.log("Error response was not JSON, using raw text.");
                    }
                    throw new Error(errorMessage);
                }
                
                window.location.href = '/index.html';

            } catch (error) {
                console.error("Registration process failed:", error);
                regError.innerHTML = `<strong>Error:</strong><br>${error.message}`;
                regErrorContainer.classList.remove('hidden');
            }
        });
    }

    // --- Login Logic ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginErrorContainer.classList.add('hidden');
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                await signInWithEmailAndPassword(auth, email, password);
                window.location.href = '/index.html';
            } catch (error) {
                console.error("Login Error:", error);
                let displayMessage = 'Ocurrió un error al iniciar sesión.';
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    displayMessage = 'Correo o contraseña incorrectos.';
                } else {
                    displayMessage = error.message;
                }
                loginError.textContent = displayMessage;
                loginErrorContainer.classList.remove('hidden');
            }
        });
    }
});
