import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURAÇÃO DO FIREBASE (NEXUS V12) ---
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

let carrosLocais = [];
let clientesLocais = [];

/* ==========================================
   SISTEMA DE ACESSO E SESSÃO
========================================== */

window.handleLogin = async () => {
    const email = document.getElementById("email-login").value;
    const senha = document.getElementById("senha-login").value;
    if (!email || !senha) return alert("Preencha todos os campos!");

    try {
        await signInWithEmailAndPassword(auth, email, senha);
    } catch (e) {
        console.error(e);
        alert("Erro no login: Acesso negado.");
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
        iniciarSincronizacao();
    } else {
        loginSec.classList.remove("hidden");
        appSec.classList.add("hidden");
    }
    if (loader) setTimeout(() => loader.style.display = 'none', 800);
});

/* ==========================================
   SINCRONIZAÇÃO EM TEMPO REAL
========================================== */

function iniciarSincronizacao() {
    // Escuta Veículos
    onSnapshot(query(collection(db, "carros"), orderBy("data", "desc")), (snap) => {
        carrosLocais = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderShowroom();
        updateStats();
    });

    // Escuta Leads
    onSnapshot(query(collection(db, "clientes"), orderBy("timestamp", "desc")), (snap) => {
        clientesLocais = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderCRM();
    });
}

/* ==========================================
   GESTÃO DE VEÍCULOS (REGISTRO COMPLETO)
========================================== */

window.salvarVeiculo = async () => {
    const btn = document.getElementById("btn-salvar");
    const modelo = document.getElementById("modelo").value;
    const preco = parseFloat(document.getElementById("preco").value);
    const km = document.getElementById("km").value;
    const cambio = document.getElementById("cambio").value;
    const descricao = document.getElementById("descricao").value;

    if (!modelo || isNaN(preco)) return alert("Preencha Modelo e Preço!");

    btn.innerText = "COMPRIMINDO E ENVIANDO...";
    btn.disabled = true;

    try {
        const f1 = await comprimirImagem(document.getElementById("fotoFrente").files[0]);
        const f2 = await comprimirImagem(document.getElementById("fotoTraseira").files[0]);
        const f3 = await comprimirImagem(document.getElementById("fotoInterior").files[0]);
        
        const listaFotos = [f1, f2, f3].filter(f => f !== "");

        await addDoc(collection(db, "carros"), {
            modelo,
            preco,
            km,
            cambio,
            descricao,
            fotos: listaFotos,
            data: new Date().toISOString()
        });

        alert("Veículo registrado com sucesso!");
        window.nav('showroom');
        limparFormVeiculo();
    } catch (e) { 
        alert("Erro ao salvar: " + e.message); 
    } finally { 
        btn.innerText = "SALVAR NO SISTEMA"; 
        btn.disabled = false; 
    }
};

window.removerCarro = async (id) => {
    if (confirm("Deseja remover este veículo permanentemente do estoque?")) {
        await deleteDoc(doc(db, "carros", id));
    }
};

/* ==========================================
   CRM - GESTÃO DE LEADS AVANÇADA
========================================== */

window.addCliente = async () => {
    const nome = document.getElementById("c-nome").value;
    const fone = document.getElementById("c-fone").value;
    const situacao = document.getElementById("c-situacao").value;
    const obs = document.getElementById("c-obs").value;

    if (!nome || !fone) return alert("Nome e WhatsApp são obrigatórios!");

    try {
        await addDoc(collection(db, "clientes"), {
            nome,
            fone,
            situacao,
            obs,
            timestamp: new Date().toISOString(),
            dataLocal: new Date().toLocaleDateString('pt-BR')
        });
        alert("Novo lead capturado!");
        limparFormCRM();
    } catch (e) { alert(e.message); }
};

window.removerLead = async (id) => {
    if (confirm("Excluir este lead?")) await deleteDoc(doc(db, "clientes", id));
};

/* ==========================================
   INTERFACE (RENDERIZAÇÃO)
========================================== */

function renderShowroom() {
    const grid = document.getElementById("listaCarros");
    if (!grid) return;

    grid.innerHTML = carrosLocais.map(c => {
        const fotoFrente = c.fotos[0] || '';
        const fotoHover = c.fotos[1] || c.fotos[0] || '';
        
        return `
            <div class="card" 
                 onmouseenter="this.querySelector('.img-container').style.backgroundImage='url(${fotoHover})'" 
                 onmouseleave="this.querySelector('.img-container').style.backgroundImage='url(${fotoFrente})'">
                <div class="img-container" style="background-image: url('${fotoFrente}')"></div>
                <div class="info">
                    <span class="badge-status">DISPONÍVEL</span>
                    <h3>${c.modelo}</h3>
                    <p class="price">R$ ${c.preco.toLocaleString('pt-BR')}</p>
                    <p class="specs">${c.km} KM | ${c.cambio}</p>
                    <div class="actions">
                        <button onclick="window.removerCarro('${c.id}')" class="btn-danger-sm">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderCRM() {
    const list = document.getElementById("listaClientes");
    if (!list) return;

    list.innerHTML = clientesLocais.map(c => `
        <div class="card-client lead-${c.situacao}">
            <div class="client-header">
                <h4>${c.nome}</h4>
                <span class="status-tag">${c.situacao.toUpperCase()}</span>
            </div>
            <p class="obs-text">${c.obs || 'Sem observações.'}</p>
            <p class="phone-text"><i class="fab fa-whatsapp"></i> ${c.fone}</p>
            <div class="client-actions">
                <button onclick="window.open('https://wa.me/${c.fone.replace(/\D/g,'')}')" class="btn-primary-sm" style="background:#25D366">CONTATO</button>
                <button onclick="window.removerLead('${c.id}')" class="btn-danger-sm">×</button>
            </div>
        </div>
    `).join('');
}

/* ==========================================
   UTILITÁRIOS E SUPORTE
========================================== */

window.nav = (id) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
};

function updateStats() {
    const total = carrosLocais.reduce((acc, cur) => acc + (cur.preco || 0), 0);
    const el = document.getElementById("stat-total");
    if (el) el.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

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
                const MAX_WIDTH = 800;
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

function limparFormVeiculo() {
    document.getElementById("modelo").value = "";
    document.getElementById("preco").value = "";
    document.getElementById("km").value = "";
    document.getElementById("descricao").value = "";
    document.getElementById("fotoFrente").value = "";
    document.getElementById("fotoTraseira").value = "";
    document.getElementById("fotoInterior").value = "";
}

function limparFormCRM() {
    document.getElementById("c-nome").value = "";
    document.getElementById("c-fone").value = "";
    document.getElementById("c-obs").value = "";
}
