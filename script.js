import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- FUNÇÃO DA SETA (TOGGLE SIDEBAR) ---
window.toggleSidebar = () => {
    const body = document.body;
    const icon = document.getElementById('sidebar-icon');
    
    body.classList.toggle('collapsed');
    
    if (body.classList.contains('collapsed')) {
        icon.className = 'fa fa-chevron-right';
    } else {
        icon.className = 'fa fa-chevron-left';
    }
};

// --- NAVEGAÇÃO ---
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    document.getElementById('btn-' + id).classList.add('active');
};

// --- AUTH ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        sincronizarCores(user.uid);
    } else {
        document.getElementById('login-form').classList.remove('hidden');
    }
});

window.fazerLogin = () => {
    const e = document.getElementById('email-login').value;
    const s = document.getElementById('pass-login').value;
    signInWithEmailAndPassword(auth, e, s).catch(err => alert("Erro no login"));
};

// --- CORES ---
window.salvarConfig = async () => {
    const cor = document.getElementById('cor-loja').value;
    document.documentElement.style.setProperty('--primary', cor);
    await setDoc(doc(db, "configuracoes", auth.currentUser.uid), { corLoja: cor }, { merge: true });
    alert("Layout atualizado!");
};

function sincronizarCores(uid) {
    onSnapshot(doc(db, "configuracoes", uid), (snap) => {
        if (snap.exists() && snap.data().corLoja) {
            document.documentElement.style.setProperty('--primary', snap.data().corLoja);
            document.getElementById('cor-loja').value = snap.data().corLoja;
        }
    });
}
