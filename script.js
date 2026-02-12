import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

window.fotosCarro = [];
window.logoBase64 = "";

// LOGIN
window.fazerLogin = () => {
    const e = document.getElementById('email-login').value;
    const s = document.getElementById('pass-login').value;
    signInWithEmailAndPassword(auth, e, s).catch(() => alert("Acesso Inválido"));
};

// NAVEGAÇÃO
window.toggleMenu = () => document.body.classList.toggle('collapsed');
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

// FOTOS
window.handlePhoto = (input, slotId, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.fotosCarro[index] = e.target.result;
        document.getElementById(slotId).innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">`;
    };
    reader.readAsDataURL(input.files[0]);
};

window.handleLogo = (input) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.logoBase64 = e.target.result;
        document.getElementById('logo-preview').innerHTML = `<img src="${e.target.result}" style="max-height:50px">`;
    };
    reader.readAsDataURL(input.files[0]);
};

// SALVAR CARRO
window.salvarVeiculo = async () => {
    const user = auth.currentUser;
    const carro = {
        lojaId: user.uid,
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        preco: Number(document.getElementById('preco').value),
        ano: document.getElementById('ano').value,
        vendedorId: document.getElementById('vendedor-carro').value,
        descricao: document.getElementById('descricao').value,
        fotos: window.fotosCarro.filter(f => f !== ""),
        dataCriacao: new Date()
    };
    await addDoc(collection(db, "carros"), carro);
    alert("Carro publicado!");
    location.reload();
};

// SALVAR VENDEDOR
window.addVendedor = async () => {
    await addDoc(collection(db, "vendedores"), {
        lojaId: auth.currentUser.uid,
        nome: document.getElementById('nome-vendedor').value,
        whats: document.getElementById('whats-vendedor').value
    });
    alert("Vendedor cadastrado!");
    location.reload();
};

// MONITOR DE ESTADO
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        
        // Carregar Vendedores no Select
        const qV = query(collection(db, "vendedores"), where("lojaId", "==", user.uid));
        const snapV = await getDocs(qV);
        snapV.forEach(v => {
            document.getElementById('vendedor-carro').innerHTML += `<option value="${v.id}">${v.data().nome}</option>`;
        });

        // Carregar Leads
        const qL = query(collection(db, "interesses"), where("lojaId", "==", user.uid));
        onSnapshot(qL, (snap) => {
            const lista = document.getElementById('lista-clientes');
            lista.innerHTML = '';
            snap.forEach(d => {
                const lead = d.data();
                lista.innerHTML += `<div class="card-lead"><strong>${lead.carro}</strong> - ${lead.vendedor}</div>`;
            });
        });

        // Sincronizar Configs
        onSnapshot(doc(db, "configuracoes", user.uid), (s) => {
            if(s.exists()){
                const d = s.data();
                document.documentElement.style.setProperty('--primary', d.corLoja);
            }
        });
    } else {
        document.getElementById('login-form').classList.remove('hidden');
    }
});

window.salvarConfig = async () => {
    await setDoc(doc(db, "configuracoes", auth.currentUser.uid), {
        lojaId: auth.currentUser.uid,
        corLoja: document.getElementById('cor-loja').value,
        logo: window.logoBase64
    });
    alert("Portal Atualizado!");
};

window.copyPortalLink = () => {
    const url = `${window.location.origin}${window.location.pathname.replace('index.html','')}portal.html?loja=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(url);
    alert("Link do Portal Copiado!");
};
