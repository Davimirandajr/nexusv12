import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

window.fotosCarro = ["", "", ""];
window.logoBase64 = "";

// LOGIN
window.fazerLogin = () => {
    const e = document.getElementById('email-login').value;
    const s = document.getElementById('pass-login').value;
    signInWithEmailAndPassword(auth, e, s).catch(() => alert("Erro ao acessar."));
};

// SIDEBAR
window.toggleMenu = () => {
    document.body.classList.toggle('collapsed');
    document.getElementById('toggle-icon').className = document.body.classList.contains('collapsed') ? 'fa fa-chevron-right' : 'fa fa-chevron-left';
};

window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('btn-' + id).classList.add('active');
};

// IMAGENS
window.handlePhoto = (input, slotId, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.fotosCarro[index] = e.target.result;
        document.getElementById(slotId).innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
    };
    reader.readAsDataURL(input.files[0]);
};

window.handleLogo = (input) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.logoBase64 = e.target.result;
        document.getElementById('logo-preview').innerHTML = `<img src="${e.target.result}" style="max-height:60px">`;
    };
    reader.readAsDataURL(input.files[0]);
};

// CRUD
window.addVendedor = async () => {
    const nome = document.getElementById('nome-vendedor').value;
    const whats = document.getElementById('whats-vendedor').value;
    if(!nome || !whats) return alert("Preencha tudo");
    await addDoc(collection(db, "vendedores"), { lojaId: auth.currentUser.uid, nome, whats });
    alert("Vendedor Salvo!");
    location.reload();
};

window.salvarVeiculo = async () => {
    const fotosLimpas = window.fotosCarro.filter(f => f !== "");
    if(fotosLimpas.length === 0) return alert("Suba ao menos uma foto.");
    
    await addDoc(collection(db, "carros"), {
        lojaId: auth.currentUser.uid,
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        preco: Number(document.getElementById('preco').value),
        ano: document.getElementById('ano').value,
        vendedorId: document.getElementById('vendedor-carro').value,
        descricao: document.getElementById('descricao').value,
        fotos: fotosLimpas,
        data: new Date()
    });
    alert("Veículo Publicado!");
    location.reload();
};

// LEADS E CONFIG
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        
        // Carregar Vendedores no Select e Lista
        const qV = query(collection(db, "vendedores"), where("lojaId", "==", user.uid));
        const snapV = await getDocs(qV);
        const select = document.getElementById('vendedor-carro');
        const listaV = document.getElementById('lista-vendedores');
        snapV.forEach(v => {
            select.innerHTML += `<option value="${v.id}">${v.data().nome}</option>`;
            listaV.innerHTML += `<div class="vendedor-item"><span>${v.data().nome}</span> <span>${v.data().whats}</span></div>`;
        });

        // Carregar Leads (Clientes)
        const qC = query(collection(db, "interesses"), where("lojaId", "==", user.uid));
        onSnapshot(qC, (snap) => {
            const lC = document.getElementById('lista-clientes');
            lC.innerHTML = '';
            snap.forEach(d => {
                const c = d.data();
                lC.innerHTML += `<div style="background:#111; padding:15px; border-radius:10px; margin-bottom:10px; border-left:4px solid var(--primary)">
                    <p><strong>Carro:</strong> ${c.carro}</p>
                    <p><strong>Vendedor:</strong> ${c.vendedor}</p>
                    <p><small>${new Date(c.data.seconds*1000).toLocaleString()}</small></p>
                </div>`;
            });
        });

        // Sincronizar Config
        onSnapshot(doc(db, "configuracoes", user.uid), (s) => {
            if(s.exists()){
                const d = s.data();
                if(d.corLoja) document.documentElement.style.setProperty('--primary', d.corLoja);
                if(d.logo) document.getElementById('logo-preview').innerHTML = `<img src="${d.logo}" style="max-height:60px">`;
            }
        });
    } else {
        document.getElementById('login-form').classList.remove('hidden');
    }
});

window.salvarConfig = async () => {
    await setDoc(doc(db, "configuracoes", auth.currentUser.uid), {
        corLoja: document.getElementById('cor-loja').value,
        logo: window.logoBase64
    }, { merge: true });
    alert("Portal Atualizado!");
};

window.copyPortalLink = () => {
    const link = `${window.location.origin}${window.location.pathname.replace('index.html','')}portal.html?loja=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(link);
    alert("Link do seu portal copiado!");
};

window.handleLogout = () => signOut(auth).then(() => location.reload());
