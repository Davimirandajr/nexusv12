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

/* === NAVEGAÇÃO E LOGIN === */
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('btn-' + id).classList.add('active');
};

window.fazerLogin = () => {
    const email = document.getElementById('email-login').value;
    const pass = document.getElementById('pass-login').value;
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert("Erro: " + err.message));
};

window.handleLogout = () => signOut(auth).then(() => location.reload());

/* === PROCESSAMENTO DE IMAGENS === */
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
        alert("Logo preparada!");
    }
};

/* === GESTÃO DE ESTOQUE (SALVAR / EDITAR) === */
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
        vendedorResponsavel: document.getElementById('vendedor-responsavel').value,
        descricao: document.getElementById('descricao').value,
        fotos: window.fotosCarro.filter(f => f !== ""),
        dataUpdate: new Date()
    };

    try {
        if (idEdit) {
            await updateDoc(doc(db, "carros", idEdit), dados);
            alert("Veículo atualizado!");
        } else {
            await addDoc(collection(db, "carros"), dados);
            alert("Veículo cadastrado!");
        }
        window.limparFormEstoque();
    } catch (e) { alert("Erro: " + e.message); }
};

window.prepararEdicaoCarro = (id, c) => {
    window.nav('estoque');
    document.getElementById('form-title').innerText = "Editando Veículo";
    document.getElementById('edit-carro-id').value = id;
    document.getElementById('marca').value = c.marca;
    document.getElementById('modelo').value = c.modelo;
    document.getElementById('preco').value = c.preco;
    document.getElementById('ano').value = c.ano;
    document.getElementById('km').value = c.km;
    document.getElementById('cambio').value = c.cambio;
    document.getElementById('status-carro').value = c.status;
    document.getElementById('vendedor-responsavel').value = c.vendedorResponsavel || "";
    document.getElementById('descricao').value = c.descricao || "";
    document.getElementById('btn-cancelar-carro').style.display = "block";
    
    window.fotosCarro = ["", "", ""];
    c.fotos.forEach((f, i) => {
        window.fotosCarro[i] = f;
        document.getElementById(`p${i+1}`).innerHTML = `<img src="${f}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
    });
};

window.limparFormEstoque = () => {
    document.getElementById('edit-carro-id').value = "";
    document.getElementById('form-title').innerText = "Novo Veículo";
    document.getElementById('btn-cancelar-carro').style.display = "none";
    ['marca','modelo','preco','ano','km','descricao'].forEach(i => document.getElementById(i).value = "");
    window.fotosCarro = ["", "", ""];
    document.querySelectorAll('.slot').forEach(s => s.innerHTML = '<i class="fa fa-camera"></i>');
};

/* === GESTÃO DE VENDEDORES === */
window.salvarVendedor = async () => {
    const idEdit = document.getElementById('edit-vendedor-id').value;
    const dados = {
        lojaId: auth.currentUser.uid,
        nome: document.getElementById('nome-vendedor').value,
        whatsapp: document.getElementById('whatsapp-vendedor').value,
        email: document.getElementById('email-vendedor').value,
        dataUpdate: new Date()
    };

    if (idEdit) {
        await updateDoc(doc(db, "vendedores", idEdit), dados);
    } else {
        await addDoc(collection(db, "vendedores"), dados);
    }
    window.limparFormVendedor();
    alert("Vendedor salvo!");
};

window.prepararEdicaoVendedor = (id, v) => {
    document.getElementById('vendedor-form-title').innerText = "Editando Vendedor";
    document.getElementById('edit-vendedor-id').value = id;
    document.getElementById('nome-vendedor').value = v.nome;
    document.getElementById('whatsapp-vendedor').value = v.whatsapp;
    document.getElementById('email-vendedor').value = v.email || "";
    document.getElementById('btn-cancelar-vendedor').style.display = "block";
};

window.limparFormVendedor = () => {
    document.getElementById('edit-vendedor-id').value = "";
    document.getElementById('vendedor-form-title').innerText = "Cadastrar Vendedor";
    document.getElementById('btn-cancelar-vendedor').style.display = "none";
    ['nome-vendedor','whatsapp-vendedor','email-vendedor'].forEach(i => document.getElementById(i).value = "");
};

/* === CRM E GESTÃO DE LEADS === */
window.verDetalhesLead = (nome, whats, carro, vendedor) => {
    alert(`📋 FICHA DO CLIENTE\n\n👤 Nome: ${nome}\n📱 WhatsApp: ${whats}\n🚗 Interesse: ${carro}\n👤 Atendimento por: ${vendedor}`);
};

window.moverLead = async (id, novoStatus) => {
    await updateDoc(doc(db, "interesses", id), { statusFunil: novoStatus });
};

/* === MONITORES EM TEMPO REAL === */
const iniciarMonitores = (user) => {
    // Carros
    onSnapshot(query(collection(db, "carros"), where("lojaId", "==", user.uid)), (snap) => {
        const lista = document.getElementById('lista-estoque-admin');
        if (!lista) return;
        lista.innerHTML = '';
        snap.forEach(d => {
            const c = d.data();
            lista.innerHTML += `
                <div class="card-item" style="padding:15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
                    <span><b>${c.marca} ${c.modelo}</b> (${c.ano})</span>
                    <div>
                        <button onclick='window.prepararEdicaoCarro("${d.id}", ${JSON.stringify(c)})' style="color:var(--primary); background:none; border:none; cursor:pointer; margin-right:10px;"><i class="fa fa-edit"></i></button>
                        <button onclick="window.excluirDoc('carros', '${d.id}')" style="color:red; background:none; border:none; cursor:pointer;"><i class="fa fa-trash"></i></button>
                    </div>
                </div>`;
        });
    });

    // Vendedores
    onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", user.uid)), (snap) => {
        const select = document.getElementById('vendedor-responsavel');
        const lista = document.getElementById('lista-vendedores');
        if (select) select.innerHTML = '<option value="">Selecione um Vendedor...</option>';
        if (lista) lista.innerHTML = '';
        snap.forEach(d => {
            const v = d.data();
            if (select) select.innerHTML += `<option value="${v.nome}">${v.nome}</option>`;
            if (lista) lista.innerHTML += `
                <div class="card-item" style="padding:10px; display:flex; justify-content:space-between;">
                    <span>${v.nome}</span>
                    <div>
                        <button onclick='window.prepararEdicaoVendedor("${d.id}", ${JSON.stringify(v)})' style="color:var(--primary); background:none; border:none; cursor:pointer; margin-right:10px;"><i class="fa fa-edit"></i></button>
                        <button onclick="window.excluirDoc('vendedores', '${d.id}')" style="color:red; background:none; border:none; cursor:pointer;"><i class="fa fa-trash"></i></button>
                    </div>
                </div>`;
        });
    });

    // CRM
    onSnapshot(query(collection(db, "interesses"), where("lojaId", "==", user.uid)), (snap) => {
        const cols = { novo: '', contato: '', visita: '', fechado: '' };
        snap.forEach(d => {
            const l = d.data();
            const s = l.statusFunil || 'novo';
            const html = `
                <div class="kanban-card" onclick="window.verDetalhesLead('${l.nome}', '${l.whatsapp}', '${l.carro}', '${l.vendedorResponsavel}')" style="cursor:pointer">
                    <b>${l.nome}</b> <i class="fa fa-eye" style="float:right; opacity:0.3"></i><br>
                    <small>${l.carro}</small><br>
                    <select onchange="window.moverLead('${d.id}', this.value)" onclick="event.stopPropagation()" style="margin-top:5px; font-size:10px;">
                        <option value="novo" ${s==='novo'?'selected':''}>Novo</option>
                        <option value="contato" ${s==='contato'?'selected':''}>Contato</option>
                        <option value="visita" ${s==='visita'?'selected':''}>Visita</option>
                        <option value="fechado" ${s==='fechado'?'selected':''}>Fechado</option>
                    </select>
                </div>`;
            if (cols[s] !== undefined) cols[s] += html;
        });
        ['novo','contato','visita','fechado'].forEach(c => {
            const el = document.querySelector(`#col-${c} .kanban-cards`);
            if (el) el.innerHTML = cols[c];
        });
    });
};

/* === INICIALIZAÇÃO === */
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        iniciarMonitores(user);
    } else {
        document.getElementById('login-screen').style.display = 'flex';
    }
});

window.excluirDoc = async (coll, id) => { if(confirm("Deseja realmente excluir?")) await deleteDoc(doc(db, coll, id)); };

window.copiarLinkPortal = () => {
    const urlBase = window.location.href.split('index.html')[0];
    const link = `${urlBase}portal.html?loja=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(link).then(() => alert("Link copiado! Envie para seus clientes."));
};

window.salvarConfig = async () => {
    await setDoc(doc(db, "configuracoes", auth.currentUser.uid), {
        corLoja: document.getElementById('cor-loja').value,
        logo: window.logoBase64,
        dataUpdate: new Date()
    }, { merge: true });
    alert("Configurações salvas!");
};
