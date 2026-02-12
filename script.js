/* =========================================================
   🔥 NEXUS V12 • SISTEMA COMPLETO
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    getFirestore,
    doc,
    onSnapshot,
    collection,
    addDoc,
    query,
    where,
    deleteDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================================================
   🔐 FIREBASE CONFIG
   ========================================================= */

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

/* =========================================================
   🌎 ESTADO GLOBAL
   ========================================================= */

let currentUser = null;
let fotosCarro = ["", "", ""];

/* =========================================================
   🧭 NAVEGAÇÃO
   ========================================================= */

window.nav = (tab) => {
    document.querySelectorAll(".tab-content")
        .forEach(t => t.classList.remove("active"));

    document.querySelectorAll(".nav-item")
        .forEach(b => b.classList.remove("active"));

    document.getElementById(tab)?.classList.add("active");
    document.querySelector(`[data-tab="${tab}"]`)
        ?.classList.add("active");
};

/* =========================================================
   🔐 LOGIN / LOGOUT
   ========================================================= */

window.fazerLogin = async () => {
    const email = document.getElementById("email-login").value;
    const senha = document.getElementById("pass-login").value;
    const status = document.getElementById("auth-status");

    if (!email || !senha)
        return alert("Preencha todos os campos.");

    try {
        status.innerText = "Entrando...";
        await signInWithEmailAndPassword(auth, email, senha);
    } catch (err) {
        status.innerText = "Erro no login";
        alert(err.message);
    }
};

window.handleLogout = async () => {
    await signOut(auth);
    location.reload();
};

/* =========================================================
   🖼️ IMAGENS
   ========================================================= */

const comprimirImagem = (file, maxWidth = 800) => {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.src = e.target.result;

            img.onload = () => {
                const canvas = document.createElement("canvas");
                const scale = maxWidth / img.width;

                canvas.width = maxWidth;
                canvas.height = img.height * scale;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                resolve(canvas.toDataURL("image/jpeg", 0.7));
            };
        };
        reader.readAsDataURL(file);
    });
};

