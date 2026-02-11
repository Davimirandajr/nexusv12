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
let fotosData = ["","","","",""];

// NAVEGAÇÃO ENTRE ABAS
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(id);
    if(target) target.style.display = 'block';
    
    const btn = document.querySelector(`[onclick="window.nav('${id}')"]`);
    if(btn) btn.classList.add('active');
    
    document.getElementById("sidebar").classList.remove("open");
};

window.toggleMenu = () => document.getElementById("sidebar").classList.toggle("open");

// CONTROLE DE ACESSO
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("login").style.display = 'none';
        document.getElementById("app").classList.remove("hidden");
        window.nav('showroom');
        startSync();
    } else {
        document.getElementById("login").style.display = 'flex';
        document.getElementById("app").classList.add("hidden");
    }
});

window.handleLogin = () => {
    const e = document.getElementById("email-login").value;
    const s = document.getElementById("senha-login").value;
    signInWithEmailAndPassword(auth, e, s).catch(err => {
        alert("Erro de Autenticação. Verifique se o seu domínio está autorizado no Firebase Console.");
    });
};

window.handleLogout = () => signOut(auth);

// SINCRONIZAÇÃO EM TEMPO REAL
function startSync() {
    const q = query(collection(db, "carros"), where("lojaId", "==", auth.currentUser.uid));
    onSnapshot(q, (snap) => {
        const showroom = document.getElementById("listaCarros");
        showroom.innerHTML = "";

        snap.forEach(d => {
            const c = d.data();
            // BLOQUEIO DO ERRO UNDEFINED
            const img = (c.fotos && c.fotos[0]) ? c.fotos[0] : 'https://via.placeholder.com/400x250?text=V12+Premium';
            
            showroom.innerHTML += `
                <div class="car-card">
                    <div class="car-img" style="background-image:url('${img}')"></div>
                    <div class="car-info">
                        <h3>${c.modelo || 'Veículo Nexus'}</h3>
                        <p class="price">R$ ${Number(c.preco || 0).toLocaleString('pt-BR')}</p>
                        <button onclick="window.excluir('${d.id}')" class="btn-del">Remover</button>
                    </div>
                </div>`;
        });
    });
}

window.excluir = (id) => confirm("Excluir?") && deleteDoc(doc(db, "carros", id));

window.preview = (input, id) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        fotosData[parseInt(id.replace('p',''))-1] = e.target.result;
        document.getElementById(id).innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
    };
    reader.readAsDataURL(input.files[0]);
};

window.salvarVeiculo = async () => {
    const btn = document.getElementById("btn-salvar");
    btn.innerText = "Salvando...";
    await addDoc(collection(db, "carros"), {
        lojaId: auth.currentUser.uid,
        modelo: document.getElementById("modelo").value,
        preco: document.getElementById("preco").value,
        fotos: fotosData.filter(f => f !== ""),
        status: 'leads'
    });
    alert("Cadastrado!");
    window.nav('showroom');
};
