import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, query, where, deleteDoc, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CONFIGURAÇÃO FIREBASE
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
window.logoBase64 = "";

/* ==========================================================================
   FUNÇÕES DE INTERFACE (WINDOW) - Colocadas no topo para evitar Uncaught TypeError
   ========================================================================== */

window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const targetTab = document.getElementById(id);
    const targetBtn = document.getElementById('btn-' + id);
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
};

window.handlePhoto = (input, slotId, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.fotosCarro[index] = e.target.result;
        document.getElementById(slotId).innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
    };
    if(input.files[0]) reader.readAsDataURL(input.files[0]);
};

window.handleLogo = (input) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.logoBase64 = e.target.result;
        const preview = document.getElementById('preview-logo');
        if(preview) preview.innerHTML = `<img src="${e.target.result}" style="max-height: 100%; max-width: 100%; object-fit: contain;">`;
    };
    if(input.files[0]) reader.readAsDataURL(input.files[0]);
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
    document.getElementById('form-title').innerText = "Editando " + c.modelo;
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
    window.nav('showroom');
};

/* ==========================================================================
   AÇÕES DE BANCO DE DADOS
   ========================================================================== */

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
            alert("Veículo atualizado!");
        } else {
            dados.fotos = window.fotosCarro.filter(f => f !== "");
            dados.dataCriacao = new Date();
            await addDoc(collection(db, "carros"), dados);
            alert("Veículo cadastrado!");
        }
        window.limparFormEstoque();
    } catch (e) { alert("Erro ao salvar."); }
};

window.salvarConfig = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const dados = {
        corLoja: document.getElementById('cor-loja').value,
        logo: window.logoBase64
    };
    try {
        await setDoc(doc(db, "configuracoes", user.uid), dados);
        alert("Configurações salvas!");
    } catch (e) { alert("Erro ao salvar config."); }
};

window.fazerLogin = () => {
    const e = document.getElementById('email-login').value;
    const s = document.getElementById('pass-login').value;
    signInWithEmailAndPassword(auth, e, s).catch(() => alert("Acesso negado."));
};

window.handleLogout = () => signOut(auth).then(() => location.reload());

window.excluirDoc = async (coll, id) => {
    if(confirm("Excluir definitivamente?")) await deleteDoc(doc(db, coll, id));
};

window.limparFormEstoque = () => {
    document.getElementById('edit-carro-id').value = "";
    document.getElementById('form-title').innerHTML = '<i class="fa fa-car"></i> Gerenciar Veículo';
    document.querySelectorAll('#showroom input, #showroom textarea').forEach(i => i.value = "");
    window.fotosCarro = ["", "", ""];
    document.querySelectorAll('.photo-slot').forEach(s => s.innerHTML = '<i class="fa fa-plus"></i>');
    document.getElementById('btn-cancel-edit').classList.add('hidden');
};

window.addVendedor = async () => {
    const nome = document.getElementById('nome-vendedor').value;
    const whats = document.getElementById('whats-vendedor').value;
    if(!nome || !whats) return alert("Preencha tudo");
    await addDoc(collection(db, "vendedores"), { lojaId: auth.currentUser.uid, nome, whats });
    document.getElementById('nome-vendedor').value = "";
    document.getElementById('whats-vendedor').value = "";
};

/* ==========================================================================
   MONITORES E INICIALIZAÇÃO
   ========================================================================== */

const iniciarMonitores = (user) => {
    // Monitor de Estoque
    onSnapshot(query(collection(db, "carros"), where("lojaId", "==", user.uid)), (snap) => {
        const lista = document.getElementById('lista-estoque-admin');
        let total = 0, vendidos = 0, valorTotal = 0;
        lista.innerHTML = '';
        snap.forEach(d => {
            const c = d.data();
            total++;
            if(c.status === 'vendido') { vendidos++; valorTotal += c.preco; }
            lista.innerHTML += `
                <div class="item-admin-card">
                    <img src="${c.fotos[0] || ''}" style="width:60px; height:40px; object-fit:cover; border-radius:5px; background:#eee;">
                    <div style="flex:1"><strong>${c.modelo}</strong></div>
                    <button class="nav-item" style="width:auto; padding:8px" onclick="window.prepararEdicaoCarro('${d.id}', '${encodeURIComponent(JSON.stringify(c))}')"><i class="fa fa-edit"></i></button>
                    <button class="nav-item" style="width:auto; padding:8px; color:red" onclick="window.excluirDoc('carros', '${d.id}')"><i class="fa fa-trash"></i></button>
                </div>`;
        });
        document.getElementById('stat-total-estoque').innerText = total;
        document.getElementById('stat-vendidos-mes').innerText = vendidos;
        document.getElementById('stat-valor-estoque').innerText = "R$ " + valorTotal.toLocaleString();
    });

    // Monitor de Leads (CRM) - IMPORTANTE: Requer o índice que o console sugeriu!
    const qLeads = query(collection(db, "interesses"), where("lojaId", "==", user.uid), orderBy("data", "desc"));
    onSnapshot(qLeads, (snap) => {
        const crm = document.getElementById('lista-clientes-crm');
        crm.innerHTML = '';
        snap.forEach(d => {
            const lead = d.data();
            crm.innerHTML += `
                <div class="item-admin-card">
                    <div style="flex:1"><strong>${lead.carro}</strong><br><small>${lead.nome} - ${lead.vendedor}</small></div>
                    <button onclick="window.excluirDoc('interesses', '${d.id}')" style="background:gray; color:white; border:none; padding:5px 10px; border-radius:5px;">OK</button>
                </div>`;
        });
    }, (error) => {
        console.warn("Aguardando criação de índice no Firebase para mostrar os Leads...");
    });

    // Monitor de Configurações
    onSnapshot(doc(db, "configuracoes", user.uid), (s) => {
        if(s.exists()){
            const d = s.data();
            if(d.corLoja) document.getElementById('cor-loja').value = d.corLoja;
            if(d.logo) {
                window.logoBase64 = d.logo;
                const preview = document.getElementById('preview-logo');
                if(preview) preview.innerHTML = `<img src="${d.logo}" style="max-height: 100%; max-width: 100%; object-fit: contain;">`;
            }
        }
    });
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        iniciarMonitores(user);
        
        onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", user.uid)), (snap) => {
            const sel = document.getElementById('vendedor-carro');
            const listaVend = document.getElementById('lista-vendedores');
            if (sel) sel.innerHTML = '<option value="">Selecione...</option>';
            if (listaVend) listaVend.innerHTML = '';
            
            snap.forEach(v => {
                const vend = v.data();
                if(sel) sel.innerHTML += `<option value="${v.id}">${vend.nome}</option>`;
                if(listaVend) listaVend.innerHTML += `<div class="item-admin-card"><strong>${vend.nome}</strong><button onclick="window.excluirDoc('vendedores', '${v.id}')"><i class="fa fa-trash"></i></button></div>`;
            });
        });
    } else {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('auth-status').innerText = "Aguardando login...";
    }
});
