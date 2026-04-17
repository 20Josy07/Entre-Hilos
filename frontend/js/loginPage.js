import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";

// NOTE: This firebaseConfig MUST be replaced by the user's actual Firebase configuration.
// The placeholder values here will not work.
const firebaseConfig = {
    apiKey: "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    authDomain: "example.firebaseapp.com",
    projectId: "example-project",
    storageBucket: "example.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:xxxxxxxxxxxxxxxxx"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

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
    } else {
        console.error('UI Error: One or more tab elements for login/register are missing.');
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

                if (!response.ok) {
                    let errorMessage = 'Error desconocido del servidor.';
                    try {
                        const result = await response.json();
                        errorMessage = result.detailed_error || result.error || JSON.stringify(result);
                    } catch (e) {
                        errorMessage = await response.text();
                    }
                    throw new Error(errorMessage);
                }
                
                console.log("User and profile created successfully! Redirecting...");
                window.location.href = '/index.html';

            } catch (error) {
                console.error("Registration process failed:", error);
                regError.innerHTML = `<strong>Error:</strong> ${error.message}`;
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

    // --- Guest Login Logic ---
    const guestBtn = document.getElementById('btn-guest-login');
    if (guestBtn) {
        guestBtn.addEventListener('click', () => {
            window.location.href = '/catalogo.html';
        });
    }
});
