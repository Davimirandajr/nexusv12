import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
let fotosData = ["","","","",""];

// NAVEGAÇÃO
window.nav = (id) => {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    const btn = document.querySelector(`[onclick="window.nav('${id}')"]`);
    if(btn) btn.classList.add('active');
    document.getElementById("sidebar").classList.remove("open");
};

window.toggleMenu = () => document.getElementById("sidebar").classList.toggle("open");

// AUTH
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("login").classList.remove("active");
        document.getElementById("app").classList.remove("hidden");
        window.nav('showroom');
        syncData();
    } else {
        document.getElementById("login").classList.add("active");
        document.getElementById("app").classList.add("hidden");
    }
});

window.handleLogin = () => {
    const e = document.getElementById("email-login").value;
    const s = document.getElementById("senha-login").value;
    signInWithEmailAndPassword(auth, e, s).catch(err => alert("Acesso negado!"));
};

window.handleLogout = () => signOut(auth);

// FOTOS PREVIEW
window.preview = (input, id) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const idx = parseInt(id.replace('p','')) - 1;
        fotosData[idx] = e.target.result;
        document.getElementById(id).innerHTML = `<img src="${e.target.result}">`;
    };
    reader.readAsDataURL(input.files[0]);
};

// SALVAR VEÍCULO
window.salvarVeiculo = async () => {
    const btn = document.getElementById("btn-salvar");
    btn.innerText = "SALVANDO...";
    try {
        await addDoc(collection(db, "carros"), {
            lojaId: auth.currentUser.uid,
            modelo: document.getElementById("modelo").value,
            preco: document.getElementById("preco").value,
            vendedorWhats: document.getElementById("vendedor-select").value,
            fotos: fotosData.filter(f => f !== ""),
            status: 'leads'
        });
        alert("Sucesso!");
        window.nav('showroom');
        location.reload();
    } catch (e) { alert("Erro ao salvar."); }
};

// SYNC REALTIME
function syncData() {
    const q = query(collection(db, "carros"), where("lojaId", "==", auth.currentUser.uid));
    onSnapshot(q, (snap) => {
        const grid = document.getElementById("listaCarros");
        const lLeads = document.getElementById("col-leads");
        grid.innerHTML = ""; lLeads.innerHTML = "";
        snap.forEach(d => {
            const c = d.data();
            const card = `<div class="card">
                <div class="card-img" style="background-image:url(${c.fotos[0]})"></div>
                <div class="card-body">
                    <h4>${c.modelo}</h4>
                    <p style="color:var(--gold)">R$ ${c.preco}</p>
                    <button onclick="window.del('${d.id}')" style="color:red; background:none; border:none; cursor:pointer; font-size:10px; margin-top:10px;">EXCLUIR</button>
                </div>
            </div>`;
            grid.innerHTML += card;
            if(c.status === 'leads') lLeads.innerHTML += card;
        });
    });

    onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", auth.currentUser.uid)), snap => {
        const sel = document.getElementById("vendedor-select");
        const list = document.getElementById("listaVendedores");
        sel.innerHTML = `<option value="">Selecione o Vendedor</option>`;
        list.innerHTML = "";
        snap.forEach(d => {
            const v = d.data();
            sel.innerHTML += `<option value="${v.whats}">${v.nome}</option>`;
            list.innerHTML += `<p>${v.nome} - ${v.whats}</p>`;
        });
    });
}

window.addVendedor = async () => {
    await addDoc(collection(db, "vendedores"), {
        lojaId: auth.currentUser.uid,
        nome: document.getElementById("v-nome").value,
        whats: document.getElementById("v-whats").value
    });
    alert("Vendedor cadastrado!");
};

window.del = (id) => confirm("Apagar?") && deleteDoc(doc(db, "carros", id));

window.copyPortalLink = () => {
    const link = `${window.location.origin}/portal.html?loja=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(link);
    alert("Link copiado!");
};
