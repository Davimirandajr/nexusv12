import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, query, where, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

window.fotosCarro = ["", "", ""];
window.logoBase64 = "";

/* ==========================================================================
   NAVEGAÇÃO
   ========================================================================== */
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    const targetTab = document.getElementById(id);
    const targetBtn = document.getElementById('btn-' + id);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');

    const sidebar = document.getElementById('sidebar');
    if(window.innerWidth < 900 && sidebar) {
        sidebar.style.transform = "translateX(-100%)";
    }
};

/* ==========================================================================
   AUTENTICAÇÃO
   ========================================================================== */
window.fazerLogin = () => {
    const email = document.getElementById('email-login').value;
    const pass = document.getElementById('pass-login').value;
    const status = document.getElementById('auth-status');

    if(!email || !pass) return alert("Preencha todos os campos.");

    if(status) status.innerText = "Autenticando...";
    signInWithEmailAndPassword(auth, email, pass).catch(err => {
        if(status) status.innerText = "Erro no login.";
        alert("Falha: " + err.message);
    });
};

window.handleLogout = () => signOut(auth).then(() => location.reload());

/* ==========================================================================
   IMAGENS
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
        const slot = document.getElementById(slotId);
        if(slot) slot.innerHTML = `<img src="${b64}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
    }
};

/* ==========================================================================
   ESTOQUE
   ========================================================================== */
window.salvarVeiculo = async () => {
    const idEdit = document.getElementById('edit-carro-id').value;
    const btn = document.getElementById('btn-save-carro');
    
    const dados = {
        lojaId: auth.currentUser.uid,
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        preco: Number(document.getElementById('preco').value),
        km: Number(document.getElementById('km').value || 0),
        ano: document.getElementById('ano').value,
        cambio: document.getElementById('cambio').value,
        status: document.getElementById('status-carro').value,
        descricao: document.getElementById('descricao').value,
        fotos: window.fotosCarro.filter(f => f !== ""),
        dataUpdate: new Date()
    };

    try {
        if(btn) btn.innerText = "SALVANDO...";
        if (idEdit) {
            await updateDoc(doc(db, "carros", idEdit), dados);
            alert("Veículo atualizado!");
        } else {
            await addDoc(collection(db, "carros"), dados);
            alert("Veículo cadastrado!");
        }
        window.limparFormEstoque();
    } catch (e) { alert("Erro: " + e.message); }
    if(btn) btn.innerText = "SALVAR VEÍCULO";
};

