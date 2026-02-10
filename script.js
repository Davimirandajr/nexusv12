import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Sua Configuração do Firebase
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

// Estado Local para UI
let carrosLocais = [];
let clientesLocais = [];
let editId = null;

/* =====================
   LOGIN E SESSÃO
===================== */

window.handleLogin = async () => {
    const email = document.getElementById("email-login").value;
    const senha = document.getElementById("senha-login").value;
    try {
        await signInWithEmailAndPassword(auth, email, senha);
    } catch (e) {
        alert("Erro de Acesso: " + e.message);
    }
};

window.handleLogout = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    const loginSec = document.getElementById("login");
    const appSec = document.getElementById("app");
    const loader = document.getElementById('loader');

    if (user) {
        loginSec.classList.add("hidden");
        appSec.classList.remove("hidden");
        syncFirebase();
    } else {
        loginSec.classList.remove("hidden");
        appSec.classList.add("hidden");
    }
    if (loader) setTimeout(() => loader.style.display = 'none', 1000);
});

/* =====================
   SINCRONIZAÇÃO (REAL-TIME)
===================== */

function syncFirebase() {
    // Escutar Carros
    onSnapshot(query(collection(db, "carros"), orderBy("data", "desc")), (snap) => {
        carrosLocais = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderShowroom();
        updateStats();
        atualizarSelects();
    });

    // Escutar Clientes
    onSnapshot(query(collection(db, "clientes"), orderBy("data", "desc")), (snap) => {
        clientesLocais = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderCRM();
    });
}

/* =====================
   GESTÃO DE VEÍCULOS
===================== */

window.salvarVeiculo = async () => {
    const modelo = document.getElementById("modelo").value;
    const preco = parseFloat(document.getElementById("preco").value);
    const status = document.getElementById("status").value;

    if (!modelo || isNaN(preco)) return alert("Preencha os dados corretamente.");

    const novasFotos = [
        await comprimirImagem(document.getElementById("fotoFrente").files[0]),
        await comprimirImagem(document.getElementById("fotoTraseira").files[0]),
        await comprimirImagem(document.getElementById("fotoInterior").files[0])
    ].filter(f => f !== "");

    const data = {
        modelo,
        preco,
        status,
        fotos: novasFotos,
        data: new Date().toISOString()
    };

    try {
        if (editId) {
            await updateDoc(doc(db, "carros", editId), data);
            editId = null;
        } else {
            await addDoc(collection(db, "carros"), data);
        }
        window.nav('showroom');
        limparFormVeiculo();
    } catch (e) { alert("Erro ao salvar: " + e.message); }
};

window.removerCarro = async (id) => {
    if (confirm("Excluir veículo permanentemente?")) {
        await deleteDoc(doc(db, "carros", id));
    }
};

/* =====================
   CRM - LEADS
===================== */

window.salvarCliente = async () => {
    const nome = document.getElementById("c-nome").value;
    const fone = document.getElementById("c-fone").value;
    
    if (!nome || !fone) return alert("Nome e Fone obrigatórios.");

    try {
        await addDoc(collection(db, "clientes"), {
            nome,
            fone,
            data: new Date().toLocaleDateString('pt-BR'),
            timestamp: new Date().toISOString()
        });
        limparFormCRM();
    } catch (e) { alert(e.message); }
};

window.removerCliente = async (id) => {
    if (confirm("Excluir lead?")) {
        await deleteDoc(doc(db, "clientes", id));
    }
};

/* =====================
   RENDERIZAÇÃO
===================== */

function renderShowroom() {
    const grid = document.getElementById("listaCarros");
    grid.innerHTML = carrosLocais.map((c) => `
        <div class="card">
            <div class="card-img" style="background-image: url('${c.fotos[0] || ''}')"></div>
            <div class="info">
                <span class="badge ${c.status}">${c.status.toUpperCase()}</span>
                <h3>${c.modelo}</h3>
                <p class="price">R$ ${c.preco.toLocaleString('pt-BR')}</p>
                <div class="actions">
                    <button onclick="window.removerCarro('${c.id}')" class="btn-danger-sm">×</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderCRM() {
    const list = document.getElementById("listaClientes");
    list.innerHTML = clientesLocais.map((c) => `
        <div class="card-client">
            <h4>${c.nome}</h4>
            <p>WhatsApp: ${c.fone}</p>
            <button onclick="window.enviarMensagem('${c.fone}', '${c.nome}')" class="btn-primary-sm" style="background:#25D366">WhatsApp</button>
            <button onclick="window.removerCliente('${c.id}')" class="btn-danger-sm">×</button>
        </div>
    `).join('');
}

window.enviarMensagem = (fone, nome) => {
    const texto = encodeURIComponent(`Olá ${nome}, tudo bem? Sou da Nexus V12...`);
    window.open(`https://wa.me/${fone.replace(/\D/g, '')}?text=${texto}`, '_blank');
};

// Funções Auxiliares (Navegação, Stats, etc)
window.nav = (id) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

function updateStats() {
    const total = carrosLocais.reduce((acc, cur) => acc + (cur.preco || 0), 0);
    document.getElementById("stat-total").innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function atualizarSelects() {
    const s = document.getElementById("c-veiculo");
    if (s) s.innerHTML = `<option value="">Interesse Geral</option>` + carrosLocais.map(c => `<option value="${c.id}">${c.modelo}</option>`).join('');
}

// Sua função de compressão original mantida
function comprimirImagem(file) {
    return new Promise((resolve) => {
        if (!file) return resolve("");
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600;
                const scale = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
    });
}

function limparFormVeiculo() { document.querySelectorAll('#novo input').forEach(i => i.value = ""); }
function limparFormCRM() { document.getElementById("c-nome").value = ""; document.getElementById("c-fone").value = ""; }
