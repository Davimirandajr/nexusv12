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

let fotosArray = ["", "", "", "", ""]; // Armazena as 5 fotos

// --- CONTROLE DE ACESSO ---
onAuthStateChanged(auth, (user) => {
    const loader = document.getElementById("loader");
    const loginSec = document.getElementById("login");
    const appSec = document.getElementById("app");

    if (user) {
        loginSec.classList.remove("active");
        appSec.classList.remove("hidden");
        window.nav('showroom');
        syncEstoque();
        syncVendedores();
    } else {
        loginSec.classList.add("active");
        appSec.classList.add("hidden");
    }
    if(loader) loader.style.display = "none";
});

// --- NAVEGAÇÃO DE PÁGINAS ---
window.nav = (pageId) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    document.getElementById(pageId).classList.add('active');
    const btn = document.querySelector(`[onclick="window.nav('${pageId}')"]`);
    if(btn) btn.classList.add('active');
};

// --- NAVEGAÇÃO DE ETAPAS (CADASTRO) ---
window.nextStep = (step) => {
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    document.getElementById('step' + step).classList.add('active');
};

// --- PREVIEW E COMPRESSÃO DE FOTOS ---
window.preview = async (input, slotId) => {
    const file = input.files[0];
    if (file) {
        const base64 = await compress(file);
        const index = parseInt(slotId.replace('p', '')) - 1;
        fotosArray[index] = base64;
        document.getElementById(slotId).innerHTML = `<img src="${base64}">`;
    }
};

// --- SINCRONIZAÇÃO EM TEMPO REAL ---
function syncEstoque() {
    if (!auth.currentUser) return;
    const q = query(collection(db, "carros"), where("lojaId", "==", auth.currentUser.uid));

    onSnapshot(q, (snap) => {
        const grid = document.getElementById("listaCarros");
        const cLeads = document.getElementById("col-leads");
        const cNegoc = document.getElementById("col-negociacao");
        const cVenda = document.getElementById("col-vendidos");

        grid.innerHTML = ""; cLeads.innerHTML = ""; cNegoc.innerHTML = ""; cVenda.innerHTML = "";

        snap.forEach(docSnap => {
            const c = docSnap.data();
            const id = docSnap.id;
            const card = `
                <div class="car-card">
                    <div class="car-img" style="background-image:url(${c.fotos[0]})"></div>
                    <div class="car-info">
                        <h4>${c.modelo}</h4>
                        <p>R$ ${c.preco.toLocaleString('pt-BR')}</p>
                        <button onclick="window.delCarro('${id}')" style="background:none; border:none; color:red; cursor:pointer; font-size:10px; margin-top:5px;">EXCLUIR</button>
                    </div>
                </div>`;
            
            grid.innerHTML += card;
            if (c.status === 'leads') cLeads.innerHTML += card;
            else if (c.status === 'negociacao') cNegoc.innerHTML += card;
            else if (c.status === 'vendidos') cVenda.innerHTML += card;
        });
    });
}

function syncVendedores() {
    const q = query(collection(db, "vendedores"), where("lojaId", "==", auth.currentUser.uid));
    onSnapshot(q, snap => {
        const sel = document.getElementById("vendedor-select");
        sel.innerHTML = `<option value="">Selecione um Vendedor</option>`;
        snap.forEach(d => {
            sel.innerHTML += `<option value="${d.data().whats}">${d.data().nome}</option>`;
        });
    });
}

// --- AÇÕES ---
window.salvarVeiculo = async () => {
    const btn = document.getElementById("btn-salvar");
    const validPhotos = fotosArray.filter(f => f !== "");
    
    if(validPhotos.length === 0) return alert("Adicione pelo menos 1 foto!");

    btn.innerText = "SALVANDO...";
    btn.disabled = true;

    try {
        await addDoc(collection(db, "carros"), {
            lojaId: auth.currentUser.uid,
            modelo: document.getElementById("modelo").value,
            preco: parseFloat(document.getElementById("preco").value),
            vendedorWhats: document.getElementById("vendedor-select").value,
            fotos: validPhotos,
            status: 'leads',
            data: new Date().toISOString()
        });
        alert("Sucesso!");
        location.reload();
    } catch (e) { alert("Erro ao salvar."); btn.disabled = false; }
};

window.handleLogin = () => {
    const e = document.getElementById("email-login").value;
    const s = document.getElementById("senha-login").value;
    signInWithEmailAndPassword(auth, e, s).catch(() => alert("Acesso Negado"));
};

window.handleLogout = () => signOut(auth);

window.delCarro = (id) => confirm("Apagar veículo?") && deleteDoc(doc(db, "carros", id));

async function compress(file) {
    return new Promise(res => {
        const r = new FileReader(); r.readAsDataURL(file);
        r.onload = e => {
            const img = new Image(); img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 600; canvas.height = (img.height * 600) / img.width;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                res(canvas.toDataURL('image/jpeg', 0.6));
            }
        }
    });
}
