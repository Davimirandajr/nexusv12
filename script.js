/* VARIÁVEIS DE CORES E ESTILO */
:root {
    --primary: #E31010; /* Cor padrão, alterada pelo JS posteriormente */
    --bg-dark: #0a0a0b;
    --card-bg: #151517;
    --sidebar-bg: #000000;
    --text-main: #ffffff;
    --text-dim: #a0a0a0;
    --sidebar-width: 260px;
    --sidebar-collapsed: 80px;
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* RESET BÁSICO */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background-color: var(--bg-dark);
    color: var(--text-main);
    font-family: 'Inter', sans-serif;
    display: flex;
    min-height: 100vh;
    overflow-x: hidden;
}

.hidden { display: none !important; }

/* TELA DE LOGIN */
#login-screen {
    position: fixed;
    inset: 0;
    background: radial-gradient(circle at center, #1a1a1c 0%, #000 100%);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
}

.login-container {
    background: var(--card-bg);
    padding: 40px;
    border-radius: 24px;
    border: 1px solid #222;
    text-align: center;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
}

.brand { font-weight: 900; font-size: 32px; margin-bottom: 30px; letter-spacing: -1px; }
.brand span { color: var(--primary); }

/* SIDEBAR */
#sidebar {
    width: var(--sidebar-width);
    background: var(--sidebar-bg);
    height: 100vh;
    position: fixed;
    padding: 30px 15px;
    border-right: 1px solid #1a1a1c;
    display: flex;
    flex-direction: column;
    transition: var(--transition);
    z-index: 1000;
}

body.collapsed #sidebar { width: var(--sidebar-collapsed); }

.sidebar-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 50px;
    padding: 0 10px;
}

.sidebar-logo { font-weight: 900; font-size: 24px; }
.sidebar-logo span { color: var(--primary); }
body.collapsed .sidebar-logo { display: none; }

#toggle-btn {
    background: #1a1a1c;
    border: none;
    color: #fff;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
}

/* NAVEGAÇÃO */
nav { flex-grow: 1; }

.nav-item {
    width: 100%;
    background: transparent;
    border: none;
    color: var(--text-dim);
    padding: 16px;
    margin-bottom: 10px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 15px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
    white-space: nowrap;
}

.nav-item i { font-size: 18px; min-width: 24px; }
.nav-item:hover { background: #1a1a1c; color: #fff; }
.nav-item.active { background: var(--primary); color: #fff; }
body.collapsed .nav-item span { display: none; }

.btn-logout {
    background: #1a1a1c;
    border: none;
    color: #ff4444;
    padding: 15px;
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 15px;
    font-weight: bold;
}

/* CONTEÚDO PRINCIPAL */
#main-content {
    margin-left: var(--sidebar-width);
    padding: 40px;
    width: 100%;
    transition: var(--transition);
}

body.collapsed #main-content { margin-left: var(--sidebar-collapsed); }

.tab-content { display: none; animation: fadeIn 0.4s ease; }
.tab-content.active { display: block; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* CARDS E FORMULÁRIOS */
.glass-card {
    background: var(--card-bg);
    padding: 35px;
    border-radius: 24px;
    border: 1px solid #222;
    max-width: 900px;
    margin: 0 auto;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin: 25px 0;
}

.full-width { grid-column: span 2; }

.input-group label { display: block; margin-bottom: 8px; font-size: 13px; color: var(--text-dim); }

input, select, textarea {
    width: 100%;
    background: #0a0a0b;
    border: 1px solid #333;
    padding: 14px;
    border-radius: 12px;
    color: #fff;
    font-size: 15px;
    transition: 0.2s;
}

input:focus { border-color: var(--primary); outline: none; }

/* FOTOS */
.photo-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
    margin: 15px 0 25px 0;
}

.photo-slot {
    aspect-ratio: 1/1;
    background: #0a0a0b;
    border: 2px dashed #333;
    border-radius: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    overflow: hidden;
    position: relative;
}

.photo-slot img { width: 100%; height: 100%; object-fit: cover; }
.photo-slot i { font-size: 24px; color: #444; }

/* BOTÕES */
.btn-primary {
    background: var(--primary);
    color: #fff;
    border: none;
    padding: 16px 30px;
    border-radius: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: 0.3s;
}

.btn-primary:hover { filter: brightness(1.2); transform: translateY(-2px); }

.btn-secondary {
    background: #1a1a1c;
    color: #fff;
    border: 1px solid #333;
    padding: 12px;
    border-radius: 12px;
    cursor: pointer;
    margin-top: 10px;
}

/* CONFIGURAÇÃO DE LOGO */
.config-row { display: flex; gap: 30px; align-items: flex-end; margin-bottom: 30px; }
.upload-logo {
    width: 200px;
    height: 100px;
    background: #0a0a0b;
    border: 2px dashed #333;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--text-dim);
    cursor: pointer;
}

/* LEADS (CLIENTES) */
.card-lead {
    background: #0a0a0b;
    padding: 20px;
    border-radius: 16px;
    margin-bottom: 15px;
    border-left: 5px solid var(--primary);
}

/* RESPONSIVIDADE */
@media (max-width: 768px) {
    #sidebar { width: var(--sidebar-collapsed); }
    #sidebar span, .sidebar-logo { display: none; }
    #main-content { margin-left: var(--sidebar-collapsed); padding: 20px; }
    .form-grid { grid-template-columns: 1fr; }
    .full-width { grid-column: span 1; }
}
