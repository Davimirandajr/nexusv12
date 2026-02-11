import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Configuração do seu Firebase (Mantenha os seus dados aqui)
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "ID_SENDER",
    appId: "ID_APP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- GESTÃO DE ACESSO (Login/Logout) ---

window.handleLogin = async () => {
    const email = document.getElementById("email-login").value;
    const senha = document.getElementById("senha-login").value;
    try {
        await signInWithEmailAndPassword(auth, email, senha);
    } catch (error) {
        alert("Erro no login: Verifique as credenciais.");
    }
};

window.handleLogout = () => {
    signOut(auth).then(() => {
        window.location.reload();
    });
};

// --- MONITOR DE ESTADO (Resolve o Carregamento Infinito) ---

onAuthStateChanged(auth, (user) => {
    const loginSec = document.getElementById("login");
    const appSec = document.getElementById("app");
    const loader = document.getElementById("loader");

    if (user) {
        // Utilizador Logado
        loginSec.classList.add("hidden");
        appSec.classList.remove("hidden");
        if(loader) loader.style.display = "none";
        
        // Inicia a sincronização dos dados específicos desta loja
        syncEstoque();
        syncVendedores();
    } else {
        // Utilizador Deslogado
        loginSec.classList.remove("hidden");
        appSec.classList.add("hidden");
        if(loader) loader.style.display = "none";
    }
});

// --- FUNÇÕES DE SINCRONIZAÇÃO (ISOLAMENTO DE DADOS) ---

function syncEstoque() {
    const user = auth.currentUser;
    // Consulta filtrada pelo ID da loja logada
    const q = query(
        collection(db, "carros"), 
        where("lojaId", "==", user.uid), 
        orderBy("data", "desc")
    );

    onSnapshot(q, (snap) => {
        const grid = document.getElementById("listaCarros");
        grid.innerHTML = snap.docs.map(d => {
            const c = d.data();
            return `
                <div class="card">
                    <div class="img-v" style="background-image:url(${c.fotos[0]})"></div>
                    <div class="info">
                        <h3>${c.modelo}</h3>
                        <p>R$ ${c.preco.toLocaleString('pt-BR')}</p>
                        <button onclick="window.removerVeiculo('${d.id}')" class="btn-del">Remover</button>
                    </div>
                </div>`;
        }).join('');
    });
}

function syncVendedores() {
    const q = query(collection(db, "vendedores"), where("lojaId", "==", auth.currentUser.uid));
    onSnapshot(q, snap => {
        const vends = snap.docs.map(d => ({id: d.id, ...d.data()}));
        const select = document.getElementById("vendedor-select");
        select.innerHTML = vends.map(v => `<option value="${v.whats}">${v.nome}</option>`).join('');
    });
}

// --- FUNÇÕES DE SALVAMENTO ---

window.salvarVeiculo = async () => {
    const btn = document.getElementById("btn-salvar");
    btn.innerText = "A guardar...";
    btn.disabled = true;

    try {
        const sel = document.getElementById("vendedor-select");
        const foto = await compress(document.getElementById("f1").files[0]);

        await addDoc(collection(db, "carros"), {
            lojaId: auth.currentUser.uid, // O "carimbo" da loja
            modelo: document.getElementById("modelo").value,
            preco: parseFloat(document.getElementById("preco").value),
            vendedorWhats: sel.value,
            vendedorNome: sel.options[sel.selectedIndex].text,
            fotos: [foto],
            data: new Date().toISOString()
        });
        
        window.nav('showroom');
    } catch (e) {
        alert("Erro ao salvar veículo.");
    } finally {
        btn.innerText = "SALVAR";
        btn.disabled = false;
    }
};

window.removerVeiculo = async (id) => {
    if(confirm("Deseja eliminar este veículo?")) {
        await deleteDoc(doc(db, "carros", id));
    }
};

// --- UTILITÁRIOS ---

window.gerarLinkShowroom = () => {
    const link = window.location.origin + "/portal.html?loja=" + auth.currentUser.uid;
    navigator.clipboard.writeText(link);
    alert("Link da sua loja copiado!");
};

window.nav = (id) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
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
                res(canvas.toDataURL('image/jpeg', 0.7));
            }
        }
    });
}
