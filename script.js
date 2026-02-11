import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// NAVEGAÇÃO ENTRE ABAS
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    
    document.getElementById(id).classList.add('active');
    const activeBtn = document.querySelector(`[onclick="window.nav('${id}')"]`);
    if(activeBtn) activeBtn.classList.add('active');
    
    document.getElementById("sidebar").classList.remove("open");
};

window.toggleMenu = () => document.getElementById("sidebar").classList.toggle("open");

// AUTH LOGIC
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("login").classList.remove("active");
        document.getElementById("app").classList.remove("hidden");
        window.nav('showroom');
        startSync();
    } else {
        document.getElementById("login").classList.add("active");
        document.getElementById("app").classList.add("hidden");
    }
});

window.handleLogin = () => {
    const e = document.getElementById("email-login").value;
    const s = document.getElementById("senha-login").value;
    signInWithEmailAndPassword(auth, e, s).catch(() => alert("Falha no login"));
};

window.handleLogout = () => signOut(auth);

// CARDS E FUNIL
function startSync() {
    const q = query(collection(db, "carros"), where("lojaId", "==", auth.currentUser.uid));
    onSnapshot(q, (snap) => {
        const showroom = document.getElementById("listaCarros");
        const cLeads = document.getElementById("col-leads");
        const cNegoc = document.getElementById("col-negociacao");
        const cVend = document.getElementById("col-vendidos");

        showroom.innerHTML = ""; cLeads.innerHTML = ""; cNegoc.innerHTML = ""; cVend.innerHTML = "";

        snap.forEach(d => {
            const c = d.data();
            const cardHtml = `
                <div class="car-card">
                    <div class="car-img" style="background-image:url(${c.fotos[0]})"></div>
                    <div class="car-info">
                        <h3>${c.modelo}</h3>
                        <p class="car-price">R$ ${Number(c.preco).toLocaleString('pt-BR')}</p>
                        <select onchange="window.updateStatus('${d.id}', this.value)" style="width:100%; padding:5px; margin-top:10px;">
                            <option value="leads" ${c.status === 'leads' ? 'selected' : ''}>Novo Lead</option>
                            <option value="negociacao" ${c.status === 'negociacao' ? 'selected' : ''}>Negociação</option>
                            <option value="vendido" ${c.status === 'vendido' ? 'selected' : ''}>Vendido</option>
                        </select>
                        <button onclick="window.excluir('${d.id}')" style="margin-top:10px; color:red; border:none; background:none; cursor:pointer;">Excluir</button>
                    </div>
                </div>`;
            
            showroom.innerHTML += cardHtml;
            if(c.status === 'leads') cLeads.innerHTML += cardHtml;
            if(c.status === 'negociacao') cNegoc.innerHTML += cardHtml;
            if(c.status === 'vendido') cVend.innerHTML += cardHtml;
        });
    });

    // Sync Vendedores
    onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", auth.currentUser.uid)), snap => {
        const select = document.getElementById("vendedor-select");
        const list = document.getElementById("listaVendedores");
        select.innerHTML = ""; list.innerHTML = "";
        snap.forEach(d => {
            const v = d.data();
            select.innerHTML += `<option value="${v.whats}">${v.nome}</option>`;
            list.innerHTML += `<div style="background:white; padding:10px; border-radius:8px; margin-bottom:5px; border:1px solid #ddd">${v.nome} - ${v.whats}</div>`;
        });
    });
}

window.updateStatus = (id, newStatus) => updateDoc(doc(db, "carros", id), { status: newStatus });
window.excluir = (id) => confirm("Excluir definitivamente?") && deleteDoc(doc(db, "carros", id));

window.preview = (input, id) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        fotosData[parseInt(id.replace('p',''))-1] = e.target.result;
        document.getElementById(id).innerHTML = `<img src="${e.target.result}">`;
    };
    reader.readAsDataURL(input.files[0]);
};

window.salvarVeiculo = async () => {
    const btn = document.getElementById("btn-salvar");
    btn.disabled = true; btn.innerText = "Processando...";
    await addDoc(collection(db, "carros"), {
        lojaId: auth.currentUser.uid,
        modelo: document.getElementById("modelo").value,
        preco: document.getElementById("preco").value,
        vendedor: document.getElementById("vendedor-select").value,
        fotos: fotosData.filter(f => f !== ""),
        status: 'leads',
        criadoEm: new Date().getTime()
    });
    alert("Veículo cadastrado!");
    window.nav('showroom');
    location.reload();
};

window.copyPortalLink = () => {
    const link = `${window.location.origin}/portal.html?loja=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(link);
    alert("Link copiado para a área de transferência!");
};
