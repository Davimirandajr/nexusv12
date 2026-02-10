/**
 * NEXUS V12 - ENTERPRISE ERP
 * Versão: 3.0 (CRM Enhanced & WhatsApp Integration)
 */

const AppState = {
    KEY: "1234",
    carros: JSON.parse(localStorage.getItem("nexus_v12_carros") || "[]"),
    clientes: JSON.parse(localStorage.getItem("nexus_v12_clientes") || "[]"),
    editId: null, // Para edição de veículos
    editClienteId: null, // Para edição de leads

    // Salva os dados e atualiza toda a UI
    save: () => {
        try {
            localStorage.setItem("nexus_v12_carros", JSON.stringify(AppState.carros));
            localStorage.setItem("nexus_v12_clientes", JSON.stringify(AppState.clientes));
            
            renderShowroom();
            renderCRM();
            updateStats();
            atualizarSelects();
        } catch (e) {
            console.error("Erro Crítico de Memória:", e);
            alert("⚠️ Memória cheia! Remova veículos antigos ou fotos muito pesadas.");
        }
    }
};

/* =====================
   PIPELINE DE IMAGEM
===================== */

function comprimirImagem(file) {
    return new Promise((resolve) => {
        if (!file) return resolve("");
        
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; 
                const scaleSize = MAX_WIDTH / img.width;
                
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
        };
    });
}

/* =====================
   LOGIN E NAVEGAÇÃO
===================== */

window.onload = () => {
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 1000);
        }
    }, 1500);
    // Renderiza dados iniciais se já logado (opcional)
    AppState.save();
};

function handleLogin() {
    const input = document.getElementById("senha");
    if (input.value === AppState.KEY) {
        document.getElementById("login").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        AppState.save();
        iniciarCarrosselAutomatico();
    } else {
        alert("Chave de acesso inválida.");
    }
}

