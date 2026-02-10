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

// --- MENU TOGGLE ---
window.toggleSidebar = () => {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("active");
    const icon = document.querySelector("#toggle-menu i");
    icon.className = sidebar.classList.contains("active") ? "fa fa-times" : "fa fa-bars";
};

// --- NAVEGAÇÃO ---
window.nav = (id) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (window.innerWidth <= 768) {
        document.getElementById("sidebar").classList.remove("active");
        document.querySelector("#toggle-menu i").className = "fa fa-bars";
    }
};

// --- AUTENTICAÇÃO ---
window.handleLogin = async () => {
    const email = document.getElementById("email-login").value;
    const senha = document.getElementById("senha-login").value;
    try { await signInWithEmailAndPassword(auth, email, senha); } 
    catch (e) { alert("Acesso negado!"); }
};
window.handleLogout = () => signOut(auth);

onAuthStateChanged(auth, user => {
    document.getElementById("login").classList.toggle("hidden", !!user);
    document.getElementById("app").classList.toggle("hidden", !user);
    if(user) { 
        document.getElementById("loader").style.display = "none";
        sync(); 
    }
});

// --- SINCRONIZAÇÃO EM TEMPO REAL ---
function sync() {
    // Carros
    onSnapshot(query(collection(db, "carros"), orderBy("data", "desc")), snap => {
        const grid = document.getElementById("listaCarros");
        const carros = snap.docs.map(d => ({id: d.id, ...d.data()}));
        grid.innerHTML = carros.map(c => `
            <div class="card" onmouseenter="this.querySelector('.img-v').style.backgroundImage='url(${c.fotos[1] || c.fotos[0]})'" 
                              onmouseleave="this.querySelector('.img-v').style.backgroundImage='url(${c.fotos[0]})'">
                <div class="img-v" style="background-image: url('${c.fotos[0]}')"></div>
                <div class="info">
                    <h3>${c.modelo}</h3>
                    <p class="price">R$ ${c.preco.toLocaleString('pt-BR')}</p>
                    <p>${c.km} KM | ${c.cambio}</p>
                    <button onclick="window.removerCarro('${c.id}')" style="background:none; border:none; color:red; cursor:pointer;">Excluir</button>
                </div>
            </div>
        `).join('');
        const total = carros.reduce((acc, cur) => acc + (cur.preco || 0), 0);
        document.getElementById("stat-total").innerText = total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    });

    // CRM
    onSnapshot(query(collection(db, "clientes"), orderBy("timestamp", "desc")), snap => {
        const crmList = document.getElementById("listaClientes");
        crmList.innerHTML = snap.docs.map(doc => {
            const l = doc.data();
            return `<div class="card-client lead-${l.situacao}">
                <h4>${l.nome}</h4>
                <p>${l.obs}</p>
                <button onclick="window.open('https://wa.me/${l.fone.replace(/\D/g,'')}')" class="btn-primary" style="padding: 5px; font-size: 0.8rem;">WhatsApp</button>
            </div>`;
        }).join('');
    });
}

// --- SALVAR VEÍCULO COM COMPRESSÃO ---
window.salvarVeiculo = async () => {
    const btn = document.getElementById("btn-salvar");
    btn.innerText = "PROCESSANDO IMAGENS...";
    btn.disabled = true;

    try {
        const f1 = await compress(document.getElementById("fotoFrente").files[0]);
        const f2 = await compress(document.getElementById("fotoTraseira").files[0]);
        const f3 = await compress(document.getElementById("fotoInterior").files[0]);
        const fotos = [f1, f2, f3].filter(f => f !== "");

        await addDoc(collection(db, "carros"), {
            modelo: document.getElementById("modelo").value,
            preco: parseFloat(document.getElementById("preco").value),
            km: document.getElementById("km").value,
            cambio: document.getElementById("cambio").value,
            descricao: document.getElementById("descricao").value,
            fotos: fotos,
            data: new Date().toISOString()
        });
        window.nav('showroom');
    } catch (e) { alert("Erro ao salvar."); }
    btn.innerText = "SALVAR NO SISTEMA";
    btn.disabled = false;
};

window.addCliente = async () => {
    await addDoc(collection(db, "clientes"), {
        nome: document.getElementById("c-nome").value,
        fone: document.getElementById("c-fone").value,
        situacao: document.getElementById("c-situacao").value,
        obs: document.getElementById("c-obs").value,
        timestamp: new Date().toISOString()
    });
    alert("Lead salvo!");
};

window.removerCarro = async (id) => { if(confirm("Remover?")) await deleteDoc(doc(db, "carros", id)); };

// COMPRESSOR DE IMAGEM (600px de largura)
async function compress(file) {
    if(!file) return "";
    return new Promise(res => {
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = e => {
            const img = new Image(); img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 600; canvas.height = (img.height * 600) / img.width;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                res(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
    });
}
