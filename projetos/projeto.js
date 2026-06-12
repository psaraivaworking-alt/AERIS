import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyACpXbLGy6bA2MGGPvItUGY_Izi0jgO5wQ",
    authDomain: "aeris-c56b8.firebaseapp.com",
    projectId: "aeris-c56b8",
    storageBucket: "aeris-c56b8.firebasestorage.app",
    messagingSenderId: "23240473122",
    appId: "1:23240473122:web:c353570a1aa2061d03687b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Estado Global da Aplicação
let todosOsProjetos = [];
let todasAsCategorias = []; // <-- NOVO: Armazena a estrutura oficial vinda do Firestore

let filtroCategoria = "todos";    // Vai guardar o NOME da categoria (Ex: "Casa")
let filtroSubcategoria = "todos"; // Vai guardar o NOME da subcategoria (Ex: "Interna")

// Seletores DOM
const gridProjetos = document.getElementById('grid-projetos');
const categoriasContainer = document.getElementById('categorias-container');
const subcategoriasContainer = document.getElementById('subcategorias-container');
const subcategoriasRow = document.getElementById('subcategorias-row');
const viewLista = document.getElementById('view-lista');
const viewInterna = document.getElementById('view-interna');
const btnVoltarLista = document.getElementById('btn-voltar-lista');

document.addEventListener('DOMContentLoaded', () => {
    inicializarNavegacao();
    ouvirBancoDeDados();
});

function inicializarNavegacao() {
    if (btnVoltarLista) {
        btnVoltarLista.addEventListener('click', () => {
            removerParametroUrl();
            exibirEstruturaVitrine();
        });
    }
    window.addEventListener('popstate', verificarParametrosUrl);
}

// Escuta ativa de ambas as coleções em paralelo
function ouvirBancoDeDados() {
    // 1. ESCUTA OS PROJETOS/PRODUTOS
    onSnapshot(collection(db, "projetos"), (snapshot) => {
        todosOsProjetos = [];
        snapshot.forEach((doc) => {
            const dados = doc.data();
            todosOsProjetos.push({
                id: doc.id,
                nome: dados.nome || "Produto Sem Título",
                fotos: dados.urlFotos || dados.fotos || [],
                descricao: dados.descricao || dados.desc || "Produto autoral exclusivo AERIS Studio.",
                categoria: dados.categoria || "Geral",       // Aqui o projeto guarda o nome (Ex: "Casa")
                subcategoria: dados.subcategoria || "",   // Aqui o projeto guarda o nome (Ex: "Interna")
                arquiteto: dados.arquiteto || "AERIS Studio",
                cidade: dados.cidade || "São Paulo",
                estado: dados.estado || "SP",
                ano: dados.ano || "2026",
                materiais: dados.materials || dados.materiais || "Materiais nobres sob consulta.",
                area: dados.area || "Sob consulta"
            });
        });

        // Atualiza a grade sempre que os projetos mudarem
        renderizarGradeVitrine();
        verificarParametrosUrl(); 
    }, (error) => {
        console.error("Erro Projetos: ", error);
    });

    // 2. ESCUTA A COLEÇÃO OFICIAL DE CATEGORIAS (Conforme seu Print)
    const qCategorias = query(collection(db, "categorias"), orderBy("ordem", "asc"));
    onSnapshot(qCategorias, (snapshot) => {
        todasAsCategorias = [];
        snapshot.forEach((doc) => {
            const dados = doc.data();
            todasAsCategorias.push({
                id: doc.id,
                nome: dados.nome,                       // Ex: "Casa"
                ordem: dados.ordem,                     // Ex: 1
                subcategorias: dados.subcategorias || [] // Ex: ["Interna"]
            });
        });

        // Renderiza os botões baseando-se estritamente na coleção oficial
        renderizarFiltrosOficiais();
    }, (error) => {
        console.error("Erro Categorias: ", error);
    });
}

// GERA OS BOTÕES PRINCIPAIS (COLEÇÃO) USANDO A COLEÇÃO "CATEGORIAS"
function renderizarFiltrosOficiais() {
    if (!categoriasContainer) return;

    // Limpa e cria o botão "Ver Tudo"
    categoriasContainer.innerHTML = `<button class="btn-filter ${filtroCategoria === 'todos' ? 'active' : ''}" data-cat="todos">Ver Tudo</button>`;

    // Cria os botões dinamicamente a partir da coleção oficial do seu Admin
    todasAsCategorias.forEach(cat => {
        categoriasContainer.innerHTML += `<button class="btn-filter ${filtroCategoria === cat.nome ? 'active' : ''}" data-cat="${cat.nome}">${cat.nome}</button>`;
    });

    // Adiciona os eventos de clique
    categoriasContainer.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            categoriasContainer.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            filtroCategoria = e.target.getAttribute('data-cat');
            filtroSubcategoria = "todos"; // Reseta segmento ao mudar de coleção
            
            gerarSubfiltrosOficiais();
            renderizarGradeVitrine();
        });
    });

    // Atualiza a linha de baixo
    gerarSubfiltrosOficiais();
}

