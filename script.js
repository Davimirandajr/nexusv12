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

let fotosData = ["", "", "", ""];
let editId = null;

// NAVEGAÇÃO
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    const btn = document.querySelector(`[onclick="window.nav('${id}')"]`);
    if(btn) btn.classList.add('active');
};

// ACESSO
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("login").classList.remove("active");
        document.getElementById("app").classList.remove("hidden");
        window.nav('showroom');
        startSync(user.uid);
    } else {
        document.getElementById("login").classList.add("active");
        document.getElementById("app").classList.add("hidden");
    }
});

// SYNC REALTIME
function startSync(uid) {
    // Carros
    onSnapshot(query(collection(db, "carros"), where("lojaId", "==", uid)), (snap) => {
        const grid = document.getElementById("listaCarros");
        grid.innerHTML = "";
        snap.forEach(d => {
            const c = d.data();
            grid.innerHTML += `
                <div class="car-card">
                    <div class="car-img" style="background-image:url('${c.fotos[0] || ''}')"></div>
                    <div class="car-info">
                        <h3>${c.modelo}</h3>
                        <p class="car-price">R$ ${Number(c.preco).toLocaleString('pt-BR')}</p>
                        <div style="margin-top:10px;">
                            <button onclick='window.prepararEdicao("${d.id}", ${JSON.stringify(c)})' style="color:blue; border:none; background:none; cursor:pointer;">Editar</button>
                            <button onclick="window.excluirCarro('${d.id}')" style="color:red; border:none; background:none; cursor:pointer; margin-left:15px;">Excluir</button>
                        </div>
                    </div>
                </div>`;
        });
    });

    // Equipe
    onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", uid)), (snap) => {
        const list = document.getElementById("listaVendedores");
        list.innerHTML = "";
        snap.forEach(d => {
            const v = d.data();
            list.innerHTML += `<div class="v-list-item"><span>${v.nome} (${v.whats})</span> <button onclick="window.excluirVendedor('${d.id}')" style="color:red; border:none; background:none; cursor:pointer;">Remover</button></div>`;
        });
    });
}

// SALVAR E EDITAR
window.salvarVeiculo = async () => {
    const btn = document.getElementById("btn-salvar");
    const dados = {
        lojaId: auth.currentUser.uid,
        modelo: document.getElementById("modelo").value,
        preco: document.getElementById("preco").value,
        descricao: document.getElementById("descricao").value,
        fotos: fotosData.filter(f => f !== ""),
        status: 'leads'
    };

    btn.innerText = "PROCESSANDO...";
    if(editId) {
        await updateDoc(doc(db, "carros", editId), dados);
        alert("Veículo Atualizado!");
    } else {
        await addDoc(collection(db, "carros"), dados);
        alert("Veículo Cadastrado!");
    }
    window.resetForm();
    window.nav('showroom');
};

window.prepararEdicao = (id, dados) => {
    editId = id;
    document.getElementById("modelo").value = dados.modelo;
    document.getElementById("preco").value = dados.preco;
    document.getElementById("descricao").value = dados.descricao || "";
    fotosData = dados.fotos || ["","","",""];
    
    // Atualiza visualmente os slots
    fotosData.forEach((foto, i) => {
        if(foto) document.getElementById(`p${i+1}`).innerHTML = `<img src="${foto}">`;
    });

    document.getElementById("form-title").innerText = "Editando Veículo";
    document.getElementById("btn-salvar").innerText = "ATUALIZAR DADOS";
    document.getElementById("btn-cancelar").classList.remove("hidden");
    window.nav('adicionar');
};

window.resetForm = () => {
    editId = null;
    document.getElementById("modelo").value = "";
    document.getElementById("preco").value = "";
    document.getElementById("descricao").value = "";
    fotosData = ["","","",""];
    for(let i=1; i<=4; i++) document.getElementById(`p${i}`).innerHTML = "+";
    document.getElementById("form-title").innerText = "Cadastrar Veículo";
    document.getElementById("btn-salvar").innerText = "SALVAR NO ESTOQUE";
    document.getElementById("btn-cancelar").classList.add("hidden");
};

// PORTAL LINK (CORRIGIDO)
window.copyPortalLink = () => {
    const link = `${window.location.origin}${window.location.pathname.replace('index.html','')}portal.html?loja=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(link);
    alert("Link do Portal Copiado!");
};

// APOIO
window.preview = (input, id) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        fotosData[parseInt(id.replace('p',''))-1] = e.target.result;
        document.getElementById(id).innerHTML = `<img src="${e.target.result}">`;
    };
    reader.readAsDataURL(input.files[0]);
};

window.addVendedor = async () => {
    await addDoc(collection(db, "vendedores"), { lojaId: auth.currentUser.uid, nome: document.getElementById("v-nome").value, whats: document.getElementById("v-whats").value });
    alert("Vendedor Adicionado!");
};

window.excluirCarro = (id) => confirm("Excluir?") && deleteDoc(doc(db, "carros", id));
window.excluirVendedor = (id) => confirm("Remover?") && deleteDoc(doc(db, "vendedores", id));
window.handleLogin = () => signInWithEmailAndPassword(auth, document.getElementById("email-login").value, document.getElementById("senha-login").value).catch(() => alert("Erro no Login!"));
window.handleLogout = () => signOut(auth);
