import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, setDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Variáveis Globais para armazenamento temporário
window.veiculoFotos = ["", "", "", ""];
window.logoEmpresa = "";
let todosVeiculos = [];

// --- GESTÃO DE IMAGENS (COMPRESSÃO) ---
const compress = (file, callback, size = 800) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = size / img.width;
            canvas.width = size;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            callback(canvas.toDataURL('image/jpeg', 0.7));
        };
    };
    reader.readAsDataURL(file);
};

window.handlePhoto = (input, slotId, index) => {
    if (input.files && input.files[0]) {
        compress(input.files[0], (data) => {
            window.veiculoFotos[index] = data;
            document.getElementById(slotId).innerHTML = `<img src="${data}">`;
        });
    }
};

window.handleLogo = (input) => {
    if (input.files && input.files[0]) {
        compress(input.files[0], (data) => {
            window.logoEmpresa = data;
            document.getElementById('logo-preview').innerHTML = `<img src="${data}" style="max-height:100%">`;
        }, 400);
    }
};

// --- SALVAMENTO ---
window.salvarVeiculo = async () => {
    try {
        const btn = document.querySelector('#showroom .btn');
        btn.innerText = "Publicando...";
        btn.disabled = true;

        await addDoc(collection(db, "carros"), {
            lojaId: auth.currentUser.uid,
            marca: document.getElementById('marca').value,
            modelo: document.getElementById('modelo').value,
            ano: document.getElementById('ano').value,
            motor: document.getElementById('motor').value,
            cor: document.getElementById('cor').value,
            km: Number(document.getElementById('km').value),
            cambio: document.getElementById('cambio').value,
            preco: Number(document.getElementById('preco').value),
            descricao: document.getElementById('descricao').value,
            fotos: window.veiculoFotos.filter(f => f !== ""),
            status: 'disponivel',
            dataCriacao: new Date()
        });
        
        alert("Veículo Publicado com Sucesso!");
        location.reload(); 
    } catch (e) {
        alert("Erro ao publicar: " + e.message);
    }
};

window.salvarCliente = async () => {
    await addDoc(collection(db, "clientes"), {
        lojaId: auth.currentUser.uid,
        nome: document.getElementById('c-nome').value,
        whats: document.getElementById('c-whats').value,
        veiculo: document.getElementById('c-veiculo').value,
        etapa: 'novo'
    });
    alert("Lead Criado!");
};

window.salvarVendedor = async () => {
    await addDoc(collection(db, "vendedores"), {
        lojaId: auth.currentUser.uid,
        nome: document.getElementById('v-nome').value,
        whats: document.getElementById('v-whats').value
    });
    alert("Vendedor Salvo!");
};

window.salvarConfig = async () => {
    await setDoc(doc(db, "configuracoes", auth.currentUser.uid), {
        corLoja: document.getElementById('cor-loja').value,
        logoLoja: window.logoEmpresa,
        lojaId: auth.currentUser.uid
    }, { merge: true });
    alert("Identidade da Loja Atualizada!");
};

// --- NAVEGAÇÃO ---
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-nav'));
    document.getElementById(id).classList.add('active');
    document.getElementById('btn-'+id)?.classList.add('active-nav');
};

// --- MONITOR DE SESSÃO ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        document.getElementById("menu-lateral").classList.remove("hidden");
        sincronizar(user.uid);
    } else {
        document.getElementById("login-status").innerText = "Pronto para entrar";
        document.getElementById("login-form").classList.remove("hidden");
    }
});

