import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, query, where, deleteDoc, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

/* NAVEGAÇÃO */
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('btn-' + id).classList.add('active');
};

/* UTILITÁRIOS */
window.copiarLinkPortal = () => {
    const link = `${window.location.origin}/portal.html?loja=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(link).then(() => alert("🚀 Link do seu Portal copiado!"));
};

/* FOTOS */
window.handlePhoto = (input, slotId, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.fotosCarro[index] = e.target.result;
        document.getElementById(slotId).innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
    };
    if(input.files[0]) reader.readAsDataURL(input.files[0]);
};

window.handleLogo = (input) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.logoBase64 = e.target.result;
        document.getElementById('preview-logo').innerHTML = `<img src="${e.target.result}" style="max-height:100%;max-width:100%;">`;
    };
    if(input.files[0]) reader.readAsDataURL(input.files[0]);
};

/* ESTOQUE */
window.salvarVeiculo = async () => {
    const id = document.getElementById('edit-carro-id').value;
    const dados = {
        lojaId: auth.currentUser.uid,
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
        if(id) {
            await updateDoc(doc(db, "carros", id), dados);
            alert("Atualizado!");
        } else {
            dados.fotos = window.fotosCarro.filter(f => f !== "");
            dados.dataCriacao = new Date();
            await addDoc(collection(db, "carros"), dados);
            alert("Cadastrado!");
        }
        window.limparFormEstoque();
    } catch(e) { alert("Erro ao salvar."); }
};

window.prepararEdicaoCarro = (id, dataJson) => {
    const c = JSON.parse(decodeURIComponent(dataJson));
    document.getElementById('edit-carro-id').value = id;
    document.getElementById('modelo').value = c.modelo;
    document.getElementById('marca').value = c.marca;
    document.getElementById('preco').value = c.preco;
    document.getElementById('form-title').innerText = "Editando: " + c.modelo;
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
    window.nav('showroom');
};

window.limparFormEstoque = () => {
    document.getElementById('edit-carro-id').value = "";
    document.querySelectorAll('#showroom input, #showroom textarea').forEach(i => i.value = "");
    window.fotosCarro = ["", "", ""];
    document.querySelectorAll('.slot').forEach(s => s.innerHTML = '<i class="fa fa-plus"></i>');
    document.getElementById('form-title').innerText = "Novo Veículo";
    document.getElementById('btn-cancel-edit').classList.add('hidden');
};

/* CRM & VENDEDORES */
window.addLeadManual = async () => {
    const nome = prompt("Nome do Cliente:");
    const carro = prompt("Carro:");
    if(nome && carro) {
        await addDoc(collection(db, "interesses"), { 
            lojaId: auth.currentUser.uid, nome, carro, vendedor: "Manual", data: new Date() 
        });
    }
};

window.addVendedor = async () => {
    const nome = document.getElementById('nome-vendedor').value;
    const whats = document.getElementById('whats-vendedor').value;
    if(nome && whats) {
        await addDoc(collection(db, "vendedores"), { lojaId: auth.currentUser.uid, nome, whats });
        document.getElementById('nome-vendedor').value = "";
        document.getElementById('whats-vendedor').value = "";
    }
};

window.excluirDoc = async (coll, id) => {
    if(confirm("Deseja excluir permanentemente?")) await deleteDoc(doc(db, coll, id));
};

/* CONFIG */
window.salvarConfig = async () => {
    await setDoc(doc(db, "configuracoes", auth.currentUser.uid), {
        corLoja: document.getElementById('cor-loja').value,
        logo: window.logoBase64
    });
    alert("Identidade Visual Atualizada!");
};

/* MONITORES */
const iniciarMonitores = (user) => {
    // Carros
    onSnapshot(query(collection(db, "carros"), where("lojaId", "==", user.uid)), (snap) => {
        const lista = document.getElementById('lista-estoque-admin');
        let total = 0, vendidos = 0;
        lista.innerHTML = '';
        snap.forEach(d => {
            const c = d.data();
            total++;
            if(c.status === 'vendido') vendidos++;
            lista.innerHTML += `
                <div class="card-item">
                    <img src="${c.fotos[0] || ''}">
                    <div class="info"><b>${c.modelo}</b><br>R$ ${c.preco.toLocaleString()}</div>
                    <div class="btns">
                        <button onclick="window.prepararEdicaoCarro('${d.id}', '${encodeURIComponent(JSON.stringify(c))}')"><i class="fa fa-edit"></i></button>
                        <button onclick="window.excluirDoc('carros', '${d.id}')" style="color:red"><i class="fa fa-trash"></i></button>
                    </div>
                </div>`;
        });
        document.getElementById('stat-total').innerText = total;
        document.getElementById('stat-vendidos').innerText = vendidos;
    });

    // CRM
    const qLeads = query(collection(db, "interesses"), where("lojaId", "==", user.uid), orderBy("data", "desc"));
    onSnapshot(qLeads, (snap) => {
        const crm = document.getElementById('lista-clientes-crm');
        crm.innerHTML = '';
        snap.forEach(d => {
            const l = d.data();
            crm.innerHTML += `
                <div class="crm-card">
                    <div><b>${l.nome}</b> está interessado em <b>${l.carro}</b></div>
                    <button onclick="window.excluirDoc('interesses', '${d.id}')" class="btn-check">OK</button>
                </div>`;
        });
    }, (err) => console.log("Aguardando índice do Firebase..."));

    // Vendedores
    onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", user.uid)), (snap) => {
        const vList = document.getElementById('lista-vendedores');
        const sel = document.getElementById('vendedor-carro');
        vList.innerHTML = '';
        sel.innerHTML = '<option value="">Vendedor Responsável</option>';
        snap.forEach(v => {
            const ven = v.data();
            vList.innerHTML += `<div class="card-item"><b>${ven.nome}</b> <span>${ven.whats}</span> <button onclick="window.excluirDoc('vendedores', '${v.id}')">X</button></div>`;
            sel.innerHTML += `<option value="${v.id}">${ven.nome}</option>`;
        });
    });

    // Configs
    onSnapshot(doc(db, "configuracoes", user.uid), (s) => {
        if(s.exists()){
            const d = s.data();
            document.getElementById('cor-loja').value = d.corLoja || "#e31010";
            if(d.logo) document.getElementById('preview-logo').innerHTML = `<img src="${d.logo}" style="max-height:100%;">`;
        }
    });
};

/* INICIALIZAÇÃO */
window.fazerLogin = () => {
    const e = document.getElementById('email-login').value;
    const s = document.getElementById('pass-login').value;
    signInWithEmailAndPassword(auth, e, s).catch(() => alert("Credenciais Inválidas"));
};

window.handleLogout = () => signOut(auth).then(() => location.reload());

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        iniciarMonitores(user);
    } else {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('auth-status').innerText = "Acesso Restrito";
    }
});
