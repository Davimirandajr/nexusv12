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

// MENU & NAVEGAÇÃO
window.toggleSidebar = () => {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("active");
    document.querySelector("#toggle-menu i").className = sidebar.classList.contains("active") ? "fa fa-times" : "fa fa-bars";
};

window.nav = (id) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (window.innerWidth <= 768) window.toggleSidebar();
};

// AUTH
window.handleLogin = async () => {
    const e = document.getElementById("email-login").value;
    const s = document.getElementById("senha-login").value;
    try { await signInWithEmailAndPassword(auth, e, s); } catch { alert("Erro de Login!"); }
};
window.handleLogout = () => signOut(auth);

onAuthStateChanged(auth, user => {
    document.getElementById("login").classList.toggle("hidden", !!user);
    document.getElementById("app").classList.toggle("hidden", !user);
    if(user) { document.getElementById("loader").style.display="none"; sync(); syncVendedores(); }
});

// VENDEDORES
window.addVendedor = async () => {
    const nome = document.getElementById("v-nome").value;
    const whats = document.getElementById("v-whats").value.replace(/\D/g,'');
    await addDoc(collection(db, "vendedores"), { nome, whats });
    alert("Vendedor Salvo!");
};

function syncVendedores() {
    onSnapshot(collection(db, "vendedores"), snap => {
        const vends = snap.docs.map(d => ({id: d.id, ...d.data()}));
        document.getElementById("vendedor-select").innerHTML = vends.map(v => `<option value="${v.whats}">${v.nome}</option>`).join('');
        document.getElementById("listaVendedores").innerHTML = vends.map(v => `
            <div class="card-client" style="border-left: 4px solid var(--y)">
                <h4>${v.nome}</h4><p>Whats: ${v.whats}</p>
                <button onclick="window.removerVend('${v.id}')" style="color:red;background:none;border:none;cursor:pointer">Excluir</button>
            </div>`).join('');
    });
}
window.removerVend = async (id) => { if(confirm("Excluir?")) await deleteDoc(doc(db, "vendedores", id)); };

// ESTOQUE
function sync() {
    onSnapshot(query(collection(db, "carros"), orderBy("data", "desc")), snap => {
        const grid = document.getElementById("listaCarros");
        const carros = snap.docs.map(d => ({id: d.id, ...d.data()}));
        grid.innerHTML = carros.map(c => `
            <div class="card" onmouseenter="this.querySelector('.img-v').style.backgroundImage='url(${c.fotos[1] || c.fotos[0]})'" 
                              onmouseleave="this.querySelector('.img-v').style.backgroundImage='url(${c.fotos[0]})'">
                <div class="img-v" style="background-image: url('${c.fotos[0]}')"></div>
                <div class="info">
                    <h3>${c.modelo}</h3>
                    <p class="price">R$ ${c.preco.toLocaleString()}</p>
                    <p style="font-size:0.8rem">${c.vendedorNome || 'Sem vendedor'}</p>
                    <button onclick="window.removerCarro('${c.id}')" style="color:red;background:none;border:none;cursor:pointer">Remover</button>
                </div>
            </div>`).join('');
        const total = carros.reduce((a,b) => a + (b.preco || 0), 0);
        document.getElementById("stat-total").innerText = total.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    });
}

window.salvarVeiculo = async () => {
    const btn = document.getElementById("btn-salvar");
    btn.innerText = "Processando...";
    const sel = document.getElementById("vendedor-select");
    const f1 = await compress(document.getElementById("fotoFrente").files[0]);
    const f2 = await compress(document.getElementById("fotoTraseira").files[0]);
    const f3 = await compress(document.getElementById("fotoInterior").files[0]);
    
    await addDoc(collection(db, "carros"), {
        modelo: document.getElementById("modelo").value,
        preco: parseFloat(document.getElementById("preco").value),
        km: document.getElementById("km").value,
        cambio: document.getElementById("cambio").value,
        vendedorWhats: sel.value,
        vendedorNome: sel.options[sel.selectedIndex].text,
        fotos: [f1, f2, f3].filter(f => f !== ""),
        data: new Date().toISOString()
    });
    window.nav('showroom');
    btn.innerText = "SALVAR NO SISTEMA";
};

window.removerCarro = async (id) => { if(confirm("Remover?")) await deleteDoc(doc(db, "carros", id)); };

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
