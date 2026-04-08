import { auth } from './firebase-config.js';
import { EntreHilosUI } from './app.js';
import { signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    // Tabs
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Forms Inputs
    const loginEmail = document.getElementById('login-email');
    const loginPass = document.getElementById('login-password');
    const regFirstName = document.getElementById('reg-first-name');
    const regLastName = document.getElementById('reg-last-name');
    const regPhone = document.getElementById('reg-phone');
    const regEmail = document.getElementById('reg-email');
    const regPass = document.getElementById('reg-password');

    // Misc
    const btnGuestLogin = document.getElementById('btn-guest-login');
    const loginErrorCont = document.getElementById('login-error-container');
    const loginErrorText = document.getElementById('login-error');
    const regErrorCont = document.getElementById('reg-error-container');
    const regErrorText = document.getElementById('reg-error');

    let isProcessing = false;

    // Auth state check - Redirect if logged in (avoid during registration/guest login)
    onAuthStateChanged(auth, (user) => {
        if (user && !isProcessing) {
            window.location.href = "/catalogo.html";
        }
    });

    // Tab Switching Logic
    tabLogin.addEventListener('click', () => {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabLogin.classList.add('border-tierra-600', 'text-tierra-900');
        tabLogin.classList.remove('text-tierra-500');
        tabRegister.classList.remove('border-tierra-600', 'text-tierra-900');
        tabRegister.classList.add('border-transparent', 'text-tierra-500');
    });

    tabRegister.addEventListener('click', () => {
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        tabRegister.classList.add('border-tierra-600', 'text-tierra-900');
        tabRegister.classList.remove('text-tierra-500');
        tabLogin.classList.remove('border-tierra-600', 'text-tierra-900');
        tabLogin.classList.add('border-transparent', 'text-tierra-500');
    });

    // Login Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = loginForm.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Ingresando...';
        loginErrorCont.classList.add('hidden');

        isProcessing = true;
        try {
            await signInWithEmailAndPassword(auth, loginEmail.value, loginPass.value);
            window.location.href = "/catalogo.html";
        } catch (error) {
            console.error(error);
            loginErrorText.textContent = "Error al ingresar: " + (error.code === 'auth/invalid-credential' ? "Correo o contraseña incorrectos" : error.message);
            loginErrorCont.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = 'Entrar';
        }
    });

    // Register Submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = registerForm.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Creando Cuenta...';
        regErrorCont.classList.add('hidden');

        isProcessing = true;
        try {
            // 1. Create User
            const userCredential = await createUserWithEmailAndPassword(auth, regEmail.value, regPass.value);
            const user = userCredential.user;

            // 2. Save Profile Data to Firestore via Backend Bridge (bypassing Client Security Rules)
            const idToken = await user.getIdToken();
            const profileResponse = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    first_name: regFirstName.value.trim(),
                    last_name: regLastName.value.trim(),
                    phone: regPhone.value.trim(),
                    email: regEmail.value.trim()
                })
            });

            if (!profileResponse.ok) {
                throw new Error("No se pudo crear el perfil en la base de datos.");
            }

            // 3. Manual Redirect after API success
            window.location.href = "/catalogo.html";
        } catch (error) {
            isProcessing = false;
            console.error(error);
            regErrorText.textContent = "Error al registrar: " + error.message;
            regErrorCont.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = 'Crear Cuenta';
        }
    });

    // Guest Login
    btnGuestLogin.addEventListener('click', async () => {
        isProcessing = true;
        try {
            btnGuestLogin.disabled = true;
            btnGuestLogin.textContent = 'Conectando Seguro...';
            await signInAnonymously(auth);
            window.location.href = "/catalogo.html";
        } catch (error) {
            isProcessing = false;
            EntreHilosUI.alert("No se pudo iniciar sesión como invitado: " + error.message, 'error');
            btnGuestLogin.disabled = false;
            btnGuestLogin.textContent = 'Continuar comprando como Invitado';
        }
    });
});
