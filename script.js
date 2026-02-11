import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Suas configurações que você enviou
const firebaseConfig = {
  apiKey: "AIzaSyBOCli1HzoijZ1gcplo_18tKH-5Umb63q8",
  authDomain: "nexus-v12.firebaseapp.com",
  projectId: "nexus-v12",
  storageBucket: "nexus-v12.firebasestorage.app",
  messagingSenderId: "587840382224",
  appId: "1:587840382224:web:61c0f1890c7c395dc77195",
  measurementId: "G-VE69B1WNC1"
};

// Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- MONITOR DE ACESSO (O QUE MATA O LOOP) ---
onAuthStateChanged(auth, (user) => {
    const loader = document.getElementById("loader");
    const loginSec = document.getElementById("login");
    const appSec = document.getElementById("app");

    if (user) {
        // Se logado, mostra o painel
        if(loginSec) loginSec.classList.add("hidden");
        if(appSec) appSec.classList.remove("hidden");
        syncEstoque();
        syncVendedores();
    } else {
        // Se deslogado, mostra o login
        if(loginSec) loginSec.classList.remove("hidden");
        if(appSec) appSec.classList.add("hidden");
    }

    // DESLIGA O LOADER
    if(loader) {
        loader.style.opacity = "0";
        setTimeout(() => loader.style.display = "none", 500);
    }
});

// --- FUNÇÃO DE LOGIN ---
window.handleLogin = async () => {
    const email = document.getElementById("email-login").value;
    const senha = document.getElementById("senha-login").value;
    try { 
        await signInWithEmailAndPassword(auth, email, senha); 
    } catch (err) { 
        alert("Erro: E-mail ou senha inválidos."); 
    }
};

window.handleLogout = () => signOut(auth).then(() => window.location.reload());

// --- SINCRONIZAÇÃO (ISOLAMENTO MULTI-LOJA) ---
function syncEstoque() {
    if(!auth.currentUser) return;
    
    // Filtra apenas os carros da loja logada
    const q = query(
        collection(db, "carros"), 
        where("lojaId", "==", auth.currentUser.uid),
        orderBy("data", "desc")
    );

    onSnapshot(q, (snap) => {
        const grid = document.getElementById("listaCarros");
        if(!grid) return;

        grid.innerHTML = snap.docs.map(d => {
            const c = d.data();
            return `
                <div class="card">
                    <div class="img-v" style="background-image:url(${c.fotos[0] || ''})"></div>
                    <div class="info">
                        <h3>${c.modelo}</h3>
                        <span class="price">R$ ${Number(c.preco).toLocaleString('pt-BR')}</span>
                        <button onclick="window.delCarro('${d.id}')" class="btn-del">Excluir</button>
                    </div>
                </div>`;
        }).join('');
    }, (error) => {
        console.error("Erro no Firestore:", error.message);
    });
}

function syncVendedores() {
    if(!auth.currentUser) return;
    const q = query(collection(db, "vendedores"), where("lojaId", "==", auth.currentUser.uid));
    onSnapshot(q, snap => {
        const sel = document.getElementById("vendedor-select");
        if(!sel) return;
        const vends = snap.docs.map(d => d.data());
        sel.innerHTML = vends.map(v => `<option value="${v.whats}">${v.nome}</option>`).join('');
    });
}

// --- FUNÇÕES DE CADASTRO ---
window.salvarVeiculo = async () => {
    const btn = document.getElementById("btn-salvar");
    btn.innerText = "Salvando...";
    btn.disabled = true;

    try {
        const f1 = await compress(document.getElementById("foto-principal").files[0]);
        const sel = document.getElementById("vendedor-select");

        await addDoc(collection(db, "carros"), {
            lojaId: auth.currentUser.uid, // O selo da loja
            modelo: document.getElementById("modelo").value,
            preco: parseFloat(document.getElementById("preco").value),
            vendedorWhats: sel.value,
            vendedorNome: sel.options[sel.selectedIndex].text,
            fotos: [f1].filter(f => f !== ""),
            data: new Date().toISOString()
        });
        window.nav('showroom');
    } catch (e) { alert("Erro ao salvar."); }
    
    btn.innerText = "SALVAR";
    btn.disabled = false;
};

window.addVendedor = async () => {
    await addDoc(collection(db, "vendedores"), {
        lojaId: auth.currentUser.uid,
        nome: document.getElementById("v-nome").value,
        whats: document.getElementById("v-whats").value
    });
    alert("Vendedor adicionado!");
};

window.delCarro = (id) => confirm("Apagar veículo?") && deleteDoc(doc(db, "carros", id));

window.nav = (id) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

window.gerarLinkShowroom = () => {
    const link = window.location.origin + "/portal.html?loja=" + auth.currentUser.uid;
    navigator.clipboard.writeText(link);
    alert("Link do Portal copiado!");
};

async function compress(file) {
    if(!file) return "";
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
