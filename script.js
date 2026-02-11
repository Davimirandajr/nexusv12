// 1. IMPORTS CORRETOS (Usando a versão estável 10.7.1)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. SUA CONFIGURAÇÃO (Verificada)
const firebaseConfig = {
  apiKey: "AIzaSyBOCli1HzoijZ1gcplo_18tKH-5Umb63q8",
  authDomain: "nexus-v12.firebaseapp.com",
  projectId: "nexus-v12",
  storageBucket: "nexus-v12.firebasestorage.app",
  messagingSenderId: "587840382224",
  appId: "1:587840382224:web:61c0f1890c7c395dc77195",
  measurementId: "G-VE69B1WNC1"
};

// 3. INICIALIZAÇÃO
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- MONITOR DE ACESSO (O QUE MATA O LOOP) ---
onAuthStateChanged(auth, (user) => {
    const loader = document.getElementById("loader");
    const loginSec = document.getElementById("login");
    const appSec = document.getElementById("app");

    console.log("Nexus V12: Verificando autenticação...");

    if (user) {
        // Logado: Mostra Painel
        if(loginSec) loginSec.classList.add("hidden");
        if(appSec) appSec.classList.remove("hidden");
        syncEstoque();
        syncVendedores();
    } else {
        // Deslogado: Mostra Login
        if(loginSec) loginSec.classList.remove("hidden");
        if(appSec) appSec.classList.add("hidden");
    }

    // FORÇA O LOADER A SUMIR (Anti-Loop)
    if(loader) {
        setTimeout(() => {
            loader.style.opacity = "0";
            setTimeout(() => loader.style.display = "none", 500);
        }, 1000);
    }
});

// --- FUNÇÃO DE LOGIN ---
window.handleLogin = async () => {
    const email = document.getElementById("email-login").value;
    const senha = document.getElementById("senha-login").value;
    
    if(!email || !senha) return alert("Preencha os campos!");

    try {
        await signInWithEmailAndPassword(auth, email, senha);
    } catch (err) {
        console.error("Erro ao logar:", err.code);
        alert("Falha no login: Verifique e-mail e senha.");
    }
};

window.handleLogout = () => signOut(auth).then(() => window.location.reload());

// --- BUSCA DE DADOS ---
function syncEstoque() {
    if(!auth.currentUser) return;

    // Filtro por Loja
    const q = query(
        collection(db, "carros"), 
        where("lojaId", "==", auth.currentUser.uid)
    );

    onSnapshot(q, (snap) => {
        const grid = document.getElementById("listaCarros");
        if(!grid) return;

        grid.innerHTML = snap.docs.map(d => {
            const c = d.data();
            return `
                <div class="card">
                    <div class="img-v" style="background-image:url(${c.fotos ? c.fotos[0] : ''})"></div>
                    <div class="info">
                        <h3>${c.modelo}</h3>
                        <span class="price">R$ ${Number(c.preco).toLocaleString('pt-BR')}</span>
                        <button onclick="window.delCarro('${d.id}')" class="btn-del">Remover</button>
                    </div>
                </div>`;
        }).join('');
    }, (error) => {
        console.log("Erro no Firestore (Estoque):", error.message);
    });
}

function syncVendedores() {
    if(!auth.currentUser) return;
    const q = query(collection(db, "vendedores"), where("lojaId", "==", auth.currentUser.uid));
    onSnapshot(q, snap => {
        const sel = document.getElementById("vendedor-select");
        if(sel) {
            const vends = snap.docs.map(d => d.data());
            sel.innerHTML = `<option value="">Selecione...</option>` + 
                            vends.map(v => `<option value="${v.whats}">${v.nome}</option>`).join('');
        }
    });
}

// --- SALVAMENTO ---
window.salvarVeiculo = async () => {
    const btn = document.getElementById("btn-salvar");
    btn.innerText = "Aguarde...";
    btn.disabled = true;

    try {
        const sel = document.getElementById("vendedor-select");
        const file = document.getElementById("foto-principal").files[0];
        const fotoFinal = await compress(file);

        await addDoc(collection(db, "carros"), {
            lojaId: auth.currentUser.uid,
            modelo: document.getElementById("modelo").value,
            preco: parseFloat(document.getElementById("preco").value),
            vendedorWhats: sel.value,
            vendedorNome: sel.options[sel.selectedIndex].text,
            fotos: [fotoFinal],
            data: new Date().toISOString()
        });

        window.nav('showroom');
    } catch (e) {
        alert("Erro ao salvar.");
    } finally {
        btn.innerText = "SALVAR";
        btn.disabled = false;
    }
};

window.addVendedor = async () => {
    await addDoc(collection(db, "vendedores"), {
        lojaId: auth.currentUser.uid,
        nome: document.getElementById("v-nome").value,
        whats: document.getElementById("v-whats").value
    });
    alert("Vendedor Salvo!");
};

window.delCarro = (id) => confirm("Excluir?") && deleteDoc(doc(db, "carros", id));

window.nav = (id) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

window.gerarLinkShowroom = () => {
    const link = window.location.origin + "/portal.html?loja=" + auth.currentUser.uid;
    navigator.clipboard.writeText(link);
    alert("Link copiado!");
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
