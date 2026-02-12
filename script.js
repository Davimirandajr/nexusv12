import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CONFIGURAÇÃO FIREBASE (Mantenha seus dados aqui)
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

// Estados Globais
window.fotosCarro = ["", "", ""];

// --- 1. AUTENTICAÇÃO ---
window.fazerLogin = () => {
    const e = document.getElementById('email-login').value;
    const s = document.getElementById('pass-login').value;
    signInWithEmailAndPassword(auth, e, s).catch(err => alert("Erro no acesso."));
};
window.handleLogout = () => signOut(auth).then(() => location.reload());

// --- 2. GESTÃO DE ESTOQUE (SALVAR / EDITAR) ---
window.salvarVeiculo = async () => {
    const user = auth.currentUser;
    const idEdit = document.getElementById('edit-carro-id').value;
    
    const dados = {
        lojaId: user.uid,
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        preco: Number(document.getElementById('preco').value),
        km: Number(document.getElementById('km').value),
        ano: document.getElementById('ano').value,
        cambio: document.getElementById('cambio').value,
        vendedorId: document.getElementById('vendedor-carro').value,
        status: document.getElementById('status-carro').value,
        descricao: document.getElementById('descricao').value,
        dataUpdate: new Date()
    };

    try {
        if (idEdit) {
            await updateDoc(doc(db, "carros", idEdit), dados);
            alert("Veículo Atualizado!");
        } else {
            dados.fotos = window.fotosCarro.filter(f => f !== "");
            dados.dataCriacao = new Date();
            await addDoc(collection(db, "carros"), dados);
            alert("Veículo Publicado!");
        }
        window.limparFormEstoque();
    } catch (e) { alert("Erro ao salvar dados."); }
};

window.prepararEdicaoCarro = (id, dataJson) => {
    const c = JSON.parse(decodeURIComponent(dataJson));
    document.getElementById('edit-carro-id').value = id;
    document.getElementById('marca').value = c.marca;
    document.getElementById('modelo').value = c.modelo;
    document.getElementById('preco').value = c.preco;
    document.getElementById('km').value = c.km;
    document.getElementById('ano').value = c.ano;
    document.getElementById('cambio').value = c.cambio;
    document.getElementById('vendedor-carro').value = c.vendedorId;
    document.getElementById('status-carro').value = c.status;
    document.getElementById('descricao').value = c.descricao;
    
    document.getElementById('form-title').innerText = "Editando: " + c.modelo;
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
    window.scrollTo(0,0);
};

window.limparFormEstoque = () => {
    document.getElementById('edit-carro-id').value = "";
    document.getElementById('form-title').innerHTML = '<i class="fa fa-plus-circle"></i> Gerenciar Veículo';
    document.querySelectorAll('#showroom input, #showroom textarea').forEach(i => i.value = "");
    document.getElementById('btn-cancel-edit').classList.add('hidden');
};

// --- 3. FUNIL DE VENDAS E MONITORAMENTO ---
const iniciarMonitores = (user) => {
    // Monitor de Estoque e Cotação
    onSnapshot(query(collection(db, "carros"), where("lojaId", "==", user.uid)), (snap) => {
        const lista = document.getElementById('lista-estoque-admin');
        let totalEstoque = 0;
        let vendidosMes = 0;
        let cotacaoTotal = 0;
        
        lista.innerHTML = '';
        snap.forEach(d => {
            const c = d.data();
            totalEstoque++;
            if(c.status === 'vendido') {
                vendidosMes++;
                cotacaoTotal += c.preco;
            }

            lista.innerHTML += `
                <div class="item-admin-card">
                    <img src="${c.fotos[0]}" class="item-thumb">
                    <div style="flex:1">
                        <strong>${c.marca} ${c.modelo}</strong>
                        <p style="font-size:12px; color:gray">${c.ano} | ${c.cambio} | ${c.km}km</p>
                    </div>
                    <span class="badge status-${c.status}">${c.status}</span>
                    <button class="btn-secondary" onclick="window.prepararEdicaoCarro('${d.id}', '${encodeURIComponent(JSON.stringify(c))}')"><i class="fa fa-edit"></i></button>
                    <button class="btn-secondary" style="background:#ff4444" onclick="window.excluirDoc('carros', '${d.id}')"><i class="fa fa-trash"></i></button>
                </div>`;
        });

        document.getElementById('stat-total-estoque').innerText = totalEstoque;
        document.getElementById('stat-vendidos-mes').innerText = vendidosMes;
        document.getElementById('stat-valor-estoque').innerText = "R$ " + cotacaoTotal.toLocaleString();
    });

    // Monitor de CRM (Clientes/Leads)
    onSnapshot(query(collection(db, "interesses"), where("lojaId", "==", user.uid), orderBy("data", "desc")), (snap) => {
        const crm = document.getElementById('lista-clientes-crm');
        crm.innerHTML = '';
        snap.forEach(d => {
            const lead = d.data();
            crm.innerHTML += `
                <div class="crm-card">
                    <div class="crm-info">
                        <h4>${lead.carro}</h4>
                        <p>Interessado via Portal | ${new Date(lead.data.seconds*1000).toLocaleDateString()}</p>
                    </div>
                    <div class="crm-actions">
                        <a href="https://wa.me/${lead.vendedorWhats}" target="_blank" class="btn-whatsapp"><i class="fab fa-whatsapp"></i></a>
                        <button class="btn-secondary" onclick="window.excluirDoc('interesses', '${d.id}')"><i class="fa fa-check"></i> Finalizar</button>
                    </div>
                </div>`;
        });
    });
};

// --- 4. VENDEDORES ---
window.addVendedor = async () => {
    const nome = document.getElementById('nome-vendedor').value;
    const whats = document.getElementById('whats-vendedor').value;
    await addDoc(collection(db, "vendedores"), { lojaId: auth.currentUser.uid, nome, whats });
    alert("Vendedor Adicionado!");
};

// --- UTILITÁRIOS ---
window.excluirDoc = async (coll, id) => {
    if(confirm("Deseja excluir este registro?")) await deleteDoc(doc(db, coll, id));
};

window.handlePhoto = (input, slotId, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.fotosCarro[index] = e.target.result;
        document.getElementById(slotId).innerHTML = `<img src="${e.target.result}">`;
    };
    reader.readAsDataURL(input.files[0]);
};

window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('btn-'+id).classList.add('active');
};

window.toggleMenu = () => document.body.classList.toggle('collapsed');

// Inicialização de Auth
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        iniciarMonitores(user);
        
        // Carregar Vendedores no Select
        onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", user.uid)), (snap) => {
            const sel = document.getElementById('vendedor-carro');
            sel.innerHTML = '';
            snap.forEach(v => sel.innerHTML += `<option value="${v.id}">${v.data().nome}</option>`);
        });
    } else {
        document.getElementById('login-form').classList.remove('hidden');
    }
});
