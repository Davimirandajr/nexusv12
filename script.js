import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Sua Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBOCli1HzoijZ1gcplo_18tKH-5Umb63q8",
    authDomain: "nexus-v12.firebaseapp.com",
    projectId: "nexus-v12",
    storageBucket: "nexus-v12.firebasestorage.app",
    messagingSenderId: "587840382224",
    appId: "1:587840382224:web:61c0f1890c7c395dc77195",
    measurementId: "G-VE69B1WNC1"
};

// 2. Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- MONITOR DE ACESSO (O QUE MATA O LOOP) ---
onAuthStateChanged(auth, (user) => {
    const loader = document.getElementById("loader");
    const loginSec = document.getElementById("login");
    const appSec = document.getElementById("app");

    console.log("Status Auth:", user ? "Logado" : "Deslogado");

    if (user) {
        // Usuário Logado: Libera o Painel
        if (loginSec) loginSec.classList.add("hidden");
        if (appSec) appSec.classList.remove("hidden");
        
        // Inicia a busca de dados da loja logada
        syncEstoque();
        syncVendedores();
    } else {
        // Usuário Deslogado: Mostra tela de login
        if (loginSec) loginSec.classList.remove("hidden");
        if (appSec) appSec.classList.add("hidden");
    }

    // DESLIGA O LOADER SEMPRE (Anti-Loop)
    if (loader) {
        setTimeout(() => {
            loader.style.opacity = "0";
            setTimeout(() => loader.style.display = "none", 500);
        }, 800);
    }
});

// --- FUNÇÃO DE LOGIN ---
window.handleLogin = async () => {
    const email = document.getElementById("email-login").value;
    const senha = document.getElementById("senha-login").value;
    
    if(!email || !senha) return alert("Preencha todos os campos!");

    try { 
        await signInWithEmailAndPassword(auth, email, senha); 
    } catch (err) { 
        console.error(err);
        alert("Erro: E-mail ou senha inválidos ou erro de conexão."); 
    }
};

window.handleLogout = () => {
    if(confirm("Deseja sair do sistema?")) {
        signOut(auth).then(() => window.location.reload());
    }
};

// --- SINCRONIZAÇÃO (ISOLAMENTO MULTI-LOJA) ---
function syncEstoque() {
    if (!auth.currentUser) return;
    
    // Filtra para trazer apenas carros onde o lojaId é o UID do usuário logado
    const q = query(
        collection(db, "carros"), 
        where("lojaId", "==", auth.currentUser.uid),
        orderBy("data", "desc")
    );

    onSnapshot(q, (snap) => {
        const grid = document.getElementById("listaCarros");
        if (!grid) return;

        if (snap.empty) {
            grid.innerHTML = `<p style="color:var(--text-dim); grid-column: 1/-1; text-align: center; padding: 50px;">Nenhum veículo no seu estoque.</p>`;
            return;
        }

        grid.innerHTML = snap.docs.map(d => {
            const c = d.data();
            return `
                <div class="card">
                    <div class="img-v" style="background-image:url(${c.fotos[0] || ''})"></div>
                    <div class="info">
                        <h3>${c.modelo}</h3>
                        <span class="price">R$ ${Number(c.preco).toLocaleString('pt-BR')}</span>
                        <div style="display:flex; justify-content: space-between; align-items: center;">
                             <small style="color:var(--text-dim)">${c.vendedorNome || 'Sem vendedor'}</small>
                             <button onclick="window.delCarro('${d.id}')" class="btn-del"><i class="fa fa-trash"></i></button>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }, (error) => {
        // Se este erro aparecer no console, você precisa criar o INDEX no Firebase
        console.error("Erro no Firestore (Estoque):", error.message);
    });
}

function syncVendedores() {
    if (!auth.currentUser) return;
    const q = query(collection(db, "vendedores"), where("lojaId", "==", auth.currentUser.uid));
    
    onSnapshot(q, snap => {
        const sel = document.getElementById("vendedor-select");
        if (!sel) return;
        
        const vends = snap.docs.map(d => d.data());
        
        if (vends.length === 0) {
            sel.innerHTML = `<option value="">Cadastre um vendedor primeiro</option>`;
        } else {
            sel.innerHTML = `<option value="">Selecione o responsável</option>` + 
                            vends.map(v => `<option value="${v.whats}">${v.nome}</option>`).join('');
        }
    });
}

// --- FUNÇÕES DE CADASTRO ---
window.salvarVeiculo = async () => {
    const btn = document.getElementById("btn-salvar");
    const modelo = document.getElementById("modelo").value;
    const preco = document.getElementById("preco").value;
    const sel = document.getElementById("vendedor-select");
    const fileInput = document.getElementById("foto-principal");

    if(!modelo || !preco || !sel.value) return alert("Preencha modelo, preço e vendedor!");

    btn.innerText = "PROCESSANDO FOTOS...";
    btn.disabled = true;

    try {
        const f1 = await compress(fileInput.files[0]);
        
        await addDoc(collection(db, "carros"), {
            lojaId: auth.currentUser.uid, // O "Carimbo" que separa os dados
            modelo: modelo,
            preco: parseFloat(preco),
            vendedorWhats: sel.value,
            vendedorNome: sel.options[sel.selectedIndex].text,
            fotos: [f1].filter(f => f !== ""),
            data: new Date().toISOString()
        });

        alert("Veículo salvo com sucesso!");
        window.nav('showroom'); // Volta para o estoque
        
        // Limpa o formulário
        document.getElementById("modelo").value = "";
        document.getElementById("preco").value = "";
        fileInput.value = "";

    } catch (e) { 
        console.error(e);
        alert("Erro ao salvar veículo. Verifique as regras do banco de dados."); 
    } finally {
        btn.innerText = "SALVAR NO ESTOQUE";
        btn.disabled = false;
    }
};

window.addVendedor = async () => {
    const nome = document.getElementById("v-nome").value;
    const whats = document.getElementById("v-whats").value;

    if(!nome || !whats) return alert("Preencha nome e WhatsApp do vendedor!");

    try {
        await addDoc(collection(db, "vendedores"), {
            lojaId: auth.currentUser.uid,
            nome: nome,
            whats: whats
        });
        alert("Vendedor cadastrado!");
        document.getElementById("v-nome").value = "";
        document.getElementById("v-whats").value = "";
    } catch (e) {
        alert("Erro ao cadastrar vendedor.");
    }
};

window.delCarro = (id) => {
    if (confirm("Deseja realmente excluir este veículo?")) {
        deleteDoc(doc(db, "carros", id));
    }
};

// --- NAVEGAÇÃO ENTRE PÁGINAS ---
window.nav = (id) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(id).classList.add('active');
    // Adiciona classe active no botão clicado (baseado no ícone ou texto)
};

window.gerarLinkShowroom = () => {
    const link = window.location.origin + "/portal.html?loja=" + auth.currentUser.uid;
    navigator.clipboard.writeText(link).then(() => {
        alert("Link exclusivo da sua loja copiado para a área de transferência!");
    });
};

// --- COMPRESSÃO DE IMAGENS (Para não estourar o limite do Firebase) ---
async function compress(file) {
    if (!file) return "";
    return new Promise(res => {
        const r = new FileReader(); r.readAsDataURL(file);
        r.onload = e => {
            const img = new Image(); img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Redimensiona para máximo de 800px de largura
                const maxWidth = 800;
                const scale = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scale;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // Comprime em 60% de qualidade JPEG
                res(canvas.toDataURL('image/jpeg', 0.6));
            }
        }
    });
}
