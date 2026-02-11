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
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    document.getElementById("sidebar").classList.remove("open");
};

window.toggleMenu = () => document.getElementById("sidebar").classList.toggle("open");

// AUTH MONITOR
onAuthStateChanged(auth, (user) => {
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

window.handleLogin = () => {
    const e = document.getElementById("email-login").value;
    const s = document.getElementById("senha-login").value;
    signInWithEmailAndPassword(auth, e, s).catch(err => alert("Erro ao entrar"));
};

window.handleLogout = () => signOut(auth);

// SALVAR VEÍCULO
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

// SYNC REALTIME
function syncData() {
    const q = query(collection(db, "carros"), where("lojaId", "==", auth.currentUser.uid));
    onSnapshot(q, (snap) => {
        const grid = document.getElementById("listaCarros");
        grid.innerHTML = "";
        snap.forEach(d => {
            const c = d.data();
            grid.innerHTML += `
                <div class="card">
                    <div class="card-img" style="background-image:url(${c.fotos[0]})"></div>
                    <div class="card-body">
                        <h4>${c.modelo}</h4>
                        <p style="color:var(--gold)">R$ ${c.preco}</p>
                    </div>
                </div>`;
        });
    });
}
