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

// NAVEGAÇÃO
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    
    const activeBtn = document.querySelector(`[onclick="window.nav('${id}')"]`);
    if(activeBtn) activeBtn.classList.add('active');
    
    document.getElementById("sidebar").classList.remove("open");
};

window.toggleMenu = () => {
    document.getElementById("sidebar").classList.toggle("open");
};

// MONITOR DE AUTENTICAÇÃO
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("login").classList.remove("active");
        document.getElementById("app").classList.remove("hidden");
        window.nav('showroom');
        startSync();
    } else {
        document.getElementById("login").classList.add("active");
        document.getElementById("app").classList.add("hidden");
    }
});

// LOGIN
window.handleLogin = () => {
    const e = document.getElementById("email-login").value;
    const s = document.getElementById("senha-login").value;
    signInWithEmailAndPassword(auth, e, s).catch(() => alert("Acesso inválido!"));
};

window.handleLogout = () => signOut(auth);

// SINCRONIZAÇÃO DE DADOS (COM TRAVA PARA UNDEFINED)
function startSync() {
    const q = query(collection(db, "carros"), where("lojaId", "==", auth.currentUser.uid));
    onSnapshot(q, (snap) => {
        const showroom = document.getElementById("listaCarros");
        const cLeads = document.getElementById("col-leads");
        
        showroom.innerHTML = ""; 
        if(cLeads) cLeads.innerHTML = "";

        snap.forEach(d => {
            const c = d.data();
            // CORREÇÃO DO ERRO UNDEFINED: Se não tiver foto, usa uma imagem padrão
            const fotoPrincipal = (c.fotos && c.fotos[0]) ? c.fotos[0] : 'https://via.placeholder.com/400x300?text=Sem+Foto';
            
            const cardHtml = `
                <div class="car-card">
                    <div class="car-img" style="background-image:url('${fotoPrincipal}')"></div>
                    <div class="car-info">
                        <h3>${c.modelo || 'Sem Modelo'}</h3>
                        <p class="car-price">R$ ${Number(c.preco || 0).toLocaleString('pt-BR')}</p>
                        <button onclick="window.excluir('${d.id}')" class="btn-del">Excluir</button>
                    </div>
                </div>`;
            
            showroom.innerHTML += cardHtml;
            if(c.status === 'leads' && cLeads) cLeads.innerHTML += cardHtml;
        });
    });
}

window.excluir = (id) => {
    if(confirm("Deseja apagar este veículo?")) {
        deleteDoc(doc(db, "carros", id));
    }
};

// PREVIEW DE FOTOS
window.preview = (input, id) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const idx = parseInt(id.replace('p','')) - 1;
        fotosData[idx] = e.target.result;
        document.getElementById(id).innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
    };
    reader.readAsDataURL(input.files[0]);
};

// SALVAR VEÍCULO
window.salvarVeiculo = async () => {
    const btn = document.getElementById("btn-salvar");
    btn.innerText = "Enviando...";
    btn.disabled = true;

    try {
        await addDoc(collection(db, "carros"), {
            lojaId: auth.currentUser.uid,
            modelo: document.getElementById("modelo").value,
            preco: document.getElementById("preco").value,
            fotos: fotosData.filter(f => f !== ""),
            status: 'leads',
            timestamp: new Date().getTime()
        });
        alert("Veículo cadastrado!");
        fotosData = ["","","","",""]; // Limpa as fotos
        window.nav('showroom');
    } catch (e) {
        alert("Erro ao salvar: " + e.message);
    } finally {
        btn.innerText = "SALVAR NO ESTOQUE";
        btn.disabled = false;
    }
};