window.prepararEdicaoCarro = (id, c) => {
    document.getElementById('edit-carro-id').value = id;
    document.getElementById('marca').value = c.marca || "";
    document.getElementById('modelo').value = c.modelo || "";
    document.getElementById('preco').value = c.preco || "";
    document.getElementById('km').value = c.km || "";
    document.getElementById('ano').value = c.ano || "";
    document.getElementById('cambio').value = c.cambio || "Automático";
    document.getElementById('status-carro').value = c.status || "disponivel";
    document.getElementById('descricao').value = c.descricao || "";
    
    const titulo = document.getElementById('form-title');
    if(titulo) titulo.innerText = "Editando " + c.modelo;
    
    window.fotosCarro = c.fotos || ["","",""];
    [1, 2, 3].forEach((num, i) => {
        const slot = document.getElementById('p' + num);
        if(slot) {
            slot.innerHTML = window.fotosCarro[i] 
                ? `<img src="${window.fotosCarro[i]}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`
                : '<i class="fa fa-camera"></i>';
        }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.limparFormEstoque = () => {
    document.getElementById('edit-carro-id').value = "";
    const titulo = document.getElementById('form-title');
    if(titulo) titulo.innerText = "Novo Veículo";
    
    // Limpa todos os inputs e textareas
    document.getElementById('marca').value = "";
    document.getElementById('modelo').value = "";
    document.getElementById('preco').value = "";
    document.getElementById('km').value = "";
    document.getElementById('ano').value = "";
    document.getElementById('descricao').value = "";
    
    window.fotosCarro = ["", "", ""];
    document.querySelectorAll('.slot').forEach(s => s.innerHTML = '<i class="fa fa-camera"></i>');
};

/* ==========================================================================
   CRM E MONITORES
   ========================================================================== */
window.moverLead = async (id, novoStatus) => {
    await updateDoc(doc(db, "interesses", id), { statusFunil: novoStatus });
};

window.excluirDoc = async (coll, id) => {
    if(confirm("Deseja realmente excluir?")) await deleteDoc(doc(db, coll, id));
};

const iniciarMonitores = (user) => {
    onSnapshot(query(collection(db, "carros"), where("lojaId", "==", user.uid)), (snap) => {
        const lista = document.getElementById('lista-estoque-admin');
        if (!lista) return;
        lista.innerHTML = '';
        snap.forEach(d => {
            const c = d.data();
            lista.innerHTML += `
                <div class="card-item" style="padding:15px; border-bottom:1px solid rgba(0,0,0,0.05); display:flex; justify-content:space-between; align-items:center;">
                    <span><b>${c.marca} ${c.modelo}</b></span>
                    <div>
                        <button onclick='window.prepararEdicaoCarro("${d.id}", ${JSON.stringify(c)})' style="color:var(--primary); background:none; border:none; cursor:pointer; margin-right:15px;"><i class="fa fa-edit"></i></button>
                        <button onclick="window.excluirDoc('carros', '${d.id}')" style="color:red; background:none; border:none; cursor:pointer;"><i class="fa fa-trash"></i></button>
                    </div>
                </div>`;
        });
    });

    onSnapshot(query(collection(db, "interesses"), where("lojaId", "==", user.uid)), (snap) => {
        const cols = { novo: '', contato: '', visita: '', fechado: '' };
        snap.forEach(d => {
            const l = d.data();
            const s = l.statusFunil || 'novo';
            const html = `
                <div class="kanban-card">
                    <b>${l.nome}</b><br><small>${l.carro}</small>
                    <select onchange="window.moverLead('${d.id}', this.value)" style="width:100%; margin-top:8px; border-radius:5px; font-size:12px;">
                        <option value="novo" ${s=='novo'?'selected':''}>Novos</option>
                        <option value="contato" ${s=='contato'?'selected':''}>Contato</option>
                        <option value="visita" ${s=='visita'?'selected':''}>Visita</option>
                        <option value="fechado" ${s=='fechado'?'selected':''}>Fechado</option>
                    </select>
                </div>`;
            if (cols[s] !== undefined) cols[s] += html;
        });
        ['novo', 'contato', 'visita', 'fechado'].forEach(c => {
            const el = document.querySelector(`#col-${c} .kanban-cards`);
            if (el) el.innerHTML = cols[c];
        });
    });
};

onAuthStateChanged(auth, (user) => {
    const login = document.getElementById('login-screen');
    if (user) {
        if(login) login.style.display = 'none';
        iniciarMonitores(user);
    } else {
        if(login) login.style.display = 'flex';
    }
});

window.copiarLinkPortal = () => {
    const link = `${window.location.origin}/portal.html?loja=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(link).then(() => alert("Link copiado!"));
};
/* ==========================================================================
   GESTÃO DE VENDEDORES
   ========================================================================== */
window.salvarVendedor = async () => {
    const nome = document.getElementById('nome-vendedor').value;
    const whats = document.getElementById('whatsapp-vendedor').value;
    const email = document.getElementById('email-vendedor').value;

    if(!nome || !whats) return alert("Nome e WhatsApp são obrigatórios!");

    try {
        await addDoc(collection(db, "vendedores"), {
            lojaId: auth.currentUser.uid,
            nome: nome,
            whatsapp: whats,
            email: email,
            dataCadastro: new Date()
        });
        alert("Vendedor cadastrado com sucesso!");
        document.getElementById('nome-vendedor').value = "";
        document.getElementById('whatsapp-vendedor').value = "";
        document.getElementById('email-vendedor').value = "";
    } catch (e) { alert("Erro ao salvar vendedor"); }
};

// Adicione este monitor dentro da função iniciarMonitores(user):
onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", user.uid)), (snap) => {
    const lista = document.getElementById('lista-vendedores');
    if (!lista) return;
    lista.innerHTML = '';
    snap.forEach(d => {
        const v = d.data();
        lista.innerHTML += `
            <div class="card-item" style="padding:15px; border-bottom:1px solid rgba(0,0,0,0.05); display:flex; justify-content:space-between; align-items:center;">
                <span><i class="fa fa-user-circle"></i> <b>${v.nome}</b> (${v.whatsapp})</span>
                <button onclick="window.excluirDoc('vendedores', '${d.id}')" style="color:red; background:none; border:none; cursor:pointer;"><i class="fa fa-trash"></i></button>
            </div>`;
    });
});
