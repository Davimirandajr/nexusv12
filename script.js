import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, updateDoc, deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBOCli1HzoijZ1gcplo_18tKH-5Umb63q8",
    authDomain: "nexus-v12.firebaseapp.com",
    projectId: "nexus-v12",
    storageBucket: "nexus-v12.firebasestorage.app",
    messagingSenderId: "587840382224",
    appId: "1:587840382224:web:61c0f1890c7c395dc77195"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// NAVEGAÇÃO
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelector(`[data-tab="${id}"]`).classList.add('active');
};

// --- GESTÃO DE ESTOQUE ---
window.salvarVeiculo = async () => {
    const user = auth.currentUser;
    const dados = {
        lojaId: user.uid,
        marca: document.getElementById('v-marca').value,
        modelo: document.getElementById('v-modelo').value,
        ano: document.getElementById('v-ano').value,
        km: Number(document.getElementById('v-km').value),
        cambio: document.getElementById('v-cambio').value,
        preco: Number(document.getElementById('v-preco').value),
        descricao: document.getElementById('v-desc').value,
        status: 'disponivel',
        fotos: [] // Implementar preview de fotos se desejar
    };
    await addDoc(collection(db, "carros"), dados);
    alert("Carro Adicionado!");
};

// --- GESTÃO DE VENDEDORES ---
window.salvarVendedor = async () => {
    const user = auth.currentUser;
    await addDoc(collection(db, "vendedores"), {
        lojaId: user.uid,
        nome: document.getElementById('vend-nome').value,
        whats: document.getElementById('vend-whats').value
    });
    alert("Vendedor Cadastrado!");
};

// --- CRM E FUNIL DE VENDAS ---
window.salvarCliente = async () => {
    const user = auth.currentUser;
    await addDoc(collection(db, "clientes"), {
        lojaId: user.uid,
        nome: document.getElementById('c-nome').value,
        whats: document.getElementById('c-whats').value,
        veiculoInteresse: document.getElementById('c-veiculo').value,
        etapa: 'novo', // Etapas: novo, negociacao, ganho
        data: new Date().toLocaleDateString()
    });
};

window.moverEtapa = async (id, novaEtapa, veiculoId) => {
    await updateDoc(doc(db, "clientes", id), { etapa: novaEtapa });
    
    // Se a venda for ganha, marca o carro como vendido automaticamente
    if(novaEtapa === 'ganho' && veiculoId) {
        // Busca o documento do carro pelo modelo ou ID e atualiza
        const q = query(collection(db, "carros"), where("modelo", "==", veiculoId));
        onSnapshot(q, (s) => {
            s.forEach(carDoc => updateDoc(doc(db, "carros", carDoc.id), { status: 'vendido' }));
        });
    }
};

// --- SINCRONIZAÇÃO EM TEMPO REAL ---
onAuthStateChanged(auth, (user) => {
    if(user) {
        // Sincroniza Estoque
        onSnapshot(query(collection(db, "carros"), where("lojaId", "==", user.uid)), (snap) => {
            const list = document.getElementById("listaEstoque");
            const select = document.getElementById("c-veiculo");
            list.innerHTML = ""; select.innerHTML = "";
            snap.forEach(d => {
                const c = d.data();
                if(c.status === 'disponivel') {
                    select.innerHTML += `<option value="${c.modelo}">${c.marca} ${c.modelo}</option>`;
                    list.innerHTML += `<div class="card-form"><b>${c.marca} ${c.modelo}</b><br>R$ ${c.preco.toLocaleString()}</div>`;
                }
            });
        });

        // Sincroniza Vendedores
        onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", user.uid)), (snap) => {
            const tb = document.getElementById("tabelaVendedores");
            tb.innerHTML = "";
            snap.forEach(d => {
                const v = d.data();
                tb.innerHTML += `<tr><td>${v.nome}</td><td>${v.whats}</td><td><button onclick="window.excluir('${d.id}', 'vendedores')">Excluir</button></td></tr>`;
            });
        });

        // Sincroniza Funil de Clientes
        onSnapshot(query(collection(db, "clientes"), where("lojaId", "==", user.uid)), (snap) => {
            const colNovo = document.getElementById("f-novo");
            const colNeg = document.getElementById("f-negocio");
            const colGanho = document.getElementById("f-ganho");
            colNovo.innerHTML = ""; colNeg.innerHTML = ""; colGanho.innerHTML = "";

            snap.forEach(d => {
                const c = d.data();
                const card = `
                    <div class="customer-card">
                        <b>${c.nome}</b><br><small>${c.veiculoInteresse}</small><br>
                        ${c.etapa !== 'ganho' ? `<button onclick="window.moverEtapa('${d.id}', '${c.etapa === 'novo' ? 'negociacao' : 'ganho'}', '${c.veiculoInteresse}')">Mover >> </button>` : '✅ Vendido'}
                    </div>`;
                if(c.etapa === 'novo') colNovo.innerHTML += card;
                if(c.etapa === 'negociacao') colNeg.innerHTML += card;
                if(c.etapa === 'ganho') colGanho.innerHTML += card;
            });
        });
    }
});

window.excluir = async (id, col) => confirm("Deseja excluir?") && await deleteDoc(doc(db, col, id));
