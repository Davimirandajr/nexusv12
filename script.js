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
   NAVEGAÇÃO E RESPONSIVIDADE
   ========================================================================== */
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    const targetTab = document.getElementById(id);
    const targetBtn = document.getElementById('btn-' + id);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');

    // Fecha sidebar no mobile automaticamente ao clicar em um item
    if(window.innerWidth < 900) {
        document.getElementById('sidebar').style.transform = "translateX(-100%)";
    }
};

/* ==========================================================================
   AUTENTICAÇÃO
   ========================================================================== */
window.fazerLogin = () => {
    const email = document.getElementById('email-login').value;
    const pass = document.getElementById('pass-login').value;
    const status = document.getElementById('auth-status');

    if(!email || !pass) return alert("Preencha E-mail e Senha.");

    status.innerText = "Autenticando...";
    signInWithEmailAndPassword(auth, email, pass).catch((error) => {
        status.innerText = "Erro ao acessar.";
        alert("Falha: " + error.message);
    });
};

window.handleLogout = () => signOut(auth).then(() => location.reload());

/* ==========================================================================
   PROCESSAMENTO DE IMAGENS (PREVINE ERRO DE 1MB)
   ========================================================================== */
const comprimirImagem = (file, maxWidth) => {
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
                resolve(canvas.toDataURL('image/jpeg', 0.7)); // Qualidade 70%
            };
        };
    });
};

window.handlePhoto = async (input, slotId, index) => {
    if (input.files[0]) {
        const base64 = await comprimirImagem(input.files[0], 800);
        window.fotosCarro[index] = base64;
        document.getElementById(slotId).innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
    }
};

window.handleLogo = async (input) => {
    if (input.files[0]) {
        window.logoBase64 = await comprimirImagem(input.files[0], 400);
        document.getElementById('preview-logo').innerHTML = `<img src="${window.logoBase64}" style="max-height:80px;">`;
    }
};

/* ==========================================================================
   ESTOQUE (SALVAR E EDITAR)
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
        vendedorId: document.getElementById('vendedor-carro').value,
        dataUpdate: new Date()
    };

    try {
        btn.innerText = "SALVANDO...";
        if (idEdit) {
            await updateDoc(doc(db, "carros", idEdit), dados);
            alert("Veículo atualizado!");
        } else {
            await addDoc(collection(db, "carros"), dados);
            alert("Veículo cadastrado!");
        }
        window.limparFormEstoque();
    } catch (e) { alert("Erro ao salvar: " + e.message); }
    btn.innerText = "SALVAR VEÍCULO";
};

window.prepararEdicaoCarro = (id, c) => {
    document.getElementById('edit-carro-id').value = id;
    document.getElementById('marca').value = c.marca;
    document.getElementById('modelo').value = c.modelo;
    document.getElementById('preco').value = c.preco;
    document.getElementById('status-carro').value = c.status;
    document.getElementById('form-title').innerText = "Editando " + c.modelo;
    
    // Carrega fotos existentes na memória do script
    window.fotosCarro = c.fotos || ["","",""];
    window.fotosCarro.forEach((f, i) => {
        if(f) document.getElementById('p'+(i+1)).innerHTML = `<img src="${f}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.limparFormEstoque = () => {
    document.getElementById('edit-carro-id').value = "";
    document.getElementById('form-title').innerText = "Novo Veículo";
    document.querySelectorAll('#showroom input, #showroom textarea').forEach(i => i.value = "");
    window.fotosCarro = ["", "", ""];
    document.querySelectorAll('.slot').forEach(s => s.innerHTML = '<i class="fa fa-camera"></i>');
};

/* ==========================================================================
   CRM E FUNIL DE VENDAS
   ========================================================================== */
window.moverLead = async (id, novoStatus) => {
    await updateDoc(doc(db, "interesses", id), { statusFunil: novoStatus });
};

