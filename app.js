import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, onSnapshot, setDoc, getDoc, updateDoc } from "firebase/firestore";

alert("SISTEMA ATUALIZADO (v6)");
console.log("Versão: 6");
console.log("DEBUG: Iniciando app.js v5...");
console.log("URL Atual:", window.location.href);

// 1. Verificação de Protocolo (Diagnóstico)
if (location.protocol === 'file:') {
    alert("ERRO DE AMBIENTE: Você abriu o arquivo index.html diretamente. O Login com Google NÃO funciona assim. \n\nPor favor, use um servidor local (como o Live Server do VS Code) ou hospede o site (Firebase Hosting/Vercel/GitHub Pages).");
    console.error("Firebase Auth requer um servidor (http/https).");
}

// CONFIGURAÇÃO FIREBASE (Substitua pelos seus dados do console.firebase.google.com)
const firebaseConfig = {
    apiKey: "AIzaSyBIHvRzLzmSyhI8LAPutyxxgj6L5Pkk-6M",
    authDomain: "meugestor-c046d.firebaseapp.com",
    projectId: "meugestor-c046d",
    storageBucket: "meugestor-c046d.firebasestorage.app",
    messagingSenderId: "541808413499",
    appId: "1:541808413499:web:3061013642a5c493f6c51e",
    measurementId: "G-6KH8QZK311"
};

console.log("0. Configuração Firebase carregada.");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
console.log("1. Firebase Inicializado.");

// Estados Locais (Serão sincronizados com Firestore)
let transactions = [];
let categories = [];
let subcategories = [];
let cards = [];
let currentUser = null;

// --- AUTENTICAÇÃO ---
let authMode = 'login'; // 'login' ou 'signup'

const toggleAuthBtn = document.getElementById('toggle-auth-mode');
if (toggleAuthBtn) {
    toggleAuthBtn.onclick = (e) => {
        e.preventDefault();
        authMode = authMode === 'login' ? 'signup' : 'login';
        console.log("Mudando modo de autenticação para:", authMode);
        
        // Elementos UI
        const title = document.getElementById('auth-title');
        const subtitle = document.getElementById('auth-subtitle');
        const btnText = document.getElementById('auth-btn-text');
        const footerText = document.getElementById('toggle-text');

        if (authMode === 'signup') {
            title.textContent = 'Nova Conta';
            subtitle.textContent = 'Preencha os dados abaixo para começar.';
            btnText.textContent = 'Criar Minha Conta';
            footerText.textContent = 'Já tem uma conta?';
            toggleAuthBtn.textContent = 'Fazer Login';
        } else {
            title.textContent = 'Gestor Financeiro';
            subtitle.textContent = 'O controle da sua vida financeira na palma da mão.';
            btnText.textContent = 'Entrar';
            footerText.textContent = 'Ainda não tem conta?';
            toggleAuthBtn.textContent = 'Criar uma agora';
        }
    };
}

const emailAuthForm = document.getElementById('email-auth-form');
if (emailAuthForm) {
    emailAuthForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const submitBtn = document.getElementById('auth-submit-btn');

        try {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';

            if (authMode === 'signup') {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            console.error("Erro na Auth por E-mail:", err.code, err.message);
            let msg = "Erro na autenticação: " + err.message;
            
            if (err.code === 'auth/weak-password') msg = "A senha deve ter pelo menos 6 caracteres.";
            if (err.code === 'auth/email-already-in-use') msg = "Este e-mail já está em uso por outra conta.";
            if (err.code === 'auth/invalid-email') msg = "O formato do e-mail é inválido.";
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                msg = "E-mail ou senha incorretos. Verifique os dados.";
            }
            if (err.code === 'auth/operation-not-allowed') {
                msg = "ERRO: O provedor de E-mail/Senha está DESATIVADO no seu Firebase Console. Por favor, ative-o em Authentication > Sign-in method.";
            }
            
            alert(msg);
        } finally {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    };
}

console.log("2. Verificando botão de login...");
const loginBtn = document.getElementById('google-login-btn');
if (loginBtn) {
    console.log("3. Botão de login encontrado.");
    loginBtn.onclick = async () => {
        console.log("Ação: Clicou no botão de Login.");
        try {
            await signInWithPopup(auth, provider);
            console.log("Login com Google iniciado!");
        } catch (err) {
            console.error("ERRO no login Google:", err.code, err.message);
            if (err.code === 'auth/operation-not-allowed') {
                alert("ERRO: O provedor Google não está ativado no seu Console do Firebase. Vá em 'Authentication > Sign-in method' e ative-o.");
            } else if (err.code === 'auth/unauthorized-domain') {
                alert("ERRO: Este domínio não está autorizado no Console do Firebase. Vá em 'Authentication > Settings > Authorized domains' e adicione o endereço que aparece no seu navegador.");
            } else if (err.code === 'auth/popup-blocked') {
                alert("O seu navegador bloqueou o pop-up. Por favor, permita pop-ups para fazer login.");
            } else {
                alert("Erro no login Google: " + err.message + "\nCódigo: " + err.code);
            }
        }
    };
} else {
    console.warn("AVISO: Botão 'google-login-btn' não encontrado no DOM.");
}

console.log("4. Login por Redirecionamento desativado (usando modo Popup).");

console.log("6. Registrando observador de estado (onAuthStateChanged)...");
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("7. Usuário Logado detectado:", user.email);
        currentUser = user;
        document.getElementById('auth-screen').style.display = 'none';
        const appElem = document.getElementById('app-container');
        appElem.style.display = 'block';
        setTimeout(() => appElem.style.opacity = '1', 50);

        await initUserData(user.uid);
        registerServiceWorker();

        // Limpeza de UI caso necessário antes de initUserData
    } else {
        currentUser = null;
        transactions = [];
        categories = [];
        subcategories = [];
        cards = [];
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
});

// Função Global de Logout (disponível para index.html)
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        console.log("Ação: Clicou em sair.");
        // Se o clique veio por código, não mostre confirm (opcional)
        if (confirm("Deseja realmente sair da sua conta?")) {
            try {
                await auth.signOut();
                console.log("Usuário deslogado com sucesso.");
            } catch (err) {
                console.error("Erro ao deslogar:", err);
                alert("Erro ao sair: " + err.message);
            }
        }
    });
}
window.handleLogout = () => { if(logoutBtn) logoutBtn.click(); };

// Função para Restaurar Padrões Forçadamente
window.resetToDefaults = async () => {
    if (confirm("Isso vai apagar suas categorias/subcategorias ATUAIS e voltar para as originais. Suas transações NÃO serão apagadas. Confirmar?")) {
        try {
            categories = [...defaultCategories];
            subcategories = [...defaultSubcategories];
            await syncData();
            alert("Categorias originais restauradas com sucesso!");
            renderCategoriesList();
            updateCategorySelect();
        } catch (err) {
            console.error("Erro ao resetar categorias:", err);
            alert("Erro ao restaurar: " + err.message);
        }
    }
};