window.handlePhoto = async (input, slotId, index) => {
    if (!input.files[0]) return;

    const base64 = await comprimirImagem(input.files[0]);
    fotosCarro[index] = base64;

    const slot = document.getElementById(slotId);
    if (slot) {
        slot.innerHTML =
            `<img src="${base64}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
    }
};

/* =========================================================
   🚗 ESTOQUE
   ========================================================= */

window.salvarVeiculo = async () => {

    if (!currentUser) return alert("Usuário não autenticado.");

    const idEdit = document.getElementById("edit-carro-id").value;

    const dados = {
        lojaId: currentUser.uid,
        marca: document.getElementById("marca").value,
        modelo: document.getElementById("modelo").value,
        preco: Number(document.getElementById("preco").value),
        km: Number(document.getElementById("km").value || 0),
        ano: document.getElementById("ano").value,
        cambio: document.getElementById("cambio").value,
        status: document.getElementById("status-carro").value,
        descricao: document.getElementById("descricao").value,
        fotos: fotosCarro.filter(f => f !== ""),
        atualizadoEm: new Date()
    };

    try {

        if (idEdit) {
            await updateDoc(doc(db, "carros", idEdit), dados);
            alert("Veículo atualizado!");
        } else {
            await addDoc(collection(db, "carros"), dados);
            alert("Veículo cadastrado!");
        }

        limparFormEstoque();

    } catch (err) {
        alert("Erro: " + err.message);
    }
};

window.prepararEdicaoCarro = (id, c) => {

    document.getElementById("edit-carro-id").value = id;
    document.getElementById("marca").value = c.marca || "";
    document.getElementById("modelo").value = c.modelo || "";
    document.getElementById("preco").value = c.preco || "";
    document.getElementById("km").value = c.km || "";
    document.getElementById("ano").value = c.ano || "";
    document.getElementById("cambio").value = c.cambio || "Automático";
    document.getElementById("status-carro").value = c.status || "disponivel";
    document.getElementById("descricao").value = c.descricao || "";

    fotosCarro = c.fotos || ["", "", ""];
};

window.limparFormEstoque = () => {

    document.getElementById("edit-carro-id").value = "";
    document.getElementById("marca").value = "";
    document.getElementById("modelo").value = "";
    document.getElementById("preco").value = "";
    document.getElementById("km").value = "";
    document.getElementById("ano").value = "";
    document.getElementById("descricao").value = "";

    fotosCarro = ["", "", ""];
};

window.excluirDoc = async (coll, id) => {
    if (!confirm("Deseja excluir?")) return;
    await deleteDoc(doc(db, coll, id));
};

/* =========================================================
   👥 VENDEDORES
   ========================================================= */

window.salvarVendedor = async () => {

    if (!currentUser) return;

    const nome = document.getElementById("nome-vendedor").value;
    const whatsapp = document.getElementById("whatsapp-vendedor").value;
    const email = document.getElementById("email-vendedor").value;

    if (!nome || !whatsapp)
        return alert("Nome e WhatsApp obrigatórios.");

    await addDoc(collection(db, "vendedores"), {
        lojaId: currentUser.uid,
        nome,
        whatsapp,
        email,
        criadoEm: new Date()
    });

    document.getElementById("nome-vendedor").value = "";
    document.getElementById("whatsapp-vendedor").value = "";
    document.getElementById("email-vendedor").value = "";
};

/* =========================================================
   📊 CRM
   ========================================================= */

window.moverLead = async (id, status) => {
    await updateDoc(doc(db, "interesses", id), {
        statusFunil: status
    });
};

/* =========================================================
   📡 MONITORES REALTIME
   ========================================================= */

function iniciarMonitores(user) {

    // CARROS
    onSnapshot(
        query(collection(db, "carros"), where("lojaId", "==", user.uid)),
        snapshot => {

            const lista = document.getElementById("lista-estoque-admin");
            if (!lista) return;

            lista.innerHTML = "";

            snapshot.forEach(docSnap => {

                const c = docSnap.data();

                lista.innerHTML += `
                    <div class="card-item">
                        <b>${c.marca} ${c.modelo}</b>
                        <div>
                            <button onclick='prepararEdicaoCarro("${docSnap.id}", ${JSON.stringify(c)})'>Editar</button>
                            <button onclick="excluirDoc('carros','${docSnap.id}')">Excluir</button>
                        </div>
                    </div>
                `;
            });
        }
    );

    // VENDEDORES
    onSnapshot(
        query(collection(db, "vendedores"), where("lojaId", "==", user.uid)),
        snapshot => {

            const lista = document.getElementById("lista-vendedores");
            if (!lista) return;

            lista.innerHTML = "";

            snapshot.forEach(docSnap => {

                const v = docSnap.data();

                lista.innerHTML += `
                    <div class="card-item">
                        ${v.nome} (${v.whatsapp})
                        <button onclick="excluirDoc('vendedores','${docSnap.id}')">Excluir</button>
                    </div>
                `;
            });
        }
    );

    // CRM
    onSnapshot(
        query(collection(db, "interesses"), where("lojaId", "==", user.uid)),
        snapshot => {

            const cols = { novo: "", contato: "", visita: "", fechado: "" };

            snapshot.forEach(docSnap => {

                const l = docSnap.data();
                const s = l.statusFunil || "novo";

                cols[s] += `
                    <div class="kanban-card">
                        <b>${l.nome}</b><br>
                        <small>${l.carro}</small>
                        <select onchange="moverLead('${docSnap.id}', this.value)">
                            <option value="novo" ${s=="novo"?"selected":""}>Novos</option>
                            <option value="contato" ${s=="contato"?"selected":""}>Contato</option>
                            <option value="visita" ${s=="visita"?"selected":""}>Visita</option>
                            <option value="fechado" ${s=="fechado"?"selected":""}>Fechado</option>
                        </select>
                    </div>
                `;
            });

            Object.keys(cols).forEach(status => {
                const el = document.querySelector(`#col-${status} .kanban-cards`);
                if (el) el.innerHTML = cols[status];
            });
        }
    );
}

/* =========================================================
   🔄 AUTH STATE
   ========================================================= */

onAuthStateChanged(auth, (user) => {

    const login = document.getElementById("login-screen");

    if (user) {
        currentUser = user;
        if (login) login.style.display = "none";
        iniciarMonitores(user);
    } else {
        currentUser = null;
        if (login) login.style.display = "flex";
    }
});

/* =========================================================
   🔗 PORTAL
   ========================================================= */

window.copiarLinkPortal = () => {

    if (!currentUser) return;

    const link =
        `${window.location.origin}/portal.html?loja=${currentUser.uid}`;

    navigator.clipboard.writeText(link)
        .then(() => alert("Link copiado!"));
};
