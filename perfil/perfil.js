// ==========================================================================
// 1. IMPORTAÇÃO FIREBASE
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    deleteUser,
    EmailAuthProvider,
    reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================================================
// 2. CONFIG FIREBASE
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyACpXbLGy6bA2MGGPvItUGY_Izi0jgO5wQ",
    authDomain: "aeris-c56b8.firebaseapp.com",
    projectId: "aeris-c56b8",
    storageBucket: "aeris-c56b8.firebasestorage.app",
    messagingSenderId: "23240473122",
    appId: "1:23240473122:web:c353570a1aa2061d03687b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================================================
// 3. DOM READY
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {

    const logoutBtns = document.querySelectorAll('.btn-logout');

    const userName = document.getElementById('user-display-name');
    const userCpf = document.getElementById('user-display-cpf');

    const updateForm = document.getElementById('update-profile-form');

    const updateName = document.getElementById('update-name');
    const updateEmail = document.getElementById('update-email');
    const updatePhone = document.getElementById('update-phone');
    const updateCep = document.getElementById('update-cep');
    const updateLogradouro = document.getElementById('update-logradouro');
    const updateNumber = document.getElementById('update-number');
    const updateBairro = document.getElementById('update-bairro');
    const updateCidade = document.getElementById('update-cidade');
    const updateUf = document.getElementById('update-uf');

    const activeOrderContainer = document.getElementById('active-order-container');
    const historyTableBody = document.getElementById('history-table-body');

    let currentUserData = null;

    // ======================================================================
    // TABS
    // ======================================================================
    const menuItems = document.querySelectorAll('.profile-menu-item');
    const tabContents = document.querySelectorAll('.profile-tab-content');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {

            if (!item.dataset.tab) return;

            menuItems.forEach(i => i.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));

            item.classList.add('active');

            const target = document.getElementById(item.dataset.tab);
            if (target) target.classList.add('active');
        });
    });

    // ======================================================================
    // MÁSCARAS
    // ======================================================================
    if (updatePhone) {
        updatePhone.addEventListener('input', e => {
            let v = e.target.value.replace(/\D/g, '');
            v = v.replace(/^(\d{2})(\d)/, '($1) $2');
            v = v.replace(/(\d{5})(\d{4})$/, '$1-$2');
            e.target.value = v.substring(0, 15);
        });
    }

    if (updateCep) {

        updateCep.addEventListener('input', e => {
            let v = e.target.value.replace(/\D/g, '');
            v = v.replace(/^(\d{5})(\d)/, '$1-$2');
            e.target.value = v.substring(0, 9);
        });

        updateCep.addEventListener('blur', async () => {

            const cep = updateCep.value.replace(/\D/g,'');

            if (cep.length !== 8) return;

            try {

                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();

                if (!data.erro) {

                    updateLogradouro.value = data.logradouro || "";
                    updateBairro.value = data.bairro || "";
                    updateCidade.value = data.localidade || "";
                    updateUf.value = data.uf || "";

                    updateNumber.focus();
                }

            } catch(err) {
                console.error(err);
            }
        });
    }

    // ======================================================================
    // AUTH STATE
    // ======================================================================
    onAuthStateChanged(auth, async (user) => {

        if (!user) {
            window.location.href = "/index.html";
            return;
        }

        try {

            const userRef = doc(db, "usuarios", user.uid);
            const snap = await getDoc(userRef);

            if (!snap.exists()) {
                showToast("Conta não localizada.", "error");
                return;
            }

            currentUserData = snap.data();

            userName.textContent = currentUserData.nome || "Parceiro";
            userCpf.textContent = "CPF: " + (currentUserData.cpf || "Não cadastrado");

            if (updateName) updateName.value = currentUserData.nome || "";
            if (updateEmail) updateEmail.value = currentUserData.email || "";
            if (updatePhone) updatePhone.value = currentUserData.telefone || "";

            if (updateCep) updateCep.value = currentUserData.endereco?.cep || "";
            if (updateLogradouro) updateLogradouro.value = currentUserData.endereco?.logradouro || "";
            if (updateNumber) updateNumber.value = currentUserData.endereco?.numero || "";
            if (updateBairro) updateBairro.value = currentUserData.endereco?.bairro || "";
            if (updateCidade) updateCidade.value = currentUserData.endereco?.cidade || "";
            if (updateUf) updateUf.value = currentUserData.endereco?.uf || "";

            // Chamando as funções de carregamento passando o email do Auth
            await carregarPedidoAtual(user.email);
            await carregarHistoricoDePedidos(user.email);

        } catch(error) {
            console.error(error);
            showToast("Erro ao carregar perfil.", "error");
        }
    });

    // ======================================================================
    // MOTOR DE RASTREAMENTO: PEDIDO ATUAL (PIPELINE AERIS)
    // ======================================================================
    async function carregarPedidoAtual(userEmail) {
        if (!activeOrderContainer) return;

        try {
            const q = query(
                collection(db, "pedidos"), 
                where("clientEmail", "==", userEmail), 
                where("status", "!=", "Finalizado")
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                activeOrderContainer.innerHTML = `<p style="font-size:14px; color:rgba(44,34,30,0.5); padding: 20px 0;">Nenhum projeto ativo em linha de produção.</p>`;
                return;
            }

            const pedidoDoc = querySnapshot.docs[0];
            const pedido = pedidoDoc.data();
            const etapas = ["Fabricação", "Manutenção", "Acabamento", "Entrega", "Finalizado"];
            
            let timelineHTML = '';
            
            etapas.forEach(etapa => {
                let classeEtapa = '';
                
                if (pedido.status === etapa) {
                    classeEtapa = 'active';
                } else if (etapas.indexOf(etapa) < etapas.indexOf(pedido.status)) {
                    classeEtapa = 'completed';
                }

                const dataEtapa = pedido.datasEtapas && pedido.datasEtapas[etapa] ? pedido.datasEtapas[etapa] : "Aguardando";

                timelineHTML += `
                    <div class="timeline-step ${classeEtapa}">
                        <div class="timeline-dot">•</div>
                        <div class="timeline-label">${etapa}</div>
                        <span class="timeline-date">${dataEtapa}</span>
                    </div>
                `;
            });

            activeOrderContainer.innerHTML = `
                <div class="order-tracking-card">
                    <div class="order-info-header">
                        <div>
                            <span style="font-size:10px; text-transform:uppercase; color:var(--color-moss);">ID do Pedido</span>
                            <h4 style="font-family:var(--font-serif); font-size:18px; font-weight:400; color:var(--color-deep);">#${pedidoDoc.id.substring(0,8).toUpperCase()}</h4>
                        </div>
                        <div style="text-align:right;">
                            <span style="font-size:10px; text-transform:uppercase; color:var(--color-moss);">Especificação Técnica</span>
                            <p style="font-size:13px; color:var(--color-deep);">${pedido.descricao || 'Insumos Aeris'}</p>
                        </div>
                    </div>
                    <div class="timeline">
                        ${timelineHTML}
                    </div>
                </div>
            `;

        } catch (error) {
            console.error("Erro ao renderizar tracking:", error);
            activeOrderContainer.innerHTML = `<p style="color:#9A4444;">Erro ao mapear linha de fabricação.</p>`;
        }
    }

    // ======================================================================
    // MOTOR DE RASTREAMENTO: HISTÓRICO DE PEDIDOS (CONCLUÍDOS)
    // ======================================================================
    async function carregarHistoricoDePedidos(userEmail) {
        if (!historyTableBody) return;

        try {
            const q = query(
                collection(db, "pedidos"), 
                where("clientEmail", "==", userEmail), 
                where("status", "==", "Finalizado")
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                historyTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:rgba(44,34,30,0.5); padding: 20px 0;">Nenhum projeto concluído no histórico.</td></tr>`;
                return;
            }

            historyTableBody.innerHTML = '';
            
            querySnapshot.forEach(docSnap => {
                const p = docSnap.data();
                const dataFinal = p.datasEtapas && p.datasEtapas["Finalizado"] ? p.datasEtapas["Finalizado"] : "Concluído";
                
                historyTableBody.innerHTML += `
                    <tr>
                        <td style="font-family: monospace; font-weight:700;">#${docSnap.id.substring(0,8).toUpperCase()}</td>
                        <td>${dataFinal}</td>
                        <td>${p.descricao || 'Especificação Premium Aeris'}</td>
                        <td><a href="#" style="color:var(--color-moss); text-decoration:none; font-weight:500;">Laudo Técnico</a></td>
                    </tr>
                `;
            });

        } catch (error) {
            console.error("Erro ao processar histórico:", error);
            historyTableBody.innerHTML = `<tr><td colspan="4" style="color:#9A4444; text-align:center;">Erro ao mapear histórico de dados.</td></tr>`;
        }
    }

    // ======================================================================
    // UPDATE PERFIL
    // ======================================================================
    if (updateForm) {

        updateForm.addEventListener('submit', async (e) => {

            e.preventDefault();

            const user = auth.currentUser;

            try {

                await updateDoc(doc(db,"usuarios",user.uid),{

                    telefone: updatePhone.value,

                    endereco: {
                        cep: updateCep.value,
                        logradouro: updateLogradouro.value,
                        numero: updateNumber.value,
                        bairro: updateBairro.value,
                        cidade: updateCidade.value,
                        uf: updateUf.value
                    }
                });

                showToast("Dados atualizados com sucesso.","success");

            } catch(error){

                console.error(error);
                showToast("Erro ao salvar.","error");
            }
        });
    }

    // ======================================================================
    // LOGOUT
    // ======================================================================
    logoutBtns.forEach(btn => {

        btn.addEventListener('click', async () => {

            try {

                await signOut(auth);
                window.location.href="/index.html";

            } catch(error){

                console.error(error);
            }
        });
    });

    // ======================================================================
    // DELETE MODAL
    // ======================================================================
    const deleteModal = document.getElementById('delete-confirm-modal');
    const openDeleteBtn = document.getElementById('btn-start-delete');
    const closeDeleteBtn = document.getElementById('close-delete-modal');

    const deleteStep1 = document.getElementById('delete-step-1');
    const deleteStep2 = document.getElementById('delete-step-2');

    const confirmStep1Btn = document.getElementById('btn-confirm-delete-step1');
    const deleteFeedback = document.getElementById('delete-modal-feedback');

    if(openDeleteBtn){

        openDeleteBtn.addEventListener('click',()=>{

            deleteModal.classList.add('active');
        });
    }

    if(closeDeleteBtn){

        closeDeleteBtn.addEventListener('click',()=>{

            deleteModal.classList.remove('active');

            deleteStep1.style.display="block";
            deleteStep2.style.display="none";
        });
    }

    if(confirmStep1Btn){

        confirmStep1Btn.addEventListener('click',()=>{

            deleteStep1.style.display="none";
            deleteStep2.style.display="flex";
        });
    }

    // ======================================================================
    // DELETE ACCOUNT
    // ======================================================================
    if(deleteStep2){

        deleteStep2.addEventListener('submit', async(e)=>{

            e.preventDefault();

            const user = auth.currentUser;
            const password = document.getElementById('delete-password-confirm').value;

            try {

                const credential =
                    EmailAuthProvider.credential(
                        user.email,
                        password
                    );

                // Executa a reautenticação de segurança necessária pelo Firebase
                await reauthenticateWithCredential(user, credential);

                // Importante: Lembre-se de atualizar a regra "allow delete" no console do Firebase!
                await deleteDoc(doc(db,"usuarios",user.uid));
                await deleteUser(user);

                showToast("Conta removida.","success");

                setTimeout(()=>{
                    window.location.href="/index.html";
                },1200);

            } catch(error){

                console.error(error);

                deleteFeedback.textContent =
                    "Senha incorreta ou sessão expirada.";
            }
        });
    }

});

// ==========================================================================
// 4. TOAST
// ==========================================================================
function showToast(message,type='success'){

    const container =
        document.getElementById('global-toast-container');

    if(!container) return;

    const toast = document.createElement('div');

    toast.className = `toast ${type}`;
    toast.innerText = message;

    container.appendChild(toast);

    setTimeout(()=>{
        toast.classList.add('show');
    },50);

    setTimeout(()=>{
        toast.classList.remove('show');

        setTimeout(()=>{
            toast.remove();
        },400);

    },4000);
}