// Inicialização de Dados por Usuário
async function initUserData(uid) {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        // Primeira vez: Migrar do LocalStorage para a Nuvem
        const localT = JSON.parse(localStorage.getItem('gestor_transactions')) || [];
        const localC = JSON.parse(localStorage.getItem('gestor_categories')) || defaultCategories;
        const localS = JSON.parse(localStorage.getItem('gestor_subcategories')) || defaultSubcategories;
        const localCards = JSON.parse(localStorage.getItem('gestor_cards')) || [];

        await setDoc(userRef, {
            transactions: localT,
            categories: localC,
            subcategories: localS,
            cards: localCards
        });
    }

    // Escuta em tempo real para sincronização entre dispositivos
    onSnapshot(userRef, (snapshot) => {
        const data = snapshot.data();
        if (data) {
            transactions = data.transactions || [];
            categories = data.categories || [];
            subcategories = data.subcategories || [];
            cards = data.cards || [];
            updateUI();
        }
    });
}

const defaultCategories = [
    { id: 'c1', name: 'Salário', type: 'income', icon: 'briefcase' },
    { id: 'c2', name: 'Investimentos', type: 'income', icon: 'trending-up' },
    { id: 'c3', name: 'Moradia', type: 'expense', icon: 'home' },
    { id: 'c4', name: 'Alimentação', type: 'expense', icon: 'shopping-cart' },
    { id: 'c5', name: 'Transporte', type: 'expense', icon: 'car' },
    { id: 'c6', name: 'Lazer', type: 'expense', icon: 'coffee' },
    { id: 'c7', name: 'Saúde', type: 'expense', icon: 'heart' },
    { id: 'c8', name: 'Educação', type: 'expense', icon: 'book' },
    { id: 'c9', name: 'Tarifas', type: 'expense', icon: 'zap' },
    { id: 'c10', name: 'Freelance', type: 'income', icon: 'dollar-sign' },
    { id: 'c11', name: 'Venda de Produtos', type: 'income', icon: 'shopping-bag' },
    { id: 'c12', name: 'Serviços', type: 'income', icon: 'tool' },
    { id: 'c13', name: 'Marketing', type: 'expense', icon: 'zap' },
    { id: 'c14', name: 'Logística', type: 'expense', icon: 'truck' }
];

const defaultSubcategories = [
    { id: 's1', name: 'Aluguel', categoryId: 'c3' },
    { id: 's2', name: 'Condomínio', categoryId: 'c3' },
    { id: 's11', name: 'Energia', categoryId: 'c3' },
    { id: 's12', name: 'Água', categoryId: 'c3' },
    { id: 's13', name: 'Internet', categoryId: 'c3' },
    { id: 's3', name: 'Supermercado', categoryId: 'c4' },
    { id: 's4', name: 'Lanches/Ifood', categoryId: 'c4' },
    { id: 's14', name: 'Feira/Hortifruti', categoryId: 'c4' },
    { id: 's5', name: 'Combustível', categoryId: 'c5' },
    { id: 's6', name: 'Manutenção', categoryId: 'c5' },
    { id: 's15', name: 'Uber/Táxi', categoryId: 'c5' },
    { id: 's7', name: 'Restaurante', categoryId: 'c6' },
    { id: 's8', name: 'Cinema/Streaming', categoryId: 'c6' },
    { id: 's16', name: 'Viagens', categoryId: 'c6' },
    { id: 's9', name: 'Vendas Diretas', categoryId: 'c1' },
    { id: 's17', name: 'Bônus', categoryId: 'c1' },
    { id: 's10', name: 'Dividendos', categoryId: 'c2' },
    { id: 's18', name: 'Farmácia', categoryId: 'c7' },
    { id: 's19', name: 'Consultas', categoryId: 'c7' },
    { id: 's20', name: 'Cursos/Pós', categoryId: 'c8' },
    { id: 's21', name: 'Livros', categoryId: 'c8' },
    { id: 's22', name: 'Tarifa Bancária', categoryId: 'c9' },
    { id: 's23', name: 'Impostos', categoryId: 'c9' },
    { id: 's24', name: 'Projetos Freelance', categoryId: 'c10' }
];

// Função auxiliadora para salvar no Firestore
async function syncData() {
    if (!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
        transactions,
        categories,
        subcategories,
        cards
    });
}

// Registro do Service Worker para PWA
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW failed', err));
    }
}


let currentProfile = 'PF'; // PF ou PJ
let viewDate = new Date(); // Data de referência para o filtro mensal
viewDate.setDate(1); // Normaliza para o dia 1 do mês atual

// --- MODAIS ---
window.openTransactionModal = () => {
    document.getElementById('transaction-modal').style.display = 'flex';
    updateCategorySelect(); // Garante que as categorias estejam carregadas
    document.getElementById('date').valueAsDate = new Date(); // Sugere data de hoje
};

window.closeTransactionModal = () => {
    document.getElementById('transaction-modal').style.display = 'none';
    // Reset do valor para editável caso tenha vindo de um estado anterior
    document.getElementById('amount').readOnly = false;
};

window.openCategoryModal = () => {
    document.getElementById('category-modal').style.display = 'flex';
    renderIconSelector();
};

window.closeCategoryModal = () => {
    document.getElementById('category-modal').style.display = 'none';
};

window.openCardModal = () => {
    document.getElementById('card-modal').style.display = 'flex';
    renderCardsList();
};

window.closeCardModal = () => {
    document.getElementById('card-modal').style.display = 'none';
};

// Referências para objetos do Chart.js
let charts = {
    category: null,
    income: null,
    trend: null
};

// Ícones Disponíveis para Nova Categoria
const availableIcons = ['home', 'coffee', 'shopping-cart', 'car', 'briefcase', 'trending-up', 'heart', 'zap', 'shopping-bag', 'monitor', 'smartphone', 'gift', 'tool', 'book', 'video', 'music', 'plane', 'dollar-sign'];
let selectedIcon = 'home';

// Formatadores
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};
const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

// --- NAVEGAÇÃO ---
window.switchView = (view) => {
    document.getElementById('view-dashboard').style.display = view === 'dashboard' ? 'block' : 'none';
    document.getElementById('view-categories').style.display = view === 'categories' ? 'block' : 'none';
    document.getElementById('view-reports').style.display = view === 'reports' ? 'block' : 'none';

    document.getElementById('nav-dashboard').classList.toggle('active', view === 'dashboard');
    document.getElementById('nav-categories').classList.toggle('active', view === 'categories');
    document.getElementById('nav-reports').classList.toggle('active', view === 'reports');

    document.getElementById('page-title').textContent =
        view === 'dashboard' ? 'Visão Geral' :
            (view === 'reports' ? 'Estatísticas' : 'Suas Categorias');

    // Controle do seletor de mês
    document.getElementById('month-selector-ui').style.display = (view === 'dashboard' || view === 'reports') ? 'flex' : 'none';

    if (view === 'categories') {
        renderCategoriesList();
    } else if (view === 'reports') {
        updateReports();
    }
};

window.changeMonth = (offset) => {
    viewDate.setMonth(viewDate.getMonth() + offset);
    syncData();
    updateUI();
};

window.goToToday = () => {
    viewDate = new Date();
    viewDate.setDate(1);
    syncData();
    updateUI();
};

window.switchProfile = (profile) => {
    currentProfile = profile;
    const btnPF = document.getElementById('btn-pf');
    const btnPJ = document.getElementById('btn-pj');
    const badgeProfile = document.getElementById('current-profile-badge');

    if (profile === 'PF') {
        btnPF.classList.add('active');
        btnPJ.classList.remove('active');
        badgeProfile.textContent = 'Perfil: Física';
    } else {
        btnPJ.classList.add('active');
        btnPF.classList.remove('active');
        badgeProfile.textContent = 'Perfil: Jurídica';
    }
    syncData();
    updateUI();
};


