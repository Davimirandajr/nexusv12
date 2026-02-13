import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, addDoc, query, where, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

window.fotosCarro = ["", "", ""];
window.logoBase64 = "";

/* ==========================================================================
   NAVEGAÇÃO E LOGIN
   ========================================================================== */
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const targetTab = document.getElementById(id);
    const targetBtn = document.getElementById('btn-' + id);
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
};

window.fazerLogin = () => {
    const email = document.getElementById('email-login').value;
    const pass = document.getElementById('pass-login').value;
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert("Falha: " + err.message));
};

window.handleLogout = () => signOut(auth).then(() => location.reload());

/* ==========================================================================
   GESTÃO DE IMAGENS (LOGO E FOTOS)
   ========================================================================== */
const comprimirImagem = (file, maxWidth) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
};

window.handlePhoto = async (input, slotId, index) => {
    if (input.files[0]) {
        const b64 = await comprimirImagem(input.files[0], 800);
        window.fotosCarro[index] = b64;
        document.getElementById(slotId).innerHTML = `<img src="${b64}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
    }
};

window.handleLogo = async (input) => {
    if (input.files[0]) {
        window.logoBase64 = await comprimirImagem(input.files[0], 400);
        alert("Logo carregada! Não esqueça de clicar em Salvar Identidade.");
    }
};

/* ==========================================================================
   ESTOQUE E VENDEDORES
   ========================================================================== */
window.salvarVeiculo = async () => {
    const idEdit = document.getElementById('edit-carro-id').value;
    const dados = {
        lojaId: auth.currentUser.uid,
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        preco: Number(document.getElementById('preco').value),
        km: Number(document.getElementById('km').value || 0),
        ano: document.getElementById('ano').value,
        cambio: document.getElementById('cambio').value,
        status: document.getElementById('status-carro').value,
        vendedorResponsavel: document.getElementById('vendedor-responsavel').value, // LINKANDO VENDEDOR
        descricao: document.getElementById('descricao').value,
        fotos: window.fotosCarro.filter(f => f !== ""),
        dataUpdate: new Date()
    };

    try {
        if (idEdit) {
            await updateDoc(doc(db, "carros", idEdit), dados);
        } else {
            await addDoc(collection(db, "carros"), dados);
        }
        alert("Sucesso!");
        window.limparFormEstoque();
    } catch (e) { alert("Erro: " + e.message); }
};

window.salvarVendedor = async () => {
    const nome = document.getElementById('nome-vendedor').value;
    const whats = document.getElementById('whatsapp-vendedor').value;
    if(!nome || !whats) return alert("Preencha nome e zap!");
    await addDoc(collection(db, "vendedores"), {
        lojaId: auth.currentUser.uid,
        nome, whatsapp: whats, dataCadastro: new Date()
    });
    alert("Vendedor salvo!");
};

/* ==========================================================================
   CONFIGURAÇÕES (CORES E LOGO)
   ========================================================================== */
window.salvarConfig = async () => {
    const cor = document.getElementById('cor-loja').value;
    try {
        await setDoc(doc(db, "configuracoes", auth.currentUser.uid), {
            corLoja: cor,
            logo: window.logoBase64,
            dataUpdate: new Date()
        }, { merge: true });
        alert("Identidade visual salva com sucesso!");
    } catch (e) { alert("Erro ao salvar config."); }
};

/* ==========================================================================
   MONITORES EM TEMPO REAL
   ========================================================================== */
const iniciarMonitores = (user) => {
    // Monitor de Carros
    onSnapshot(query(collection(db, "carros"), where("lojaId", "==", user.uid)), (snap) => {
        const lista = document.getElementById('lista-estoque-admin');
        if (lista) {
            lista.innerHTML = '';
            snap.forEach(d => {
                lista.innerHTML += `<div class="card-item" style="padding:10px; border-bottom:1px solid #eee;">
                    ${d.data().marca} ${d.data().modelo} 
                    <button onclick="window.excluirDoc('carros', '${d.id}')" style="float:right; color:red; border:none; background:none; cursor:pointer;"><i class="fa fa-trash"></i></button>
                </div>`;
            });
        }
    });

    // Monitor de Vendedores (Atualiza o Select do Estoque e a Lista)
    onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", user.uid)), (snap) => {
        const select = document.getElementById('vendedor-responsavel');
        const lista = document.getElementById('lista-vendedores');
        if (select) select.innerHTML = '<option value="">Selecione um Vendedor...</option>';
        if (lista) lista.innerHTML = '';
        
        snap.forEach(d => {
            const v = d.data();
            if (select) select.innerHTML += `<option value="${v.nome}">${v.nome}</option>`;
            if (lista) lista.innerHTML += `<div class="card-item" style="padding:10px;">${v.nome} <button onclick="window.excluirDoc('vendedores', '${d.id}')" style="border:none; color:red; cursor:pointer;">X</button></div>`;
        });
    });

    // Monitor de Leads (CRM)
    onSnapshot(query(collection(db, "interesses"), where("lojaId", "==", user.uid)), (snap) => {
        const cols = { novo: '', contato: '', visita: '', fechado: '' };
        snap.forEach(d => {
            const l = d.data();
            const s = l.statusFunil || 'novo';
            const html = `<div class="kanban-card"><b>${l.nome}</b><br><small>${l.carro}</small></div>`;
            if (cols[s] !== undefined) cols[s] += html;
        });
        ['novo', 'contato', 'visita', 'fechado'].forEach(c => {
            const el = document.querySelector(`#col-${c} .kanban-cards`);
            if (el) el.innerHTML = cols[c];
        });
    });

    // Carregar Configurações Iniciais (Cor e Logo)
    getDoc(doc(db, "configuracoes", user.uid)).then(d => {
        if(d.exists()){
            const c = d.data();
            if(c.corLoja) document.getElementById('cor-loja').value = c.corLoja;
            if(c.logo) {
                window.logoBase64 = c.logo;
                document.getElementById('preview-logo-sidebar').innerHTML = `<img src="${c.logo}" style="max-width:120px;">`;
            }
        }
    });
};

/* ==========================================================================
   INICIALIZAÇÃO
   ========================================================================== */
onAuthStateChanged(auth, (user) => {
    const login = document.getElementById('login-screen');
    if (user) {
        if(login) login.style.display = 'none';
        iniciarMonitores(user);
    } else {
        if(login) login.style.display = 'flex';
    }
});

window.excluirDoc = async (coll, id) => { if(confirm("Excluir?")) await deleteDoc(doc(db, coll, id)); };
window.moverLead = async (id, novoStatus) => { await updateDoc(doc(db, "interesses", id), { statusFunil: novoStatus }); };
window.copiarLinkPortal = () => {
    if (!auth.currentUser) {
        return alert("Você precisa estar logado para copiar o link!");
    }

    // Pega o endereço atual e troca o 'index.html' por 'portal.html'
    const urlBase = window.location.href.split('index.html')[0];
    const link = `${urlBase}portal.html?loja=${auth.currentUser.uid}`;

    navigator.clipboard.writeText(link).then(() => {
        alert("Link do seu portal copiado com sucesso!");
        console.log("Link gerado:", link);
    }).catch(err => {
        alert("Erro ao copiar. Copie manualmente do console (F12)");
        console.log("Link para copiar:", link);
    });
};
