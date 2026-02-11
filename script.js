import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { /* SEU CONFIG AQUI */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- MONITOR DE ACESSO (O "QUEBRA-LOOP") ---
onAuthStateChanged(auth, (user) => {
    const loader = document.getElementById("loader");
    const loginSec = document.getElementById("login");
    const appSec = document.getElementById("app");

    if (user) {
        loginSec.classList.add("hidden");
        appSec.classList.remove("hidden");
        syncEstoque();
        syncVendedores();
    } else {
        loginSec.classList.remove("hidden");
        appSec.classList.add("hidden");
    }
    if(loader) loader.style.display = "none";
});

// --- FUNÇÕES DE LOGIN/OUT ---
window.handleLogin = async () => {
    try { await signInWithEmailAndPassword(auth, document.getElementById("email-login").value, document.getElementById("senha-login").value); }
    catch { alert("Falha no login."); }
};
window.handleLogout = () => signOut(auth);

// --- BUSCA DE DADOS (ISOLADA POR LOJA) ---
function syncEstoque() {
    const q = query(collection(db, "carros"), where("lojaId", "==", auth.currentUser.uid));
    onSnapshot(q, snap => {
        document.getElementById("listaCarros").innerHTML = snap.docs.map(d => {
            const c = d.data();
            return `<div class="card">
                <div class="img-v" style="background-image:url(${c.fotos[0]})"></div>
                <div class="info"><h3>${c.modelo}</h3><p>R$ ${c.preco.toLocaleString()}</p>
                <button onclick="window.delCarro('${d.id}')">Excluir</button></div>
            </div>`;
        }).join('');
    });
}

function syncVendedores() {
    const q = query(collection(db, "vendedores"), where("lojaId", "==", auth.currentUser.uid));
    onSnapshot(q, snap => {
        const vends = snap.docs.map(d => d.data());
        document.getElementById("vendedor-select").innerHTML = vends.map(v => `<option value="${v.whats}">${v.nome}</option>`).join('');
    });
}

// --- SALVAMENTO ---
window.salvarVeiculo = async () => {
    const sel = document.getElementById("vendedor-select");
    const foto = await compress(document.getElementById("foto-principal").files[0]);
    
    await addDoc(collection(db, "carros"), {
        lojaId: auth.currentUser.uid,
        modelo: document.getElementById("modelo").value,
        preco: parseFloat(document.getElementById("preco").value),
        vendedorWhats: sel.value,
        vendedorNome: sel.options[sel.selectedIndex].text,
        fotos: [foto],
        data: new Date().toISOString()
    });
    window.nav('showroom');
};

window.addVendedor = async () => {
    await addDoc(collection(db, "vendedores"), {
        lojaId: auth.currentUser.uid,
        nome: document.getElementById("v-nome").value,
        whats: document.getElementById("v-whats").value
    });
};

window.delCarro = (id) => deleteDoc(doc(db, "carros", id));
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