// --- CATEGORIAS ---
const typeSelect = document.getElementById('type');
const categorySelect = document.getElementById('category');

const updateCategorySelect = () => {
    const selectedType = typeSelect.value;
    const filteredCats = categories.filter(c => c.type === selectedType);
    categorySelect.innerHTML = filteredCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    if (filteredCats.length === 0) {
        categorySelect.innerHTML = `<option value="">Geral</option>`;
    }

    // Mostra seletor de cartão para despesas e receitas
    const cardGroup = document.getElementById('card-selector-group');
    cardGroup.style.display = 'block';
    updateCardSelect();

    updateSubcategorySelect();
};

const updateCardSelect = () => {
    const cardSelect = document.getElementById('card-id');
    const profileCards = cards.filter(c => c.profile === currentProfile);
    cardSelect.innerHTML = '<option value="">Saldo em Conta</option>' +
        profileCards.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
};

window.updateSubcategorySelect = () => {
    const catId = categorySelect.value;
    const subSelect = document.getElementById('subcategory');
    const filteredSubs = subcategories.filter(s => s.categoryId === catId);

    subSelect.innerHTML = '<option value="">Geral</option>' +
        filteredSubs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
};

typeSelect.addEventListener('change', updateCategorySelect);

const renderIconSelector = () => {
    const container = document.getElementById('icon-selector');
    container.innerHTML = availableIcons.map(icon => `
        <div class="icon-option ${icon === selectedIcon ? 'selected' : ''}" onclick="selectIcon('${icon}')">
            <i data-lucide="${icon}"></i>
        </div>
    `).join('');
    lucide.createIcons();
};

window.selectIcon = (icon) => {
    selectedIcon = icon;
    document.getElementById('cat-icon').value = icon;
    renderIconSelector();
};

// Formulário Nova Categoria
document.getElementById('category-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cat-name').value;
    const type = document.getElementById('cat-type').value;
    const icon = document.getElementById('cat-icon').value;

    if (!name || !icon) return;

    categories.push({
        id: 'cat_' + Date.now(),
        name,
        type,
        icon
    });
    syncData();

    document.getElementById('cat-name').value = '';
    renderCategoriesList();
    updateCategorySelect();
    closeCategoryModal();
});

window.deleteCategory = (id) => {
    const isUsed = transactions.some(t => t.categoryId === id);

    if (isUsed) {
        if (confirm('Atenção: Esta categoria possui lançamentos associados!\nDeseja excluí-la mesmo assim e mover as transações para a categoria "Geral"? (Clique OK para confirmar)')) {

            // Move todas as transações para 'Geral' (sem ID)
            transactions = transactions.map(t => {
                if (t.categoryId === id) {
                    return { ...t, categoryId: '' };
                }
                return t;
            });

            // Deleta a categoria
            categories = categories.filter(c => c.id !== id);
            syncData();

            renderCategoriesList();
            updateCategorySelect();
            updateUI(); // Refresh the dashboard transactions as well
        }
    } else {
        if (confirm('Tem certeza que deseja excluir esta categoria?')) {
            categories = categories.filter(c => c.id !== id);
            syncData();
            renderCategoriesList();
            updateCategorySelect();
        }
    }
};

window.addSubcategory = (e, categoryId) => {
    e.preventDefault();
    const input = document.getElementById(`new-sub-${categoryId}`);
    const name = input.value.trim();
    if (!name) return;

    const newSub = {
        id: 'sub_' + Date.now(),
        name: name,
        categoryId: categoryId
    };

    subcategories.push(newSub);
    syncData();

    input.value = '';
    renderCategoriesList();
    updateSubcategorySelect();
};

window.deleteSubcategory = (id) => {
    if (confirm('Excluir esta subcategoria?')) {
        subcategories = subcategories.filter(s => s.id !== id);
        localStorage.setItem('gestor_subcategories', JSON.stringify(subcategories));
        renderCategoriesList();
        updateSubcategorySelect();
    }
};

// --- SPLIT TRANSACTIONS (ITENS ANINHADOS) ---
window.addSplitItemRow = () => {
    const container = document.getElementById('split-items-container');
    const warning = document.getElementById('split-warning');
    const amountInput = document.getElementById('amount');

    // Bloqueia o input de valor principal se houver itens (será calculado)
    amountInput.readOnly = true;
    warning.style.display = 'block';

    const row = document.createElement('div');
    row.className = 'split-row';
    row.innerHTML = `
        <select class="split-subcategory" style="flex: 1.5;">
            <option value="">Geral</option>
            ${subcategories.filter(s => s.categoryId === document.getElementById('category').value).map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
        <input type="number" placeholder="0.00" step="0.01" class="split-amount" style="flex: 1;" oninput="syncSplitTotal()" required>
        <input type="text" placeholder="Anotação (opcional)" class="split-desc" style="flex: 2;">
        <button type="button" class="btn-mini" onclick="removeSplitRow(this)" style="color: var(--red-500); padding: 5px;"><i data-lucide="trash-2" width="14"></i></button>
    `;
    container.appendChild(row);
    lucide.createIcons();
};

window.removeSplitRow = (btn) => {
    btn.parentElement.remove();
    syncSplitTotal();

    const container = document.getElementById('split-items-container');
    if (container.children.length === 0) {
        document.getElementById('amount').readOnly = false;
        document.getElementById('split-warning').style.display = 'none';
    }
};

window.syncSplitTotal = () => {
    const rows = document.querySelectorAll('.split-row');
    let total = 0;
    rows.forEach(row => {
        const val = parseFloat(row.querySelector('.split-amount').value) || 0;
        total += val;
    });
    document.getElementById('amount').value = total.toFixed(2);
};

window.toggleSplitDetails = (btn, id) => {
    const details = document.getElementById(`split-details-${id}`);
    const isVisible = details.style.display === 'block';
    details.style.display = isVisible ? 'none' : 'block';
    btn.classList.toggle('active', !isVisible);
};

const renderCategoriesList = () => {
    const list = document.getElementById('categories-list');

    if (categories.length === 0) {
        list.innerHTML = `<p class="empty-state">Sem categorias</p>`;
        return;
    }

    list.innerHTML = categories.map(c => {
        const subs = subcategories.filter(s => s.categoryId === c.id);
        const subsHtml = subs.map(s => `
            <div class="subcategory-item">
                <span>${s.name}</span>
                <button class="action-btn delete" onclick="deleteSubcategory('${s.id}')" style="padding: 2px;"><i data-lucide="x" width="12" height="12"></i></button>
            </div>
        `).join('');

        return `
            <div class="category-group" style="margin-bottom: 2rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1.5rem;">
                <div class="transaction-item" style="background: transparent; border: none; padding: 0;">
                    <div class="t-details">
                        <h4 style="font-size: 1.1rem; font-weight: 700;">${c.name}</h4>
                        <p style="text-transform: capitalize;">${c.type === 'income' ? 'Receita' : 'Custo'}</p>
                    </div>
                    <div class="t-actions" style="opacity: 1;">
                        <button class="action-btn delete" onclick="deleteCategory('${c.id}')"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>
                
                <div class="subcategories-list">
                    ${subsHtml}
                </div>
                
                <form class="add-sub-form" onsubmit="addSubcategory(event, '${c.id}')">
                    <input type="text" id="new-sub-${c.id}" placeholder="Nova subcategoria..." required>
                    <button type="submit" class="btn-mini"><i data-lucide="plus"></i></button>
                </form>
            </div>
        `;
    }).join('');
    lucide.createIcons();
};


