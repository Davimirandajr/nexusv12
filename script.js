import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuração do seu projeto Firebase
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

// Variáveis Globais de Estado
window.fotosCarro = ["", "", ""];
window.logoBase64 = "";

// --- SISTEMA DE LOGIN ---
window.fazerLogin = () => {
    const e = document.getElementById('email-login').value;
    const s = document.getElementById('pass-login').value;
    if(!e || !s) return alert("Preencha todos os campos");
    
    signInWithEmailAndPassword(auth, e, s)
        .catch(err => alert("Erro ao acessar: Verifique e-mail e senha."));
};

window.handleLogout = () => signOut(auth).then(() => location.reload());


// --- NAVEGAÇÃO E INTERFACE ---
window.toggleMenu = () => {
    document.body.classList.toggle('collapsed');
    const icon = document.getElementById('toggle-icon');
    icon.className = document.body.classList.contains('collapsed') ? 'fa fa-chevron-right' : 'fa fa-chevron-left';
};

window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('btn-' + id).classList.add('active');
};

// --- PROCESSAMENTO DE IMAGENS ---
window.handlePhoto = (input, slotId, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.fotosCarro[index] = e.target.result;
        document.getElementById(slotId).innerHTML = `<img src="${e.target.result}">`;
    };
    if(input.files[0]) reader.readAsDataURL(input.files[0]);
};

window.handleLogo = (input) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.logoBase64 = e.target.result;
        document.getElementById('logo-preview').innerHTML = `<img src="${e.target.result}" style="max-height:60px">`;
    };
    if(input.files[0]) reader.readAsDataURL(input.files[0]);
};

// --- GESTÃO DE DADOS (CRUD) ---

// 1. Salvar Veículo
window.salvarVeiculo = async () => {
    const user = auth.currentUser;
    const fotosLimpas = window.fotosCarro.filter(f => f !== "");
    const vendedorId = document.getElementById('vendedor-carro').value;

    if(fotosLimpas.length === 0 || !vendedorId) {
        return alert("Por favor, selecione um vendedor e suba ao menos 1 foto.");
    }

    try {
        await addDoc(collection(db, "carros"), {
            lojaId: user.uid,
            marca: document.getElementById('marca').value,
            modelo: document.getElementById('modelo').value,
            preco: Number(document.getElementById('preco').value),
            ano: document.getElementById('ano').value,
            vendedorId: vendedorId,
            descricao: document.getElementById('descricao').value,
            fotos: fotosLimpas,
            dataCriacao: new Date()
        });
        alert("Veículo publicado com sucesso!");
        location.reload();
    } catch (e) { alert("Erro ao salvar veículo."); }
};

// 2. Adicionar Vendedor
window.addVendedor = async () => {
    const nome = document.getElementById('nome-vendedor').value;
    const whats = document.getElementById('whats-vendedor').value;
    if(!nome || !whats) return alert("Preencha os dados do vendedor.");

    await addDoc(collection(db, "vendedores"), {
        lojaId: auth.currentUser.uid,
        nome,
        whats
    });
    alert("Vendedor cadastrado!");
    location.reload();
};

// 3. Salvar Identidade Visual
window.salvarConfig = async () => {
    const user = auth.currentUser;
    await setDoc(doc(db, "configuracoes", user.uid), {
        lojaId: user.uid,
        corLoja: document.getElementById('cor-loja').value,
        logo: window.logoBase64
    }, { merge: true });
    alert("Identidade da loja atualizada!");
};

// --- SINCRONIZAÇÃO EM TEMPO REAL ---

onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        
        // Carregar Vendedores no Select e na Lista
        const qV = query(collection(db, "vendedores"), where("lojaId", "==", user.uid));
        const snapV = await getDocs(qV);
        const select = document.getElementById('vendedor-carro');
        const listaV = document.getElementById('lista-vendedores');
        
        snapV.forEach(v => {
            const d = v.data();
            select.innerHTML += `<option value="${v.id}">${d.nome}</option>`;
            listaV.innerHTML += `<div class="card-lead" style="border-left-color: #444"><b>${d.nome}</b> - ${d.whats}</div>`;
        });

        // Monitorar Leads (Interesses)
        const qL = query(collection(db, "interesses"), where("lojaId", "==", user.uid), orderBy("data", "desc"));
        onSnapshot(qL, (snap) => {
            const listaL = document.getElementById('lista-clientes');
            listaL.innerHTML = '';
            snap.forEach(doc => {
                const lead = doc.data();
                const dataFormatada = new Date(lead.data.seconds * 1000).toLocaleString('pt-BR');
                listaL.innerHTML += `
                    <div class="card-lead">
                        <p><strong>Carro:</strong> ${lead.carro}</p>
                        <p><strong>Vendedor:</strong> ${lead.vendedor}</p>
                        <p style="font-size:12px; color:#666">${dataFormatada}</p>
                    </div>`;
            });
        });

        // Carregar Configurações Atuais
        onSnapshot(doc(db, "configuracoes", user.uid), (s) => {
            if(s.exists()){
                const d = s.data();
                document.documentElement.style.setProperty('--primary', d.corLoja);
                document.getElementById('cor-loja').value = d.corLoja;
                if(d.logo) {
                    document.getElementById('logo-preview').innerHTML = `<img src="${d.logo}" style="max-height:60px">`;
                    window.logoBase64 = d.logo;
                }
            }
        });

    } else {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('auth-status').innerText = "Acesso restrito. Faça login.";
    }
});

// Link do Portal
window.copyPortalLink = () => {
    const url = `${window.location.origin}${window.location.pathname.replace('index.html','')}portal.html?loja=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(url);
    alert("Link do seu portal copiado! Envie para seus clientes.");
};
// --- MONITOR DE ESTOQUE (PAINEL ADMIN) ---
const listarEstoqueAdmin = (userId) => {
    const q = query(collection(db, "carros"), where("lojaId", "==", userId));
    
    onSnapshot(q, (snap) => {
        // Procure ou crie um lugar para listar os carros no index.html
        let container = document.getElementById('lista-estoque-admin');
        
        // Se o container não existir no HTML, vamos criar um dinamicamente
        if (!container) {
            const novaDiv = document.createElement('div');
            novaDiv.id = 'lista-estoque-admin';
            novaDiv.innerHTML = '<h3 style="margin-top:40px">Seu Estoque Atual</h3><div id="cards-estoque"></div>';
            document.querySelector('#showroom .glass-card').appendChild(novaDiv);
            container = document.getElementById('cards-estoque');
        } else {
            container = document.getElementById('cards-estoque');
        }

        container.innerHTML = ''; // Limpa a lista antes de carregar

        snap.forEach(d => {
            const carro = d.data();
            container.innerHTML += `
                <div style="display:flex; align-items:center; gap:15px; background:#0a0a0b; padding:15px; border-radius:12px; margin-top:10px; border:1px solid #222">
                    <img src="${carro.fotos[0]}" style="width:60px; height:60px; object-fit:cover; border-radius:8px">
                    <div style="flex:1">
                        <strong style="display:block">${carro.marca} ${carro.modelo}</strong>
                        <span style="color:var(--primary); font-size:14px">R$ ${carro.preco.toLocaleString()}</span>
                    </div>
                    <button onclick="window.excluirCarro('${d.id}')" style="background:none; border:none; color:#ff4444; cursor:pointer">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            `;
        });
    });
};

// Função para excluir carro
window.excluirCarro = async (id) => {
    if(confirm("Deseja realmente remover este veículo?")) {
        try {
            await deleteDoc(doc(db, "carros", id));
            alert("Veículo removido!");
        } catch (e) { alert("Erro ao excluir."); }
    }
};

// --- CHAME A FUNÇÃO DENTRO DO onAuthStateChanged ---
// Localize o onAuthStateChanged no seu script.js e adicione a chamada:
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // ... (seus códigos existentes)
        listarEstoqueAdmin(user.uid); // <--- ADICIONE ESTA LINHA
    }
});