// GERA OS BOTÕES SECUNDÁRIOS (SEGMENTO) USANDO O ARRAY DE DENTRO DA CATEGORIA SELECIONADA
function gerarSubfiltrosOficiais() {
    if (!subcategoriasContainer || !subcategoriasRow) return;

    // Se "Ver Tudo" estiver ativo, esconde os segmentos
    if (filtroCategoria === 'todos') {
        subcategoriasRow.style.display = 'none';
        return;
    }

    // Encontra o objeto da categoria atual para ler o array "subcategorias" mapeado no seu Firestore
    const categoriaAtiva = todasAsCategorias.find(c => c.nome === filtroCategoria);

    // Se não achar ou não tiver subcategorias cadastradas na estrutura, esconde a linha
    if (!categoriaAtiva || !categoriaAtiva.subcategorias || categoriaAtiva.subcategorias.length === 0) {
        subcategoriasRow.style.display = 'none';
        return;
    }

    // Se tem subcategorias na estrutura, exibe a linha automaticamente
    subcategoriasRow.style.display = 'flex';
    subcategoriasContainer.innerHTML = `<button class="btn-filter ${filtroSubcategoria === 'todos' ? 'active' : ''}" data-sub="todos">Todos de ${filtroCategoria}</button>`;
    
    // Varre o array ["Interna", ...] que está no documento da categoria
    categoriaAtiva.subcategorias.forEach(subNome => {
        subcategoriasContainer.innerHTML += `<button class="btn-filter ${filtroSubcategoria === subNome ? 'sub-active' : ''}" data-sub="${subNome}">${subNome}</button>`;
    });

    // Adiciona cliques nos botões de segmento
    subcategoriasContainer.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            subcategoriasContainer.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active', 'sub-active'));
            
            filtroSubcategoria = e.target.getAttribute('data-sub');
            
            if (filtroSubcategoria === 'todos') {
                e.target.classList.add('active');
            } else {
                e.target.classList.add('sub-active');
            }
            
            renderizarGradeVitrine();
        });
    });
}

function renderizarGradeVitrine() {
    if (!gridProjetos) return;
    gridProjetos.innerHTML = '';

    // 1. Cruza os filtros selecionados usando a lógica de ID ou Nome
    const filtrados = todosOsProjetos.filter(p => {
        // Encontra o objeto da categoria correspondente ao ID salvo no projeto
        const objCategoriaDoProjeto = todasAsCategorias.find(c => c.id === p.categoria);
        const nomeCategoriaDoProjeto = objCategoriaDoProjeto ? objCategoriaDoProjeto.nome : "Geral";

        // Verifica se bate com o filtro ativo (comparando por nome)
        const checkCat = (filtroCategoria === 'todos' || nomeCategoriaDoProjeto === filtroCategoria);
        const checkSub = (filtroSubcategoria === 'todos' || p.subcategoria === filtroSubcategoria);
        return checkCat && checkSub;
    });

    if (filtrados.length === 0) {
        gridProjetos.innerHTML = `<div class="loading-placeholder">Nenhuma peça registrada nesta vertente.</div>`;
        return;
    }

    // 2. Renderiza os cards traduzindo o ID para o Nome real na tag
    filtrados.forEach(projeto => {
        const card = document.createElement('div');
        card.className = 'aeris-project-card';
        
        const capa = (projeto.fotos && projeto.fotos.length > 0) ? projeto.fotos[0] : 'https://placehold.co/600x600?text=AERIS';

        // TRADUÇÃO: Busca o nome legível da categoria para exibir no HTML do card
        const categoriaObjeto = todasAsCategorias.find(c => c.id === projeto.categoria);
        const nomeCategoriaExibicao = categoriaObjeto ? categoriaObjeto.nome : "Geral";

        card.innerHTML = `
            <div class="card-media-wrapper">
                <img src="${capa}" alt="${projeto.nome}" loading="lazy">
            </div>
            <span class="card-meta-tag">${nomeCategoriaExibicao} ${projeto.subcategoria ? '• ' + projeto.subcategoria : ''}</span>
            <h3 class="card-project-title">${projeto.nome}</h3>
            <div class="card-project-location">
                <i class="fa-solid fa-location-dot" style="font-size:10px;"></i> ${projeto.cidade}, ${projeto.estado}
            </div>
        `;

        card.addEventListener('click', () => {
            atualizarParametroUrl(projeto.id);
            abrirProdutoInterno(projeto);
        });

        gridProjetos.appendChild(card);
    });
}

