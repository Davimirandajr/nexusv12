import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// FUNÇÃO DE NAVEGAÇÃO (CORRIGIDA)
window.nav = (id) => {
    // 1. Esconde TODAS as páginas de conteúdo
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(p => p.classList.remove('active'));

    // 2. Remove destaque de todos os botões
    const btns = document.querySelectorAll('.nav-btn');
    btns.forEach(b => b.classList.remove('active'));

    // 3. Mostra a página certa
    const target = document.getElementById(id);
    if(target) {
        target.classList.add('active');
    }

    // 4. Fecha o menu no celular
    document.getElementById("sidebar").classList.remove("open");
    console.log("Navegou para:", id);
};

window.toggleMenu = () => document.getElementById("sidebar").classList.toggle("open");

// MONITOR DE LOGIN
onAuthStateChanged(auth, (user) => {
    document.getElementById("loader").style.display = "none";
    if (user) {
        document.getElementById("login").classList.remove("active");
        document.getElementById("app").style.display = "block"; // Mostra o container do App
        window.nav('showroom'); // Vai direto para o estoque
        syncData();
    } else {
        document.getElementById("login").classList.add("active");
        document.getElementById("app").style.display = "none";
    }
});

// LOGIN E LOGOUT
window.handleLogin = () => {
    const email = document.getElementById("email-login").value;
    const senha = document.getElementById("senha-login").value;
    signInWithEmailAndPassword(auth, email, senha).catch(e => alert("Erro: " + e.message));
};

window.handleLogout = () => signOut(auth);

// CADASTRAR VEÍCULO
window.salvarVeiculo = async () => {
    const btn = document.getElementById("btn-salvar");
    btn.innerText = "CADASTRANDO...";
    
    try {
        await addDoc(collection(db, "carros"), {
            lojaId: auth.currentUser.uid,
            modelo: document.getElementById("modelo").value,
            preco: document.getElementById("preco").value,
            fotos: fotosData.filter(f => f !== ""),
            status: 'leads',
            data: new Date().toISOString()
        });
        alert("Veículo salvo com sucesso!");
        window.nav('showroom');
    } catch (e) {
        alert("Erro ao salvar: " + e.message);
    } finally {
        btn.innerText = "SALVAR VEÍCULO";
    }
};

// PREVIEW DAS FOTOS
window.preview = (input, id) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const idx = parseInt(id.replace('p','')) - 1;
        fotosData[idx] = e.target.result;
        document.getElementById(id).innerHTML = `<img src="${e.target.result}">`;
    };
    reader.readAsDataURL(input.files[0]);
};

// PUXAR DADOS DO FIREBASE
function syncData() {
    const q = query(collection(db, "carros"), where("lojaId", "==", auth.currentUser.uid));
    onSnapshot(q, (snap) => {
        const list = document.getElementById("listaCarros");
        const lLeads = document.getElementById("col-leads");
        
        list.innerHTML = ""; lLeads.innerHTML = "";
        
        snap.forEach(d => {
            const c = d.data();
            const card = `
                <div style="background:#111; padding:15px; border-radius:10px; margin-bottom:15px; border:1px solid #222">
                    <img src="${c.fotos[0]}" style="width:100%; border-radius:5px; height:150px; object-fit:cover">
                    <h4 style="margin-top:10px">${c.modelo}</h4>
                    <p style="color:var(--gold)">R$ ${c.preco}</p>
                </div>`;
            list.innerHTML += card;
            if(c.status === 'leads') lLeads.innerHTML += card;
        });
    });
}