// --- TRANSAÇÕES (DASHBOARD) ---
const updateUI = () => {
    const elIncome = document.getElementById('total-income');
    const elExpense = document.getElementById('total-expense');
    const elTotal = document.getElementById('total-balance');
    const elMonthResult = document.getElementById('month-result');
    const elDisplayMonth = document.getElementById('display-month');
    const transactionsList = document.getElementById('transactions-list');

    // Atualiza Texto do Mês
    const monthYearStr = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    elDisplayMonth.textContent = monthYearStr;

    // Sincroniza o campo de data do formulário com o mês ativo (padrão: dia 1 ou hoje se for o mês atual)
    const now = new Date();
    const dateInput = document.getElementById('date');
    if (viewDate.getMonth() === now.getMonth() && viewDate.getFullYear() === now.getFullYear()) {
        dateInput.value = now.toISOString().split('T')[0];
    } else {
        const y = viewDate.getFullYear();
        const m = String(viewDate.getMonth() + 1).padStart(2, '0');
        dateInput.value = `${y}-${m}-01`;
    }

    // Filtros de Data
    const viewMonth = viewDate.getMonth();
    const viewYear = viewDate.getFullYear();

    const profileTransactions = transactions.filter(t => t.profile === currentProfile);

    // Filtra transações do mês especifico para os cards de Receita/Custo e Lista
    const monthlyTransactions = profileTransactions.filter(t => {
        const d = new Date(t.date + 'T12:00:00');
        return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    });

    const income = monthlyTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = monthlyTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const monthBalance = income - expense;

    // Saldo Total Acumulado (Somente Mês Atual + Mês Anterior)
    const currentMonthStart = new Date(viewYear, viewMonth, 1);
    const prevMonthStart = new Date(viewYear, viewMonth - 1, 1);
    const endOfCurrentMonth = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59);

    const relevantTransactions = transactions.filter(t => {
        const d = new Date(t.date + 'T12:00:00');
        return d >= prevMonthStart && d <= endOfCurrentMonth;
    });

    const totalGlobalIncome = relevantTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalGlobalExpense = relevantTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const totalGlobal = totalGlobalIncome - totalGlobalExpense;

    elIncome.textContent = formatCurrency(income);
    elExpense.textContent = formatCurrency(expense);
    elTotal.textContent = formatCurrency(totalGlobal);
    elMonthResult.textContent = formatCurrency(monthBalance);

    // Cor do resultado do mês (verde se positivo, branco/neutro se negativo)
    elMonthResult.style.color = monthBalance >= 0 ? '#4ade80' : '#ffa0a0';

    transactionsList.innerHTML = '';

    // Inserção dos Cartões no topo do Histórico (Sempre visível e Expansível)
    const profileCards = cards.filter(c => c.profile === currentProfile);
    profileCards.forEach(card => {
        const item = document.createElement('div');
        item.className = 'transaction-item-wrapper card-row-history';
        item.dataset.id = card.id;
        item.dataset.type = 'card';
        item.draggable = true;
        const logoUrl = `https://www.google.com/s2/favicons?domain=${card.bank || 'generic'}&sz=32`;

        // Busca lançamentos REAIS vinculados a este cartão neste mês
        const cardTransactions = monthlyTransactions.filter(t => t.cardId === card.id);
        const invoiceTotal = cardTransactions.reduce((acc, t) => acc + (t.type === 'income' ? -t.amount : t.amount), 0);
        const hasCardItems = cardTransactions.length > 0;

        item.innerHTML = `
            <div class="transaction-item" style="border-left: 4px solid ${bankColors[card.bank] || bankColors.generic}; background-color: rgba(59, 130, 246, 0.03); margin-bottom: 2px;">
                <div class="t-main-col">
                    <div style="width: 25px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        ${hasCardItems ? `<button class="expand-btn" onclick="toggleSplitDetails(this, '${card.id}')"><i data-lucide="chevron-right" width="16"></i></button>` : ''}
                    </div>
                    <img src="${logoUrl}" width="24" height="24" style="border-radius: 4px; flex-shrink: 0; background: white;">
                    <div class="t-details">
                        <h4 style="color: var(--blue-700);">${card.name}</h4>
                        <p>Total da Fatura</p>
                    </div>
                </div>
                <div class="t-amount-col">
                    <div style="font-weight: 700; font-size: 1.1rem; color: var(--blue-600);">
                        ${formatCurrency(invoiceTotal)}
                    </div>
                    <div class="t-actions">
                        <button class="action-btn" onclick="openSubitemModal('${card.id}')" title="Inserir despesa no cartão" style="background-color: var(--blue-50); color: var(--blue-600);"><i data-lucide="plus" width="16" height="16"></i></button>
                    </div>
                </div>
            </div>
            <div class="split-details-list" id="split-details-${card.id}" style="${hasCardItems ? '' : 'display:none;'}">
                ${cardTransactions.map(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            const sub = subcategories.find(s => s.id === t.subcategoryId);
            const sign = t.type === 'income' ? '+' : '-';
            return `
                        <div class="split-detail-item">
                            <div class="t-main-col">
                                <div style="width: 80px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    <button class="action-btn delete" onclick="deleteTransaction('${t.id}')" title="Excluir" style="padding: 2px; color: var(--red-400);"><i data-lucide="trash-2" width="14" height="14"></i></button>
                                </div>
                                <span style="font-size: 0.9rem; cursor: text;" onclick="makeEditable(this, '${t.id}', 'description')">${t.description}</span>
                            </div>
                            <div class="t-subcategory-col" onclick="makeEditable(this, '${t.id}', 'subcategoryId')">
                                <span class="pill pill-subcategory" style="font-size: 0.7rem; cursor: pointer;">${sub ? sub.name : 'Geral'}</span>
                            </div>
                            <div class="t-amount-col ${t.type}" onclick="makeEditable(this, '${t.id}', 'amount')">
                                <span style="font-weight: 600; font-size: 0.95rem; cursor: pointer;">${sign} ${formatCurrency(t.amount)}</span>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
        transactionsList.appendChild(item);
    });

    const sorted = monthlyTransactions
        .filter(t => !t.cardId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(t => {
        const isIncome = t.type === 'income';
        const typeClass = isIncome ? 'income' : 'expense';
        const sign = isIncome ? '+' : '-';
        const cat = categories.find(c => c.id === t.categoryId);
        const sub = subcategories.find(s => s.id === t.subcategoryId);
        const iconName = cat ? cat.icon : 'dollar-sign';
        const catName = cat ? cat.name : 'Geral';
        const subName = sub ? sub.name : 'Geral';
        const hasItems = t.items && t.items.length > 0;

        const item = document.createElement('div');
        item.className = 'transaction-item-wrapper';
        item.dataset.id = t.id;
        item.dataset.type = 'transaction';
        item.draggable = true;

        let subItemsHtml = '';
        if (hasItems) {
            subItemsHtml = `
                <div class="split-details-list" id="split-details-${t.id}">
                    ${t.items.map((si, idx) => {
                const sSub = subcategories.find(s => s.id === si.subcategoryId);
                return `
                            <div class="split-detail-item">
                                <div class="t-main-col">
                                    <div style="width: 80px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                        <button class="action-btn delete" onclick="deleteSubitem('${t.id}', ${idx})" title="Remover item" style="padding: 2px; color: var(--red-400);"><i data-lucide="x" width="14" height="14"></i></button>
                                    </div>
                                    <span style="font-size: 0.9rem;">${si.description}</span>
                                </div>
                                <div class="t-subcategory-col">
                                    <span class="pill pill-subcategory" style="font-size: 0.7rem;">${sSub ? sSub.name : 'Geral'}</span>
                                </div>
                                <div class="t-amount-col">
                                    <span style="font-weight: 600; font-size: 0.95rem;">${formatCurrency(si.amount)}</span>
                                </div>
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        }

        item.innerHTML = `
            <div class="transaction-item">
                <div class="t-main-col">
                    <div style="width: 25px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        ${hasItems ? `<button class="expand-btn" onclick="toggleSplitDetails(this, '${t.id}')"><i data-lucide="chevron-right" width="16"></i></button>` : ''}
                    </div>
                    <div class="t-icon ${typeClass}">
                        <i data-lucide="${iconName}"></i>
                    </div>
                    <div class="t-details">
                        <h4 onclick="makeEditable(this, '${t.id}', 'description')" style="cursor: text;">${t.description}</h4>
                        <p>${formatDate(t.date)}</p>
                    </div>
                </div>
                <div class="t-category-col">
                    <span class="pill pill-category ${t.type}">${catName}</span>
                </div>
                <div class="t-subcategory-col">
                    <span class="pill pill-subcategory">${subName}</span>
                </div>
                <div class="t-amount-col ${typeClass}">
                    <div style="font-weight: 700; font-size: 1.1rem;">${sign} ${formatCurrency(t.amount)}</div>
                    <div class="t-actions">
                        <button class="action-btn" onclick="openSubitemModal('${t.id}')" title="Adicionar item" style="background-color: var(--blue-50); color: var(--blue-600);"><i data-lucide="plus" width="16" height="16"></i></button>
                        <button class="action-btn delete" onclick="deleteTransaction('${t.id}')" title="Excluir"><i data-lucide="trash-2" width="16" height="16"></i></button>
                    </div>
                </div>
            </div>
            ${subItemsHtml}
        `;
        transactionsList.appendChild(item);
    });

    lucide.createIcons();
    if (document.getElementById('view-reports').style.display === 'block') updateReports();
};

