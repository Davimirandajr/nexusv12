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

/* INTERFACE */
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('btn-' + id).classList.add('active');
};

window.copiarLinkPortal = () => {
    const url = window.location.origin + "/portal.html?loja=" + auth.currentUser.uid;
    navigator.clipboard.writeText(url).then(() => alert("Link copiado!"));
};

/* AUTH */
window.fazerLogin = () => {
    const e = document.getElementById('email-login').value;
    const s = document.getElementById('pass-login').value;
    signInWithEmailAndPassword(auth, e, s).catch(() => alert("Erro no login."));
};
window.handleLogout = () => signOut(auth).then(() => location.reload());

/* FOTOS */
window.handlePhoto = (input, slotId, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.fotosCarro[index] = e.target.result;
        document.getElementById(slotId).innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
    };
    reader.readAsDataURL(input.files[0]);
};

window.handleLogo = (input) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.logoBase64 = e.target.result;
        document.getElementById('preview-logo').innerHTML = `<img src="${e.target.result}" style="max-height:100%;max-width:100%;object-fit:contain;">`;
    };
    reader.readAsDataURL(input.files[0]);
};

/* ESTOQUE */
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

    if (idEdit) {
        await updateDoc(doc(db, "carros", idEdit), dados);
    } else {
        dados.fotos = window.fotosCarro.filter(f => f !== "");
        dados.dataCriacao = new Date();
        await addDoc(collection(db, "carros"), dados);
    }
    window.limparFormEstoque();
};

window.prepararEdicaoCarro = (id, dataJson) => {
    const c = JSON.parse(decodeURIComponent(dataJson));
    document.getElementById('edit-carro-id').value = id;
    document.getElementById('modelo').value = c.modelo;
    document.getElementById('marca').value = c.marca;
    document.getElementById('preco').value = c.preco;
    document.getElementById('form-title').innerText = "Editando " + c.modelo;
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
    window.nav('showroom');
};

window.limparFormEstoque = () => {
    document.getElementById('edit-carro-id').value = "";
    document.querySelectorAll('#showroom input, #showroom textarea').forEach(i => i.value = "");
    window.fotosCarro = ["", "", ""];
    document.querySelectorAll('.photo-slot').forEach(s => s.innerHTML = '<i class="fa fa-plus"></i>');
    document.getElementById('btn-cancel-edit').classList.add('hidden');
};

/* CONFIG */
window.salvarConfig = async () => {
    await setDoc(doc(db, "configuracoes", auth.currentUser.uid), {
        corLoja: document.getElementById('cor-loja').value,
        logo: window.logoBase64
    });
    alert("Configurações salvas!");
};

window.excluirDoc = async (coll, id) => {
    if(confirm("Excluir?")) await deleteDoc(doc(db, coll, id));
};

window.addVendedor = async () => {
    const nome = document.getElementById('nome-vendedor').value;
    const whats = document.getElementById('whats-vendedor').value;
    await addDoc(collection(db, "vendedores"), { lojaId: auth.currentUser.uid, nome, whats });
};

/* MONITORES */
const iniciarMonitores = (user) => {
    // Estoque
    onSnapshot(query(collection(db, "carros"), where("lojaId", "==", user.uid)), (snap) => {
        const lista = document.getElementById('lista-estoque-admin');
        let total = 0, vendidos = 0, valorTotal = 0;
        lista.innerHTML = '';
        snap.forEach(d => {
            const c = d.data();
            total++;
            if(c.status === 'vendido') { vendidos++; valorTotal += c.preco; }
            lista.innerHTML += `
                <div class="item-admin-card">
                    <img src="${c.fotos[0] || ''}" style="width:50px;height:40px;object-fit:cover;border-radius:5px;">
                    <div style="flex:1"><strong>${c.modelo}</strong></div>
                    <button onclick="window.prepararEdicaoCarro('${d.id}', '${encodeURIComponent(JSON.stringify(c))}')">Edit</button>
                    <button onclick="window.excluirDoc('carros', '${d.id}')" style="color:red">X</button>
                </div>`;
        });
        document.getElementById('stat-total-estoque').innerText = total;
        document.getElementById('stat-vendidos-mes').innerText = vendidos;
        document.getElementById('stat-valor-estoque').innerText = "R$ " + valorTotal.toLocaleString();
    });

    // CRM / Leads
    onSnapshot(query(collection(db, "interesses"), where("lojaId", "==", user.uid), orderBy("data", "desc")), (snap) => {
        const crm = document.getElementById('lista-clientes-crm');
        crm.innerHTML = '';
        snap.forEach(d => {
            const l = d.data();
            crm.innerHTML += `<div class="item-admin-card">
                <div><strong>${l.carro}</strong><br>${l.nome}</div>
                <a href="https://wa.me/${l.vendedorWhats}" target="_blank">Zap</a>
                <button onclick="window.excluirDoc('interesses', '${d.id}')">OK</button>
            </div>`;
        });
    }, (err) => console.log("Aguardando Índice..."));

    // Configs
    onSnapshot(doc(db, "configuracoes", user.uid), (s) => {
        if(s.exists()){
            const d = s.data();
            document.getElementById('cor-loja').value = d.corLoja || "#0056b3";
            if(d.logo) document.getElementById('preview-logo').innerHTML = `<img src="${d.logo}" style="max-height:100%;max-width:100%;object-fit:contain;">`;
        }
    });
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        iniciarMonitores(user);
        onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", user.uid)), (snap) => {
            const sel = document.getElementById('vendedor-carro');
            const lista = document.getElementById('lista-vendedores');
            sel.innerHTML = '<option value="">Vendedor Responsável</option>';
            lista.innerHTML = '';
            snap.forEach(v => {
                sel.innerHTML += `<option value="${v.id}">${v.data().nome}</option>`;
                lista.innerHTML += `<div class="item-admin-card">${v.data().nome} <button onclick="window.excluirDoc('vendedores', '${v.id}')">X</button></div>`;
            });
        });
    } else {
        document.getElementById('login-form').classList.remove('hidden');
    }
});
