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

// Variáveis de Estado
window.fotosCarro = ["", "", ""];
window.logoBase64 = "";

/* ==========================================================================
   NAVEGAÇÃO E RESPONSIVIDADE
   ========================================================================== */
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    const targetTab = document.getElementById(id);
    const targetBtn = document.getElementById('btn-' + id);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');

    // Fechar sidebar no mobile (se houver a classe mobile-open no CSS)
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
   PROCESSAMENTO DE IMAGENS (PREVINE ERRO DE TAMANHO)
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

window.handleLogo = async (input) => {
    if (input.files[0]) {
        window.logoBase64 = await comprimirImagem(input.files[0], 400);
        const preview = document.getElementById('preview-logo');
        if(preview) preview.innerHTML = `<img src="${window.logoBase64}" style="max-height:80px;">`;
    }
};

/* ==========================================================================
   GESTÃO DE ESTOQUE
   ========================================================================== */
window.salvarVeiculo = async () => {
    const idEdit = document.getElementById('edit-carro-id').value;
    const btn = document.getElementById('btn-save-carro');
    
    const dados = {
        lojaId: auth.currentUser.uid,
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        preco: Number(document.getElementById('preco').value),
        km: Number(document.getElementById('km').value),
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
    document.getElementById('status-carro').value = c.status || "disponivel";
    
    const titulo = document.getElementById('form-title');
    if(titulo) titulo.innerText = "Editando " + c.modelo;
    
    window.fotosCarro = c.fotos || ["","",""];
    window.fotosCarro.forEach((f, i) => {
        const slot = document.getElementById('p' + (i + 1));
        if(slot && f) slot.innerHTML = `<img src="${f}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.limparFormEstoque = () => {
    document.getElementById('edit-carro-id').value = "";
    const titulo = document.getElementById('form-title');
    if(titulo) titulo.innerText = "Novo Veículo";
    document.querySelectorAll('#showroom input, #showroom textarea').forEach(i => i.value = "");
    window.fotosCarro = ["", "", ""];
    document.querySelectorAll('.slot').forEach(s => s.innerHTML = '<i class="fa fa-camera"></i>');
};

/* ==========================================================================
   CRM (FUNIL DE VENDAS)
   ========================================================================== */
window.moverLead = async (id, novoStatus) => {
    await updateDoc(doc(db, "interesses", id), { statusFunil: novoStatus });
};

window.excluirDoc = async (coll, id) => {
    if(confirm("Deseja realmente excluir?")) await deleteDoc(doc(db, coll, id));
};

/* ==========================================================================
   CONFIGURAÇÕES E PORTAL
   ========================================================================== */
window.salvarConfig = async () => {
    const cor = document.getElementById('cor-loja').value;
    await setDoc(doc(db, "configuracoes", auth.currentUser.uid), {
        corLoja: cor,
        logo: window.logoBase64
    }, { merge: true });
    alert("Identidade salva!");
};

window.copiarLinkPortal = () => {
    const link = `${window.location.origin}/portal.html?loja=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(link).then(() => alert("Link copiado!"));
};

/* ==========================================================================
   MONITORES EM TEMPO REAL (PROTEGIDOS)
   ========================================================================== */
const iniciarMonitores = (user) => {
    // Monitor Estoque
    onSnapshot(query(collection(db, "carros"), where("lojaId", "==", user.uid)), (snap) => {
        const lista = document.getElementById('lista-estoque-admin');
        if (!lista) return;
        
        let total = 0, vendidos = 0;
        lista.innerHTML = '';
        snap.forEach(d => {
            const c = d.data();
            total++; if(c.status === 'vendido') vendidos++;
            lista.innerHTML += `
                <div class="card-item" style="background:rgba(255,255,255,0.05); margin-bottom:8px; padding:10px; border-radius:10px; display:flex; justify-content:space-between;">
                    <span>${c.modelo}</span>
                    <div>
                        <button onclick='window.prepararEdicaoCarro("${d.id}", ${JSON.stringify(c)})' style="color:var(--primary); background:none; border:none; cursor:pointer; margin-right:10px;"><i class="fa fa-edit"></i></button>
                        <button onclick="window.excluirDoc('carros', '${d.id}')" style="color:red; background:none; border:none; cursor:pointer;"><i class="fa fa-trash"></i></button>
                    </div>
                </div>`;
        });
        const sTotal = document.getElementById('stat-total');
        const sVend = document.getElementById('stat-vendidos');
        if(sTotal) sTotal.innerText = total;
        if(sVend) sVend.innerText = vendidos;
    });

    // Monitor Funil (CRM) - Blindagem de erro de renderização
    onSnapshot(query(collection(db, "interesses"), where("lojaId", "==", user.uid)), (snap) => {
        const cols = { novo: '', contato: '', visita: '', fechado: '' };
        
        snap.forEach(d => {
            const l = d.data();
            const s = l.statusFunil || 'novo';
            const html = `
                <div class="kanban-card">
                    <b>${l.nome}</b><br><small>${l.carro}</small>
                    <select onchange="window.moverLead('${d.id}', this.value)" style="width:100%; margin-top:8px;">
                        <option value="novo" ${s=='novo'?'selected':''}>Novos</option>
                        <option value="contato" ${s=='contato'?'selected':''}>Contato</option>
                        <option value="visita" ${s=='visita'?'selected':''}>Visita</option>
                        <option value="fechado" ${s=='fechado'?'selected':''}>Fechado</option>
                    </select>
                </div>`;
            if (cols[s] !== undefined) cols[s] += html;
        });

        const renderCol = (id, html) => {
            const el = document.querySelector(`#${id} .kanban-cards`);
            if (el) el.innerHTML = html;
        };

        renderCol('col-novo', cols.novo);
        renderCol('col-contato', cols.contato);
        renderCol('col-visita', cols.visita);
        renderCol('col-fechado', cols.fechado);
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
