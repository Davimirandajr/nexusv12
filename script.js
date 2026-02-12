import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

window.veiculoFotos = ["", "", "", ""];
window.logoEmpresa = "";

// LOGIN
window.fazerLogin = () => {
    const e = document.getElementById('email-login').value;
    const s = document.getElementById('pass-login').value;
    signInWithEmailAndPassword(auth, e, s).catch(err => alert("Acesso Negado!"));
};

// NAV
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('btn-'+id).classList.add('active');
};

// IMAGENS
window.handlePhoto = (input, slotId, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.veiculoFotos[index] = e.target.result;
        document.getElementById(slotId).innerHTML = `<img src="${e.target.result}">`;
    };
    reader.readAsDataURL(input.files[0]);
};

// SALVAR
window.salvarVeiculo = async () => {
    await addDoc(collection(db, "carros"), {
        lojaId: auth.currentUser.uid,
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        preco: Number(document.getElementById('preco').value),
        fotos: window.veiculoFotos.filter(f => f !== ""),
        vendedor: document.getElementById('vendedor-carro').value
    });
    alert("Publicado!");
    location.reload();
};

window.salvarConfig = async () => {
    const cor = document.getElementById('cor-loja').value;
    await setDoc(doc(db, "configuracoes", auth.currentUser.uid), {
        corLoja: cor,
        logoLoja: window.logoEmpresa
    }, { merge: true });
    alert("Identidade Salva!");
};

// AUTH MONITOR
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('menu-lateral').classList.remove('hidden');
        sincronizar(user.uid);
    } else {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('auth-status').innerText = "Pronto para acesso";
    }
});

function sincronizar(uid) {
    onSnapshot(doc(db, "configuracoes", uid), (s) => {
        if(s.exists() && s.data().corLoja) {
            document.documentElement.style.setProperty('--primary', s.data().corLoja);
            document.getElementById('cor-loja').value = s.data().corLoja;
        }
    });
}

window.copyPortalLink = () => {
    const link = window.location.href.replace('index.html', '') + "portal.html?loja=" + auth.currentUser.uid;
    navigator.clipboard.writeText(link);
    alert("Link do Portal Copiado!");
};
