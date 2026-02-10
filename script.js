import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- LÓGICA DO MENU RETRÁTIL ---
window.toggleSidebar = () => {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("active");
    const icon = document.querySelector("#toggle-menu i");
    if (sidebar.classList.contains("active")) {
        icon.classList.replace("fa-bars", "fa-times");
    } else {
        icon.classList.replace("fa-times", "fa-bars");
    }
};

// --- NAVEGAÇÃO ---
window.nav = (id) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    // Se estiver no celular, fecha o menu ao trocar de página
    if (window.innerWidth <= 768) {
        document.getElementById("sidebar").classList.remove("active");
        document.querySelector("#toggle-menu i").classList.replace("fa-times", "fa-bars");
    }
};

// --- AUTENTICAÇÃO ---
window.handleLogin = async () => {
    const email = document.getElementById("email-login").value;
    const senha = document.getElementById("senha-login").value;
    try { await signInWithEmailAndPassword(auth, email, senha); } 
    catch (e) { alert("Acesso Negado!"); }
};

window.handleLogout = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    document.getElementById("login").classList.toggle("hidden", !!user);
    document.getElementById("app").classList.toggle("hidden", !user);
    if (user) iniciarSincronizacao();
});

// --- SINCRONIZAÇÃO FIRESTORE ---
function iniciarSincronizacao() {
    onSnapshot(query(collection(db, "carros"), orderBy("data", "desc")), (snap) => {
        carrosLocais = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderShowroom();
        updateStats();
    });
    onSnapshot(query(collection(db, "clientes"), orderBy("timestamp", "desc")), (snap) => {
        clientesLocais = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderCRM();
    });
}

// --- SALVAR VEÍCULO ---
window.salvarVeiculo = async () => {
    const btn = document.getElementById("btn-salvar");
    const dados = {
        modelo: document.getElementById("modelo").value,
        preco: parseFloat(document.getElementById("preco").value),
        km: document.getElementById("km").value,
        cambio: document.getElementById("cambio").value,
        descricao: document.getElementById("descricao").value,
        status: "showroom",
        data: new Date().toISOString()
    };

    btn.innerText = "PROCESSANDO...";
    try {
        const f1 = await comprimirImagem(document.getElementById("fotoFrente").files[0]);
        const f2 = await comprimirImagem(document.getElementById("fotoTraseira").files[0]);
        const f3 = await comprimirImagem(document.getElementById("fotoInterior").files[0]);
        dados.fotos = [f1, f2, f3].filter(f => f !== "");
        await addDoc(collection(db, "carros"), dados);
        window.nav('showroom');
    } catch (e) { alert("Erro ao salvar."); }
    btn.innerText = "SALVAR NO SISTEMA";
};

// --- CRM ---
window.addCliente = async () => {
    const lead = {
        nome: document.getElementById("c-nome").value,
        fone: document.getElementById("c-fone").value,
        situacao: document.getElementById("c-situacao").value,
        obs: document.getElementById("c-obs").value,
        timestamp: new Date().toISOString()
    };
    await addDoc(collection(db, "clientes"), lead);
    alert("Lead Adicionado!");
};

window.removerCarro = async (id) => { if(confirm("Excluir?")) await deleteDoc(doc(db, "carros", id)); };

// --- RENDERIZAÇÃO ---
function renderShowroom() {
    const grid = document.getElementById("listaCarros");
    grid.innerHTML = carrosLocais.map(c => `
        <div class="card" onmouseenter="this.querySelector('.img-v').style.backgroundImage='url(${c.fotos[1] || c.fotos[0]})'" 
                          onmouseleave="this.querySelector('.img-v').style.backgroundImage='url(${c.fotos[0]})'">
            <div class="img-v" style="background-image: url('${c.fotos[0]}')"></div>
            <div class="info">
                <h3>${c.modelo}</h3>
                <p class="price">R$ ${c.preco.toLocaleString('pt-BR')}</p>
                <p class="specs">${c.km} KM | ${c.cambio}</p>
                <button onclick="window.removerCarro('${c.id}')" class="btn-danger-sm">Remover</button>
            </div>
        </div>
    `).join('');
}

function renderCRM() {
    const list = document.getElementById("listaClientes");
    list.innerHTML = clientesLocais.map(c => `
        <div class="card-client lead-${c.situacao}">
            <h4>${c.nome}</h4>
            <p>${c.obs}</p>
            <button onclick="window.open('https://wa.me/${c.fone.replace(/\D/g,'')}')" class="btn-primary-sm">Whats</button>
        </div>
    `).join('');
}

function updateStats() {
    const total = carrosLocais.reduce((acc, cur) => acc + (cur.preco || 0), 0);
    document.getElementById("stat-total").innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function comprimirImagem(file) {
    if (!file) return "";
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
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
    });
}
