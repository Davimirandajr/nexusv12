import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, query, where, deleteDoc, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. CONFIGURAÇÃO FIREBASE
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

// Variáveis de suporte
window.fotosCarro = ["", "", ""];
window.logoBase64 = "";

/* ==========================================================================
   FUNÇÕES DE NAVEGAÇÃO E UI
   ========================================================================== */
window.nav = (id) => {
    // Esconde todas as abas e remove active dos botões
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    // Ativa apenas o selecionado
    const targetTab = document.getElementById(id);
    const targetBtn = document.getElementById('btn-' + id);
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
};

/* ==========================================================================
   AUTENTICAÇÃO
   ========================================================================== */
window.fazerLogin = () => {
    const email = document.getElementById('email-login').value;
    const pass = document.getElementById('pass-login').value;
    const status = document.getElementById('auth-status');

    if(!email || !pass) return alert("Preencha todos os campos");

    status.innerText = "Validando acesso...";
    signInWithEmailAndPassword(auth, email, pass)
        .catch(err => {
            status.innerText = "Erro ao acessar: " + err.message;
        });
};

window.handleLogout = () => signOut(auth).then(() => location.reload());

/* ==========================================================================
   TRATAMENTO DE IMAGENS (REDIMENSIONAMENTO)
   ========================================================================== */
const processarImagem = (file, maxWidth, quality, callback) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            callback(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.handlePhoto = (input, slotId, index) => {
    if (input.files[0]) {
        processarImagem(input.files[0], 800, 0.7, (base64) => {
            window.fotosCarro[index] = base64;
            document.getElementById(slotId).innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
        });
    }
};

window.handleLogo = (input) => {
    if (input.files[0]) {
        processarImagem(input.files[0], 400, 0.6, (base64) => {
            window.logoBase64 = base64;
            document.getElementById('preview-logo').innerHTML = `<img src="${base64}" style="max-height:100px;">`;
        });
    }
};

/* ==========================================================================
   ESTOQUE (CARROS)
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
        data: new Date()
    };

    try {
        if (idEdit) {
            await updateDoc(doc(db, "carros", idEdit), dados);
        } else {
            await addDoc(collection(db, "carros"), dados);
        }
        alert("Sucesso!");
        window.limparFormEstoque();
    } catch (e) { console.error(e); alert("Erro ao salvar."); }
};

window.limparFormEstoque = () => {
    document.getElementById('edit-carro-id').value = "";
    document.querySelectorAll('#showroom input, #showroom textarea').forEach(i => i.value = "");
    window.fotosCarro = ["", "", ""];
    document.querySelectorAll('.slot').forEach(s => s.innerHTML = '<i class="fa fa-camera"></i>');
};

/* ==========================================================================
   VENDEDORES E CRM
   ========================================================================== */
window.addVendedor = async () => {
    const nome = document.getElementById('nome-vendedor').value;
    const whats = document.getElementById('whats-vendedor').value;
    if(!nome || !whats) return alert("Preencha tudo");

    await addDoc(collection(db, "vendedores"), {
        lojaId: auth.currentUser.uid,
        nome: nome,
        whats: whats
    });
    document.getElementById('nome-vendedor').value = "";
    document.getElementById('whats-vendedor').value = "";
};

window.excluirDoc = async (coll, id) => {
    if(confirm("Deseja excluir?")) await deleteDoc(doc(db, coll, id));
};

window.copiarLinkPortal = () => {
    const link = `${window.location.origin}${window.location.pathname.replace('index.html', '')}portal.html?loja=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(link);
    alert("🚀 Link do Portal copiado!");
};

window.salvarConfig = async () => {
    const cor = document.getElementById('cor-loja').value;
    await setDoc(doc(db, "configuracoes", auth.currentUser.uid), {
        corLoja: cor,
        logo: window.logoBase64
    });
    alert("Identidade da loja salva!");
};

/* ==========================================================================
   MONITORES EM TEMPO REAL
   ========================================================================== */
const iniciarMonitores = (user) => {
    // Lista Carros Admin
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
                    <img src="${c.fotos[0] || ''}" width="50">
                    <div style="flex:1"><b>${c.modelo}</b></div>
                    <button onclick="window.excluirDoc('carros', '${d.id}')" style="color:red; border:none; background:none; cursor:pointer;"><i class="fa fa-trash"></i></button>
                </div>`;
        });
        if(statTotal) statTotal.innerText = total;
        if(statVend) statVend.innerText = vendidos;
    });

    // Lista Vendedores
    onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", user.uid)), (snap) => {
        const vList = document.getElementById('lista-vendedores');
        const selectV = document.getElementById('vendedor-carro');
        vList.innerHTML = '';
        selectV.innerHTML = '<option value="">Vendedor Responsável</option>';
        snap.forEach(v => {
            const data = v.data();
            vList.innerHTML += `<div class="card-item"><b>${data.nome}</b> <button onclick="window.excluirDoc('vendedores', '${v.id}')">X</button></div>`;
            selectV.innerHTML += `<option value="${v.id}">${data.nome}</option>`;
        });
    });

    // CRM Leads
    const qLeads = query(collection(db, "interesses"), where("lojaId", "==", user.uid), orderBy("data", "desc"));
    onSnapshot(qLeads, (snap) => {
        const crm = document.getElementById('lista-clientes-crm');
        crm.innerHTML = '';
        snap.forEach(d => {
            const l = d.data();
            crm.innerHTML += `<div class="crm-card"><b>${l.nome}</b> - ${l.carro} <button onclick="window.excluirDoc('interesses', '${d.id}')">OK</button></div>`;
        });
    }, (err) => {
        console.warn("Aguardando índice...");
    });
};

/* ==========================================================================
   INICIALIZAÇÃO
   ========================================================================== */
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        iniciarMonitores(user);
    } else {
        document.getElementById('login-screen').style.display = 'flex';
    }
});
