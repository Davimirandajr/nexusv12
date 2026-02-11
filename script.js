import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBOCli1HzoijZ1gcplo_18tKH-5Umb63q8",
    authDomain: "nexus-v12.firebaseapp.com",
    projectId: "nexus-v12",
    storageBucket: "nexus-v12.firebasestorage.app",
    messagingSenderId: "587840382224",
    appId: "1:587840382224:web:61c0f1890c7c395dc77195"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let fotosData = ["","","","",""];

// NAVEGAÇÃO
window.nav = (id) => {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    const btn = document.querySelector(`[onclick="window.nav('${id}')"]`);
    if(btn) btn.classList.add('active');
    document.getElementById("sidebar").classList.remove("open");
};

window.toggleMenu = () => document.getElementById("sidebar").classList.toggle("open");

// AUTH
onAuthStateChanged(auth, (user) => {
    document.getElementById("loader").style.display = "none";
    if (user) {
        document.getElementById("login").classList.remove("active");
        document.getElementById("app").classList.remove("hidden");
        window.nav('showroom');
        syncData();
    } else {
        document.getElementById("login").classList.add("active");
        document.getElementById("app").classList.add("hidden");
    }
});

// SYNC
function syncData() {
    const q = query(collection(db, "carros"), where("lojaId", "==", auth.currentUser.uid));
    onSnapshot(q, (snap) => {
        const list = document.getElementById("listaCarros");
        const l1 = document.getElementById("col-leads");
        list.innerHTML = ""; l1.innerHTML = "";
        snap.forEach(d => {
            const c = d.data();
            const html = `<div style="background:#0a0a0a; padding:10px; border-radius:10px; margin-bottom:10px; border:1px solid #222">
                <img src="${c.fotos[0]}" style="width:100%; border-radius:5px">
                <h4>${c.modelo}</h4>
                <p style="color:var(--gold)">R$ ${c.preco}</p>
            </div>`;
            list.innerHTML += html;
            if(c.status === 'leads') l1.innerHTML += html;
        });
    });
}

// FUNÇÕES GLOBAIS
window.handleLogin = () => signInWithEmailAndPassword(auth, document.getElementById("email-login").value, document.getElementById("senha-login").value);
window.handleLogout = () => signOut(auth);
window.preview = (input, id) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const idx = parseInt(id.replace('p','')) - 1;
        fotosData[idx] = e.target.result;
        document.getElementById(id).innerHTML = `<img src="${e.target.result}">`;
    };
    reader.readAsDataURL(input.files[0]);
};
window.salvarVeiculo = async () => {
    await addDoc(collection(db, "carros"), {
        lojaId: auth.currentUser.uid,
        modelo: document.getElementById("modelo").value,
        preco: document.getElementById("preco").value,
        fotos: fotosData.filter(f => f !== ""),
        status: 'leads'
    });
    alert("Salvo!");
    window.nav('showroom');
};
