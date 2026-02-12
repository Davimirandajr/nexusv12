import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, setDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CONFIGURAÇÃO LIMPA (Sem espaços ou erros)
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

// Variáveis de suporte
let fotosData = ["", "", "", ""];
let logoData = "";

// --- FUNÇÕES DE NAVEGAÇÃO ---
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    const btn = document.querySelector(`[data-tab="${id}"]`);
    if(btn) btn.classList.add('active');
};

// --- COMPRESSÃO DE IMAGENS (Evita erro de cota do Firebase) ---
const compress = (file, callback, width = 800) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = width / img.width;
            canvas.width = width;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            callback(canvas.toDataURL('image/jpeg', 0.7));
        };
    };
    reader.readAsDataURL(file);
};

window.preview = (input, id) => {
    compress(input.files[0], (data) => {
        const idx = parseInt(id.replace('p','')) - 1;
        fotosData[idx] = data;
        document.getElementById(id).innerHTML = `<img src="${data}" style="width:100%;height:100%;object-fit:cover">`;
    });
};

window.handleLogo = (input) => {
    compress(input.files[0], (data) => {
        logoData = data;
        document.getElementById('logo-preview').innerHTML = `<img src="${data}" style="max-width:100%;max-height:100%;object-fit:contain">`;
    }, 400);
};

// --- SALVAMENTO ---
window.salvarConfig = async () => {
    try {
        await setDoc(doc(db, "configuracoes", auth.currentUser.uid), {
            corLoja: document.getElementById('cor-loja').value,
            logoLoja: logoData,
            lojaId: auth.currentUser.uid
        }, { merge: true });
        alert("Configurações de Identidade Salvas!");
    } catch(e) { alert("Erro ao salvar config: " + e.message); }
};

window.salvarVeiculo = async () => {
    try {
        const vSel = document.getElementById("vendedor-select")?.value.split('|') || ["", ""];
        await addDoc(collection(db, "carros"), {
            lojaId: auth.currentUser.uid,
            marca: document.getElementById('marca').value,
            modelo: document.getElementById('modelo').value,
            ano: document.getElementById('ano').value,
            km: Number(document.getElementById('km').value),
            cambio: document.getElementById('cambio').value,
            preco: Number(document.getElementById('preco').value),
            descricao: document.getElementById('descricao').value,
            vendedorWhats: vSel[0],
            fotos: fotosData.filter(f => f !== ""),
            status: 'disponivel'
        });
        alert("Veículo cadastrado no estoque!");
        window.nav('showroom');
    } catch(e) { alert("Erro ao cadastrar carro: " + e.message); }
};

// --- MONITORAMENTO DE LOGIN E DADOS ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("app").classList.remove("hidden");
        
        // Sincronizar Estoque
        onSnapshot(query(collection(db, "carros"), where("lojaId", "==", user.uid)), (snap) => {
            const list = document.getElementById("listaCarros");
            if(list) {
                list.innerHTML = snap.docs.map(d => {
                    const c = d.data();
                    return `
                    <div class="car-item" style="background:#fff; padding:15px; border-radius:10px; margin-bottom:10px; border-left: 5px solid ${c.status === 'vendido' ? 'gray' : 'red'}">
                        <b>${c.marca} ${c.modelo}</b> - R$ ${c.preco.toLocaleString()}
                        <br><small>${c.ano} | ${c.km} KM</small>
                        <button onclick="window.excluir('${d.id}')" style="float:right; color:red; border:none; background:none; cursor:pointer;">Excluir</button>
                    </div>`;
                }).join('');
            }
        });
    } else {
        const email = prompt("Nexus V12 - Digite seu email:");
        const senha = prompt("Digite sua senha:");
        if(email && senha) {
            signInWithEmailAndPassword(auth, email, senha).catch(e => alert("Erro: " + e.message));
        }
    }
});

window.excluir = (id) => confirm("Deseja apagar este veículo?") && deleteDoc(doc(db, "carros", id));
window.handleLogout = () => signOut(auth).then(() => location.reload());
