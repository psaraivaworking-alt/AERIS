document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================================================
    // 1. SLIDER DE IMAGENS CINEMATOGRÁFICAS
    // ==========================================================================
    let currentSlideIdx = 0;
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.dot');
    const slideInterval = 6500;
    let sliderTimer;

    function switchSlide(index) {
        if (!slides.length || !dots.length) return;
        slides[currentSlideIdx].classList.remove('active');
        dots[currentSlideIdx].classList.remove('active');
        currentSlideIdx = index;
        slides[currentSlideIdx].classList.add('active');
        dots[currentSlideIdx].classList.add('active');
    }

    function autoPlaySlides() {
        let nextIdx = (currentSlideIdx + 1) % slides.length;
        switchSlide(nextIdx);
    }

    if (slides.length > 0) {
        sliderTimer = setInterval(autoPlaySlides, slideInterval);
        dots.forEach((dot, idx) => {
            dot.addEventListener('click', () => {
                clearInterval(sliderTimer);
                switchSlide(idx);
                sliderTimer = setInterval(autoPlaySlides, slideInterval);
            });
        });
    }

    // ==========================================================================
    // 2. TRANSFORMAÇÃO DA NAVBAR AO SCROLL
    // ==========================================================================
    const headerEl = document.getElementById('dynamic-header');
    if (headerEl) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 60) {
                headerEl.classList.add('scrolled');
            } else {
                headerEl.classList.remove('scrolled');
            }
        });
    }

    // ==========================================================================
    // 3. MENU HAMBÚRGUER MOBILE (CORRIGIDO E OTIMIZADO)
    // ==========================================================================
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navWrapper = document.getElementById('nav-wrapper'); // Captura precisa via ID
    const navLinks = document.querySelectorAll('.nav-link');

    if (hamburgerBtn && navWrapper) {
        function toggleMenu(e) {
            if (e) e.stopPropagation(); // Previne propagação indesejada no documento
            hamburgerBtn.classList.toggle('open');
            navWrapper.classList.toggle('open');
        }

        function forceCloseMenu() {
            hamburgerBtn.classList.remove('open');
            navWrapper.classList.remove('open');
        }

        // Evento de clique para abrir/fechar
        hamburgerBtn.addEventListener('click', toggleMenu);

        // Fecha a gaveta automaticamente ao clicar em qualquer link interno
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (navWrapper.classList.contains('open')) forceCloseMenu();
            });
        });

        // Fecha o menu se o usuário clicar em qualquer área vazia fora dele
        document.addEventListener('click', (e) => {
            const isClickInsideMenu = navWrapper.contains(e.target);
            const isClickOnHamburger = hamburgerBtn.contains(e.target);
            
            if (navWrapper.classList.contains('open') && !isClickInsideMenu && !isClickOnHamburger) {
                forceCloseMenu();
            }
        });
    }

    // ==========================================================================
    // 4. SISTEMA CLEAN DE JANELA MODAL (AUTH)
    // ==========================================================================
    const profileTrigger = document.getElementById('profile-trigger');
    const authModal = document.getElementById('auth-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const bodyEl = document.body;

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');
    const modalTitle = document.getElementById('auth-modal-title');
    const modalSubtitle = document.getElementById('auth-modal-subtitle');

    function openModal(e) {
        e.preventDefault();
        if (authModal) {
            authModal.classList.add('active');
            bodyEl.classList.add('modal-open');
            showLogin();
        }
    }

    function closeModal() {
        if (authModal) {
            authModal.classList.remove('active');
            bodyEl.classList.remove('modal-open');
        }
    }

    function showRegister(e) {
        if (e) e.preventDefault();
        if (loginForm && registerForm) {
            loginForm.classList.remove('active');
            registerForm.classList.add('active');
            if (modalTitle) modalTitle.textContent = "Solicitar Chave";
            if (modalSubtitle) modalSubtitle.textContent = "Cadastre seu e-mail profissional para receber acesso ao acervo restrito.";
        }
    }

    function showLogin(e) {
        if (e) e.preventDefault();
        if (loginForm && registerForm) {
            registerForm.classList.remove('active');
            loginForm.classList.add('active');
            if (modalTitle) modalTitle.textContent = "Acessar Estúdio Privado";
            if (modalSubtitle) modalSubtitle.textContent = "Insira suas credenciais de parceiro ou arquiteto exclusivo.";
        }
    }

    if (profileTrigger) profileTrigger.addEventListener('click', openModal);
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) closeModal();
        });
    }

    if (switchToRegister) switchToRegister.addEventListener('click', showRegister);
    if (switchToLogin) switchToLogin.addEventListener('click', showLogin);

    // ==========================================================================
    // 5. INTERSECTION OBSERVER PARA ANIMAÇÕES (REVEAL)
    // ==========================================================================
    const revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length > 0) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05, rootMargin: "0px 0px -10px 0px" });
        
        revealElements.forEach(el => revealObserver.observe(el));
    } else {
        document.querySelectorAll('.reveal').forEach(el => el.classList.add('active'));
    }
});

// ==========================================================================
// FUNÇÕES AUXILIARES GLOBAIS
// ==========================================================================
/**
 * Exibe o feedback discretamente abaixo do formulário ativo
 * @param {HTMLElement} formElement - O formulário pai contendo a div de feedback
 * @param {string} message - A mensagem textual ou HTML a ser exibida
 * @param {string} type - Tipo de estilização ('success' ou 'error')
 */
function showFormFeedback(formElement, message, type = 'success') {
    if (!formElement) return;

    const feedbackEl = formElement.querySelector('.form-feedback');
    if (!feedbackEl) return;

    feedbackEl.innerHTML = message;
    feedbackEl.className = `form-feedback ${type} show`;

    setTimeout(() => {
        feedbackEl.classList.remove('show');
    }, 5000);
}