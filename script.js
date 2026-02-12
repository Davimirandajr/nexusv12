import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, query, where, deleteDoc, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CONFIGURAÇÃO DO SEU PROJETO
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

// VARIÁVEIS GLOBAIS DE MÍDIA
window.fotosCarro = ["", "", ""];
window.logoBase64 = "";

/* ==========================================================================
   NAVEGAÇÃO (CONTROLE DE ABAS)
   ========================================================================== */
window.nav = (id) => {
    // Remove active de todas as seções e botões
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    // Ativa a seção e o botão clicado
    const targetTab = document.getElementById(id);
    const targetBtn = document.getElementById('btn-' + id);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
};

/* ==========================================================================
   AUTENTICAÇÃO (LOGIN/LOGOUT)
   ========================================================================== */
window.fazerLogin = () => {
    const email = document.getElementById('email-login').value;
    const pass = document.getElementById('pass-login').value;
    const status = document.getElementById('auth-status');

    status.innerText = "Autenticando...";
    
    signInWithEmailAndPassword(auth, email, pass)
        .then(() => {
            status.innerText = "Acesso concedido!";
        })
        .catch((error) => {
            status.innerText = "Erro: Usuário ou senha inválidos.";
            console.error(error);
        });
};

window.handleLogout = () => {
    signOut(auth).then(() => location.reload());
};

/* ==========================================================================
   ESTOQUE (VEÍCULOS)
   ========================================================================== */
window.handlePhoto = (input, slotId, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.fotosCarro[index] = e.target.result;
        document.getElementById(slotId).innerHTML = `<img src="${e.target.result}">`;
    };
    if (input.files[0]) reader.readAsDataURL(input.files[0]);
};

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
            alert("Veículo atualizado com sucesso!");
        } else {
            dados.fotos = window.fotosCarro.filter(f => f !== "");
            dados.dataCriacao = new Date();
            await addDoc(collection(db, "carros"), dados);
            alert("Veículo cadastrado no estoque!");
        }
        window.limparFormEstoque();
    } catch (e) {
        alert("Erro ao salvar. Verifique os campos.");
    }
};

window.limparFormEstoque = () => {
    document.getElementById('edit-carro-id').value = "";
    document.querySelectorAll('#showroom input, #showroom textarea').forEach(i => i.value = "");
    window.fotosCarro = ["", "", ""];
    document.querySelectorAll('.slot').forEach(s => s.innerHTML = '<i class="fa fa-camera"></i>');
    document.getElementById('form-title').innerText = "Novo Veículo";
};

/* ==========================================================================
   CRM E EQUIPE
   ========================================================================== */
window.addVendedor = async () => {
    const nome = document.getElementById('nome-vendedor').value;
    const whats = document.getElementById('whats-vendedor').value;
    if (!nome || !whats) return alert("Preencha nome e WhatsApp");

    await addDoc(collection(db, "vendedores"), {
        lojaId: auth.currentUser.uid,
        nome: nome,
        whats: whats
    });
    document.getElementById('nome-vendedor').value = "";
    document.getElementById('whats-vendedor').value = "";
};

window.excluirDoc = async (coll, id) => {
    if (confirm("Tem certeza que deseja excluir?")) {
        await deleteDoc(doc(db, coll, id));
    }
};

window.copiarLinkPortal = () => {
    // Garante que o link aponte para portal.html na mesma pasta
    const link = `${window.location.origin}${window.location.pathname.replace('index.html', '')}portal.html?loja=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(link).then(() => {
        alert("🚀 Link do seu Portal copiado! Envie para seus clientes.");
    });
};

/* ==========================================================================
   CONFIGURAÇÕES VISUAIS
   ========================================================================== */
window.handleLogo = (input) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.logoBase64 = e.target.result;
        document.getElementById('preview-logo').innerHTML = `<img src="${e.target.result}" style="max-height:100%">`;
    };
    if (input.files[0]) reader.readAsDataURL(input.files[0]);
};

window.salvarConfig = async () => {
    const cor = document.getElementById('cor-loja').value;
    await setDoc(doc(db, "configuracoes", auth.currentUser.uid), {
        corLoja: cor,
        logo: window.logoBase64
    });
    alert("Identidade visual salva!");
};

/* ==========================================================================
   MONITORES EM TEMPO REAL (LISTENERS)
   ========================================================================== */
const iniciarMonitores = (user) => {
    // Monitor de Carros (Estoque)
    onSnapshot(query(collection(db, "carros"), where("lojaId", "==", user.uid)), (snap) => {
        const lista = document.getElementById('lista-estoque-admin');
        const statT = document.getElementById('stat-total');
        const statV = document.getElementById('stat-vendidos');
        
        let total = 0, vendidos = 0;
        lista.innerHTML = '';

        snap.forEach(d => {
            const c = d.data();
            total++;
            if (c.status === 'vendido') vendidos++;

            lista.innerHTML += `
                <div class="card-item">
                    <img src="${c.fotos[0] || ''}" style="width:50px; height:40px; object-fit:cover; border-radius:5px;">
                    <div style="flex:1"><b>${c.modelo}</b></div>
                    <button onclick="window.excluirDoc('carros', '${d.id}')" style="color:red; border:none; background:none; cursor:pointer;"><i class="fa fa-trash"></i></button>
                </div>`;
        });
        if(statT) statT.innerText = total;
        if(statV) statV.innerText = vendidos;
    });

    // Monitor de Vendedores (Equipe)
    onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", user.uid)), (snap) => {
        const vList = document.getElementById('lista-vendedores');
        const selectVendedor = document.getElementById('vendedor-carro');
        vList.innerHTML = '';
        selectVendedor.innerHTML = '<option value="">Vendedor Responsável</option>';

        snap.forEach(v => {
            const ven = v.data();
            vList.innerHTML += `
                <div class="card-item">
                    <div style="flex:1"><b>${ven.nome}</b></div>
                    <button onclick="window.excluirDoc('vendedores', '${v.id}')" style="border:none; background:none; cursor:pointer;">X</button>
                </div>`;
            selectVendedor.innerHTML += `<option value="${v.id}">${ven.nome}</option>`;
        });
    });

    // Monitor de Leads (CRM) - Protegido contra erro de índice
    const qLeads = query(collection(db, "interesses"), where("lojaId", "==", user.uid), orderBy("data", "desc"));
    onSnapshot(qLeads, (snap) => {
        const crm = document.getElementById('lista-clientes-crm');
        crm.innerHTML = '';
        snap.forEach(d => {
            const l = d.data();
            crm.innerHTML += `
                <div class="crm-card">
                    <div><b>${l.nome}</b> está interessado no carro <b>${l.carro}</b></div>
                    <button onclick="window.excluirDoc('interesses', '${d.id}')" class="btn-main" style="padding: 5px 15px;">OK</button>
                </div>`;
        });
    }, (err) => {
        console.warn("Aguardando índice do Firebase...");
        document.getElementById('lista-clientes-crm').innerHTML = "<p>O banco de dados está sendo indexado. Os leads aparecerão em breve.</p>";
    });
};

/* ==========================================================================
   INICIALIZAÇÃO DO APP
   ========================================================================== */
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        iniciarMonitores(user);
    } else {
        document.getElementById('login-screen').style.display = 'flex';
    }
});
