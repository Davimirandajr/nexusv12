/* NEXUS V12 - CORE ENGINE 
   Cores: Branco, Vermelho e Dourado
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. CONFIGURAÇÃO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyBOCli1HzoijZ1gcplo_18tKH-5Umb63q8",
    authDomain: "nexus-v12.firebaseapp.com",
    projectId: "nexus-v12",
    storageBucket: "nexus-v12.firebasestorage.app",
    messagingSenderId: "587840382224",
    appId: "1:587840382224:web:61c0f1890c7c395dc77195"
};

// Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Estado Global
let fotosData = ["", "", "", "", ""];

/* --- SISTEMA DE NAVEGAÇÃO --- */
window.nav = (id) => {
    // Esconde todas as abas
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Remove destaque dos botões
    const btns = document.querySelectorAll('.nav-item');
    btns.forEach(btn => btn.classList.remove('active'));

    // Ativa a aba e o botão correto
    const target = document.getElementById(id);
    if (target) target.classList.add('active');

    const activeBtn = document.querySelector(`[onclick="window.nav('${id}')"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Fecha menu mobile após clique
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.remove("open");
};

window.toggleMenu = () => {
    document.getElementById("sidebar").classList.toggle("open");
};

/* --- AUTENTICAÇÃO --- */
onAuthStateChanged(auth, (user) => {
    const loginScreen = document.getElementById("login");
    const appScreen = document.getElementById("app");

    if (user) {
        if (loginScreen) loginScreen.classList.remove("active");
        if (appScreen) appScreen.classList.remove("hidden");
        window.nav('showroom');
        startRealtimeSync();
    } else {
        if (loginScreen) loginScreen.classList.add("active");
        if (appScreen) appScreen.classList.add("hidden");
    }
});

window.handleLogin = () => {
    const email = document.getElementById("email-login").value;
    const pass = document.getElementById("senha-login").value;

    if (!email || !pass) return alert("Preencha todos os campos.");

    signInWithEmailAndPassword(auth, email, pass)
        .catch(error => {
            console.error(error);
            alert("Falha na autenticação: Verifique e-mail e senha.");
        });
};

window.handleLogout = () => {
    if (confirm("Deseja sair do sistema?")) signOut(auth);
};

/* --- SINCRONIZAÇÃO EM TEMPO REAL --- */
function startRealtimeSync() {
    const q = query(collection(db, "carros"), where("lojaId", "==", auth.currentUser.uid));

    onSnapshot(q, (snap) => {
        const showroomGrid = document.getElementById("listaCarros");
        const colLeads = document.getElementById("col-leads");
        const colNegoc = document.getElementById("col-negociacao");
        const colVend = document.getElementById("col-vendidos");

        // Limpa tudo antes de renderizar (evita duplicados)
        if (showroomGrid) showroomGrid.innerHTML = "";
        if (colLeads) colLeads.innerHTML = "";
        if (colNegoc) colNegoc.innerHTML = "";
        if (colVend) colVend.innerHTML = "";

        snap.forEach(docSnap => {
            const carro = docSnap.data();
            const id = docSnap.id;

            // PREVENÇÃO DE ERRO 404/UNDEFINED:
            // Se fotos não existem ou o array está vazio, usa imagem padrão.
            const fotoUrl = (carro.fotos && carro.fotos.length > 0 && carro.fotos[0] !== "") 
                            ? carro.fotos[0] 
                            : 'https://via.placeholder.com/400x250?text=Sem+Imagem';

            const cardHtml = `
                <div class="car-card">
                    <div class="car-img" style="background-image: url('${fotoUrl}')"></div>
                    <div class="car-info">
                        <h3>${carro.modelo || 'Modelo não definido'}</h3>
                        <p class="car-price">R$ ${Number(carro.preco || 0).toLocaleString('pt-BR')}</p>
                        <div class="card-actions">
                            <select onchange="window.updateStatus('${id}', this.value)" class="status-select">
                                <option value="leads" ${carro.status === 'leads' ? 'selected' : ''}>Novo Lead</option>
                                <option value="negociacao" ${carro.status === 'negociacao' ? 'selected' : ''}>Em Negociação</option>
                                <option value="vendido" ${carro.status === 'vendido' ? 'selected' : ''}>Vendido</option>
                            </select>
                            <button onclick="window.excluirVeiculo('${id}')" class="btn-delete"><i class="fa fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `;

            // Adiciona ao Showroom Geral
            if (showroomGrid) showroomGrid.innerHTML += cardHtml;

            // Adiciona às colunas do Funil
            if (carro.status === 'leads' && colLeads) colLeads.innerHTML += cardHtml;
            if (carro.status === 'negociacao' && colNegoc) colNegoc.innerHTML += cardHtml;
            if (carro.status === 'vendido' && colVend) colVend.innerHTML += cardHtml;
        });
    });

    // Sincroniza lista de vendedores para o SELECT de cadastro
    onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", auth.currentUser.uid)), snap => {
        const select = document.getElementById("vendedor-select");
        if (select) {
            select.innerHTML = '<option value="">Selecione um vendedor</option>';
            snap.forEach(d => {
                const v = d.data();
                select.innerHTML += `<option value="${v.whats}">${v.nome}</option>`;
            });
        }
    });
}

/* --- FUNÇÕES DE VEÍCULO --- */
window.preview = (input, slotId) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const index = parseInt(slotId.replace('p', '')) - 1;
        fotosData[index] = e.target.result;
        document.getElementById(slotId).innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
    };
    if (input.files[0]) reader.readAsDataURL(input.files[0]);
};

window.salvarVeiculo = async () => {
    const modelo = document.getElementById("modelo").value;
    const preco = document.getElementById("preco").value;
    const btn = document.getElementById("btn-salvar");

    if (!modelo || !preco) return alert("Por favor, preencha modelo e preço.");

    btn.innerText = "CADASTRANDO...";
    btn.disabled = true;

    try {
        await addDoc(collection(db, "carros"), {
            lojaId: auth.currentUser.uid,
            modelo: modelo,
            preco: preco,
            fotos: fotosData.filter(f => f !== ""),
            status: 'leads',
            dataCriacao: new Date().getTime()
        });
        
        alert("Veículo cadastrado com sucesso!");
        fotosData = ["", "", "", "", ""]; // Reseta fotos
        window.nav('showroom');
        location.reload(); // Recarrega para limpar formulário
    } catch (e) {
        alert("Erro ao salvar dados.");
        btn.disabled = false;
        btn.innerText = "SALVAR NO ESTOQUE";
    }
};

window.updateStatus = async (id, novoStatus) => {
    await updateDoc(doc(db, "carros", id), { status: novoStatus });
};

window.excluirVeiculo = async (id) => {
    if (confirm("Tem certeza que deseja remover este veículo?")) {
        await deleteDoc(doc(db, "carros", id));
    }
};

/* --- EQUIPE --- */
window.addVendedor = async () => {
    const nome = document.getElementById("v-nome").value;
    const whats = document.getElementById("v-whats").value;

    if (!nome || !whats) return alert("Dados incompletos.");

    await addDoc(collection(db, "vendedores"), {
        lojaId: auth.currentUser.uid,
        nome: nome,
        whats: whats
    });

    alert("Vendedor adicionado!");
    document.getElementById("v-nome").value = "";
    document.getElementById("v-whats").value = "";
};

window.copyPortalLink = () => {
    const link = `${window.location.origin}/portal.html?loja=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(link);
    alert("Link do Showroom copiado para clientes!");
};
