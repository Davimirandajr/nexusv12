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

let fotosData = ["", "", "", "", ""];

// AUTH MONITOR
onAuthStateChanged(auth, (user) => {
    document.getElementById("loader").style.display = "none";
    if (user) {
        document.getElementById("login").classList.remove("active");
        document.getElementById("app").classList.remove("hidden");
        syncData();
    } else {
        document.getElementById("login").classList.add("active");
        document.getElementById("app").classList.add("hidden");
    }
});

// NAVEGAÇÃO RÍGIDA
window.nav = (pageId) => {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(pageId).classList.add('active');
    event.currentTarget.classList.add('active');
};

// PREVIEW FOTOS
window.preview = async (input, slotId) => {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const index = parseInt(slotId.replace('p', '')) - 1;
            fotosData[index] = e.target.result;
            document.getElementById(slotId).innerHTML = `<img src="${e.target.result}">`;
        };
    }
};

// SYNC
function syncData() {
    if (!auth.currentUser) return;
    const q = query(collection(db, "carros"), where("lojaId", "==", auth.currentUser.uid));
    
    onSnapshot(q, (snap) => {
        const grid = document.getElementById("listaCarros");
        const cLeads = document.getElementById("col-leads");
        const cNegoc = document.getElementById("col-negociacao");
        const cVend = document.getElementById("col-vendidos");

        grid.innerHTML = ""; cLeads.innerHTML = ""; cNegoc.innerHTML = ""; cVend.innerHTML = "";

        snap.forEach(docSnap => {
            const c = docSnap.data();
            const card = `
                <div class="card">
                    <div class="card-img" style="background-image:url(${c.fotos[0]})"></div>
                    <div class="card-body">
                        <h3>${c.modelo}</h3>
                        <p class="price">R$ ${Number(c.preco).toLocaleString()}</p>
                        <button onclick="window.delCarro('${docSnap.id}')" style="background:none; border:none; color:red; cursor:pointer; font-size:12px; margin-top:10px;">EXCLUIR</button>
                    </div>
                </div>`;
            
            grid.innerHTML += card;
            if (c.status === 'leads') cLeads.innerHTML += card;
            else if (c.status === 'negociacao') cNegoc.innerHTML += card;
            else if (c.status === 'vendidos') cVend.innerHTML += card;
        });
    });

    // Sync Vendedores
    onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", auth.currentUser.uid)), snap => {
        const sel = document.getElementById("vendedor-select");
        const lista = document.getElementById("listaVendedores");
        sel.innerHTML = ""; lista.innerHTML = "";
        snap.forEach(d => {
            const v = d.data();
            sel.innerHTML += `<option value="${v.whats}">${v.nome}</option>`;
            lista.innerHTML += `<p style="padding:10px; border-bottom:1px solid #222;">${v.nome} - ${v.whats}</p>`;
        });
    });
}

// SALVAR
window.salvarVeiculo = async () => {
    const btn = document.getElementById("btn-salvar");
    btn.innerText = "SALVANDO...";
    const validPhotos = fotosData.filter(f => f !== "");
    
    await addDoc(collection(db, "carros"), {
        lojaId: auth.currentUser.uid,
        modelo: document.getElementById("modelo").value,
        preco: parseFloat(document.getElementById("preco").value),
        vendedorWhats: document.getElementById("vendedor-select").value,
        fotos: validPhotos,
        status: 'leads',
        data: new Date().toISOString()
    });
    
    alert("Veículo Adicionado!");
    window.nav('showroom');
    btn.innerText = "SALVAR VEÍCULO";
};

window.addVendedor = async () => {
    await addDoc(collection(db, "vendedores"), {
        lojaId: auth.currentUser.uid,
        nome: document.getElementById("v-nome").value,
        whats: document.getElementById("v-whats").value
    });
    alert("Vendedor Cadastrado!");
};

window.handleLogin = () => {
    signInWithEmailAndPassword(auth, document.getElementById("email-login").value, document.getElementById("senha-login").value);
};
window.handleLogout = () => signOut(auth);
window.delCarro = (id) => confirm("Apagar?") && deleteDoc(doc(db, "carros", id));
window.gerarLinkShowroom = () => {
    const link = window.location.origin + "/portal.html?loja=" + auth.currentUser.uid;
    navigator.clipboard.writeText(link);
    alert("Link do seu Showroom Copiado!");
};
