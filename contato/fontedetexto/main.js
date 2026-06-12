import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// CORRIGIDO: Adicionado 'query' e 'orderBy' na lista abaixo
import { 
    getFirestore, doc, collection, addDoc, updateDoc, deleteDoc, onSnapshot, getDoc, setDoc,
    query, orderBy, arrayUnion
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

// ==========================================
// CONFIGURAÇÕES E INSTÂNCIAS DO FIREBASE
// ==========================================
// Certifique-se de que o seu 'db' e 'auth' vêm do seu arquivo de configuração (ex: firebase-config.js)
// ou descomente as linhas abaixo importando e configurando sua inicialização:
//
// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// import { getFirestore, collection, doc, addDoc, onSnapshot, updateDoc, deleteDoc, query, orderBy, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
//
// const app = initializeApp(firebaseConfig);
// const db = getFirestore(app);
// const auth = getAuth(app);

// ==========================================
// STORES INTERNOS E ESTADOS GLOBAIS
// ==========================================
let modoAtivo = 'colabs'; // 'colabs' ou 'projetos'
let listaMembrosCache = [];
let usuarioLogado = null;
let arrastandoElemento = null; // Controle do Drag and Drop
let arrayCategoriasGlobal = []; // Preenchido dinamicamente pelo Firestore

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // SELETORES DOM DE INTERFACE E MODOS
    // ==========================================
    const overlayAuth = document.getElementById('admin-auth-overlay');
    const overlayModos = document.getElementById('mode-selection-overlay');
    const layoutPainel = document.querySelector('.admin-layout');
    const quickModeSwitcher = document.getElementById('quick-mode-switcher');
    const activeModeText = document.getElementById('active-mode-text');
    const authForm = document.getElementById('auth-form');
    
    // Elementos Condicionais da Vitrine
    const camposColab = document.querySelectorAll('.id-campo-colab');
    const camposProjeto = document.querySelectorAll('.id-campo-projeto');
    const chkExclusivo = document.getElementById('proj-exclusivo');
    const blocoEstoqueFracionado = document.querySelector('.id-estoque-fracionado');
    
    // Seletores de Categoria e Preço
    const inputPreco = document.getElementById('proj-preco');
    const grupoPreco = inputPreco ? inputPreco.closest('.form-group') : null;
    const selectProjCategoria = document.getElementById('proj-categoria');
    const selectProjSubcategoria = document.getElementById('proj-subcategoria');

    // ==========================================
    // FLUXO DE LOGIN (INTEGRADO AO SEU OBSERVER)
    // ==========================================
    if (typeof auth !== 'undefined') {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                usuarioLogado = user;
                // Esconde a tela de login e abre a seleção dos 2 modos
                if (overlayAuth) overlayAuth.style.display = 'none';
                if (overlayModos) overlayModos.style.display = 'flex';
                
                // Inicia os escutadores em tempo real do banco de dados
                ouvirCategoriasDoFirestore();
                ouvirProdutosDoFirestore();
            } else {
                usuarioLogado = null;
                if (overlayAuth) overlayAuth.style.display = 'flex';
                if (overlayModos) overlayModos.style.display = 'none';
                if (layoutPainel) layoutPainel.style.display = 'none';
            }
        });
    }

    // fallback caso use submit manual sem observer ativo
    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (typeof auth === 'undefined') { 
                // Apenas para testes locais se o Firebase não estiver instanciado
                if (overlayAuth) overlayAuth.style.display = 'none';
                if (overlayModos) overlayModos.style.display = 'flex';
                ouvirCategoriasDoFirestore();
                ouvirProdutosDoFirestore();
            }
        });
    }

    // ==========================================
    // ENGINE DE ALTERNÂNCIA DE MODOS
    // ==========================================
    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => {
            const modoSelecionado = card.getAttribute('data-mode');
            ativarModoDefinitivo(modoSelecionado);
            
            if (overlayModos) overlayModos.style.display = 'none';
            if (layoutPainel) layoutPainel.style.display = 'flex';
        });
    });

    if (quickModeSwitcher) {
        quickModeSwitcher.addEventListener('click', () => {
            const novoModo = modoAtivo === 'colabs' ? 'projetos' : 'colabs';
            ativarModoDefinitivo(novoModo);
            if (typeof showToast === 'function') {
                showToast(`Alterado para Modo: ${novoModo.toUpperCase()}`);
            }
        });
    }

    function ativarModoDefinitivo(modo) {
        modoAtivo = modo;
        
        if(modo === 'colabs') {
            if (activeModeText) activeModeText.textContent = "Modo: Colabs";
            if (quickModeSwitcher) quickModeSwitcher.style.background = "var(--color-primary)";
            
            if (grupoPreco) grupoPreco.style.display = 'flex';
            camposColab.forEach(el => el.style.display = 'flex');
            camposProjeto.forEach(el => el.style.display = 'none');
        } else {
            if (activeModeText) activeModeText.textContent = "Modo: Projetos";
            if (quickModeSwitcher) quickModeSwitcher.style.background = "var(--color-accent)";
            
            if (grupoPreco) grupoPreco.style.display = 'none';
            camposColab.forEach(el => el.style.display = 'none');
            camposProjeto.forEach(el => el.style.display = 'flex');
            if (chkExclusivo) chkExclusivo.dispatchEvent(new Event('change'));
        }

        // Re-renderiza os painéis com as regras visuais do novo modo escolhido
        atualizarPaineisDeCategorias(arrayCategoriasGlobal);
    }

    if (chkExclusivo) {
        chkExclusivo.addEventListener('change', () => {
            if(chkExclusivo.checked && modoAtivo === 'projetos') {
                blocoEstoqueFracionado.style.display = 'block';
            } else {
                blocoEstoqueFracionado.style.display = 'none';
            }
        });
    }

    // GATILHO: Carrega as subcategorias dependendo da categoria mãe selecionada
    if (selectProjCategoria && selectProjSubcategoria) {
        selectProjCategoria.addEventListener('change', () => {
            const idCatSelecionada = selectProjCategoria.value;
            selectProjSubcategoria.innerHTML = '<option value="">-- Selecione uma Subcategoria (Opcional) --</option>';
            
            const categoriaEncontrada = arrayCategoriasGlobal.find(c => c.id === idCatSelecionada);
            if (categoriaEncontrada && categoriaEncontrada.subcategorias) {
                categoriaEncontrada.subcategorias.forEach(sub => {
                    selectProjSubcategoria.add(new Option(sub, sub));
                });
            }
        });
    }

    // ==========================================
    // CONTROLE DE ABAS (SPA)
    // ==========================================
    const itensMenu = document.querySelectorAll('.sidebar-item');
    const conteudosAbas = document.querySelectorAll('.admin-tab-content');

    itensMenu.forEach(item => {
        item.addEventListener('click', () => {
            itensMenu.forEach(i => i.classList.remove('active'));
            conteudosAbas.forEach(c => c.classList.remove('active'));

            item.classList.add('active');
            const targetTab = item.getAttribute('data-tab');
            const targetElement = document.getElementById(targetTab);
            if (targetElement) targetElement.classList.add('active');
        });
    });

    // ==========================================
    // ☁️ PERSISTÊNCIA EM TEMPO REAL: CATEGORIAS (FIREBASE)
    // ==========================================
    const formCategoria = document.getElementById('form-add-categoria');
    const formSubcategoria = document.getElementById('form-add-subcategoria');
    const containerCategorias = document.getElementById('drag-drop-container-categorias');
    const selectPai = document.getElementById('sub-cat-pai-select');

    function ouvirCategoriasDoFirestore() {
        if (typeof db === 'undefined') return;
        
        // Escuta a coleção "categorias" ordenada pelo campo "ordem"
        onSnapshot(query(collection(db, "categorias"), orderBy("ordem", "asc")), (snapshot) => {
            arrayCategoriasGlobal = [];
            snapshot.forEach((doc) => {
                arrayCategoriasGlobal.push({ id: doc.id, ...doc.data() });
            });
            atualizarPaineisDeCategorias(arrayCategoriasGlobal);
        }, (error) => {
            console.error("Erro nas regras de leitura de categorias: ", error);
        });
    }

    function atualizarPaineisDeCategorias(listaCats) {
        if (!containerCategorias) return;
        containerCategorias.innerHTML = '';
        
        if(selectPai) selectPai.innerHTML = '';
        if(selectProjCategoria) {
            selectProjCategoria.innerHTML = '';
            selectProjCategoria.add(new Option('-- Selecione uma Categoria --', ''));
        }
        if(selectProjSubcategoria) {
            selectProjSubcategoria.innerHTML = '<option value="">-- Selecione uma Subcategoria (Opcional) --</option>';
        }

        listaCats.forEach(cat => {
            if(selectPai) selectPai.add(new Option(cat.nome, cat.id));
            if(selectProjCategoria) selectProjCategoria.add(new Option(cat.nome, cat.id));

            const cardCat = document.createElement('div');
            cardCat.className = 'dd-item-categoria';
            cardCat.setAttribute('draggable', 'true');
            cardCat.setAttribute('data-id', cat.id);
            
            cardCat.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong><i class="fa-solid fa-grip-vertical" style="color:var(--text-muted); margin-right:8px;"></i> ${cat.nome}</strong>
                    <button type="button" class="btn-link" style="color:var(--color-danger); background:none; border:none; cursor:pointer;" onclick="deletarCategoriaMae('${cat.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
                <div class="subcategories-list"></div>
            `;

            const subContainer = cardCat.querySelector('.subcategories-list');
            if(cat.subcategorias && cat.subcategorias.length > 0) {
                cat.subcategorias.forEach(sub => {
                    const itemSub = document.createElement('div');
                    itemSub.className = 'sub-item-badge';
                    itemSub.innerHTML = `<span>${sub}</span> <i class="fa-solid fa-tags" style="font-size:10px; color:var(--text-muted);"></i>`;
                    subContainer.appendChild(itemSub);
                });
            } else {
                subContainer.innerHTML = `<span style="font-size:11px; color:var(--text-muted); font-style:italic;">Sem subcategorias vinculadas (Opcional).</span>`;
            }

            // Listeners do Drag and Drop Nativo
            cardCat.addEventListener('dragstart', () => {
                arrastandoElemento = cardCat;
                cardCat.style.opacity = '0.5';
            });

            cardCat.addEventListener('dragend', () => {
                arrastandoElemento = null;
                cardCat.style.opacity = '1';
                salvarNovaOrdemCategorias();
            });

            containerCategorias.appendChild(cardCat);
        });
    }

    if (containerCategorias) {
        containerCategorias.addEventListener('dragover', (e) => {
            e.preventDefault();
            const elementoAbaixo = obterElementoAlvoDrop(containerCategorias, e.clientY);
            if (elementoAbaixo == null) {
                containerCategorias.appendChild(arrastandoElemento);
            } else {
                containerCategorias.insertBefore(arrastandoElemento, elementoAbaixo);
            }
        });
    }

    function obterElementoAlvoDrop(container, y) {
        const elementosArrastaveis = [...container.querySelectorAll('.dd-item-categoria:not(:focus)')];
        return elementosArrastaveis.reduce((proximo, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > proximo.offset) {
                return { offset: offset, element: child };
            } else {
                return proximo;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    async function salvarNovaOrdemCategorias() {
        if (typeof db === 'undefined') return;
        const itensOrdenados = [...containerCategorias.querySelectorAll('.dd-item-categoria')];
        
        for (let index = 0; index < itensOrdenados.length; index++) {
            const idDoc = itensOrdenados[index].getAttribute('data-id');
            try {
                // Atualiza o campo 'ordem' direto no banco para persistir pós-F5
                await updateDoc(doc(db, "categorias", idDoc), { ordem: index + 1 });
            } catch (error) {
                console.error("Erro ao reordenar: ", error);
            }
        }
    }

    // SUBMIT: Salvar Nova Categoria Mãe no Firestore
    if (formCategoria) {
        formCategoria.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nomeInput = document.getElementById('cat-nome');
            const nome = nomeInput.value.trim();
            if (!nome) return;

            if (typeof db !== 'undefined') {
                try {
                    await addDoc(collection(db, "categorias"), {
                        nome: nome,
                        ordem: arrayCategoriasGlobal.length + 1,
                        subcategorias: []
                    });
                    if (typeof showToast === 'function') showToast(`Categoria "${nome}" salva com sucesso!`);
                    formCategoria.reset();
                } catch (error) {
                    console.error("Erro ao criar categoria: ", error);
                }
            }
        });
    }

    // SUBMIT: Salvar Nova Subcategoria (Opcional) no Firestore
    if (formSubcategoria) {
        formSubcategoria.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idPai = selectPai.value;
            const nomeSubInput = document.getElementById('sub-cat-nome');
            const nomeSub = nomeSubInput.value.trim();
            if (!idPai || !nomeSub) return;

            if (typeof db !== 'undefined') {
                try {
                    // Adiciona o elemento de texto sem duplicar no array interno do documento
                    await updateDoc(doc(db, "categorias", idPai), {
                        subcategorias: arrayUnion(nomeSub)
                    });
                    if (typeof showToast === 'function') showToast(`Subcategoria "${nomeSub}" adicionada!`);
                    formSubcategoria.reset();
                } catch (error) {
                    console.error("Erro ao adicionar subcategoria: ", error);
                }
            }
        });
    }

    // DELETAR: Remover Categoria Mãe do Firestore
    window.deletarCategoriaMae = async function(id) {
        if (confirm("Deseja mesmo remover esta categoria de forma definitiva?") && typeof db !== 'undefined') {
            try {
                await deleteDoc(doc(db, "categorias", id));
                if (typeof showToast === 'function') showToast("Categoria removida do banco.");
            } catch (error) {
                console.error("Erro ao remover: ", error);
            }
        }
    };

    // ==========================================
    // ☁️ PERSISTÊNCIA EM TEMPO REAL: VITRINE (FIREBASE)
    // ==========================================
    function ouvirProdutosDoFirestore() {
        if (typeof db === 'undefined') return;

        // Escuta a coleção "projetos" ativa (conforme suas regras estabelecidas)
        onSnapshot(collection(db, "projetos"), (snapshot) => {
            const produtosDoBanco = [];
            snapshot.forEach((doc) => {
                produtosDoBanco.push({ id: doc.id, ...doc.data() });
            });
            renderizarProdutosVitrine(produtosDoBanco);
        });
    }

    function renderizarProdutosVitrine(listaProdutos) {
        const containerProdutos = document.getElementById('container-admin-produtos');
        if(!containerProdutos) return;

        containerProdutos.innerHTML = '';

        if(listaProdutos.length === 0) {
            containerProdutos.innerHTML = `<p style="font-size:13px; color:var(--text-muted); font-style:italic; padding:20px;">Nenhum produto cadastrado na vitrine.</p>`;
            return;
        }

        listaProdutos.forEach(prod => {
            const card = document.createElement('div');
            card.className = 'product-admin-card';
            
            let renderEstoqueDinamico = '';
            // Regra de Negócio: Preço ocultado completamente em Modo Projetos
            let renderPrecoDinamico = modoAtivo === 'colabs' ? `<span style="font-weight:bold; color:var(--color-primary); font-size:15px;">R$ ${Number(prod.preco || 0).toFixed(2)}</span>` : '';
            let badgeSubcategoria = prod.subcategoria ? `<span style="font-size:10px; background:#edf2f7; padding:2px 6px; border-radius:4px; color:var(--text-muted); font-weight:normal;"><i class="fa-solid fa-tag"></i> ${prod.subcategoria}</span>` : '';

            if (modoAtivo === 'colabs') {
                renderEstoqueDinamico = `
                    <p style="font-size:12px; margin-top:5px;"><strong>Resp/Arq:</strong> ${prod.arquiteto || 'Geral'}</p>
                    <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                        <span class="badge ${prod.estoque > 0 ? 'badge-success' : 'badge-danger'}">Estoque: ${prod.estoque || 0} un</span>
                    </div>
                `;
            } else {
                if (prod.exclusivo) {
                    renderEstoqueDinamico = `
                        <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                            <span class="badge badge-prod">Coleção Exclusiva</span>
                            <strong style="font-size:13px; color:var(--color-primary);">${prod.qtdAtual || 0}/${prod.qtdTotal || 0} Itens</strong>
                        </div>
                        <div style="display:flex; gap:5px; margin-top:8px;">
                            <button type="button" class="btn-primary" style="padding:3px 8px; font-size:11px;" onclick="ajustarFracao('${prod.id}', -1, ${prod.qtdAtual || 0})">- 1 un</button>
                            <button type="button" class="btn-primary" style="padding:3px 8px; font-size:11px; background:#4a5568;" onclick="ajustarFracao('${prod.id}', 1, ${prod.qtdAtual || 0})">+ 1 un</button>
                        </div>
                    `;
                } else {
                    renderEstoqueDinamico = `<span class="badge badge-success" style="margin-top:8px; display:inline-block;">Produto Comum</span>`;
                }
            }

            card.innerHTML = `
                <div class="product-card-img" style="background-image: url('${(prod.fotos && prod.fotos[0]) || 'https://placehold.co/400x300?text=Sem+Foto'}')"></div>
                <div class="product-card-body">
                    <h4 style="margin:0 0 5px 0; display:flex; align-items:center; justify-content:space-between; gap:10px;">
                        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${prod.nome}</span>
                        ${badgeSubcategoria}
                    </h4>
                    ${renderPrecoDinamico}
                    <p style="font-size:11px; color:var(--text-muted); margin-top:5px; flex-grow:1;">${prod.desc || ''}</p>
                    ${renderEstoqueDinamico}
                    <div style="margin-top:12px; padding-top:10px; border-top:1px solid var(--color-border); display:flex; gap:10px;">
                        <button type="button" class="btn-primary" style="flex:1; padding:6px; background:var(--color-soft-bg); color:var(--text-main);" onclick="carregarProdutoParaEdicao('${prod.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button type="button" class="btn-primary" style="flex:1; padding:6px; background:#fee2e2; color:var(--color-danger);" onclick="removerProdutoDaVitrine('${prod.id}')"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
            containerProdutos.appendChild(card);
        });
    }

    // ==========================================
    // PAINÉIS LATERAIS (Membros Integrados)
    // ==========================================
    window.renderizarPainelNaDiv = function(idDoContainer, targetContext) {
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
            item.className = "membro-item-clicavel";
            item.style = "padding:10px; border:1px solid var(--color-border); border-radius:6px; cursor:pointer; background:var(--color-soft-bg); font-size:12px; transition: all 0.2s;";
            item.innerHTML = `<strong>${membro.nome || 'Usuário Anônimo'}</strong><br><span style="font-size:10px; color:var(--text-muted);">${membro.email}</span>`;
            
            item.addEventListener('click', () => {
                if(targetContext === 'pedidos') {
                    const inputRespPedido = document.getElementById('ped-responsavel');
                    if(inputRespPedido) {
                        inputRespPedido.value = `${membro.nome} (${membro.email})`;
                        if (typeof showToast === 'function') showToast(`Responsável definido: ${membro.nome}`);
                    }
                } else if(targetContext === 'vitrine' && modoAtivo === 'colabs') {
                    const inputArqVitrine = document.getElementById('proj-arquiteto');
                    if(inputArqVitrine) {
                        inputArqVitrine.value = membro.nome;
                        if (typeof showToast === 'function') showToast(`Arquiteto definido: ${membro.nome}`);
                    }
                }
            });
            
            containerBox.appendChild(item);
        });
    }

});

// ==========================================
// OPERAÇÕES GLOBAIS DE JANELA (FIREBASE)
// ==========================================
window.ajustarFracao = async function(idProduto, variacao, valorAtual) {
    if (typeof db === 'undefined') return;
    
    let novoValor = valorAtual + variacao;
    if (novoValor < 0) novoValor = 0; // Proteção para estoque não ser negativo

    try {
        // Atualiza a quantidade direto no documento do item exclusivo
        await updateDoc(doc(db, "projetos", idProduto), {
            qtdAtual: novoValor
        });
        if (typeof showToast === 'function') {
            showToast(`Estoque atualizado para ${novoValor} unidade(s).`);
        }
    } catch (error) {
        console.error("Erro ao alterar estoque fracionado: ", error);
    }
}

window.removerProdutoDaVitrine = async function(idProduto) {
    if (confirm("Deseja apagar este produto da vitrine definitivamente?") && typeof db !== 'undefined') {
        try {
            await deleteDoc(doc(db, "projetos", idProduto));
            if (typeof showToast === 'function') showToast("Produto removido com sucesso!");
        } catch (error) {
            console.error("Erro ao remover produto: ", error);
        }
    }
}