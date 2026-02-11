import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let fotosData = ["", "", "", ""];
let editId = null;

// SESSÃO E NAVEGAÇÃO
onAuthStateChanged(auth, (user) => {
    document.getElementById("loader-global").style.display = "none";
    if (user) {
        document.getElementById("login").classList.remove("active");
        document.getElementById("app").classList.remove("hidden");
        window.nav('showroom');
        startSync(user.uid);
    } else {
        document.getElementById("login").classList.add("active");
        document.getElementById("app").classList.add("hidden");
    }
});

window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelector(`[data-tab="${id}"]`)?.classList.add('active');
};

// COMPRESSÃO DE IMAGEM (ESSENCIAL PARA NÃO BARRAR NO FIREBASE)
window.preview = (input, id) => {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const scale = Math.min(800 / img.width, 600 / img.height);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressed = canvas.toDataURL('image/jpeg', 0.7);
            const idx = parseInt(id.replace('p','')) - 1;
            fotosData[idx] = compressed;
            document.getElementById(id).innerHTML = `<img src="${compressed}">`;
        };
    };
    reader.readAsDataURL(file);
};

// SINCRONIZAÇÃO EM TEMPO REAL
function startSync(uid) {
    // Sincronizar Carros (Funil)
    onSnapshot(query(collection(db, "carros"), where("lojaId", "==", uid)), (snap) => {
        const grid = document.getElementById("listaCarros");
        grid.innerHTML = "";
        snap.forEach(d => {
            const c = d.data();
            grid.innerHTML += `
                <div class="car-card status-${c.status}">
                    <div class="img-wrapper"><div class="img-inner" style="background-image:url('${c.fotos[0]}')"></div></div>
                    <div class="info">
                        <span class="status-badge">${c.status || 'estoque'}</span>
                        <h3>${c.modelo}</h3>
                        <p class="price">R$ ${Number(c.preco).toLocaleString('pt-BR')}</p>
                        <select onchange="window.updateStatus('${d.id}', this.value)" class="status-select">
                            <option value="estoque" ${c.status === 'estoque' ? 'selected' : ''}>Estoque</option>
                            <option value="lead" ${c.status === 'lead' ? 'selected' : ''}>Negociação</option>
                            <option value="vendido" ${c.status === 'vendido' ? 'selected' : ''}>Vendido</option>
                        </select>
                        <div class="btns">
                            <button onclick='window.prepararEdicao("${d.id}", ${JSON.stringify(c).replace(/'/g, "&apos;")})'><i class="fa fa-edit"></i></button>
                            <button onclick="window.excluirCarro('${d.id}')"><i class="fa fa-trash"></i></button>
                        </div>
                    </div>
                </div>`;
        });
    });

    // Sincronizar Vendedores
    onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", uid)), (snap) => {
        const list = document.getElementById("listaVendedores");
        const select = document.getElementById("vendedor-select");
        list.innerHTML = "";
        select.innerHTML = '<option value="">Escolha um vendedor</option>';
        snap.forEach(d => {
            const v = d.data();
            list.innerHTML += `<div class="v-card"><span>${v.nome}</span> <button onclick="window.excluirVendedor('${d.id}')">&times;</button></div>`;
            select.innerHTML += `<option value="${v.whats}|${v.nome}">${v.nome}</option>`;
        });
    });
}

// SALVAR VEÍCULO
window.salvarVeiculo = async () => {
    const vSel = document.getElementById("vendedor-select").value.split('|');
    const dados = {
        lojaId: auth.currentUser.uid,
        modelo: document.getElementById("modelo").value,
        preco: document.getElementById("preco").value,
        descricao: document.getElementById("descricao").value,
        vendedorWhats: vSel[0] || "",
        vendedorNome: vSel[1] || "",
        fotos: fotosData.filter(f => f !== ""),
        status: 'estoque'
    };

    if(!dados.modelo || !dados.vendedorWhats) return alert("Preencha o modelo e vendedor!");

    try {
        if(editId) await updateDoc(doc(db, "carros", editId), dados);
        else await addDoc(collection(db, "carros"), dados);
        window.resetForm();
        window.nav('showroom');
    } catch (e) { alert("Erro ao salvar! Verifique as fotos."); }
};

window.updateStatus = async (id, status) => { await updateDoc(doc(db, "carros", id), { status }); };
window.prepararEdicao = (id, d) => {
    editId = id;
    document.getElementById("modelo").value = d.modelo;
    document.getElementById("preco").value = d.preco;
    document.getElementById("descricao").value = d.descricao;
    fotosData = d.fotos;
    for(let i=1; i<=4; i++) document.getElementById(`p${i}`).innerHTML = d.fotos[i-1] ? `<img src="${d.fotos[i-1]}">` : '+';
    document.getElementById("btn-cancelar").classList.remove("hidden");
    window.nav('adicionar');
};

window.resetForm = () => {
    editId = null;
    document.getElementById("modelo").value = "";
    document.getElementById("preco").value = "";
    document.getElementById("descricao").value = "";
    fotosData = ["","","",""];
    for(let i=1; i<=4; i++) document.getElementById(`p${i}`).innerHTML = "+";
    document.getElementById("btn-cancelar").classList.add("hidden");
};

window.addVendedor = async () => {
    const nome = document.getElementById("v-nome").value;
    const whats = document.getElementById("v-whats").value.replace(/\D/g,'');
    await addDoc(collection(db, "vendedores"), { lojaId: auth.currentUser.uid, nome, whats });
    document.getElementById("v-nome").value = ""; document.getElementById("v-whats").value = "";
};

window.copyPortalLink = () => {
    const link = `${window.location.origin}${window.location.pathname.replace('index.html','')}portal.html?loja=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(link);
    alert("Link do Portal copiado!");
};

window.excluirCarro = (id) => confirm("Excluir?") && deleteDoc(doc(db, "carros", id));
window.excluirVendedor = (id) => confirm("Remover?") && deleteDoc(doc(db, "vendedores", id));
window.handleLogin = () => signInWithEmailAndPassword(auth, document.getElementById("email-login").value, document.getElementById("senha-login").value);
window.handleLogout = () => signOut(auth);
