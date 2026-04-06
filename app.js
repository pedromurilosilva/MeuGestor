import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, onSnapshot, setDoc, getDoc, updateDoc } from "firebase/firestore";


alert("SISTEMA ATUALIZADO (v1.0.3)");
console.log("Versão: 1.0.3");
console.log("DEBUG: Iniciando app.js v1.0.3...");
console.log("URL Atual:", window.location.href);


// 1. Verificação de Protocolo (Diagnóstico)
if (location.protocol === 'file:') {
    alert("ERRO DE AMBIENTE: Você abriu o arquivo index.html diretamente. O Login com Google NÃO funciona assim. \n\nPor favor, use um servidor local (como o Live Server do VS Code) ou hospede o site (Firebase Hosting/Vercel/GitHub Pages).");
    console.error("Firebase Auth requer um servidor (http/https).");
}


// CONFIGURAÇÃO FIREBASE (Substitua pelos seus dados do console.firebase.google.com)
const firebaseConfig = {
    apiKey: "AIzaSyBIHvRzLzmSyhI8LAPutyxxgj6L5Pkk-6M",
    authDomain: "meugestor-c046d.firebaseapp.com",
    projectId: "meugestor-c046d",
    storageBucket: "meugestor-c046d.firebasestorage.app",
    messagingSenderId: "541808413499",
    appId: "1:541808413499:web:3061013642a5c493f6c51e",
    measurementId: "G-6KH8QZK311"
};


console.log("0. Configuração Firebase carregada.");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
console.log("1. Firebase Inicializado.");


// Estados Locais (Serão sincronizados com Firestore)
let transactions = [];
let categories = [];

// Debug
window.DEBUG_APP = { categories, subcategories, defaultCategories, defaultSubcategories };
