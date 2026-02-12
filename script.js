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

// Estado Global para Fotos
window.fotosCarro = ["", "", ""];

/* ==========================================================================
   NAVEGAÇÃO ENTRE ABAS
   ========================================================================== */
window.nav = (id) => {
    // Esconde todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    // Desativa todos os botões do menu
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    // Ativa a aba e o botão clicado
    const targetTab = document.getElementById(id);
    const targetBtn = document.getElementById('btn-' + id);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
};

/* ==========================================================================
   AUTENTICAÇÃO
   ========================================================================== */
window.fazerLogin = () => {
    const e = document.getElementById('email-login').value;
    const s = document.getElementById('pass-login').value;
    signInWithEmailAndPassword(auth, e, s).catch(() => alert("Acesso negado."));
};

window.handleLogout = () => signOut(auth).then(() => location.reload());

/* ==========================================================================
   ESTOQUE: SALVAR E EDITAR
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
    window.nav('showroom'); // Garante que está na aba de estoque
    window.scrollTo(0,0);
};

window.limparFormEstoque = () => {
    document.getElementById('edit-carro-id').value = "";
    document.getElementById('form-title').innerHTML = '<i class="fa fa-car"></i> Gerenciar Veículo';
    document.querySelectorAll('#showroom input, #showroom textarea').forEach(i => i.value = "");
    document.getElementById('btn-cancel-edit').classList.add('hidden');
};

/* ==========================================================================
   MONITORES EM TEMPO REAL (FUNIL E CRM)
   ========================================================================== */
const iniciarMonitores = (user) => {
    // Monitor de Estoque e Dashboard
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
                    <img src="${c.fotos[0]}" style="width:80px; height:50px; border-radius:5px; object-fit:cover;">
                    <div style="flex:1">
                        <strong>${c.modelo}</strong>
                        <p style="font-size:11px; color:gray">${c.ano} | ${c.cambio}</p>
                    </div>
                    <span class="badge status-${c.status}">${c.status}</span>
                    <button class="nav-item" style="width:auto; padding:5px;" onclick="window.prepararEdicaoCarro('${d.id}', '${encodeURIComponent(JSON.stringify(c))}')"><i class="fa fa-edit"></i></button>
                    <button class="nav-item" style="width:auto; padding:5px; color:red;" onclick="window.excluirDoc('carros', '${d.id}')"><i class="fa fa-trash"></i></button>
                </div>`;
        });
        document.getElementById('stat-total-estoque').innerText = total;
        document.getElementById('stat-vendidos-mes').innerText = vendidos;
        document.getElementById('stat-valor-estoque').innerText = "R$ " + valorTotal.toLocaleString();
    });

    // Monitor de Clientes (Leads)
    onSnapshot(query(collection(db, "interesses"), where("lojaId", "==", user.uid), orderBy("data", "desc")), (snap) => {
        const crm = document.getElementById('lista-clientes-crm');
        crm.innerHTML = '';
        snap.forEach(d => {
            const lead = d.data();
            crm.innerHTML += `
                <div class="item-admin-card">
                    <div style="flex:1">
                        <strong>${lead.carro}</strong>
                        <p style="font-size:12px">Vendedor: ${lead.vendedor}</p>
                    </div>
                    <a href="https://wa.me/${lead.vendedorWhats}" target="_blank" class="btn-primary" style="background:#25d366; padding:8px;"><i class="fab fa-whatsapp"></i></a>
                    <button class="btn-primary" style="background:gray; padding:8px;" onclick="window.excluirDoc('interesses', '${d.id}')"><i class="fa fa-check"></i></button>
                </div>`;
        });
    });
};

/* ==========================================================================
   UTILITÁRIOS E FOTOS
   ========================================================================== */
window.handlePhoto = (input, slotId, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.fotosCarro[index] = e.target.result;
        document.getElementById(slotId).innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
    };
    reader.readAsDataURL(input.files[0]);
};

window.excluirDoc = async (coll, id) => {
    if(confirm("Excluir registro definitivamente?")) await deleteDoc(doc(db, coll, id));
};

// VENDEDORES
window.addVendedor = async () => {
    const nome = document.getElementById('nome-vendedor').value;
    const whats = document.getElementById('whats-vendedor').value;
    if(!nome || !whats) return alert("Preencha tudo");
    await addDoc(collection(db, "vendedores"), { lojaId: auth.currentUser.uid, nome, whats });
    document.getElementById('nome-vendedor').value = "";
    document.getElementById('whats-vendedor').value = "";
};

/* ==========================================================================
   INICIALIZAÇÃO (AUTH)
   ========================================================================== */
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        iniciarMonitores(user);
        
        // Carrega Vendedores no Select do Form
        onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", user.uid)), (snap) => {
            const sel = document.getElementById('vendedor-carro');
            if (sel) {
                sel.innerHTML = '<option value="">Selecione...</option>';
                snap.forEach(v => sel.innerHTML += `<option value="${v.id}">${v.data().nome}</option>`);
            }
            // Lista de vendedores na aba equipe
            const listaVend = document.getElementById('lista-vendedores');
            if(listaVend) {
                listaVend.innerHTML = '';
                snap.forEach(v => listaVend.innerHTML += `<div class="item-admin-card"><strong>${v.data().nome}</strong><span>${v.data().whats}</span><button onclick="window.excluirDoc('vendedores', '${v.id}')">Excluir</button></div>`);
            }
        });
    } else {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('auth-status').innerText = "Aguardando login...";
    }
});