// --- RELATÓRIOS E GRÁFICOS ---
const updateReports = () => {
    const elReportLabel = document.getElementById('report-month-label');
    const monthYearStr = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    elReportLabel.textContent = monthYearStr;

    const viewMonth = viewDate.getMonth();
    const viewYear = viewDate.getFullYear();

    const profileTransactions = transactions.filter(t => t.profile === currentProfile);
    const monthlyTransactions = profileTransactions.filter(t => {
        const d = new Date(t.date + 'T12:00:00');
        return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    });

    const getSubcategoryData = (type) => {
        const typeTransactions = monthlyTransactions.filter(t => t.type === type);
        const totals = {};

        typeTransactions.forEach(t => {
            if (t.items && t.items.length > 0) {
                t.items.forEach(item => {
                    const sub = subcategories.find(s => s.id === item.subcategoryId);
                    const cat = categories.find(c => c.id === t.categoryId);
                    const label = sub ? `${cat ? cat.name : 'Geral'} > ${sub.name}` : (cat ? cat.name : 'Geral');
                    totals[label] = (totals[label] || 0) + item.amount;
                });
            } else {
                const sub = subcategories.find(s => s.id === t.subcategoryId);
                const cat = categories.find(c => c.id === t.categoryId);
                const label = sub ? `${cat ? cat.name : 'Geral'} > ${sub.name}` : (cat ? cat.name : 'Geral');
                totals[label] = (totals[label] || 0) + t.amount;
            }
        });
        return {
            labels: Object.keys(totals),
            data: Object.values(totals)
        };
    };

    const expenseData = getSubcategoryData('expense');
    const incomeCatData = getSubcategoryData('income');

    const getTrendData = () => {
        const labels = [];
        const incomes = [];
        const expenses = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(viewDate);
            d.setMonth(d.getMonth() - i);
            const m = d.getMonth();
            const y = d.getFullYear();

            labels.push(d.toLocaleDateString('pt-BR', { month: 'short' }));

            const monthTrans = profileTransactions.filter(t => {
                const td = new Date(t.date + 'T12:00:00');
                return td.getMonth() === m && td.getFullYear() === y;
            });

            incomes.push(monthTrans.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0));
            expenses.push(monthTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0));
        }

        return { labels, incomes, expenses };
    };

    const trendData = getTrendData();

    const topExpenseIdx = expenseData.data.indexOf(Math.max(...expenseData.data));
    if (expenseData.data.length > 0 && topExpenseIdx !== -1) {
        document.getElementById('top-expense-category').textContent = expenseData.labels[topExpenseIdx];
        document.getElementById('top-expense-amount').textContent = formatCurrency(expenseData.data[topExpenseIdx]);
    } else {
        document.getElementById('top-expense-category').textContent = 'Nenhum';
        document.getElementById('top-expense-amount').textContent = 'R$ 0,00';
    }

    const avgIncome = trendData.incomes.reduce((a, b) => a + b, 0) / trendData.incomes.length;
    document.getElementById('avg-income-6m').textContent = formatCurrency(avgIncome);

    renderCategoryChart('categoryChart', expenseData, 'Despesas por Categoria', ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'], 'category');
    renderCategoryChart('incomeCategoryChart', incomeCatData, 'Receitas por Categoria', ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'], 'income');
    renderTrendChart(trendData);
};

const renderCategoryChart = (canvasId, chartData, label, colors, chartRef) => {
    if (charts[chartRef]) charts[chartRef].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');
    charts[chartRef] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartData.labels,
            datasets: [{
                data: chartData.data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15, font: { family: 'Inter', size: 11 } } }
            },
            cutout: '65%'
        }
    });
};

const renderTrendChart = (trendData) => {
    if (charts.trend) charts.trend.destroy();
    const ctx = document.getElementById('trendChart').getContext('2d');
    charts.trend = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: trendData.labels,
            datasets: [
                {
                    label: 'Receitas',
                    data: trendData.incomes,
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                },
                {
                    label: 'Custos',
                    data: trendData.expenses,
                    backgroundColor: '#ef4444',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', align: 'end', labels: { boxWidth: 12, font: { family: 'Inter', size: 12 } } }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter', size: 11 } } },
                x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } }
            }
        }
    });
};

window.deleteTransaction = (id) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
        transactions = transactions.filter(t => t.id !== id);
        syncData();
        updateUI();
    }
};

let currentParentId = null;
let currentParentIsCard = false;

