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

// NAVEGAÇÃO E ACESSO
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

window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

// SINCRONIZAÇÃO EM TEMPO REAL
function startSync(uid) {
    // Sincronizar Carros
    onSnapshot(query(collection(db, "carros"), where("lojaId", "==", uid)), (snap) => {
        const grid = document.getElementById("listaCarros");
        grid.innerHTML = "";
        snap.forEach(d => {
            const c = d.data();
            grid.innerHTML += `
                <div class="car-card">
                    <div class="img-container"><div class="car-img" style="background-image:url('${c.fotos[0] || ''}')"></div></div>
                    <div class="car-info">
                        <h3>${c.modelo}</h3>
                        <p class="car-price">R$ ${Number(c.preco).toLocaleString('pt-BR')}</p>
                        <p style="font-size:0.75rem; color:gray;">Resp: ${c.vendedorNome || 'Nenhum'}</p>
                        <div style="margin-top:10px;">
                            <button onclick='window.prepararEdicao("${d.id}", ${JSON.stringify(c).replace(/'/g, "&apos;")})' class="btn-edit">Editar</button>
                            <button onclick="window.excluirCarro('${d.id}')" class="btn-del">Excluir</button>
                        </div>
                    </div>
                </div>`;
        });
    });

    // Sincronizar Equipe no Lista e no Select
    onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", uid)), (snap) => {
        const list = document.getElementById("listaVendedores");
        const select = document.getElementById("vendedor-select");
        list.innerHTML = "";
        select.innerHTML = '<option value="">Selecione o Vendedor</option>';
        snap.forEach(d => {
            const v = d.data();
            list.innerHTML += `<div class="v-list-item"><span>${v.nome}</span> <button onclick="window.excluirVendedor('${d.id}')">×</button></div>`;
            select.innerHTML += `<option value="${v.whats}|${v.nome}">${v.nome}</option>`;
        });
    });
}

// SALVAR/ATUALIZAR (CORREÇÃO DE FOTOS E WHATS)
window.salvarVeiculo = async () => {
    const vData = document.getElementById("vendedor-select").value.split('|');
    const dados = {
        lojaId: auth.currentUser.uid,
        modelo: document.getElementById("modelo").value,
        preco: document.getElementById("preco").value,
        descricao: document.getElementById("descricao").value,
        vendedorWhats: vData[0] || "",
        vendedorNome: vData[1] || "",
        fotos: fotosData.filter(f => f !== ""), // Só salva fotos que existem
        status: 'leads'
    };

    if(!dados.vendedorWhats) return alert("Selecione um vendedor antes!");

    if(editId) {
        await updateDoc(doc(db, "carros", editId), dados);
    } else {
        await addDoc(collection(db, "carros"), dados);
    }
    alert("Dados salvos!");
    window.resetForm();
    window.nav('showroom');
};

// PREPARAR EDIÇÃO (AQUI RESOLVE O PROBLEMA DAS FOTOS NÃO MUDAREM)
window.prepararEdicao = (id, d) => {
    editId = id;
    document.getElementById("modelo").value = d.modelo;
    document.getElementById("preco").value = d.preco;
    document.getElementById("descricao").value = d.descricao || "";
    
    // Reseta e Carrega as fotos do carro selecionado
    fotosData = ["", "", "", ""]; 
    for(let i=1; i<=4; i++) {
        const slot = document.getElementById(`p${i}`);
        if(d.fotos && d.fotos[i-1]) {
            fotosData[i-1] = d.fotos[i-1];
            slot.innerHTML = `<img src="${d.fotos[i-1]}" style="width:100%;height:100%;object-fit:cover;">`;
        } else {
            slot.innerHTML = "+";
        }
    }

    document.getElementById("form-title").innerText = "Editando: " + d.modelo;
    document.getElementById("btn-salvar").innerText = "ATUALIZAR VEÍCULO";
    document.getElementById("btn-cancelar").classList.remove("hidden");
    window.nav('adicionar');
};

window.resetForm = () => {
    editId = null;
    document.getElementById("modelo").value = "";
    document.getElementById("preco").value = "";
    document.getElementById("descricao").value = "";
    fotosData = ["", "", "", ""];
    for(let i=1; i<=4; i++) document.getElementById(`p${i}`).innerHTML = "+";
    document.getElementById("form-title").innerText = "Novo Veículo";
    document.getElementById("btn-salvar").innerText = "SALVAR NO ESTOQUE";
    document.getElementById("btn-cancelar").classList.add("hidden");
};

// PREVIEW DE FOTO
window.preview = (input, id) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const index = parseInt(id.replace('p',''))-1;
        fotosData[index] = e.target.result;
        document.getElementById(id).innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
    };
    reader.readAsDataURL(input.files[0]);
};

// OUTRAS FUNÇÕES
window.addVendedor = async () => {
    const whatsLimpo = document.getElementById("v-whats").value.replace(/\D/g,'');
    await addDoc(collection(db, "vendedores"), { 
        lojaId: auth.currentUser.uid, 
        nome: document.getElementById("v-nome").value, 
        whats: whatsLimpo 
    });
    alert("Vendedor Adicionado!");
    document.getElementById("v-nome").value = "";
    document.getElementById("v-whats").value = "";
};

window.copyPortalLink = () => {
    const link = `${window.location.origin}${window.location.pathname.replace('index.html','')}portal.html?loja=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(link);
    alert("Link do Portal copiado!");
};

window.excluirCarro = (id) => confirm("Excluir carro?") && deleteDoc(doc(db, "carros", id));
window.excluirVendedor = (id) => confirm("Remover vendedor?") && deleteDoc(doc(db, "vendedores", id));
window.handleLogin = () => signInWithEmailAndPassword(auth, document.getElementById("email-login").value, document.getElementById("senha-login").value).catch(e => alert("Erro: " + e.message));
window.handleLogout = () => signOut(auth);
