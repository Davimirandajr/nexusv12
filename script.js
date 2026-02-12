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

window.veiculoFotos = ["", "", "", ""];
window.logoEmpresa = "";

// COMPRESSÃO DE IMAGEM
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
    if(input.files[0]) compress(input.files[0], (data) => {
        window.veiculoFotos[index] = data;
        document.getElementById(slotId).innerHTML = `<img src="${data}">`;
    });
};

window.handleLogo = (input) => {
    if(input.files[0]) compress(input.files[0], (data) => {
        window.logoEmpresa = data;
        document.getElementById('logo-preview').innerHTML = `<img src="${data}" style="max-height:100%">`;
    }, 400);
};

// CRUD CARROS
window.salvarVeiculo = async () => {
    const vSelect = document.getElementById('vendedor-carro');
    const vWhats = vSelect.options[vSelect.selectedIndex].getAttribute('data-whats');
    const vNome = vSelect.options[vSelect.selectedIndex].text;

    await addDoc(collection(db, "carros"), {
        lojaId: auth.currentUser.uid,
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        ano: document.getElementById('ano').value,
        motor: document.getElementById('motor').value,
        cor: document.getElementById('cor').value,
        km: Number(document.getElementById('km').value),
        cambio: document.getElementById('cambio').value,
        preco: Number(document.getElementById('preco').value),
        descricao: document.getElementById('descricao').value,
        vendedorNome: vNome,
        vendedorWhats: vWhats,
        fotos: window.veiculoFotos.filter(f => f !== ""),
        status: 'disponivel'
    });
    alert("Veículo Publicado!");
    location.reload();
};

// CRM E VENDEDORES
window.salvarVendedor = async () => {
    await addDoc(collection(db, "vendedores"), {
        lojaId: auth.currentUser.uid,
        nome: document.getElementById('v-nome').value,
        whats: document.getElementById('v-whats').value.replace(/\D/g,'')
    });
    alert("Vendedor Salvo!");
};

window.salvarConfig = async () => {
    await setDoc(doc(db, "configuracoes", auth.currentUser.uid), {
        corLoja: document.getElementById('cor-loja').value,
        logoLoja: window.logoEmpresa
    }, { merge: true });
    alert("Layout Atualizado!");
};

// NAVEGAÇÃO
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-nav'));
    document.getElementById(id).classList.add('active');
    document.getElementById('btn-'+id).classList.add('active-nav');
};

// AUTENTICAÇÃO E SYNC
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        document.getElementById("menu-lateral").classList.remove("hidden");
        
        // Sync Vendedores para o Select do Carro
        onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", user.uid)), (snap) => {
            const select = document.getElementById('vendedor-carro');
            select.innerHTML = '<option value="">Selecione um Vendedor</option>';
            snap.forEach(d => {
                select.innerHTML += `<option value="${d.id}" data-whats="${d.data().whats}">${d.data().nome}</option>`;
            });
        });

        // Sync Estoque para Lista do Admin
        onSnapshot(query(collection(db, "carros"), where("lojaId", "==", user.uid)), (snap) => {
            const lista = document.getElementById('listaCarros');
            lista.innerHTML = snap.docs.map(d => `<div class="lead-card"><b>${d.data().marca} ${d.data().modelo}</b> <button onclick="window.excluir('${d.id}', 'carros')" style="float:right; color:red; background:none; border:none;">Excluir</button></div>`).join('');
        });
    } else {
        document.getElementById("login-form").classList.remove("hidden");
    }
});

window.fazerLogin = () => signInWithEmailAndPassword(auth, document.getElementById('email-login').value, document.getElementById('pass-login').value);
window.handleLogout = () => signOut(auth).then(() => location.reload());
window.excluir = (id, col) => confirm("Apagar?") && deleteDoc(doc(db, col, id));
window.copyPortalLink = () => {
    const link = window.location.origin + window.location.pathname.replace('index.html', '') + "portal.html?loja=" + auth.currentUser.uid;
    navigator.clipboard.writeText(link);
    alert("Link Copiado!");
};