window.openSubitemModal = (parentId) => {
    currentParentId = parentId;
    currentParentIsCard = cards.some(c => c.id === parentId);

    const modal = document.getElementById('subitem-modal');
    const title = document.getElementById('subitem-modal-title');

    if (currentParentIsCard) {
        title.innerText = 'Lançar no Cartão';
    } else {
        title.innerText = 'Adicionar Item';
    }

    modal.style.display = 'flex';

    const subSelect = document.getElementById('si-subcategory');
    if (currentParentIsCard) {
        subSelect.innerHTML = '<option value="">Escolha a subcategoria...</option>' +
            subcategories.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    } else {
        const parentT = transactions.find(t => t.id === parentId);
        const parentCategory = parentT ? parentT.categoryId : '';
        const filteredSubs = subcategories.filter(s => s.categoryId === parentCategory);
        subSelect.innerHTML = '<option value="">Escolha a subcategoria...</option>' +
            filteredSubs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
};

window.closeSubitemModal = () => {
    document.getElementById('subitem-modal').style.display = 'none';
    currentParentId = null;
};

document.getElementById('subitem-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const subcategoryId = document.getElementById('si-subcategory').value;
    const amount = parseFloat(document.getElementById('si-amount').value);
    const observation = document.getElementById('si-desc').value;

    if (!subcategoryId || isNaN(amount)) return;

    const sub = subcategories.find(s => s.id === subcategoryId);
    const finalDesc = observation.trim() !== '' ? observation : (sub ? sub.name : 'Geral');

    if (currentParentIsCard) {
        // Criar um novo lançamento real vinculado ao cartão
        const newT = {
            id: Date.now().toString(),
            profile: currentProfile,
            description: finalDesc,
            amount,
            type: 'expense', // Quase sempre despesa em cartão
            categoryId: sub ? sub.categoryId : '',
            subcategoryId,
            cardId: currentParentId,
            date: new Date().toISOString().split('T')[0],
            items: []
        };
        transactions.push(newT);
    } else {
        // Adicionar como sub-item de uma transação agrupada existente
        const tIndex = transactions.findIndex(t => t.id === currentParentId);
        if (tIndex > -1) {
            if (!transactions[tIndex].items) transactions[tIndex].items = [];

            // Se já existia um valor mas não tinha itens, preservamos o valor original como o primeiro item
            if (transactions[tIndex].items.length === 0 && transactions[tIndex].amount > 0) {
                transactions[tIndex].items.push({
                    description: 'Lançamento Inicial',
                    amount: transactions[tIndex].amount,
                    subcategoryId: transactions[tIndex].subcategoryId || ''
                });
            }

            transactions[tIndex].items.push({
                description: finalDesc,
                amount: amount,
                subcategoryId: subcategoryId
            });

            // Recalcula total do pai
            transactions[tIndex].amount = transactions[tIndex].items.reduce((acc, si) => acc + si.amount, 0);
        }
    }

    syncData();
    closeSubitemModal();
    updateUI();

    // Limpar form
    document.getElementById('si-amount').value = '';
    document.getElementById('si-desc').value = '';
});

window.deleteSubitem = (tId, itemIdx) => {
    const tIndex = transactions.findIndex(tx => tx.id === tId);
    if (tIndex === -1) return;

    if (confirm('Excluir este item interno?')) {
        transactions[tIndex].items.splice(itemIdx, 1);

        // Recalcula total ou mantém se não houver itens?
        // Se após excluir não houver mais itens, talvez manter o último valor? 
        // Vamos sempre somar o que resta.
        if (transactions[tIndex].items.length > 0) {
            const newTotal = transactions[tIndex].items.reduce((acc, item) => acc + item.amount, 0);
            transactions[tIndex].amount = newTotal;
        }

        syncData();
        updateUI();
    }
};

window.closeRepeatModal = () => {
    document.getElementById('repeat-modal').style.display = 'none';
    pendingRepeatId = null;
};

window.openRepeatModal = (id) => {
    pendingRepeatId = id;
    document.getElementById('modal-repeat-end').value = '';
    document.getElementById('repeat-modal').style.display = 'flex';
};

document.getElementById('confirm-repeat-btn').addEventListener('click', () => {
    if (!pendingRepeatId) return;

    const t = transactions.find(tx => tx.id === pendingRepeatId);
    if (!t) {
        closeRepeatModal();
        return;
    }

    const recurringEnd = document.getElementById('modal-repeat-end').value;
    if (!recurringEnd) {
        alert('Por favor, selecione um Mês/Ano válido.');
        return;
    }

    const startDateObj = new Date(t.date + 'T12:00:00');
    const [endYear, endMonth] = recurringEnd.split('-');

    let currentDateObj = new Date(startDateObj);

    // Avança 1 mês pois a original já existe
    const nextMonthDate = new Date(currentDateObj);
    nextMonthDate.setMonth(currentDateObj.getMonth() + 1);
    if (nextMonthDate.getDate() !== currentDateObj.getDate()) {
        nextMonthDate.setDate(0);
    }
    currentDateObj = nextMonthDate;

    const generatedTransactions = [];
    let i = 0;

    while (true) {
        const currentYear = currentDateObj.getFullYear();
        const currentMonth = currentDateObj.getMonth();

        if (currentYear > parseInt(endYear) || (currentYear === parseInt(endYear) && currentMonth > parseInt(endMonth) - 1)) {
            break;
        }

        const y = currentYear;
        const m = String(currentMonth + 1).padStart(2, '0');
        const d = String(currentDateObj.getDate()).padStart(2, '0');

        generatedTransactions.push({
            id: Date.now().toString() + '_' + t.id.substring(0, 4) + '_' + i,
            profile: t.profile,
            description: t.description,
            amount: t.amount,
            type: t.type,
            categoryId: t.categoryId,
            date: `${y}-${m}-${d}`
        });

        const nextMonthDate2 = new Date(currentDateObj);
        nextMonthDate2.setMonth(currentDateObj.getMonth() + 1);
        if (nextMonthDate2.getDate() !== currentDateObj.getDate()) {
            nextMonthDate2.setDate(0);
        }
        currentDateObj = nextMonthDate2;

        i++;
        if (i > 120) break; // Limite de sanidade (10 anos)
    }

    if (generatedTransactions.length > 0) {
        transactions.push(...generatedTransactions);
        syncData();
        updateUI();
        alert(`${generatedTransactions.length} nova(s) cópia(s) gerada(s) para os meses seguintes!`);
    } else {
        alert('Nenhuma transação gerada.\\nO mês informado é anterior ou idêntico ao mês da transação original.');
    }
    closeRepeatModal();
});

