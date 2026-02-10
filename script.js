import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Configuração do Projeto (Nexus V12)
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

// Variáveis de Estado
let carrosLocais = [];
let clientesLocais = [];

/* ============================================================
   AUTENTICAÇÃO (O segredo está no "window.funcao")
   Isso permite que o botão do HTML encontre a função no módulo.
============================================================ */

window.handleLogin = async () => {
    const email = document.getElementById("email-login").value;
    const senha = document.getElementById("senha-login").value;

    if (!email || !senha) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, senha);
    } catch (e) {
        console.error("Erro ao logar:", e.code);
        alert("Acesso Negado: Verifique seu e-mail e senha.");
    }
};

window.handleLogout = () => signOut(auth);

// Monitor de estado do usuário
onAuthStateChanged(auth, (user) => {
    const loginSec = document.getElementById("login");
    const appSec = document.getElementById("app");
    const loader = document.getElementById('loader');

    if (user) {
        loginSec.classList.add("hidden");
        appSec.classList.remove("hidden");
        iniciarSincronizacao();
    } else {
        loginSec.classList.remove("hidden");
        appSec.classList.add("hidden");
    }
    if (loader) setTimeout(() => loader.style.display = 'none', 800);
});

/* ============================================================
   SINCRONIZAÇÃO EM TEMPO REAL (FIRESTORE)
============================================================ */

function iniciarSincronizacao() {
    // Escutar Carros
    onSnapshot(query(collection(db, "carros"), orderBy("data", "desc")), (snap) => {
        carrosLocais = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderShowroom();
        updateStats();
    });

    // Escutar Leads/Clientes
    onSnapshot(query(collection(db, "clientes"), orderBy("data", "desc")), (snap) => {
        clientesLocais = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderCRM();
    });
}

/* ============================================================
   AÇÕES DO SISTEMA (VEÍCULOS E CLIENTES)
============================================================ */

window.salvarVeiculo = async () => {
    const modelo = document.getElementById("modelo").value;
    const preco = parseFloat(document.getElementById("preco").value);
    const status = document.getElementById("status").value;

    if (!modelo || isNaN(preco)) return alert("Dados inválidos!");

    const f1 = document.getElementById("fotoFrente").files[0];
    let fotoBase64 = "";
    if (f1) fotoBase64 = await comprimirImagem(f1);

    try {
        await addDoc(collection(db, "carros"), {
            modelo,
            preco,
            status,
            fotos: [fotoBase64],
            data: new Date().toISOString()
        });
        alert("Veículo cadastrado com sucesso!");
        window.nav('showroom');
        limparFormVeiculo();
    } catch (e) { alert("Erro ao salvar: " + e.message); }
};

window.removerCarro = async (id) => {
    if (confirm("Deseja realmente excluir este veículo?")) {
        await deleteDoc(doc(db, "carros", id));
    }
};

window.salvarCliente = async () => {
    const nome = document.getElementById("c-nome").value;
    const fone = document.getElementById("c-fone").value;

    if (!nome || !fone) return alert("Preencha o nome e o WhatsApp!");

    try {
        await addDoc(collection(db, "clientes"), {
            nome,
            fone,
            data: new Date().toLocaleDateString('pt-BR'),
            timestamp: new Date().toISOString()
        });
        alert("Lead criado!");
        document.getElementById("c-nome").value = "";
        document.getElementById("c-fone").value = "";
    } catch (e) { alert(e.message); }
};

/* ============================================================
   INTERFACE E UI
============================================================ */

window.nav = (id) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

function renderShowroom() {
    const grid = document.getElementById("listaCarros");
    if (!grid) return;
    grid.innerHTML = carrosLocais.map(c => `
        <div class="card">
            <div class="card-img" style="background-image: url('${c.fotos?.[0] || ''}')"></div>
            <div class="info">
                <span class="badge ${c.status}">${c.status.toUpperCase()}</span>
                <h3>${c.modelo}</h3>
                <p>R$ ${c.preco.toLocaleString('pt-BR')}</p>
                <button onclick="window.removerCarro('${c.id}')" class="btn-danger-sm">Excluir</button>
            </div>
        </div>
    `).join('');
}

function renderCRM() {
    const list = document.getElementById("listaClientes");
    if (!list) return;
    list.innerHTML = clientesLocais.map(c => `
        <div class="card-client">
            <h4>${c.nome}</h4>
            <p>${c.fone}</p>
            <div style="display:flex; gap:10px;">
                <button onclick="window.open('https://wa.me/${c.fone.replace(/\D/g,'')}')" class="btn-primary-sm" style="background:#25D366">Whats</button>
                <button onclick="window.deleteDoc(doc(db, 'clientes', '${c.id}'))" class="btn-danger-sm">×</button>
            </div>
        </div>
    `).join('');
}

function updateStats() {
    const total = carrosLocais.reduce((acc, cur) => acc + cur.preco, 0);
    const el = document.getElementById("stat-total");
    if (el) el.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function comprimirImagem(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 600;
                canvas.height = (img.height * 600) / img.width;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
}

function limparFormVeiculo() {
    document.getElementById("modelo").value = "";
    document.getElementById("preco").value = "";
}
