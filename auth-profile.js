// ==========================================================================
// 1. IMPORTAÇÃO DOS MÓDULOS OFICIAIS DO FIREBASE (Via CDN)
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================================================
// 2. CONFIGURAÇÃO DO SEU FIREBASE
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyACpXbLGy6bA2MGGPvItUGY_Izi0jgO5wQ",
    authDomain: "aeris-c56b8.firebaseapp.com",
    projectId: "aeris-c56b8",
    storageBucket: "aeris-c56b8.firebasestorage.app",
    messagingSenderId: "23240473122",
    appId: "1:23240473122:web:c353570a1aa2061d03687b",
    measurementId: "G-1C9ZGQ19M1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================================================
// 3. FUNÇÕES DE VALIDAÇÃO MATEMÁTICA
// ==========================================================================
function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    let cpfs = cpf.split('').map(el => +el);
    const rest = (count) => (cpfs.slice(0, count-12).reduce((soma, el, i) => soma + el * (count - i), 0) * 10) % 11 % 10;
    return rest(10) === cpfs[9] && rest(11) === cpfs[10];
}

// ==========================================================================
// 4. INICIALIZAÇÃO ÚNICA DO DOM (Garante estabilidade na execução)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // === 4.1. Slider de Imagens Cinematográficas ===
    let currentSlideIdx = 0;
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.dot');
    const slideInterval = 6500;
    let sliderTimer;

    function switchSlide(index) {
        if(!slides.length || !dots.length) return;
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

    if(slides.length > 0 && dots.length > 0) {
        sliderTimer = setInterval(autoPlaySlides, slideInterval);
        dots.forEach((dot, idx) => {
            dot.addEventListener('click', () => {
                clearInterval(sliderTimer);
                switchSlide(idx);
                sliderTimer = setInterval(autoPlaySlides, slideInterval);
            });
        });
    }

    // === 4.2. Transformação da Navbar ao Scroll ===
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

    // === 4.3. Menu Hambúrguer Mobile ===
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navWrapper = document.getElementById('nav-wrapper');
    const navLinks = document.querySelectorAll('.nav-link');

    if (hamburgerBtn && navWrapper) {
        function toggleMenu() {
            hamburgerBtn.classList.toggle('open');
            navWrapper.classList.toggle('open');
        }
        hamburgerBtn.addEventListener('click', toggleMenu);
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (navWrapper.classList.contains('open')) toggleMenu();
            });
        });
    }

    // === 4.4. Sistema de Janela Modal (Geral) ===
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
        if(e) e.preventDefault();
        if (loginForm && registerForm) {
            loginForm.classList.remove('active');
            registerForm.classList.add('active');
            if (modalTitle) modalTitle.textContent = "Solicitar Chave de Acesso";
            if (modalSubtitle) modalSubtitle.textContent = "Preencha os dados do seu estúdio ou CPF para avaliação.";
        }
    }

    function showLogin(e) {
        if(e) e.preventDefault();
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


    // === 4.5. Aplicação das Máscaras Dinâmicas e Eventos Input ===
    const cpfInput = document.getElementById('register-cpf');
    const phoneInput = document.getElementById('register-phone');
    const cepInput = document.getElementById('register-cep');

    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, ""); 
            v = v.replace(/(\d{3})(\d)/, "$1.$2");
            v = v.replace(/(\d{3})(\d)/, "$1.$2");
            v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
            e.target.value = v.substring(0, 14);
        });
    }

    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, "");
            v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
            v = v.replace(/(\d{5})(\d{4})$/, "$1-$2"); 
            e.target.value = v.substring(0, 15);
        });
    }

    if (cepInput) {
        cepInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, "");
            v = v.replace(/^(\d{5})(\d)/, "$1-$2");
            e.target.value = v.substring(0, 9);
        });

        // Evento de busca automática por CEP (ViaCEP) ao sair do campo
        cepInput.addEventListener('blur', async () => {
            const cep = cepInput.value.replace(/\D/g, "");
            if (cep.length === 8) {
                try {
                    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    const data = await response.json();
                    
                    if (!data.erro) {
                        if (document.getElementById('register-logradouro')) document.getElementById('register-logradouro').value = data.logradouro || "";
                        if (document.getElementById('register-bairro')) document.getElementById('register-bairro').value = data.bairro || "";
                        if (document.getElementById('register-cidade')) document.getElementById('register-cidade').value = data.localidade || "";
                        if (document.getElementById('register-uf')) document.getElementById('register-uf').value = data.uf || "";
                        
                        const numInput = document.getElementById('register-number');
                        if (numInput) numInput.focus();
                    } else {
                        showFormFeedback(registerForm, "CEP não encontrado no registro nacional.", "error");
                    }
                } catch (err) {
                    console.error("Erro na busca do CEP:", err);
                }
            }
        });
    }

    // === 4.6. Integração Firebase: Evento Submit Cadastro ===
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nome = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const telefone = document.getElementById('register-phone').value;
            const cpf = document.getElementById('register-cpf').value;
            const cep = document.getElementById('register-cep').value;
            const logradouro = document.getElementById('register-logradouro')?.value || "";
            const numero = document.getElementById('register-number')?.value || "";
            const bairro = document.getElementById('register-bairro')?.value || "";
            const city = document.getElementById('register-cidade')?.value || "";
            const uf = document.getElementById('register-uf')?.value || "";

            // Execução e validação real do CPF via feedback inline
            if (!validarCPF(cpf)) {
                showFormFeedback(registerForm, "O CPF informado é inválido. Digite um documento real.", "error");
                document.getElementById('register-cpf').focus();
                return;
            }

            try {
                // Criação do usuário no Firebase Auth
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Armazenamento estruturado no Firestore
                await setDoc(doc(db, "usuarios", user.uid), {
                    nome: nome,
                    email: email,
                    telefone: telefone,
                    cpf: cpf,
                    endereco: { 
                        cep: cep, 
                        logradouro: logradouro,
                        numero: numero,
                        bairro: bairro,
                        cidade: city,
                        uf: uf 
                    },
                    isAdmin: false,
                    createdAt: new Date()
                });

                showFormFeedback(registerForm, "Conta de parceiro cadastrada com sucesso!", "success");
                
                setTimeout(() => {
                    closeModal();
                    window.location.href = "/perfil/index.html"; 
                }, 1500);

            } catch (error) {
                console.error("Erro ao registrar no Firebase:", error);
                showFormFeedback(registerForm, `Erro ao registrar: ${error.message}`, "error");
            }
        });
    }

    // === 4.7. Integração Firebase: Evento Submit Login ===
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                await signInWithEmailAndPassword(auth, email, password);
                showFormFeedback(loginForm, "Autenticação autorizada. Redirecionando...", "success");
                
                setTimeout(() => {
                    closeModal();
                    window.location.href = "/perfil/index.html"; 
                }, 1500);

            } catch (error) {
                console.error("Erro no login:", error);
                showFormFeedback(loginForm, "Credenciais inválidas ou conta inexistente.", "error");
            }
        });
    }

    // === 4.8. Recuperação de Senha ===
    const esqueciSenhaBtn = document.getElementById('btn-esqueci-senha');
    if (esqueciSenhaBtn) {
        esqueciSenhaBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('login-email').value;

            if (!emailInput) {
                showFormFeedback(loginForm, "Digite seu e-mail corporativo no campo de login primeiro.", "error");
                document.getElementById('login-email').focus();
                return;
            }

            try {
                await sendPasswordResetEmail(auth, emailInput);
                showFormFeedback(loginForm, `Link de redefinição enviado para: ${emailInput}`, "success");
            } catch (error) {
                console.error("Erro ao recuperar senha:", error);
                showFormFeedback(loginForm, `Erro ao solicitar link: ${error.message}`, "error");
            }
        });
    }

    // === 4.9. Intersection Observer para Animações ===
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
// 5. MONITOR STATE (Fora do DOMContentLoaded - Escuta global da sessão)
// ==========================================================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Fluxo de persistência de sessão caso necessário
    }
});

// ==========================================================================
// 6. SISTEMA DE FEEDBACK INLINE (Função Global utilitária)
// ==========================================================================
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