window.makeEditable = (element, id, field, itemIdx = null) => {
    if (element.querySelector('input') || element.querySelector('select')) return;

    let originalValue;
    let tIndex = -1;
    let cardIndex = -1;

    if (itemIdx === 'card') {
        cardIndex = cards.findIndex(c => c.id === id);
        if (cardIndex === -1) return;
        originalValue = cards[cardIndex][field];
    } else {
        tIndex = transactions.findIndex(tx => tx.id === id);
        if (tIndex === -1) return;
        const t = transactions[tIndex];
        if (itemIdx !== null) {
            originalValue = t.items[itemIdx][field];
        } else {
            originalValue = t[field];
        }
    }

    let input;

    if (field === 'categoryId') {
        // Para simplificar a edição inline, editamos Categoria e ele reseta a subcategoria para Geral
        input = document.createElement('select');
        const options = categories.filter(c => c.type === t.type);
        input.innerHTML = `<option value="">Geral</option>` + options.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        input.value = originalValue || '';
    } else if (field === 'subcategoryId') {
        input = document.createElement('select');
        const options = subcategories.filter(s => s.categoryId === t.categoryId);
        input.innerHTML = `<option value="">Geral</option>` + options.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        input.value = originalValue || '';
    } else {
        input = document.createElement('input');
        let inputType = 'text';
        if (field === 'amount') inputType = 'number';
        if (field === 'date') inputType = 'date';

        input.type = inputType;
        input.value = originalValue;

        if (field === 'amount') {
            input.step = '0.01';
            input.style.textAlign = 'right';
        }
    }

    input.style.width = field === 'categoryId' ? 'auto' : '100%';
    input.style.padding = '2px 4px';
    input.style.border = '1px solid var(--blue-500)';
    input.style.borderRadius = '4px';
    input.style.fontSize = 'inherit';
    input.style.fontFamily = 'inherit';
    input.style.fontWeight = 'inherit';
    input.style.color = 'var(--text-primary)';
    input.style.backgroundColor = 'var(--bg-color)';
    if (field !== 'categoryId') input.style.minWidth = '80px';
    else input.style.textTransform = 'capitalize';

    if (itemIdx === 'card' && field === 'limit') {
        input.type = 'number';
        input.step = '0.01';
        input.value = originalValue;
    }

    element.innerHTML = '';
    element.appendChild(input);
    input.focus();

    const save = () => {
        let val = input.value;
        if (field === 'amount' || (itemIdx === 'card' && field === 'limit')) val = parseFloat(val);

        if (((field === 'amount' || field === 'limit') && isNaN(val)) || (field !== 'amount' && field !== 'limit' && field !== 'categoryId' && field !== 'subcategoryId' && !val)) {
            updateUI(); // Reverte
            return;
        }

        if (itemIdx === 'card') {
            // Edição em Cartão
            cards[cardIndex][field] = val;
            localStorage.setItem('gestor_cards', JSON.stringify(cards));
        } else if (itemIdx !== null) {
            // Edição em Sub-item
            transactions[tIndex].items[itemIdx][field] = val;

            // Sincroniza o nome do item se a subcategoria mudar
            if (field === 'subcategoryId') {
                const newSub = subcategories.find(s => s.id === val);
                if (newSub) {
                    transactions[tIndex].items[itemIdx].description = newSub.name;
                }
            }

            // Se for alteração de valor no item, recalcula total do pai
            if (field === 'amount') {
                transactions[tIndex].amount = transactions[tIndex].items.reduce((acc, si) => acc + si.amount, 0);
            }
            // Edição em Transação Principal
            const oldT = transactions[tIndex];
            transactions[tIndex][field] = val;

            // Se mudou a subcategoria e o nome era o de uma subcategoria, atualiza
            if (field === 'subcategoryId') {
                const sub = subcategories.find(s => s.id === val);
                if (sub) {
                    transactions[tIndex].description = sub.name;
                }
            }

            if (field === 'categoryId') {
                transactions[tIndex].subcategoryId = ''; // Reset da subcategoria ao mudar categoria pai
            }
        }

        syncData();
        updateUI();
    };

    if (field === 'categoryId' || field === 'subcategoryId') {
        input.addEventListener('change', save);
        input.addEventListener('blur', save);
    } else {
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') updateUI();
        });
    }
};

document.getElementById('is-recurring').addEventListener('change', (e) => {
    document.getElementById('recurring-end-container').style.display = e.target.checked ? 'block' : 'none';
    document.getElementById('recurring-end').required = e.target.checked;
});

const transactionForm = document.getElementById('transaction-form');
const addTransaction = (e) => {
    e.preventDefault();

    const desc = document.getElementById('desc').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    const date = document.getElementById('date').value;
    const categoryId = document.getElementById('category').value;
    const subcategoryId = document.getElementById('subcategory').value;
    const cardId = document.getElementById('card-id').value;
    const isRecurring = document.getElementById('is-recurring').checked;
    const recurringEnd = document.getElementById('recurring-end').value;

    // Captura itens de split (Inicialmente vazio, pois o split agora ocorre na edição)
    const items = [];

    let finalDesc = desc.trim();
    if (!finalDesc) {
        const sub = subcategories.find(s => s.id === subcategoryId);
        finalDesc = sub ? sub.name : 'Vários';
    }

    if (isNaN(amount) || !date) return;

    if (isRecurring && recurringEnd) {
        const startDateObj = new Date(date + 'T12:00:00');
        const [endYear, endMonth] = recurringEnd.split('-');

        let currentDateObj = new Date(startDateObj);
        const generatedTransactions = [];
        let i = 0;

        while (true) {
            const currentYear = currentDateObj.getFullYear();
            const currentMonth = currentDateObj.getMonth();

            if (currentYear > parseInt(endYear) || (currentYear === parseInt(endYear) && currentMonth > parseInt(endMonth) - 1)) {
                break;
            }

            const y = currentYear;
            const m = String(currentMonth + 1).padStart(2, '0');
            const d = String(currentDateObj.getDate()).padStart(2, '0');

            generatedTransactions.push({
                id: Date.now().toString() + '_' + i,
                profile: currentProfile,
                description: finalDesc,
                amount: amount,
                type: type,
                categoryId: categoryId,
                subcategoryId: subcategoryId,
                cardId: cardId,
                date: `${y}-${m}-${d}`,
                items: items.length > 0 ? JSON.parse(JSON.stringify(items)) : []
            });

            const nextMonthDate = new Date(currentDateObj);
            nextMonthDate.setMonth(currentDateObj.getMonth() + 1);
            if (nextMonthDate.getDate() !== currentDateObj.getDate()) {
                nextMonthDate.setDate(0);
            }
            currentDateObj = nextMonthDate;

            i++;
            if (i > 120) break; // safety limit
        }
        transactions.push(...generatedTransactions);
    } else {
        const newTransaction = {
            id: Date.now().toString(),
            profile: currentProfile,
            description: finalDesc,
            amount: amount,
            type: type,
            categoryId: categoryId,
            subcategoryId: subcategoryId,
            cardId: cardId,
            date: date,
            items: items
        };
        transactions.push(newTransaction);
    }

    syncData();

    document.getElementById('desc').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('is-recurring').checked = false;
    document.getElementById('recurring-end-container').style.display = 'none';
    document.getElementById('recurring-end').value = '';

    closeTransactionModal();
    syncData();
    updateUI();
};

transactionForm.addEventListener('submit', addTransaction);

// --- CARTÕES ---
const bankColors = {
    'nubank.com.br': '#8a05be', // Roxo
    'itau.com.br': '#e36814',   // Laranja
    'inter.co': '#ff7a00',      // Inter Laranja
    'neon.com.br': '#00e5ff',   // Ciano Neon
    'mercadopago.com.br': '#009ee3', // Azul
    'santander.com.br': '#ec0000', // Vermelho
    'bradesco.com.br': '#e20613', // Vermelho Bradesco
    'c6bank.com.br': '#000000', // Preto
    'caixa.gov.br': '#00659a', // Azul Caixa
    'bb.com.br': '#fcf000',    // Amarelo BB
    'generic': '#3b82f6'       // Azul Padrão
};

