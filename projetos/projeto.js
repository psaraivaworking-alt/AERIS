import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let localProductsCache = [];
let cart = JSON.parse(localStorage.getItem('aeris_cart')) || [];

document.addEventListener('DOMContentLoaded', () => {
    
    // Controles de Interface Existentes
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navWrapper = document.getElementById('nav-wrapper');
    if (hamburgerBtn && navWrapper) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('open');
            navWrapper.classList.toggle('open');
        });
    }

    const openCartBtn = document.getElementById('open-cart-btn');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartPanel = document.getElementById('cart-sidebar-panel');
    if(openCartBtn && closeCartBtn && cartPanel) {
        openCartBtn.addEventListener('click', () => cartPanel.classList.add('open'));
        closeCartBtn.addEventListener('click', () => cartPanel.classList.remove('open'));
    }

    // NOVOS ELEMENTOS DA MODAL QUICK VIEW
    const quickviewModal = document.getElementById('quickview-modal');
    const modalContent = document.querySelector('.product-modal-content');
    const closeOverlay = document.getElementById('close-modal-overlay');
    const closeModalBtn = document.getElementById('close-modal-btn');

    function fecharModal() {
        if(quickviewModal) quickviewModal.classList.remove('open');
    }
    if(closeOverlay) closeOverlay.addEventListener('click', fecharModal);
    if(closeModalBtn) closeModalBtn.addEventListener('click', fecharModal);

    // CONEXÃO FIRESTORE COM INTEGRAÇÃO DE DETALHES
    const catalogContainer = document.getElementById('dynamic-categories-container');

    onSnapshot(collection(db, "projetos"), (snapshot) => {
        if(!catalogContainer) return;
        catalogContainer.innerHTML = "";
        let rawProducts = [];

        if(snapshot.empty) {
            catalogContainer.innerHTML = `<p class="cart-empty-message">Nenhum projeto publicado no momento.</p>`;
            localProductsCache = [];
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            rawProducts.push({ id: docSnap.id, ...data });
        });

        localProductsCache = rawProducts;

        const groupedByLinha = {};
        rawProducts.forEach(product => {
            const linhaNome = product.linha ? product.linha.trim() : "Móvel Autoral";
            if (!groupedByLinha[linhaNome]) groupedByLinha[linhaNome] = [];
            groupedByLinha[linhaNome].push(product);
        });

        const sortedLinhas = Object.keys(groupedByLinha).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

        sortedLinhas.forEach(linha => {
            const productsInLinha = groupedByLinha[linha].sort((a, b) => {
                const nomeA = (a.nome || "").toLowerCase();
                const nomeB = (b.nome || "").toLowerCase();
                return nomeA.localeCompare(nomeB);
            });

            const categoryBlock = document.createElement('div');
            categoryBlock.className = 'category-block';

            const blockTitle = document.createElement('h2');
            blockTitle.className = 'category-block-title';
            blockTitle.textContent = linha;
            categoryBlock.appendChild(blockTitle);

            const projectsGrid = document.createElement('div');
            projectsGrid.className = 'projects-grid';

            productsInLinha.forEach(product => {
                const coverImage = (product.urlFotos && product.urlFotos.length > 0) ? product.urlFotos[0] : 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80';
                const priceFormatted = parseFloat(product.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                projectsGrid.innerHTML += `
                    <article class="project-item-card" data-id="${product.id}" style="cursor: pointer;">
                        <div class="project-item-image-wrapper">
                            <img src="${coverImage}" alt="${product.nome}" loading="lazy">
                        </div>
                        <span class="project-item-meta">${product.categoria || 'Geral'}</span>
                        <h3 class="project-item-title">${product.nome}</h3>
                        <p class="project-item-description">${product.descricao || ''}</p>
                        <div class="project-item-footer">
                            <span class="project-item-price">${priceFormatted}</span>
                            <button class="btn-add-cart" data-id="${product.id}">Adicionar ao Acervo</button>
                        </div>
                    </article>
                `;
            });

            categoryBlock.appendChild(projectsGrid);
            catalogContainer.appendChild(categoryBlock);
        });

        // Aplica os cliques inteligentes nos cards e botões
        bindCardAndCartEvents();
    });

    // EVENTOS DE CLIQUE INTELIGENTES (CARD OU COMPRA DIRETA)
    function bindCardAndCartEvents() {
        // 1. Clique no card abre a Modal detalhada
        document.querySelectorAll('.project-item-card').forEach(card => {
            card.onclick = (e) => {
                // Se o clique foi especificamente no botão de adicionar ao carrinho, não abre a modal
                if(e.target.classList.contains('btn-add-cart')) return;

                const targetId = card.dataset.id;
                const product = localProductsCache.find(p => p.id === targetId);

                if(product && quickviewModal && modalContent) {
                    const coverImage = (product.urlFotos && product.urlFotos.length > 0) ? product.urlFotos[0] : 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80';
                    const priceFormatted = parseFloat(product.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                    // Injeta a estrutura refinada de duas colunas na modal
                    modalContent.innerHTML = `
                        <div class="modal-image-wrapper">
                            <img src="${coverImage}" alt="${product.nome}">
                        </div>
                        <div class="modal-info-side">
                            <span class="modal-meta">${product.linha || 'Móvel Autoral'} &bull; ${product.categoria || 'Geral'}</span>
                            <h2 class="modal-title">${product.nome}</h2>
                            <p class="modal-description">${product.descricao || 'Nenhuma descrição detalhada informada.'}</p>
                            <div class="modal-price">${priceFormatted}</div>
                            <button class="btn-luxury-checkout btn-modal-buy" data-id="${product.id}">Adicionar ao Acervo</button>
                        </div>
                    `;

                    // Exibe a modal adicionando a classe open
                    quickviewModal.classList.add('open');

                    // Aplica listener no botão de compra de dentro da modal
                    document.querySelector('.btn-modal-buy').onclick = (event) => {
                        colocarNoCarrinho(event.target.dataset.id);
                        fecharModal();
                    };
                }
            };
        });

        // 2. Clique direto no botão "Adicionar ao Acervo" do Grid principal
        document.querySelectorAll('.btn-add-cart').forEach(button => {
            button.onclick = (e) => {
                e.stopPropagation(); // Evita ativar o clique do card por acidente
                colocarNoCarrinho(e.target.dataset.id);
            };
        });
    }

    // LOGICA AUXILIAR REUTILIZÁVEL PARA ADICIONAR ITEM AO CARRINHO
    function colocarNoCarrinho(id) {
        const selectedItem = localProductsCache.find(p => p.id === id);
        if(selectedItem) {
            cart.push({
                id: selectedItem.id,
                nome: selectedItem.nome,
                preco: selectedItem.preco,
                categoria: selectedItem.categoria,
                imagem: (selectedItem.urlFotos && selectedItem.urlFotos.length > 0) ? selectedItem.urlFotos[0] : ''
            });
            updateCartUI();
            if(cartPanel) cartPanel.classList.add('open');
        }
    }

    window.removeFromCart = function(index) {
        cart.splice(index, 1);
        updateCartUI();
    };

    function updateCartUI() {
        localStorage.setItem('aeris_cart', JSON.stringify(cart));
        const counter = document.getElementById('cart-counter-global');
        if(counter) counter.textContent = cart.length;

        const itemsWrapper = document.getElementById('cart-items-wrapper');
        const totalValueEl = document.getElementById('cart-total-value');
        if(!itemsWrapper) return;
        itemsWrapper.innerHTML = "";

        if(cart.length === 0) {
            itemsWrapper.innerHTML = `<p class="cart-empty-message">Seu acervo de intenções está vazio.</p>`;
            if(totalValueEl) totalValueEl.textContent = "R$ 0,00";
            return;
        }

        let total = 0;
        cart.forEach((item, index) => {
            const currentPrice = parseFloat(item.preco) || 0;
            total += currentPrice;
            const formattedPrice = currentPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            itemsWrapper.innerHTML += `
                <div class="cart-item">
                    <img src="${item.imagem || 'https://placehold.co/100'}" class="cart-item-img" alt="${item.nome}">
                    <div class="cart-item-details">
                        <h4 class="cart-item-title">${item.nome}</h4>
                        <span class="cart-item-price">${formattedPrice}</span>
                    </div>
                    <button class="btn-remove-item" onclick="removeFromCart(${index})">Remover</button>
                </div>
            `;
        });

        if(totalValueEl) {
            totalValueEl.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
    }

    // WhatsApp Checkout
    const checkoutBtn = document.getElementById('checkout-whatsapp-btn');
    if(checkoutBtn) {
        checkoutBtn.onclick = () => {
            if(cart.length === 0) return;
            let message = `Olá AERIS, gostaria de iniciar um atendimento exclusivo e solicitar o orçamento para os seguintes projetos autorais:\n\n`;
            
            cart.forEach((item, index) => {
                const itemVal = (parseFloat(item.preco) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                message += `${index + 1}. *${item.nome}* (${item.categoria || 'Geral'})\n   Valor: ${itemVal}\n\n`;
            });

            let totalSum = cart.reduce((acc, curr) => acc + (parseFloat(curr.preco) || 0), 0);
            message += `*Total Estimado:* ${totalSum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n\n`;
            message += `Fico no aguardo para alinhar as especificações técnicas de marcenaria.`;

            const cleanPhone = "5591984794214";
            const encodedText = encodeURIComponent(message);
            
            cart = [];
            updateCartUI();
            if(cartPanel) cartPanel.classList.remove('open');
            window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
        };
    }

    updateCartUI();
});