function nav(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

/* =====================
   GESTÃO DE VEÍCULOS
===================== */

async function salvarVeiculo() {
    const btn = event.target;
    btn.innerText = "PROCESSANDO..."; 
    btn.disabled = true;

    try {
        const modelo = document.getElementById("modelo").value;
        const preco = parseFloat(document.getElementById("preco").value);
        const status = document.getElementById("status").value;

        if (!modelo || isNaN(preco)) throw new Error("Preencha todos os campos.");

        const novasFotos = [
            await comprimirImagem(document.getElementById("fotoFrente").files[0]),
            await comprimirImagem(document.getElementById("fotoTraseira").files[0]),
            await comprimirImagem(document.getElementById("fotoInterior").files[0])
        ].filter(f => f !== "");

        const data = {
            modelo,
            preco,
            status,
            // Se estiver editando e não enviou fotos novas, mantém as antigas
            fotos: novasFotos.length > 0 ? novasFotos : (AppState.editId !== null ? AppState.carros[AppState.editId].fotos : [])
        };

        if (AppState.editId !== null) {
            AppState.carros[AppState.editId] = data;
            AppState.editId = null;
            document.getElementById("tituloForm").innerText = "Cadastrar Veículo";
        } else {
            AppState.carros.push(data);
        }

        AppState.save();
        nav('showroom');
        limparFormVeiculo();
    } catch (err) {
        alert(err.message);
    } finally {
        btn.innerText = "SALVAR REGISTRO";
        btn.disabled = false;
    }
}

function renderShowroom() {
    const grid = document.getElementById("listaCarros");
    if (!grid) return;

    grid.innerHTML = AppState.carros.map((c, i) => `
        <div class="card" data-index="${i}" data-foto-ativa="0">
            <div class="card-img" style="background-image: url('${c.fotos[0] || ''}')"></div>
            <div class="info">
                <span class="badge ${c.status}">${c.status.toUpperCase()}</span>
                <h3>${c.modelo}</h3>
                <p class="price">R$ ${c.preco.toLocaleString('pt-BR')}</p>
                <div class="actions">
                    <button onclick="editarCarro(${i})" class="btn-ghost-sm">Editar</button>
                    <button onclick="simularFinanciamento(${c.preco})" class="btn-primary-sm">Simular</button>
                    <button onclick="removerCarro(${i})" class="btn-danger-sm">×</button>
                </div>
            </div>
        </div>
    `).join('');
}

function editarCarro(i) {
    const c = AppState.carros[i];
    AppState.editId = i;
    document.getElementById("modelo").value = c.modelo;
    document.getElementById("preco").value = c.preco;
    document.getElementById("status").value = c.status;
    document.getElementById("tituloForm").innerText = "Editando: " + c.modelo;
    nav('novo');
}

function removerCarro(i) {
    if (confirm("Remover veículo do estoque?")) {
        AppState.carros.splice(i, 1);
        AppState.save();
    }
}

/* =====================
   CRM - GESTÃO DE LEADS
===================== */

function addCliente() {
    const nome = document.getElementById("c-nome").value;
    const fone = document.getElementById("c-fone").value;
    const vIdx = document.getElementById("c-veiculo").value;
    const dias = document.getElementById("c-dias").value;

    if (!nome || !fone) return alert("Nome e WhatsApp são obrigatórios.");

    const clienteData = {
        nome,
        fone,
        vIdx,
        dias,
        data: new Date().toLocaleDateString('pt-BR')
    };

    if (AppState.editClienteId !== null) {
        AppState.clientes[AppState.editClienteId] = clienteData;
        AppState.editClienteId = null;
    } else {
        AppState.clientes.push(clienteData);
    }

    AppState.save();
    limparFormCRM();
}

function renderCRM() {
    const list = document.getElementById("listaClientes");
    if (!list) return;

    list.innerHTML = AppState.clientes.map((c, i) => {
        const carroInteresse = AppState.carros[c.vIdx]?.modelo || "Geral";
        return `
            <div class="card-client">
                <div class="client-header">
                    <h4>${c.nome}</h4>
                    <span class="date">${c.data}</span>
                </div>
                <p><strong>Interesse:</strong> ${carroInteresse}</p>
                <p><strong>WhatsApp:</strong> ${c.fone}</p>
                <div class="client-actions" style="margin-top: 10px; display: flex; gap: 5px;">
                    <button onclick="enviarMensagem(${i})" class="btn-primary-sm" style="background: #25D366; border: none;">
                        <i class="fab fa-whatsapp"></i> Whats
                    </button>
                    <button onclick="editarCliente(${i})" class="btn-ghost-sm">
                        <i class="fa fa-edit"></i>
                    </button>
                    <button onclick="removerCliente(${i})" class="btn-danger-sm">×</button>
                </div>
            </div>
        `;
    }).join('');
}

function editarCliente(i) {
    const c = AppState.clientes[i];
    AppState.editClienteId = i;
    
    document.getElementById("c-nome").value = c.nome;
    document.getElementById("c-fone").value = c.fone;
    document.getElementById("c-veiculo").value = c.vIdx;
    document.getElementById("c-dias").value = c.dias;
    
    document.getElementById("tituloCRM").innerText = "Editar Lead";
    const btn = document.querySelector("#clientes .btn-primary");
    btn.innerText = "ATUALIZAR LEAD";
}

function removerCliente(i) {
    if (confirm("Excluir este lead?")) {
        AppState.clientes.splice(i, 1);
        AppState.save();
    }
}

function enviarMensagem(i) {
    const c = AppState.clientes[i];
    const carro = AppState.carros[c.vIdx]?.modelo || "nossas ofertas";
    const texto = `Olá ${c.nome}! Tudo bem? Sou da Nexus V12 e estou entrando em contato sobre o seu interesse no ${carro}. Como posso te ajudar hoje?`;
    
    // Remove caracteres não numéricos para o link do zap
    const num = c.fone.replace(/\D/g, '');
    const link = `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
    window.open(link, '_blank');
}

/* =====================
   UTILITÁRIOS E UI
===================== */

function iniciarCarrosselAutomatico() {
    setInterval(() => {
        document.querySelectorAll('.card').forEach(card => {
            const index = card.dataset.index;
            const carro = AppState.carros[index];
            if (carro && carro.fotos.length > 1) {
                let ativa = parseInt(card.dataset.fotoAtiva);
                ativa = (ativa + 1) % carro.fotos.length;
                card.querySelector('.card-img').style.backgroundImage = `url('${carro.fotos[ativa]}')`;
                card.dataset.fotoAtiva = ativa;
            }
        });
    }, 4000);
}

function simularFinanciamento(preco) {
    const entrada = preco * 0.3;
    const mensalidade = ((preco - entrada) * 1.45) / 48;
    alert(`💡 Simulação Nexus:\nEntrada: R$ ${entrada.toLocaleString('pt-BR')}\n48x de R$ ${mensalidade.toLocaleString('pt-BR', {maximumFractionDigits:2})}`);
}

function updateStats() {
    const total = AppState.carros.reduce((acc, cur) => acc + (cur.preco || 0), 0);
    const el = document.getElementById("stat-total");
    if (el) el.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function atualizarSelects() {
    const s = document.getElementById("c-veiculo");
    if (s) {
        const options = AppState.carros.map((c, i) => `<option value="${i}">${c.modelo}</option>`).join('');
        s.innerHTML = `<option value="">Interesse Geral</option>` + options;
    }
}

function limparFormVeiculo() {
    document.querySelectorAll('#novo input').forEach(inp => inp.value = "");
    AppState.editId = null;
    document.getElementById("tituloForm").innerText = "Cadastrar Veículo";
}

function limparFormCRM() {
    document.getElementById("c-nome").value = "";
    document.getElementById("c-fone").value = "";
    document.getElementById("c-dias").value = "";
    document.getElementById("c-veiculo").value = "";
    AppState.editClienteId = null;
    document.getElementById("tituloCRM").innerText = "Novo Lead";
    document.querySelector("#clientes .btn-primary").innerText = "CRIAR LEAD";
}

function exportarDados() {
    const dados = {
        carros: AppState.carros,
        clientes: AppState.clientes,
        exportadoEm: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_backup_${Date.now()}.json`;
    a.click();
}