window.renderCardsList = () => {
    const container = document.getElementById('cards-list');
    if (!container) return;
    const profileCards = cards.filter(c => c.profile === currentProfile);

    if (profileCards.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 0.9rem; padding: 1rem;">Nenhum cartão cadastrado neste perfil.</p>';
        return;
    }

    container.innerHTML = profileCards.map(card => {
        const usage = getCardUsageThisMonth(card.id);
        const percentage = Math.min((usage / card.limit) * 100, 100);
        const barColor = bankColors[card.bank] || bankColors.generic;
        const logoUrl = `https://www.google.com/s2/favicons?domain=${card.bank}&sz=64`;

        return `
            <div class="card-item-row">
                <img src="${logoUrl}" width="32" height="32" style="border-radius: 4px; margin-right: 1rem; border: 1px solid var(--border-color); background: white;">
                <div class="card-item-info" style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                        <h5 style="margin:0">${card.name}</h5>
                        <span style="font-size: 0.8rem; font-weight: 600;">Usado: ${formatCurrency(usage)}</span>
                    </div>
                    <p style="margin: 2px 0 0 0;">Limite: ${formatCurrency(card.limit)}</p>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${percentage}%; background-color: ${barColor};"></div>
                    </div>
                </div>
                <button class="action-btn delete" onclick="deleteCard('${card.id}')" style="margin-left: 1rem;"><i data-lucide="trash-2" width="16" height="16"></i></button>
            </div>
        `;
    }).join('');
    lucide.createIcons();
};

const getCardUsageThisMonth = (cardId) => {
    const viewMonth = viewDate.getMonth();
    const viewYear = viewDate.getFullYear();

    return transactions
        .filter(t => t.cardId === cardId)
        .filter(t => {
            const d = new Date(t.date + 'T12:00:00');
            return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
        })
        .reduce((acc, t) => {
            // Se for receita (cashback/estorno), subtrai do valor da fatura
            return t.type === 'income' ? acc - t.amount : acc + t.amount;
        }, 0);
};

window.renderDashboardCards = () => {
    const container = document.getElementById('cards-summary-container');
    if (!container) return;
    const profileCards = cards.filter(c => c.profile === currentProfile);

    if (profileCards.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'grid';
    container.innerHTML = profileCards.map(card => {
        const usage = getCardUsageThisMonth(card.id);
        const percentage = Math.min((usage / card.limit) * 100, 100);
        const barColor = bankColors[card.bank] || bankColors.generic;
        const logoUrl = `https://www.google.com/s2/favicons?domain=${card.bank}&sz=64`;

        return `
            <div class="mini-card-display" style="background: white; box-shadow: var(--shadow-sm); border-left: 3px solid ${barColor};">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem;">
                    <img src="${logoUrl}" width="18" height="18" style="border-radius: 3px;">
                    <span style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">${card.name}</span>
                </div>
                <div style="font-size: 1rem; font-weight: 700; color: ${barColor}; margin-bottom: 0.25rem;">
                    ${formatCurrency(usage)}
                </div>
                <div style="font-size: 0.65rem; color: var(--text-secondary);">Próxima Fatura</div>
            </div>
        `;
    }).join('');
};

document.getElementById('card-form').onsubmit = (e) => {
    e.preventDefault();
    const bank = document.getElementById('card-bank').value;
    const name = document.getElementById('card-name').value;
    const limit = parseFloat(document.getElementById('card-limit').value);

    if (!name || isNaN(limit)) return;

    cards.push({
        id: 'card_' + Date.now(),
        profile: currentProfile,
        bank,
        name,
        limit
    });

    localStorage.setItem('gestor_cards', JSON.stringify(cards));
    document.getElementById('card-form').reset();
    renderCardsList();
    syncData();
    updateUI();
};

window.deleteCard = (id) => {
    if (confirm('Deseja excluir este cartão? Os lançamentos vinculados a ele não serão apagados.')) {
        cards = cards.filter(c => c.id !== id);
        transactions = transactions.map(t => t.cardId === id ? { ...t, cardId: null } : t);
        syncData();
        renderCardsList();
        updateUI();
    }
};

// Inicialização
document.getElementById('date').value = new Date().toISOString().split('T')[0];
selectIcon('home');
updateCategorySelect();
// --- DRAG AND DROP ---
let draggedId = null;
let draggedType = null;

const initDragAndDrop = () => {
    const list = document.getElementById('transactions-list');
    if (!list) return;

    // Lixeira Rápida
    const trash = document.getElementById('quick-trash');
    if (trash) {
        trash.addEventListener('dragover', (e) => {
            e.preventDefault();
            trash.classList.add('drag-over');
        });

        trash.addEventListener('dragleave', () => {
            trash.classList.remove('drag-over');
        });

        trash.addEventListener('drop', (e) => {
            e.preventDefault();
            trash.classList.remove('drag-over');

            if (draggedType === 'transaction') {
                transactions = transactions.map(t => t.cardId === draggedId ? { ...t, cardId: null } : t);
                syncData();
            }

            updateUI();
        });
    }

    list.addEventListener('dragstart', (e) => {
        const target = e.target.closest('.transaction-item-wrapper');
        if (!target) return;

        draggedId = target.dataset.id;
        draggedType = target.dataset.type;
        target.classList.add('dragging');

        // Agora transações E cartões podem ser arrastados para a lixeira
    });

    list.addEventListener('dragend', (e) => {
        const target = e.target.closest('.transaction-item-wrapper');
        if (target) target.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    list.addEventListener('dragover', (e) => {
        e.preventDefault();
        const target = e.target.closest('.transaction-item-wrapper');
        if (!target || target.dataset.id === draggedId) return;

        target.classList.add('drag-over');
    });

    list.addEventListener('dragleave', (e) => {
        const target = e.target.closest('.transaction-item-wrapper');
        if (target) target.classList.remove('drag-over');
    });

    list.addEventListener('drop', (e) => {
        e.preventDefault();
        const dropTarget = e.target.closest('.transaction-item-wrapper');
        if (!dropTarget || dropTarget.dataset.id === draggedId) return;

        const targetId = dropTarget.dataset.id;
        const targetType = dropTarget.dataset.type;

        if (targetType === 'card') {
            // Arrastado para um Cartão
            const tIndex = transactions.findIndex(t => t.id === draggedId);
            if (tIndex > -1) {
                transactions[tIndex].cardId = targetId;
                localStorage.setItem('gestor_transactions', JSON.stringify(transactions));
            }
        } else if (targetType === 'transaction') {
            // Arrastado para outra Transação (Agrupamento)
            const sourceIndex = transactions.findIndex(t => t.id === draggedId);
            const targetIndex = transactions.findIndex(t => t.id === targetId);

            if (sourceIndex > -1 && targetIndex > -1) {
                const source = transactions[sourceIndex];
                const target = transactions[targetIndex];

                // Regra: Não agrupar tipos diferentes (Despesa com Receita)
                if (source.type !== target.type) {
                    alert('Não é possível agrupar despesa com receita.');
                    return;
                }

                // Inicia array de itens no alvo se não existir
                if (!target.items || target.items.length === 0) {
                    target.items = [{
                        description: target.description,
                        amount: target.amount,
                        subcategoryId: target.subcategoryId
                    }];
                }

                // Adiciona a origem como sub-item
                if (source.items && source.items.length > 0) {
                    // Se a origem já for um grupo, move todos os itens dela
                    target.items.push(...source.items);
                } else {
                    target.items.push({
                        description: source.description,
                        amount: source.amount,
                        subcategoryId: source.subcategoryId
                    });
                }

                // Recalcula total do alvo e remove a origem
                target.amount = target.items.reduce((acc, item) => acc + item.amount, 0);
                transactions.splice(sourceIndex, 1);

                localStorage.setItem('gestor_transactions', JSON.stringify(transactions));
            }
        }

        updateUI();
    });
};

initDragAndDrop();
updateUI();
