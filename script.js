import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, setDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- ANCORAGEM GLOBAL (Resolve o erro "is not a function") ---
window.handleLogo = (input) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('logo-preview'); // Certifique-se que este ID existe
        if(preview) preview.innerHTML = `<img src="${e.target.result}" style="max-height:100px">`;
        window.logoBase64 = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
};

window.salvarConfig = async () => {
    const user = auth.currentUser;
    if(!user) return alert("Faça login primeiro");
    try {
        await setDoc(doc(db, "configuracoes", user.uid), {
            corLoja: document.getElementById('cor-loja').value,
            logoLoja: window.logoBase64 || "",
            lojaId: user.uid
        }, { merge: true });
        alert("Configurações salvas!");
    } catch (e) { alert("Erro: " + e.message); }
};

window.fazerLogin = () => {
    const e = document.getElementById('email-login').value;
    const s = document.getElementById('pass-login').value;
    signInWithEmailAndPassword(auth, e, s).catch(err => alert("Login inválido"));
};

window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-nav'));
    document.getElementById(id).classList.add('active');
    document.getElementById('btn-'+id)?.classList.add('active-nav');
};

// --- FUNIL DE VENDAS E CRM ---

window.salvarCliente = async () => {
    await addDoc(collection(db, "clientes"), {
        lojaId: auth.currentUser.uid,
        nome: document.getElementById('c-nome').value,
        whats: document.getElementById('c-whats').value,
        veiculo: document.getElementById('c-veiculo').value,
        etapa: 'novo'
    });
    alert("Lead cadastrado!");
};

window.moverEtapa = async (id, novaEtapa) => {
    await updateDoc(doc(db, "clientes", id), { etapa: novaEtapa });
};

// --- MONITOR DE SESSÃO ---
onAuthStateChanged(auth, (user) => {
    const loginScreen = document.getElementById("login-screen");
    if (user) {
        if(loginScreen) loginScreen.classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        document.getElementById("menu-lateral")?.classList.remove("hidden");
        sincronizarTudo(user.uid);
    } else {
        if(loginScreen) document.getElementById("login-form").classList.remove("hidden");
    }
});

function sincronizarTudo(uid) {
    // Escuta Clientes para o Funil
    onSnapshot(query(collection(db, "clientes"), where("lojaId", "==", uid)), (snap) => {
        const colNovo = document.getElementById("f-novo");
        const colNeg = document.getElementById("f-negocio");
        const colGan = document.getElementById("f-ganho");
        if(!colNovo) return;
        
        colNovo.innerHTML = ""; colNeg.innerHTML = ""; colGan.innerHTML = "";
        snap.forEach(d => {
            const c = d.data();
            const card = `<div class="lead-card">
                <b>${c.nome}</b><br>${c.veiculo}<br>
                <button onclick="window.moverEtapa('${d.id}', '${c.etapa === 'novo' ? 'negocio' : 'ganho'}')">Mover >></button>
            </div>`;
            if(c.etapa === 'novo') colNovo.innerHTML += card;
            if(c.etapa === 'negocio') colNeg.innerHTML += card;
            if(c.etapa === 'ganho') colGan.innerHTML += card;
        });
    });
}
