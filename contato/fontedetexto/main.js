import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, doc, collection, addDoc, updateDoc, deleteDoc, onSnapshot, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const URL_WEB_APP_DRIVE = "https://script.google.com/macros/s/AKfycbysrEYojuSy2-che0TrDVuxWXd_YM_SFAASnsgsFTi6W9UzCNIwNHbNP9J2GfrL5zc9/exec";

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

// FUNÇÃO TOAST OPERACIONAL NATIVA PARA SANAR OS ERROS DO CONSOLE
function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.style = "position: fixed; bottom: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 10px;";
        document.body.appendChild(container);
    }
    
    const toast = document.createElement("div");
    const bgColor = type === "error" ? "#d9534f" : "#6f42c1";
    toast.style = `background: ${bgColor}; color: #fff; padding: 12px 24px; border-radius: 8px; font-family: sans-serif; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); opacity: 0; transition: opacity 0.3s ease;`;
    toast.textContent = message;
    
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "1"; }, 10);
    
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => { toast.remove(); }, 300);
    }, 3500);
}

document.addEventListener('DOMContentLoaded', () => {

    const menuItems = document.querySelectorAll('.sidebar-item');
    const tabContents = document.querySelectorAll('.admin-tab-content');
    const overlay = document.getElementById('admin-auth-overlay');
    const authForm = document.getElementById('auth-form');
    const groupNome = document.getElementById('group-nome');
    const authSubtitle = document.getElementById('auth-subtitle');
    const btnSubmitAuth = document.getElementById('btn-submit-auth');
    const switchAction = document.getElementById('switch-action');
    const switchText = document.getElementById('switch-text');

    const formPedido = document.getElementById('form-add-pedido');
    const tablePedidosBody = document.getElementById('table-admin-pedidos');
    const metricPedidosAtivos = document.getElementById('metric-pedidos-ativos');

    const formProjeto = document.getElementById('form-add-projeto');
    const projFile = document.getElementById('proj-file');
    const containerProdutos = document.getElementById('container-admin-produtos');
    const imgPreviewContainer = document.getElementById('img-preview-container');
    const opcoesFotosEdicao = document.getElementById('opcoes-fotos-edicao');
    
    const metricTotalProdutos = document.getElementById('metric-total-produtos');
    const metricTotalUsuarios = document.getElementById('metric-total-usuarios');
    const tableUsuariosBody = document.getElementById('table-admin-usuarios');
    const logoutBtn = document.getElementById('admin-logout-btn');

    let modoLogin = true; 
    let listaFotosBase64 = []; 
    let fotosSalvasExistentes = []; 
    let escutasAtivas = false;
    let listaMembrosCache = [];

    // Força o input a aceitar múltiplos arquivos nativamente
    if (projFile) projFile.setAttribute('multiple', 'true');

    // LOGOUT
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                showToast("Sessão encerrada.", "success");
                window.location.reload();
            });
        });
    }

    // ALTERNAR LOGIN/CADASTRO
    if (switchAction) {
        switchAction.addEventListener('click', () => {
            modoLogin = !modoLogin;
            if (!modoLogin) {
                if(groupNome) groupNome.style.display = 'flex';
                const userNomeInput = document.getElementById('user-nome');
                if(userNomeInput) userNomeInput.required = true;
                if(authSubtitle) authSubtitle.textContent = 'Crie sua conta administrativa';
                if(btnSubmitAuth) btnSubmitAuth.textContent = 'Solicitar Acesso';
                if(switchText) switchText.textContent = 'Já tem cadastro?';
                switchAction.textContent = 'Fazer Login';
            } else {
                if(groupNome) groupNome.style.display = 'none';
                const userNomeInput = document.getElementById('user-nome');
                if(userNomeInput) userNomeInput.required = false;
                if(authSubtitle) authSubtitle.textContent = 'Faça login para acessar o painel';
                if(btnSubmitAuth) btnSubmitAuth.textContent = 'Entrar no Sistema';
                if(switchText) switchText.textContent = 'Não tem uma conta?';
                switchAction.textContent = 'Cadastre-se';
            }
        });
    }

    // MONITOR DE SESSÃO
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            if(overlay) overlay.style.display = 'flex';
            return;
        }
        try {
            const userRef = doc(db, "usuarios", user.uid);
            const snap = await getDoc(userRef);
            if (snap.exists() && snap.data().what === true) {
                if(overlay) overlay.style.display = 'none';
                if (!escutasAtivas) {
                    inicializarEscutasRealTime();
                    escutasAtivas = true;
                }
            } else {
                showToast("Acesso pendente de liberação administrativa.", "error");
                signOut(auth);
                if(overlay) overlay.style.display = 'flex';
            }
        } catch (err) {
            signOut(auth);
            if(overlay) overlay.style.display = 'flex';
        }
    });

    // AUTENTICAÇÃO
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('user-email');
            const passInput = document.getElementById('user-password');
            const email = emailInput ? emailInput.value.trim() : '';
            const pass = passInput ? passInput.value.trim() : '';
            
            if(btnSubmitAuth) {
                btnSubmitAuth.disabled = true;
                btnSubmitAuth.textContent = 'Aguarde...';
            }

            try {
                if (!modoLogin) {
                    const nomeInput = document.getElementById('user-nome');
                    const nome = nomeInput ? nomeInput.value.trim() : '';
                    const creds = await createUserWithEmailAndPassword(auth, email, pass);
                    await setDoc(doc(db, "usuarios", creds.user.uid), {
                        nome: nome, email: email, what: false, criadoEm: new Date()
                    });
                    showToast("Solicitação enviada com sucesso!", "success");
                    authForm.reset();
                    if (switchAction) switchAction.click(); 
                } else {
                    await signInWithEmailAndPassword(auth, email, pass);
                    showToast("Autenticado com sucesso!", "success");
                }
            } catch (err) {
                console.error(err);
                showToast("Erro na credencial. Verifique os dados digitados.", "error");
            } finally {
                if(btnSubmitAuth) {
                    btnSubmitAuth.disabled = false;
                    btnSubmitAuth.textContent = modoLogin ? 'Entrar no Sistema' : 'Solicitar Acesso';
                }
            }
        });
    }

    // NAVEGAÇÃO SPA
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));
            item.classList.add('active');
            const targetTab = document.getElementById(item.dataset.tab);
            if(targetTab) targetTab.classList.add('active');
        });
    });

    function inicializarEscutasRealTime() {
        
        // 1. CONTROLE DE USUÁRIOS GERAL (EXIBE ABSOLUTAMENTE TODOS OS USUÁRIOS)
        onSnapshot(collection(db, "usuarios"), (snapshot) => {
            if(tableUsuariosBody) tableUsuariosBody.innerHTML = '';
            listaMembrosCache = [];
            
            snapshot.forEach(docSnap => {
                const u = docSnap.data();
                listaMembrosCache.push({ id: docSnap.id, ...u });
            });

            listaMembrosCache.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
            if(metricTotalUsuarios) metricTotalUsuarios.textContent = listaMembrosCache.length;

            listaMembrosCache.forEach(u => {
                if(!tableUsuariosBody) return;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${u.nome || 'Usuário sem Nome'}</strong></td>
                    <td>${u.email}</td>
                    <td><span class="badge ${u.what ? 'badge-success' : 'badge-danger'}">${u.what ? 'Administrador' : 'Acesso Bloqueado'}</span></td>
                    <td class="actions-cell">
                        <select class="select-alterar-permissao" data-id="${u.id}">
                            <option value="false" ${!u.what ? 'selected' : ''}>Bloqueado</option>
                            <option value="true" ${u.what ? 'selected' : ''}>Admin</option>
                        </select>
                    </td>
                `;
                tableUsuariosBody.appendChild(tr);
            });

            // Renderiza as caixas laterais aplicando o filtro de what === true internamente
            renderizarPainelNaDiv('lista-membros-pedidos', 'pedidos');
            renderizarPainelNaDiv('lista-membros-vitrine', 'vitrine');

            document.querySelectorAll('.select-alterar-permissao').forEach(select => {
                select.addEventListener('change', async (e) => {
                    const uid = e.target.dataset.id;
                    const valorBooleano = e.target.value === "true";
                    if(uid === auth.currentUser.uid) {
                        showToast("Não pode alterar as suas próprias permissões!", "error");
                        e.target.value = "true";
                        return;
                    }
                    await updateDoc(doc(db, "usuarios", uid), { what: valorBooleano });
                    showToast("Controle de acesso updated!", "success");
                });
            });
        });

        // 2. PEDIDOS (LINHA DE PRODUÇÃO)
        onSnapshot(collection(db, "pedidos"), (snapshot) => {
            if(!tablePedidosBody) return;
            tablePedidosBody.innerHTML = '';
            let ativos = 0;

            snapshot.forEach(docSnap => {
                const ped = docSnap.data();
                if(ped.status !== "Finalizado") ativos++;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-family:monospace; font-weight:700;">#${docSnap.id.substring(0,6).toUpperCase()}</td>
                    <td>${ped.clientEmail}</td>
                    <td>
                        <strong>${ped.projetoAdquirido || 'Não Informado'}</strong><br>
                        <small><strong>Resp:</strong> ${ped.responsavel || 'Não Definido'}</small><br>
                        <small style="color:var(--text-muted);">${ped.descricao || ''}</small>
                    </td>
                    <td><span class="badge ${ped.status === 'Finalizado' ? 'badge-success' : 'badge-prod'}">${ped.status}</span></td>
                    <td class="actions-cell">
                        <select class="select-alterar-status" data-id="${docSnap.id}">
                            <option value="Fabricação" ${ped.status === 'Fabricação' ? 'selected' : ''}>Fabricação</option>
                            <option value="Manutenção" ${ped.status === 'Manutenção' ? 'selected' : ''}>Manutenção</option>
                            <option value="Acabamento" ${ped.status === 'Acabamento' ? 'selected' : ''}>Acabamento</option>
                            <option value="Entrega" ${ped.status === 'Entrega' ? 'selected' : ''}>Entrega</option>
                            <option value="Finalizado" ${ped.status === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
                        </select>
                        <button class="btn-action btn-editar-pedido" data-id="${docSnap.id}"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-action btn-deletar-pedido" data-id="${docSnap.id}" style="color:#d9534f;"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                tablePedidosBody.appendChild(tr);
            });

            if (metricPedidosAtivos) metricPedidosAtivos.textContent = ativos;

            document.querySelectorAll('.select-alterar-status').forEach(select => {
                select.addEventListener('change', async (e) => {
                    const idPed = e.target.dataset.id;
                    const novoStatus = e.target.value;
                    const updateObj = { status: novoStatus };
                    updateObj[`datasEtapas.${novoStatus}`] = new Date().toLocaleDateString('pt-BR');
                    await updateDoc(doc(db, "pedidos", idPed), updateObj);
                    showToast("Pipeline de status updated!", "success");
                });
            });

            document.querySelectorAll('.btn-editar-pedido').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const snap = await getDoc(doc(db, "pedidos", e.currentTarget.dataset.id));
                    if(snap.exists()) {
                        const ped = snap.data();
                        const idEdit = document.getElementById('ped-id-edicao');
                        const pEmail = document.getElementById('ped-email');
                        const pProjeto = document.getElementById('ped-projeto-adquirido'); 
                        const pDesc = document.getElementById('ped-desc');
                        const pStatus = document.getElementById('ped-status');
                        const pResp = document.getElementById('ped-responsavel');
                        
                        if(idEdit) idEdit.value = snap.id;
                        if(pEmail) pEmail.value = ped.clientEmail || '';
                        if(pProjeto) pProjeto.value = ped.projetoAdquirido || ''; 
                        if(pDesc) pDesc.value = ped.descricao || '';
                        if(pStatus) pStatus.value = ped.status || 'Fabricação';
                        if(pResp) pResp.value = ped.responsavel || '';
                        
                        const title = document.getElementById('form-pedido-title');
                        if(title) title.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Modificar Item em Production`;
                    }
                });
            });

            document.querySelectorAll('.btn-deletar-pedido').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if(confirm("Deseja expurgar este item da linha de produção?")) {
                        await deleteDoc(doc(db, "pedidos", e.currentTarget.dataset.id));
                        showToast("Item excluído.", "success");
                    }
                });
            });
        });

        // 3. VITRINE DE PROJETOS E PRODUTOS
        onSnapshot(collection(db, "projetos"), (snapshot) => {
            if(!containerProdutos) return;
            containerProdutos.innerHTML = '';
            if(metricTotalProdutos) metricTotalProdutos.textContent = snapshot.size;

            snapshot.forEach(docSnap => {
                const proj = docSnap.data();
                const card = document.createElement('div');
                card.className = 'product-admin-card';
                
                const fotoCapa = (proj.urlFotos && proj.urlFotos.length > 0) ? proj.urlFotos[0] : 'https://placehold.co/300x200?text=Sem+Foto';
                const qtdEstoque = (proj.estoque !== undefined && proj.estoque !== null) ? parseInt(proj.estoque) : 0;

                card.innerHTML = `
                    <div class="product-card-img" style="background-image: url('${fotoCapa}')"></div>
                    <div class="product-card-body">
                        <div>
                            <span class="badge badge-prod" style="font-size:10px;">${proj.categoria || 'Geral'}</span>
                            <h4 style="margin-top:5px;">${proj.nome}</h4>
                            <p style="font-size:12px; margin: 4px 0;"><strong>Arq/Responsável:</strong> ${proj.arquiteto || 'Geral'}</p>
                            <p style="font-size:11px; color:var(--text-muted);">${proj.descricao || ''}</p>
                            <div style="display:flex; justify-content:space-between; margin-top:5px;">
                                <small style="color:var(--color-accent); font-weight:700;">${proj.urlFotos ? proj.urlFotos.length : 0} foto(s)</small>
                                <small class="badge ${qtdEstoque > 0 ? 'badge-success' : 'badge-danger'}" style="font-size:10px; padding:2px 6px;">Estoque: ${qtdEstoque}</small>
                            </div>
                        </div>
                        <div style="margin-top:auto; padding-top:10px;">
                            <p style="font-weight:700; color:var(--color-accent); margin:0;">R$ ${parseFloat(proj.preco || 0).toFixed(2)}</p>
                            <div class="actions-cell" style="margin-top:10px;">
                                <button class="btn-action btn-editar-produto" data-id="${docSnap.id}"><i class="fa-solid fa-pen"></i> Editar</button>
                                <button class="btn-action btn-deletar-produto" data-id="${docSnap.id}" style="color:#d9534f;"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </div>
                    </div>
                `;
                containerProdutos.appendChild(card);
            });

            document.querySelectorAll('.btn-editar-produto').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const snap = await getDoc(doc(db, "projetos", e.currentTarget.dataset.id));
                    if(snap.exists()) {
                        const p = snap.data();
                        
                        const idEdit = document.getElementById('proj-id-edicao');
                        const pNome = document.getElementById('proj-nome');
                        const pPreco = document.getElementById('proj-preco');
                        const pDesc = document.getElementById('proj-desc');
                        const pCat = document.getElementById('proj-categoria');
                        const pArq = document.getElementById('proj-arquiteto');
                        const pEstoque = document.getElementById('proj-estoque');

                        if(idEdit) idEdit.value = snap.id;
                        if(pNome) pNome.value = p.nome || '';
                        if(pPreco) pPreco.value = p.preco || '';
                        if(pDesc) pDesc.value = p.descricao || '';
                        if(pCat) pCat.value = p.categoria || '';
                        if(pArq) pArq.value = p.arquiteto || '';
                        if(pEstoque) pEstoque.value = (p.estoque !== undefined && p.estoque !== null) ? parseInt(p.estoque) : 0;
                        
                        fotosSalvasExistentes = p.urlFotos || [];
                        listaFotosBase64 = [];
                        
                        if(opcoesFotosEdicao) opcoesFotosEdicao.style.display = 'flex';

                        if(imgPreviewContainer) {
                            imgPreviewContainer.innerHTML = '';
                            fotosSalvasExistentes.forEach(url => {
                                const img = document.createElement('img');
                                img.src = url;
                                img.style = "width:65px; height:65px; object-fit:cover; border-radius:6px; border:2px solid #6f42c1; margin-right:5px;";
                                imgPreviewContainer.appendChild(img);
                            });
                        }

                        const title = document.getElementById('form-vitrine-title');
                        if(title) title.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Editando Produto Corrente`;
                        if(formProjeto) formProjeto.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            });

            document.querySelectorAll('.btn-deletar-produto').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if(confirm("Remover permanentemente este produto da vitrine?")) {
                        await deleteDoc(doc(db, "projetos", e.currentTarget.dataset.id));
                        showToast("Produto excluído!", "success");
                    }
                });
            });
        });
    }

    // DISPARAR SALVAMENTO / EDIÇÃO DE PEDIDOS
    if(formPedido) {
        formPedido.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idEdicao = document.getElementById('ped-id-edicao')?.value || "";
            const email = document.getElementById('ped-email')?.value || "";
            const projetoAdquirido = document.getElementById('ped-projeto-adquirido')?.value || ""; 
            const desc = document.getElementById('ped-desc')?.value || "";
            const status = document.getElementById('ped-status')?.value || "Fabricação";
            const responsavel = document.getElementById('ped-responsavel')?.value || "";

            const datasEtapas = { "Fabricação":"Aguardando", "Manutenção":"Aguardando", "Acabamento":"Aguardando", "Entrega":"Aguardando", "Finalizado":"Aguardando" };
            datasEtapas[status] = new Date().toLocaleDateString('pt-BR');

            try {
                if(idEdicao) {
                    await updateDoc(doc(db, "pedidos", idEdicao), { 
                        clientEmail: email, 
                        projetoAdquirido: projetoAdquirido, 
                        descricao: desc, 
                        status: status, 
                        responsavel: responsavel 
                    });
                    showToast("Fluxo operacional updated!", "success");
                } else {
                    await addDoc(collection(db, "pedidos"), { 
                        clientEmail: email, 
                        projetoAdquirido: projetoAdquirido, 
                        descricao: desc, 
                        status: status, 
                        responsavel: responsavel, 
                        datasEtapas: datasEtapas 
                    });
                    showToast("Nova encomenda em linha!", "success");
                }
                formPedido.reset();
                const idEditField = document.getElementById('ped-id-edicao');
                if(idEditField) idEditField.value = "";
                
                const title = document.getElementById('form-pedido-title');
                if(title) title.innerHTML = `<i class="fa-solid fa-square-plus"></i> Abrir Nova Linha de Production`;
            } catch(e) { showToast("Erro crítico ao instanciar pipeline.", "error"); }
        });
    }

    // CARREGAMENTO COM COMPRESSÃO AUTOMÁTICA DE MÚLTIPLAS FOTOS SIMULTÂNEAS (SEM LIMITE)
    if(projFile) {
        projFile.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if(files.length === 0) return;

            const modoSubstituir = document.querySelector('input[name="modo-foto"]:checked')?.value === 'substituir';
            if (modoSubstituir) {
                listaFotosBase64 = [];
                if(imgPreviewContainer) imgPreviewContainer.innerHTML = '';
            }

            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target.result;
                    
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;

                        const MAX_WIDTH_HEIGHT = 1280;
                        if (width > MAX_WIDTH_HEIGHT || height > MAX_WIDTH_HEIGHT) {
                            if (width > height) {
                                height *= MAX_WIDTH_HEIGHT / width;
                                width = MAX_WIDTH_HEIGHT;
                            } else {
                                width *= MAX_WIDTH_HEIGHT / height;
                                height = MAX_WIDTH_HEIGHT;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;

                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        const base64Comprimido = canvas.toDataURL('image/jpeg', 0.75);
                        listaFotosBase64.push(base64Comprimido);

                        if(imgPreviewContainer) {
                            const imgPreview = document.createElement('img');
                            imgPreview.src = base64Comprimido;
                            imgPreview.style = "width:65px; height:65px; object-fit:cover; border-radius:6px; border: 2px dashed #6f42c1; margin-right:5px;";
                            imgPreviewContainer.appendChild(imgPreview);
                        }
                    };
                };
                reader.readAsDataURL(file);
            });
        });
    }

    // SALVAR NO BANCO TRATANDO ESTOQUE E COMBINAÇÃO DE FOTOS
    if(formProjeto) {
        formProjeto.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idEdicao = document.getElementById('proj-id-edicao')?.value || "";
            const nome = document.getElementById('proj-nome')?.value || "";
            const preco = parseFloat(document.getElementById('proj-preco')?.value) || 0;
            const desc = document.getElementById('proj-desc')?.value || "";
            const categoryInput = document.getElementById('proj-categoria');
            const categoria = categoryInput ? categoryInput.value : "";
            
            const estoqueInput = document.getElementById('proj-estoque');
            const estoque = (estoqueInput && estoqueInput.value !== "") ? parseInt(estoqueInput.value) : 0; 

            const stylesArq = document.getElementById('proj-arquiteto');
            const arquiteto = stylesArq ? stylesArq.value : 'Geral';
            const btn = document.getElementById('btn-submit-projeto');

            if(btn) {
                btn.disabled = true;
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sincronizando dados...`;
            }

            try {
                let urlsFinaisDoProjeto = [];
                const modoFoto = document.querySelector('input[name="modo-foto"]:checked')?.value || 'manter';

                if(idEdicao && modoFoto === 'manter') {
                    urlsFinaisDoProjeto = [...fotosSalvasExistentes];
                }

                if(listaFotosBase64.length > 0) {
                    showToast(`Sincronizando ${listaFotosBase64.length} nova(s) imagem(ns) no Drive...`, "success");
                    
                    const sufixoTempo = Date.now();
                    const dadosFormulario = new URLSearchParams();
                    dadosFormulario.append('acao', 'upload_multiplo');
                    dadosFormulario.append('arquivos', JSON.stringify(listaFotosBase64));
                    dadosFormulario.append('prefixo', `vitrine_${sufixoTempo}`);

                    fetch(URL_WEB_APP_DRIVE, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
                        body: dadosFormulario.toString()
                    }).catch(err => console.log("Processando upload em background..."));

                    listaFotosBase64.forEach(base64Image => {
                        urlsFinaisDoProjeto.push(base64Image);
                    });
                }

                if(urlsFinaisDoProjeto.length === 0) {
                    throw new Error("Adicione pelo menos 1 foto para indexar o produto.");
                }

                const tamanhoEstimado = JSON.stringify(urlsFinaisDoProjeto).length;
                if (tamanhoEstimado > 900000) { 
                    throw new Error("Limite de tamanho excedido! Evite subir muitas fotos de altíssima resolução de uma vez.");
                }

                const dataObj = { 
                    nome: nome, 
                    preco: preco, 
                    descricao: desc, 
                    categoria: categoria, 
                    arquiteto: arquiteto,
                    estoque: estoque, 
                    urlFotos: urlsFinaisDoProjeto,
                    atualizadoEm: new Date() 
                };

                if(idEdicao) {
                    await updateDoc(doc(db, "projetos", idEdicao), dataObj);
                    showToast("Produto editado e atualizado na vitrine!", "success");
                } else {
                    dataObj.criadoEm = new Date();
                    await addDoc(collection(db, "projetos"), dataObj);
                    showToast("Novo produto cadastrado com sucesso!", "success");
                }

                formProjeto.reset();
                const idEditField = document.getElementById('proj-id-edicao');
                if(idEditField) idEditField.value = "";
                
                listaFotosBase64 = [];
                fotosSalvasExistentes = [];
                if(imgPreviewContainer) imgPreviewContainer.innerHTML = '';
                if(opcoesFotosEdicao) opcoesFotosEdicao.style.display = 'none';
                
                const title = document.getElementById('form-vitrine-title');
                if(title) title.innerHTML = `<i class="fa-solid fa-folder-plus"></i> Cadastrar Novo Projeto/Produto`;
                if(btn) btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Salvar Produto na Vitrine`;
                
            } catch(err) {
                console.error(err);
                showToast(err.message || "Erro ao salvar alterações.", "error");
                if(btn) btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Tentar Novamente`;
            } finally { 
                if(btn) btn.disabled = false; 
            }
        });
    }

    // PAINÉIS LATERAIS ATUALIZADOS: FILTRA APENAS QUEM TEM WHAT === TRUE
    function renderizarPainelNaDiv(idDoContainer, targetContext) {
        const painel = document.getElementById(idDoContainer);
        if(!painel) return; 

        painel.innerHTML = `
            <h4 style="margin-top:0; color:#6f42c1; font-size:14px; border-bottom:2px solid var(--color-border); padding-bottom:8px; margin-bottom:12px;">
                <i class="fa-solid fa-users"></i> Membros da Equipe
            </h4>
            <p style="font-size:11px; color:var(--text-muted); margin-bottom:12px;">Clique no membro para indexar ao formulário:</p>
            <div class="membros-lista-box" style="display:flex; flex-direction:column; gap:8px; max-height:260px; overflow-y:auto; padding-right:4px;"></div>
        `;
        
        const containerBox = painel.querySelector('.membros-lista-box');
        if(!containerBox) return;

        const membrosAtivos = listaMembrosCache.filter(membro => membro.what === true);

        if (membrosAtivos.length === 0) {
            containerBox.innerHTML = `<p style="font-size:12px; color:var(--text-muted); font-style:italic;">Nenhum administrador liberado.</p>`;
            return;
        }

        membrosAtivos.forEach(membro => {
            const item = document.createElement('div');
            item.style = "padding:10px; border:1px solid var(--color-border); border-radius:6px; cursor:pointer; background:var(--color-soft-bg); font-size:12px; transition: all 0.2s;";
            item.innerHTML = `<strong>${membro.nome || 'Usuário Anônimo'}</strong><br><span style="font-size:10px; color:var(--text-muted);">${membro.email}</span>`;
            
            item.addEventListener('mouseenter', () => {
                item.style.background = "rgba(111, 66, 193, 0.08)";
                item.style.borderColor = "#6f42c1";
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = "var(--color-soft-bg)";
                item.style.borderColor = "var(--color-border)";
            });
            
            item.addEventListener('click', () => {
                if(targetContext === 'pedidos') {
                    const inputRespPedido = document.getElementById('ped-responsavel');
                    if(inputRespPedido) {
                        inputRespPedido.value = `${membro.nome} (${membro.email})`;
                        showToast(`Responsável definido: ${membro.nome}`);
                    }
                } else if(targetContext === 'vitrine') {
                    const inputArqVitrine = document.getElementById('proj-arquiteto');
                    if(inputArqVitrine) {
                        inputArqVitrine.value = membro.nome;
                        showToast(`Arquiteto definido: ${membro.nome}`);
                    }
                }
            });
            
            containerBox.appendChild(item);
        });
    }
});