import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Configuração extraída da sua imagem de configurações do projeto
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

// Variáveis de controle local
let carrosLocais = [];
let clientesLocais = [];

/* =====================
   SISTEMA DE AUTENTICAÇÃO
   (Exposto via window para o HTML encontrar)
===================== */

window.handleLogin = async () => {
    const email = document.getElementById("email-login").value;
    const senha = document.getElementById("senha-login").value;
    
    if(!email || !senha) return alert("Preencha e-mail e senha!");

    try {
        await signInWithEmailAndPassword(auth, email, senha);
    } catch (e) {
        console.error("Erro no login:", e.code);
        alert("Falha no login: Verifique se o e-mail e senha estão corretos no Firebase.");
    }
};

window.handleLogout = () => signOut(auth);

// Monitor de Sessão
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

/* =====================
   SINCRONIZAÇÃO EM TEMPO REAL
===================== */

function iniciarSincronizacao() {
    // Carros
    onSnapshot(query(collection(db, "carros"), orderBy("data", "desc")), (snap) => {
        carrosLocais = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderShowroom();
        updateStats();
    });

    // Clientes
    onSnapshot(query(collection(db, "clientes"), orderBy("data", "desc")), (snap) => {
        clientesLocais = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderCRM();
    });
}

/* =====================
   AÇÕES DO ERP
===================== */

window.salvarVeiculo = async () => {
    const modelo = document.getElementById("modelo").value;
    const preco = parseFloat(document.getElementById("preco").value);
    const status = document.getElementById("status").value;

    if (!modelo || isNaN(preco)) return alert("Dados inválidos!");

    // Pegando fotos (suportando a compressão se houver arquivos)
    const novasFotos = [];
    const f1 = document.getElementById("fotoFrente").files[0];
    if(f1) novasFotos.push(await comprimirImagem(f1));

    try {
        await addDoc(collection(db, "carros"), {
            modelo,
            preco,
            status,
            fotos: novasFotos,
            data: new Date().toISOString()
        });
        alert("Veículo cadastrado!");
        window.nav('showroom');
    } catch (e) { alert("Erro: " + e.message); }
};

window.removerCarro = async (id) => {
    if(confirm("Deseja excluir?")) await deleteDoc(doc(db, "carros", id));
};

/* =====================
   INTERFACE (RENDER)
===================== */

function renderShowroom() {
    const grid = document.getElementById("listaCarros");
    if(!grid) return;
    grid.innerHTML = carrosLocais.map(c => `
        <div class="card">
            <div class="card-img" style="background-image: url('${c.fotos?.[0] || ''}')"></div>
            <div class="info">
                <h3>${c.modelo}</h3>
                <p>R$ ${c.preco.toLocaleString('pt-BR')}</p>
                <button onclick="window.removerCarro('${c.id}')" class="btn-danger-sm">Excluir</button>
            </div>
        </div>
    `).join('');
}

function renderCRM() {
    const list = document.getElementById("listaClientes");
    if(!list) return;
    list.innerHTML = clientesLocais.map(c => `
        <div class="card-client">
            <h4>${c.nome}</h4>
            <p>${c.fone}</p>
            <button onclick="window.removerCliente('${c.id}')" class="btn-danger-sm">×</button>
        </div>
    `).join('');
}

/* =====================
   UTILITÁRIOS
===================== */

window.nav = (id) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

function updateStats() {
    const total = carrosLocais.reduce((acc, cur) => acc + cur.preco, 0);
    const el = document.getElementById("stat-total");
    if(el) el.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
