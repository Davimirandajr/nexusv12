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

let veiculoFotos = ["", "", "", ""];
let logoEmpresa = "";
let todosVeiculos = [];

// --- GESTÃO DE IMAGENS ---
const compress = (file, callback, size = 800) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = size / img.width;
            canvas.width = size;
            canvas.height = img.height * scale;
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            callback(canvas.toDataURL('image/jpeg', 0.7));
        };
    };
    reader.readAsDataURL(file);
};

window.handlePhoto = (input, slotId, index) => {
    compress(input.files[0], (data) => {
        veiculoFotos[index] = data;
        document.getElementById(slotId).innerHTML = `<img src="${data}">`;
    });
};

window.handleLogo = (input) => {
    compress(input.files[0], (data) => {
        logoEmpresa = data;
        document.getElementById('logo-preview').innerHTML = `<img src="${data}">`;
    }, 400);
};

// --- SALVAMENTO INTEGRADO ---
window.salvarVeiculo = async () => {
    await addDoc(collection(db, "carros"), {
        lojaId: auth.currentUser.uid,
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        ano: document.getElementById('ano').value,
        km: Number(document.getElementById('km').value),
        cambio: document.getElementById('cambio').value,
        preco: Number(document.getElementById('preco').value),
        descricao: document.getElementById('descricao').value,
        fotos: veiculoFotos.filter(f => f !== ""),
        status: 'disponivel'
    });
    alert("Veículo Publicado!");
    location.reload(); // Limpa os campos
};

window.salvarCliente = async () => {
    await addDoc(collection(db, "clientes"), {
        lojaId: auth.currentUser.uid,
        nome: document.getElementById('c-nome').value,
        whats: document.getElementById('c-whats').value,
        veiculo: document.getElementById('c-veiculo').value,
        etapa: 'novo'
    });
    alert("Lead Criado!");
};

window.salvarVendedor = async () => {
    await addDoc(collection(db, "vendedores"), {
        lojaId: auth.currentUser.uid,
        nome: document.getElementById('v-nome').value,
        whats: document.getElementById('v-whats').value
    });
    alert("Vendedor Salvo!");
};

window.salvarConfig = async () => {
    await setDoc(doc(db, "configuracoes", auth.currentUser.uid), {
        corLoja: document.getElementById('cor-loja').value,
        logoLoja: logoEmpresa,
        lojaId: auth.currentUser.uid
    }, { merge: true });
    alert("Identidade Atualizada!");
};

// --- NAVEGAÇÃO E SYNC ---
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-nav'));
    document.getElementById(id).classList.add('active');
    document.getElementById('btn-'+id)?.classList.add('active-nav');
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        document.getElementById("menu-lateral").classList.remove("hidden");
        sincronizar(user.uid);
    } else {
        document.getElementById("login-form").classList.remove("hidden");
    }
});

function sincronizar(uid) {
    // Sync Carros + Filtro
    onSnapshot(query(collection(db, "carros"), where("lojaId", "==", uid)), (snap) => {
        todosVeiculos = snap.docs.map(d => ({id: d.id, ...d.data()}));
        renderEstoque(todosVeiculos);
        document.getElementById("c-veiculo").innerHTML = todosVeiculos.map(v => `<option>${v.marca} ${v.modelo}</option>`).join('');
    });

    // Sync Funil
    onSnapshot(query(collection(db, "clientes"), where("lojaId", "==", uid)), (snap) => {
        const colNovo = document.getElementById("f-novo");
        const colNeg = document.getElementById("f-negocio");
        const colGan = document.getElementById("f-ganho");
        colNovo.innerHTML = ""; colNeg.innerHTML = ""; colGan.innerHTML = "";
        snap.forEach(d => {
            const c = d.data();
            const card = `<div class="lead-card"><b>${c.nome}</b><br>${c.veiculo}<br>
            <button onclick="window.moverEtapa('${d.id}', '${c.etapa === 'novo' ? 'negocio' : 'ganho'}')">Mover >></button></div>`;
            if(c.etapa === 'novo') colNovo.innerHTML += card;
            if(c.etapa === 'negocio') colNeg.innerHTML += card;
            if(c.etapa === 'ganho') colGan.innerHTML += card;
        });
    });

    // Sync Vendedores
    onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", uid)), (snap) => {
        document.getElementById("listaVendedores").innerHTML = snap.docs.map(d => `<div>${d.data().nome} <button onclick="window.excluir('${d.id}', 'vendedores')">X</button></div>`).join('');
    });
}

function renderEstoque(lista) {
    document.getElementById("listaCarros").innerHTML = lista.map(v => `
        <div class="card" style="display:flex; gap:15px; align-items:center;">
            <img src="${v.fotos[0] || ''}" style="width:80px; height:60px; object-fit:cover; border-radius:5px;">
            <div style="flex:1"><b>${v.marca} ${v.modelo}</b><br>R$ ${v.preco.toLocaleString()}</div>
            <button onclick="window.excluir('${v.id}', 'carros')" style="color:red; background:none; border:none; cursor:pointer;">Excluir</button>
        </div>
    `).join('');
}

window.filtrarEstoque = () => {
    const b = document.getElementById('busca-estoque').value.toLowerCase();
    renderEstoque(todosVeiculos.filter(v => v.marca.toLowerCase().includes(b) || v.modelo.toLowerCase().includes(b)));
};

window.moverEtapa = (id, etapa) => updateDoc(doc(db, "clientes", id), { etapa });
window.excluir = (id, col) => confirm("Apagar?") && deleteDoc(doc(db, col, id));
window.fazerLogin = () => signInWithEmailAndPassword(auth, document.getElementById('email-login').value, document.getElementById('pass-login').value);
window.handleLogout = () => signOut(auth).then(() => location.reload());
window.copyPortalLink = () => {
    const link = window.location.origin + "/portal.html?loja=" + auth.currentUser.uid;
    navigator.clipboard.writeText(link);
    alert("Link do Portal Copiado!");
};