// Injeção de Conteúdo da Vitrine Interna Simplificada
function abrirProdutoInterno(projeto) {
    const tituloEl = document.getElementById('projeto-titulo');
    const subcatEl = document.getElementById('projeto-subcategoria-tag');
    const metaEl = document.getElementById('projeto-meta');
    const descEl = document.getElementById('projeto-descricao');
    const catInternaEl = document.getElementById('projeto-categoria-interna');
    const areaEl = document.getElementById('projeto-area');
    const arqEl = document.getElementById('projeto-arquiteto');
    const matEl = document.getElementById('projeto-materiais');

    if (tituloEl) tituloEl.textContent = projeto.nome;
    if (subcatEl) subcatEl.textContent = projeto.subcategoria || projeto.categoria;
    if (metaEl) metaEl.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${projeto.cidade} — ${projeto.estado} &nbsp;•&nbsp; ${projeto.ano}`;
    if (descEl) descEl.textContent = projeto.descricao;
    
    if (catInternaEl) catInternaEl.textContent = projeto.categoria;
    if (arqEl) arqEl.textContent = projeto.arquiteto;
    if (matEl) matEl.textContent = projeto.materiais;
    
    if (areaEl) {
        areaEl.textContent = projeto.area !== "Sob consulta" && !projeto.area.includes('m²') ? `${projeto.area} m²` : projeto.area;
    }

    const heroBg = document.getElementById('projeto-hero');
    if (heroBg && projeto.fotos && projeto.fotos.length > 0) {
        heroBg.style.backgroundImage = `url('${projeto.fotos[0]}')`;
    }

    const btnWhatsapp = document.getElementById('btn-whatsapp-projeto');
    if (btnWhatsapp) {
        const numeroSuporte = "551110401040"; 
        const mensagem = `Olá AERIS, gostaria de solicitar um atendimento exclusivo referente ao item do acervo: "${projeto.nome}".`;
        btnWhatsapp.href = `https://api.whatsapp.com/send?phone=${numeroSuporte}&text=${encodeURIComponent(mensagem)}`;
    }

    const galeria = document.getElementById('projeto-galeria-container');
    if (galeria) {
        galeria.innerHTML = '';
        if (projeto.fotos && projeto.fotos.length > 0) {
            projeto.fotos.forEach(foto => {
                const img = document.createElement('img');
                img.src = foto;
                img.alt = projeto.nome;
                img.loading = 'lazy';
                galeria.appendChild(img);
            });
        }
    }

    exibirEstruturaInterna();
}

/* ==========================================================================
   SISTEMA DE URL DO SCRIPT (DEEP LINK ROUTING)
   ========================================================================== */
function atualizarParametroUrl(id) {
    const novaUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?projeto=${id}`;
    window.history.pushState({ path: novaUrl }, '', novaUrl);
}

function removerParametroUrl() {
    const urlLimpa = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.pushState({ path: urlLimpa }, '', urlLimpa);
}

function verificarParametrosUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const projetoId = urlParams.get('projeto');

    if (projetoId && todosOsProjetos.length > 0) {
        const projetoEncontrado = todosOsProjetos.find(p => p.id === projetoId);
        if (projetoEncontrado) {
            abrirProdutoInterno(projetoEncontrado);
            return;
        }
    }
    exibirEstruturaVitrine();
}

function exibirEstruturaVitrine() {
    if (!viewInterna || !viewLista) return;
    viewInterna.classList.remove('active');
    setTimeout(() => {
        viewInterna.style.display = 'none';
        viewLista.style.display = 'block';
        setTimeout(() => viewLista.classList.add('active'), 50);
    }, 300);
}

// Certifique-se de que a janela volte ao topo ao abrir um item
function exibirEstruturaInterna() {
    if (!viewInterna || !viewLista) return;
    viewLista.classList.remove('active');
    setTimeout(() => {
        viewLista.style.display = 'none';
        viewInterna.style.display = 'block';
        setTimeout(() => viewInterna.classList.add('active'), 50);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
}