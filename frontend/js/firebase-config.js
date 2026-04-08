import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-storage.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCl8uUOMIhkJk2Rpojt6AElQjjxvC0e1bw",
    authDomain: "entre-hilos-c798a.firebaseapp.com",
    projectId: "entre-hilos-c798a",
    storageBucket: "entre-hilos-c798a.firebasestorage.app",
    messagingSenderId: "833894892237",
    appId: "1:833894892237:web:85020432069abf06201f84",
    measurementId: "G-VXK5RFZFSZ"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
