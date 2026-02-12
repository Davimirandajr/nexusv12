import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, setDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let todosCarros = [];

// --- LOGIN ---
window.fazerLogin = () => {
    const e = document.getElementById('email-login').value;
    const s = document.getElementById('pass-login').value;
    signInWithEmailAndPassword(auth, e, s).catch(err => alert("Erro ao entrar."));
};

// --- NAVEGAÇÃO ---
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-nav'));
    document.getElementById(id).classList.add('active');
    document.getElementById('btn-'+id)?.classList.add('active-nav');
};

// --- ESTOQUE E FILTRO ---
window.salvarVeiculo = async () => {
    await addDoc(collection(db, "carros"), {
        lojaId: auth.currentUser.uid,
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        ano: document.getElementById('ano').value,
        km: Number(document.getElementById('km').value),
        cambio: document.getElementById('cambio').value,
        preco: Number(document.getElementById('preco').value),
        status: 'disponivel'
    });
    alert("Adicionado!");
};

window.filtrarEstoque = () => {
    const busca = document.getElementById('busca-estoque').value.toLowerCase();
    const filtrados = todosCarros.filter(c => c.marca.toLowerCase().includes(busca) || c.modelo.toLowerCase().includes(busca));
    renderEstoque(filtrados);
};

function renderEstoque(lista) {
    const div = document.getElementById("listaCarros");
    div.innerHTML = lista.map(c => `
        <div class="card" style="display:flex; justify-content:space-between; ${c.status === 'vendido' ? 'opacity:0.5' : ''}">
            <span><b>${c.marca} ${c.modelo}</b> - R$ ${c.preco.toLocaleString()} (${c.status})</span>
            <button onclick="window.excluir('${c.id}', 'carros')" style="color:red; border:none; background:none; cursor:pointer">Excluir</button>
        </div>
    `).join('');
}

// --- CRM / FUNIL ---
window.salvarCliente = async () => {
    await addDoc(collection(db, "clientes"), {
        lojaId: auth.currentUser.uid,
        nome: document.getElementById('c-nome').value,
        whats: document.getElementById('c-whats').value,
        veiculo: document.getElementById('c-veiculo').value,
        etapa: 'novo'
    });
};

window.moverEtapa = async (id, novaEtapa, veiculoModelo) => {
    await updateDoc(doc(db, "clientes", id), { etapa: novaEtapa });
    if(novaEtapa === 'ganho') {
        const car = todosCarros.find(c => c.modelo === veiculoModelo);
        if(car) await updateDoc(doc(db, "carros", car.id), { status: 'vendido' });
    }
};

// --- SINCRONIZAÇÃO TOTAL ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        document.getElementById("menu-lateral").classList.remove("hidden");

        // Sync Carros
        onSnapshot(query(collection(db, "carros"), where("lojaId", "==", user.uid)), (snap) => {
            todosCarros = snap.docs.map(d => ({id: d.id, ...d.data()}));
            renderEstoque(todosCarros);
            
            // Preenche select de veículos no CRM
            const select = document.getElementById("c-veiculo");
            select.innerHTML = todosCarros.filter(c => c.status === 'disponivel').map(c => `<option value="${c.modelo}">${c.marca} ${c.modelo}</option>`).join('');
        });

        // Sync Clientes (Funil)
        onSnapshot(query(collection(db, "clientes"), where("lojaId", "==", user.uid)), (snap) => {
            const colNovo = document.getElementById("f-novo");
            const colNeg = document.getElementById("f-negocio");
            const colGan = document.getElementById("f-ganho");
            colNovo.innerHTML = ""; colNeg.innerHTML = ""; colGan.innerHTML = "";
            
            snap.forEach(d => {
                const c = d.data();
                const card = `
                    <div class="lead-card">
                        <b>${c.nome}</b><br><small>${c.veiculo}</small><br>
                        ${c.etapa !== 'ganho' ? `<button onclick="window.moverEtapa('${d.id}', '${c.etapa === 'novo' ? 'negocio' : 'ganho'}', '${c.veiculo}')">Mover >></button>` : '💰 Venda Feita'}
                    </div>`;
                if(c.etapa === 'novo') colNovo.innerHTML += card;
                if(c.etapa === 'negocio') colNeg.innerHTML += card;
                if(c.etapa === 'ganho') colGan.innerHTML += card;
            });
        });
    } else {
        document.getElementById("login-form").classList.remove("hidden");
    }
});

window.excluir = (id, col) => confirm("Apagar?") && deleteDoc(doc(db, col, id));
window.copyPortalLink = () => {
    const link = window.location.origin + "/portal.html?loja=" + auth.currentUser.uid;
    navigator.clipboard.writeText(link);
    alert("Link copiado!");
};
window.handleLogout = () => signOut(auth).then(() => location.reload());
