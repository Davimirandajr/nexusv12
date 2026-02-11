import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { /* SEU CONFIG AQUI */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// AUTH & NAV
window.handleLogin = async () => {
    try { await signInWithEmailAndPassword(auth, document.getElementById("email-login").value, document.getElementById("senha-login").value); }
    catch { alert("Erro no login"); }
};
window.handleLogout = () => signOut(auth);
onAuthStateChanged(auth, user => {
    document.getElementById("login").classList.toggle("hidden", !!user);
    document.getElementById("app").classList.toggle("hidden", !user);
    if(user) { sync(); syncVendedores(); document.getElementById("loader").style.display="none"; }
});

window.nav = (id) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

// LINK EXCLUSIVO DA LOJA
window.gerarLinkShowroom = () => {
    const link = window.location.origin + "/portal.html?loja=" + auth.currentUser.uid;
    navigator.clipboard.writeText(link);
    alert("Link da sua loja copiado!");
};

// SYNC COM FILTRO DE LOJA
function sync() {
    const q = query(collection(db, "carros"), where("lojaId", "==", auth.currentUser.uid));
    onSnapshot(q, snap => {
        const grid = document.getElementById("listaCarros");
        grid.innerHTML = snap.docs.map(d => {
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
        const sel = document.getElementById("vendedor-select");
        const list = document.getElementById("listaVendedores");
        const vends = snap.docs.map(d => ({id: d.id, ...d.data()}));
        sel.innerHTML = vends.map(v => `<option value="${v.whats}">${v.nome}</option>`).join('');
        list.innerHTML = vends.map(v => `<div class="card-client">${v.nome}</div>`).join('');
    });
}

window.salvarVeiculo = async () => {
    const btn = document.getElementById("btn-salvar");
    btn.innerText = "Salvando...";
    const sel = document.getElementById("vendedor-select");
    const fotos = [await compress(document.getElementById("f1").files[0]), await compress(document.getElementById("f2").files[0]), await compress(document.getElementById("f3").files[0])].filter(f => f !== "");

    await addDoc(collection(db, "carros"), {
        lojaId: auth.currentUser.uid, // <-- ISOLAMENTO
        modelo: document.getElementById("modelo").value,
        preco: parseFloat(document.getElementById("preco").value),
        vendedorWhats: sel.value,
        vendedorNome: sel.options[sel.selectedIndex].text,
        fotos: fotos,
        data: new Date().toISOString()
    });
    btn.innerText = "SALVAR";
    window.nav('showroom');
};

window.addVendedor = async () => {
    await addDoc(collection(db, "vendedores"), {
        lojaId: auth.currentUser.uid, // <-- ISOLAMENTO
        nome: document.getElementById("v-nome").value,
        whats: document.getElementById("v-whats").value
    });
};

window.delCarro = async (id) => { if(confirm("Apagar?")) await deleteDoc(doc(db, "carros", id)); };

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
