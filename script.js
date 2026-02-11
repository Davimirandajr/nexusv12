// script.js
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

// Global Variables para fotos
let fotosData = ["", "", "", "", ""];

// Mata o Loop
onAuthStateChanged(auth, (user) => {
    document.getElementById("loader").style.display = "none";
    if (user) {
        document.getElementById("login").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        syncEstoque();
        syncVendedores();
    } else {
        document.getElementById("login").classList.remove("hidden");
        document.getElementById("app").classList.add("hidden");
    }
});

// Navegação entre Etapas de Cadastro
window.nextStep = (step) => {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById('step' + step).classList.add('active');
};

// Preview de Fotos
window.preview = async (input, slotId) => {
    const file = input.files[0];
    if (file) {
        const base64 = await compress(file);
        const index = parseInt(slotId.replace('p', '')) - 1;
        fotosData[index] = base64;
        document.getElementById(slotId).innerHTML = `<img src="${base64}">`;
    }
};

// Sincronização
function syncEstoque() {
    const q = query(collection(db, "carros"), where("lojaId", "==", auth.currentUser.uid));
    onSnapshot(q, (snap) => {
        const grid = document.getElementById("listaCarros");
        grid.innerHTML = snap.docs.map(d => {
            const c = d.data();
            return `
                <div class="car-card">
                    <div class="car-img" style="background-image:url(${c.fotos[0]})"></div>
                    <div class="car-info">
                        <h3>${c.modelo}</h3>
                        <p style="color:var(--primary)">R$ ${c.preco.toLocaleString()}</p>
                        <button onclick="window.delCarro('${d.id}')" style="background:none; border:none; color:red; cursor:pointer; margin-top:10px;">Excluir</button>
                    </div>
                </div>
            `;
        }).join('');
    });
}

// Salvar Veículo (5 fotos)
window.salvarVeiculo = async () => {
    const btn = document.getElementById("btn-salvar");
    btn.innerText = "Processando...";
    btn.disabled = true;

    try {
        const validPhotos = fotosData.filter(f => f !== "");
        await addDoc(collection(db, "carros"), {
            lojaId: auth.currentUser.uid,
            modelo: document.getElementById("modelo").value,
            preco: parseFloat(document.getElementById("preco").value),
            vendedorWhats: document.getElementById("vendedor-select").value,
            fotos: validPhotos,
            status: 'leads',
            data: new Date().toISOString()
        });
        alert("Veículo cadastrado!");
        location.reload();
    } catch (e) { alert("Erro ao salvar."); }
};

// Auxiliares
window.nav = (id) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

window.handleLogin = () => {
    signInWithEmailAndPassword(auth, document.getElementById("email-login").value, document.getElementById("senha-login").value)
    .catch(() => alert("Erro no login"));
};

window.handleLogout = () => signOut(auth);

async function compress(file) {
    return new Promise(res => {
        const r = new FileReader(); r.readAsDataURL(file);
        r.onload = e => {
            const img = new Image(); img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 600; canvas.height = (img.height * 600) / img.width;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                res(canvas.toDataURL('image/jpeg', 0.6));
            }
        }
    });
}