window.addLeadManual = async () => {
    const nome = prompt("Nome do Cliente:");
    const carro = prompt("Carro de interesse:");
    if(nome && carro) {
        await addDoc(collection(db, "interesses"), {
            lojaId: auth.currentUser.uid,
            nome, carro, statusFunil: 'novo', data: new Date()
        });
    }
};

window.excluirDoc = async (coll, id) => {
    if(confirm("Deseja realmente excluir?")) await deleteDoc(doc(db, coll, id));
};

/* ==========================================================================
   CONFIGURAÇÕES DA LOJA
   ========================================================================== */
window.salvarConfig = async () => {
    const cor = document.getElementById('cor-loja').value;
    await setDoc(doc(db, "configuracoes", auth.currentUser.uid), {
        corLoja: cor,
        logo: window.logoBase64
    }, { merge: true });
    alert("Identidade da loja salva!");
};

window.copiarLinkPortal = () => {
    const link = `${window.location.origin}/portal.html?loja=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(link).then(() => alert("Link copiado para o WhatsApp!"));
};

/* ==========================================================================
   MONITORES EM TEMPO REAL
   ========================================================================== */
const iniciarMonitores = (user) => {
    // Monitor Estoque
    onSnapshot(query(collection(db, "carros"), where("lojaId", "==", user.uid)), (snap) => {
        const lista = document.getElementById('lista-estoque-admin');
        let total = 0, vendidos = 0;
        lista.innerHTML = '';
        snap.forEach(d => {
            const c = d.data();
            total++; if(c.status === 'vendido') vendidos++;
            lista.innerHTML += `
                <div class="card-item" style="background:var(--dark-accent); margin-bottom:10px; padding:10px; border-radius:10px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                    <span><b>${c.modelo}</b></span>
                    <div>
                        <button onclick='window.prepararEdicaoCarro("${d.id}", ${JSON.stringify(c)})' style="background:none; border:none; color:var(--primary); cursor:pointer; margin-right:15px;"><i class="fa fa-edit"></i></button>
                        <button onclick="window.excluirDoc('carros', '${d.id}')" style="background:none; border:none; color:red; cursor:pointer;"><i class="fa fa-trash"></i></button>
                    </div>
                </div>`;
        });
        document.getElementById('stat-total').innerText = total;
        document.getElementById('stat-vendidos').innerText = vendidos;
    });

    // Monitor Funil (CRM)
    onSnapshot(query(collection(db, "interesses"), where("lojaId", "==", user.uid)), (snap) => {
        const cols = { novo: '', contato: '', visita: '', fechado: '' };
        snap.forEach(d => {
            const l = d.data();
            const s = l.statusFunil || 'novo';
            const html = `
                <div class="kanban-card">
                    <b>${l.nome}</b><br><small>${l.carro}</small>
                    <select onchange="window.moverLead('${d.id}', this.value)" style="width:100%; margin-top:8px; font-size:11px;">
                        <option value="novo" ${s=='novo'?'selected':''}>Novos</option>
                        <option value="contato" ${s=='contato'?'selected':''}>Contato</option>
                        <option value="visita" ${s=='visita'?'selected':''}>Visita</option>
                        <option value="fechado" ${s=='fechado'?'selected':''}>Fechado</option>
                    </select>
                    <i class="fa fa-trash" onclick="window.excluirDoc('interesses', '${d.id}')" style="color:red; cursor:pointer; font-size:12px; margin-top:5px; display:block; text-align:right;"></i>
                </div>`;
            if (cols[s] !== undefined) cols[s] += html;
        });
        document.querySelector('#col-novo .kanban-cards').innerHTML = cols.novo;
        document.querySelector('#col-contato .kanban-cards').innerHTML = cols.contato;
        document.querySelector('#col-visita .kanban-cards').innerHTML = cols.visita;
        document.querySelector('#col-fechado .kanban-cards').innerHTML = cols.fechado;
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
