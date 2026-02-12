import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { /* Sua Config Aqui */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let fotosData = ["", "", "", ""];
let logoData = "";

// NAVEGAÇÃO
window.nav = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

// COMPRESSÃO DE IMAGENS (Fundamental IHC)
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
        document.getElementById('logo-preview').innerHTML = `<img src="${data}" style="max-width:100%;max-height:100%">`;
    }, 400);
};

// SALVAR CONFIG E VEÍCULO
window.salvarConfig = async () => {
    const cor = document.getElementById('cor-loja').value;
    await setDoc(doc(db, "configuracoes", auth.currentUser.uid), {
        corLoja: cor,
        logoLoja: logoData,
        lojaId: auth.currentUser.uid
    }, { merge: true });
    alert("Cores e Logo atualizados!");
};

window.salvarVeiculo = async () => {
    const vSel = document.getElementById("vendedor-select").value.split('|');
    const dados = {
        lojaId: auth.currentUser.uid,
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        ano: document.getElementById('ano').value,
        km: Number(document.getElementById('km').value),
        cambio: document.getElementById('cambio').value,
        preco: Number(document.getElementById('preco').value),
        vendedorWhats: vSel[0],
        fotos: fotosData.filter(f => f !== ""),
        status: 'estoque'
    };
    await addDoc(collection(db, "carros"), dados);
    alert("Carro cadastrado!");
    window.nav('showroom');
};

// Inicialização e Sincronização aqui (onAuthStateChanged)...