function sincronizar(uid) {
    // Carros e Filtro
    onSnapshot(query(collection(db, "carros"), where("lojaId", "==", uid)), (snap) => {
        todosVeiculos = snap.docs.map(d => ({id: d.id, ...d.data()}));
        renderEstoque(todosVeiculos);
        // Atualiza o select de veículos no CRM
        const select = document.getElementById("c-veiculo");
        if(select) {
            select.innerHTML = `<option>Selecione um veículo...</option>` + 
                todosVeiculos.map(v => `<option value="${v.marca} ${v.modelo}">${v.marca} ${v.modelo}</option>`).join('');
        }
    });

    // Funil CRM
    onSnapshot(query(collection(db, "clientes"), where("lojaId", "==", uid)), (snap) => {
        const colNovo = document.getElementById("f-novo");
        const colNeg = document.getElementById("f-negocio");
        const colGan = document.getElementById("f-ganho");
        if(!colNovo) return;

        colNovo.innerHTML = ""; colNeg.innerHTML = ""; colGan.innerHTML = "";
        snap.forEach(d => {
            const c = d.data();
            const btnTexto = c.etapa === 'novo' ? 'Negociar' : 'Vendido';
            const proxEtapa = c.etapa === 'novo' ? 'negocio' : 'ganho';
            
            const card = `
                <div class="lead-card">
                    <b>${c.nome}</b><br><small>${c.veiculo}</small><br>
                    <div style="margin-top:10px; display:flex; gap:5px;">
                        ${c.etapa !== 'ganho' ? `<button class="btn" style="padding:5px; font-size:10px;" onclick="window.moverEtapa('${d.id}', '${proxEtapa}')">${btnTexto} >></button>` : ''}
                        <button class="btn" style="padding:5px; font-size:10px; background:#666;" onclick="window.excluir('${d.id}', 'clientes')">Excluir</button>
                    </div>
                </div>`;
            
            if(c.etapa === 'novo') colNovo.innerHTML += card;
            else if(c.etapa === 'negocio') colNeg.innerHTML += card;
            else if(c.etapa === 'ganho') colGan.innerHTML += card;
        });
    });

    // Vendedores
    onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", uid)), (snap) => {
        const lista = document.getElementById("listaVendedores");
        if(lista) {
            lista.innerHTML = snap.docs.map(d => `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                    <span><b>${d.data().nome}</b> - ${d.data().whats}</span>
                    <button onclick="window.excluir('${d.id}', 'vendedores')" style="color:red; border:none; background:none; cursor:pointer;"><i class="fa fa-trash"></i></button>
                </div>
            `).join('');
        }
    });
}

function renderEstoque(lista) {
    const container = document.getElementById("listaCarros");
    if(!container) return;
    container.innerHTML = lista.map(v => `
        <div class="card" style="display:flex; gap:15px; align-items:center; padding:10px;">
            <img src="${v.fotos[0] || 'https://via.placeholder.com/80'}" style="width:80px; height:60px; object-fit:cover; border-radius:5px;">
            <div style="flex:1">
                <b style="text-transform:uppercase;">${v.marca} ${v.modelo}</b><br>
                <small>${v.ano} | ${v.km.toLocaleString()} km</small><br>
                <b style="color:var(--primary)">R$ ${v.preco.toLocaleString('pt-BR')}</b>
            </div>
            <button onclick="window.excluir('${v.id}', 'carros')" style="color:red; background:none; border:none; cursor:pointer;"><i class="fa fa-trash"></i></button>
        </div>
    `).join('');
}

window.filtrarEstoque = () => {
    const b = document.getElementById('busca-estoque').value.toLowerCase();
    renderEstoque(todosVeiculos.filter(v => v.marca.toLowerCase().includes(b) || v.modelo.toLowerCase().includes(b)));
};

window.moverEtapa = (id, etapa) => updateDoc(doc(db, "clientes", id), { etapa });
window.excluir = (id, col) => confirm("Deseja realmente excluir este item?") && deleteDoc(doc(db, col, id));
window.fazerLogin = () => signInWithEmailAndPassword(auth, document.getElementById('email-login').value, document.getElementById('pass-login').value);
window.handleLogout = () => signOut(auth).then(() => location.reload());

window.copyPortalLink = () => {
    const link = window.location.origin + window.location.pathname.replace('index.html', '') + "portal.html?loja=" + auth.currentUser.uid;
    navigator.clipboard.writeText(link);
    alert("Link do seu Portal copiado com sucesso!");
};
