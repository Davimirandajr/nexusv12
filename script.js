import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, query, where, deleteDoc, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. CONFIGURAÇÃO DO SEU FIREBASE
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

// Variáveis Globais para Mídia
window.fotosCarro = ["", "", ""];
window.logoBase64 = "";

/* ==========================================================================
   NAVEGAÇÃO (CONTROLE DE TELAS)
   ========================================================================== */
window.nav = (id) => {
    // Esconde todas as seções
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    // Remove destaque de todos os botões do menu
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    // Ativa apenas a seção e o botão clicados
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

    if(!email || !pass) return alert("Por favor, preencha E-mail e Senha.");

    status.innerText = "Verificando credenciais...";
    signInWithEmailAndPassword(auth, email, pass)
        .catch((error) => {
            status.innerText = "Erro ao acessar portal.";
            alert("Falha no login: " + error.message);
        });
};

window.handleLogout = () => {
    signOut(auth).then(() => location.reload());
};

/* ==========================================================================
   PROCESSAMENTO DE IMAGENS (PREVINE O ERRO DE 1MB)
   ========================================================================== */
const comprimirImagem = (file, maxWidth, quality = 0.6) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        };
    });
};

window.handlePhoto = async (input, slotId, index) => {
    if (input.files[0]) {
        // Redimensiona fotos dos carros para 800px
        const base64 = await comprimirImagem(input.files[0], 800);
        window.fotosCarro[index] = base64;
        document.getElementById(slotId).innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
    }
};

window.handleLogo = async (input) => {
    if (input.files[0]) {
        // Redimensiona logo para 400px (tamanho ideal e leve)
        window.logoBase64 = await comprimirImagem(input.files[0], 400);
        document.getElementById('preview-logo').innerHTML = `<img src="${window.logoBase64}" style="max-height:80px;">`;
    }
};

/* ==========================================================================
   ESTOQUE (VEÍCULOS)
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
        fotos: window.fotosCarro.filter(f => f !== ""),
        dataAlteracao: new Date()
    };

    try {
        if (idEdit) {
            await updateDoc(doc(db, "carros", idEdit), dados);
            alert("Veículo atualizado!");
        } else {
            dados.dataCriacao = new Date();
            await addDoc(collection(db, "carros"), dados);
            alert("Veículo adicionado ao estoque!");
        }
        window.limparFormEstoque();
    } catch (e) {
        alert("Erro ao salvar. Verifique o console.");
        console.error(e);
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
   VENDEDORES E CRM (LEADS)
   ========================================================================== */
window.addVendedor = async () => {
    const nome = document.getElementById('nome-vendedor').value;
    const whats = document.getElementById('whats-vendedor').value;
    if(!nome || !whats) return alert("Preencha nome e WhatsApp!");

    await addDoc(collection(db, "vendedores"), {
        lojaId: auth.currentUser.uid,
        nome: nome,
        whats: whats
    });
    document.getElementById('nome-vendedor').value = "";
    document.getElementById('whats-vendedor').value = "";
};

window.excluirDoc = async (coll, id) => {
    if(confirm("Deseja realmente excluir este registro?")) {
        await deleteDoc(doc(db, coll, id));
    }
};

/* ==========================================================================
   CONFIGURAÇÕES DA LOJA
   ========================================================================== */
window.salvarConfig = async () => {
    const cor = document.getElementById('cor-loja').value;
    try {
        await setDoc(doc(db, "configuracoes", auth.currentUser.uid), {
            corLoja: cor,
            logo: window.logoBase64
        });
        alert("Aparência da loja atualizada com sucesso!");
    } catch (e) {
        alert("Erro ao salvar configurações.");
    }
};

window.copiarLinkPortal = () => {
    const link = `${window.location.origin}${window.location.pathname.replace('index.html', '')}portal.html?loja=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(link).then(() => {
        alert("Link do Portal copiado! Envie para seus clientes.");
    });
};

/* ==========================================================================
   MONITORES EM TEMPO REAL (LISTENERS)
   ========================================================================== */
const iniciarMonitores = (user) => {
    // Monitor de Estoque
    onSnapshot(query(collection(db, "carros"), where("lojaId", "==", user.uid)), (snap) => {
        const lista = document.getElementById('lista-estoque-admin');
        const statTotal = document.getElementById('stat-total');
        const statVend = document.getElementById('stat-vendidos');
        let total = 0, vendidos = 0;
        
        lista.innerHTML = '';
        snap.forEach(d => {
            const c = d.data();
            total++;
            if(c.status === 'vendido') vendidos++;
            lista.innerHTML += `
                <div class="card-item">
                    <img src="${c.fotos[0] || ''}" style="width:50px; height:40px; object-fit:cover; border-radius:5px;">
                    <div style="flex:1; margin-left:10px;"><b>${c.modelo}</b></div>
                    <button onclick="window.excluirDoc('carros', '${d.id}')" style="color:#e11d48; border:none; background:none; cursor:pointer;"><i class="fa fa-trash"></i></button>
                </div>`;
        });
        if(statTotal) statTotal.innerText = total;
        if(statVend) statVend.innerText = vendidos;
    });

    // Monitor de Vendedores
    onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", user.uid)), (snap) => {
        const vList = document.getElementById('lista-vendedores');
        const selectV = document.getElementById('vendedor-carro');
        vList.innerHTML = '';
        selectV.innerHTML = '<option value="">Vendedor Responsável</option>';
        snap.forEach(v => {
            const data = v.data();
            vList.innerHTML += `<div class="card-item"><b>${data.nome}</b> <button onclick="window.excluirDoc('vendedores', '${v.id}')" style="border:none; background:none; color:red; cursor:pointer;">X</button></div>`;
            selectV.innerHTML += `<option value="${v.id}">${data.nome}</option>`;
        });
    });

    // Monitor de CRM (Leads) - Protegido contra Erro de Índice
    const qLeads = query(collection(db, "interesses"), where("lojaId", "==", user.uid), orderBy("data", "desc"));
    onSnapshot(qLeads, (snap) => {
        const crm = document.getElementById('lista-clientes-crm');
        crm.innerHTML = '';
        snap.forEach(d => {
            const l = d.data();
            crm.innerHTML += `
                <div class="crm-card">
                    <span><b>${l.nome}</b> tem interesse no carro: <b>${l.carro}</b></span>
                    <button onclick="window.excluirDoc('interesses', '${d.id}')" class="btn-main" style="padding: 5px 15px;">Concluído</button>
                </div>`;
        });
    }, (err) => {
        console.warn("Dica: Clique no link do erro acima para criar o índice no Firebase.");
    });
};

/* ==========================================================================
   INICIALIZAÇÃO DO SISTEMA
   ========================================================================== */
onAuthStateChanged(auth, (user) => {
    const loginScreen = document.getElementById('login-screen');
    if (user) {
        loginScreen.style.display = 'none';
        iniciarMonitores(user);
    } else {
        loginScreen.style.display = 'flex';
    }
});
