import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. CONFIGURAÇÃO (Nexus V12)
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
let fotosData = ["", "", "", "", ""];

// 2. CONTROLE DE ACESSO (O PONTO CRÍTICO)
onAuthStateChanged(auth, (user) => {
    const loginSection = document.getElementById("login");
    const appSection = document.getElementById("app");

    if (user) {
        console.log("Logado como:", user.email);
        
        // Esconde o Login e mostra o App (Força Bruta)
        if (loginSection) {
            loginSection.classList.remove("active");
            loginSection.style.display = "none"; 
        }
        if (appSection) {
            appSection.classList.remove("hidden");
            appSection.style.display = "flex";
        }
        
        window.nav('showroom');
        startRealtimeSync(user.uid);
    } else {
        // Mostra o Login e esconde o App
        if (loginSection) {
            loginSection.classList.add("active");
            loginSection.style.display = "flex";
        }
        if (appSection) {
            appSection.classList.add("hidden");
            appSection.style.display = "none";
        }
    }
});

// 3. NAVEGAÇÃO ENTRE ABAS
window.nav = (id) => {
    // Esconde todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = "none";
    });

    // Mostra a aba clicada
    const target = document.getElementById(id);
    if (target) {
        target.classList.add('active');
        target.style.display = "block";
    }

    // Estilo dos botões da sidebar
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`button[onclick*="'${id}'"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Fecha menu mobile se estiver aberto
    document.getElementById("sidebar").classList.remove("open");
};

window.toggleMenu = () => {
    document.getElementById("sidebar").classList.toggle("open");
};

// 4. FUNÇÕES DE AUTENTICAÇÃO
window.handleLogin = async () => {
    const email = document.getElementById("email-login").value;
    const senha = document.getElementById("senha-login").value;

    if (!email || !senha) return alert("Preencha todos os campos!");

    try {
        await signInWithEmailAndPassword(auth, email, senha);
    } catch (error) {
        console.error("Erro no login:", error);
        alert("Falha no acesso! Verifique suas credenciais.");
    }
};

window.handleLogout = () => {
    if (confirm("Deseja realmente sair?")) signOut(auth);
};

// 5. SINCRONIZAÇÃO EM TEMPO REAL (FIRESTORE)
function startRealtimeSync(uid) {
    // Sincronizar Carros (Respeitando a regra de lojaId)
    const qCarros = query(collection(db, "carros"), where("lojaId", "==", uid));
    onSnapshot(qCarros, (snap) => {
        const grid = document.getElementById("listaCarros");
        const cLeads = document.getElementById("col-leads");
        const cNegoc = document.getElementById("col-negociacao");
        const cVend = document.getElementById("col-vendidos");

        if (grid) grid.innerHTML = "";
        if (cLeads) cLeads.innerHTML = "";
        if (cNegoc) cNegoc.innerHTML = "";
        if (cVend) cVend.innerHTML = "";

        snap.forEach(docSnap => {
            const c = docSnap.data();
            const id = docSnap.id;
            const foto = (c.fotos && c.fotos[0]) ? c.fotos[0] : 'https://via.placeholder.com/400x250?text=Nexus+V12';

            const cardHtml = `
                <div class="car-card">
                    <div class="car-img" style="background-image: url('${foto}')"></div>
                    <div class="car-info">
                        <h3>${c.modelo || 'Sem Modelo'}</h3>
                        <p class="car-price">R$ ${Number(c.preco || 0).toLocaleString('pt-BR')}</p>
                        <div class="card-footer">
                            <select onchange="window.updateStatus('${id}', this.value)" class="status-select">
                                <option value="leads" ${c.status === 'leads' ? 'selected' : ''}>Novo Lead</option>
                                <option value="negociacao" ${c.status === 'negociacao' ? 'selected' : ''}>Negociação</option>
                                <option value="vendido" ${c.status === 'vendido' ? 'selected' : ''}>Vendido</option>
                            </select>
                            <button onclick="window.excluir('${id}')" class="btn-del"><i class="fa fa-trash"></i></button>
                        </div>
                    </div>
                </div>`;

            if (grid) grid.innerHTML += cardHtml;
            if (c.status === 'leads' && cLeads) cLeads.innerHTML += cardHtml;
            if (c.status === 'negociacao' && cNegoc) cNegoc.innerHTML += cardHtml;
            if (c.status === 'vendido' && cVend) cVend.innerHTML += cardHtml;
        });
    });

    // Sincronizar Vendedores no Select
    onSnapshot(query(collection(db, "vendedores"), where("lojaId", "==", uid)), snap => {
        const select = document.getElementById("vendedor-select");
        if (select) {
            select.innerHTML = '<option value="">Selecione um vendedor</option>';
            snap.forEach(d => {
                const v = d.data();
                select.innerHTML += `<option value="${v.whats}">${v.nome}</option>`;
            });
        }
    });
}

// 6. CADASTRO E ACTIONS
window.preview = (input, slotId) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const index = parseInt(slotId.replace('p', '')) - 1;
        fotosData[index] = e.target.result;
        document.getElementById(slotId).innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
    };
    if (input.files[0]) reader.readAsDataURL(input.files[0]);
};

window.salvarVeiculo = async () => {
    const modelo = document.getElementById("modelo").value;
    const preco = document.getElementById("preco").value;
    const btn = document.getElementById("btn-salvar");

    if (!modelo || !preco) return alert("Preencha os dados básicos!");

    btn.innerText = "SALVANDO...";
    btn.disabled = true;

    try {
        await addDoc(collection(db, "carros"), {
            lojaId: auth.currentUser.uid,
            modelo: modelo,
            preco: preco,
            fotos: fotosData.filter(f => f !== ""),
            status: 'leads',
            vendedor: document.getElementById("vendedor-select").value,
            data: new Date().getTime()
        });
        alert("Veículo cadastrado!");
        location.reload(); 
    } catch (e) {
        alert("Erro ao salvar! Verifique suas Regras do Firebase.");
        btn.disabled = false;
        btn.innerText = "SALVAR NO ESTOQUE";
    }
};

window.updateStatus = async (id, novoStatus) => {
    try {
        await updateDoc(doc(db, "carros", id), { status: novoStatus });
    } catch (e) { alert("Sem permissão para alterar."); }
};

window.excluir = async (id) => {
    if (confirm("Excluir este veículo permanentemente?")) {
        await deleteDoc(doc(db, "carros", id));
    }
};

window.addVendedor = async () => {
    const nome = document.getElementById("v-nome").value;
    const whats = document.getElementById("v-whats").value;
    if(!nome || !whats) return alert("Dados incompletos.");

    await addDoc(collection(db, "vendedores"), {
        lojaId: auth.currentUser.uid,
        nome: nome,
        whats: whats
    });
    alert("Equipe atualizada!");
    document.getElementById("v-nome").value = "";
    document.getElementById("v-whats").value = "";
};

window.copyPortalLink = () => {
    const link = `https://davimirandajr.github.io/portal.html?loja=${auth.currentUser.uid}`;
    navigator.clipboard.writeText(link);
    alert("Link do Portal copiado!");
};
