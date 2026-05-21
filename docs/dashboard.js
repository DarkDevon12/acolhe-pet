const API_URL = "https://acolhe-pet.onrender.com";
const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
const saudacao = document.getElementById("saudacao");
const botaoLogout = document.getElementById("logout");

const abrirFormularioPost = document.getElementById("abrirFormularioPost");
const formPostAnimal = document.getElementById("formPostAnimal");
const btnPublicar = document.getElementById("btnPublicar");
const cardsPets = document.querySelector(".cards-pets");

const animalSelect = document.getElementById("animal");
const racaSelect = document.getElementById("raca");
const corSelect = document.getElementById("cor");
const estadoSelect = document.getElementById("estado");
const cidadeSelect = document.getElementById("cidade");

const abrirFiltros = document.getElementById("abrirFiltros");
const painelFiltros = document.getElementById("painelFiltros");
const limparFiltros = document.getElementById("limparFiltros");

let posts = [];

const racas = {
    Cachorro: [
        "Sem raça definida",
        "Shih-tzu",
        "Poodle",
        "Pinscher",
        "Labrador",
        "Golden Retriever",
        "Yorkshire",
        "Bulldog",
        "Pastor Alemão",
        "Pitbull",
        "Lhasa Apso",
        "Vira-lata"
    ],
    Gato: [
        "Sem raça definida",
        "Siamês",
        "Persa",
        "Maine Coon",
        "Angorá",
        "Sphynx",
        "Bengal",
        "Ragdoll",
        "Vira-lata"
    ]
};

const cores = {
    Cachorro: [
        "Preto",
        "Branco",
        "Marrom",
        "Caramelo",
        "Cinza",
        "Bege",
        "Malhado",
        "Preto com caramelo",
        "Branco com manchas",
        "Tricolor"
    ],
    Gato: [
        "Preto",
        "Branco",
        "Cinza",
        "Laranja",
        "Rajado",
        "Siamês",
        "Frajola",
        "Escaminha",
        "Tricolor"
    ]
};

if (!usuario) {
    window.location.href = "login.html";
} else {
    saudacao.textContent = `Olá, ${usuario.nome}!`;
}

botaoLogout.addEventListener("click", () => {
    localStorage.removeItem("usuarioLogado");
    window.location.href = "login.html";
});

abrirFormularioPost.addEventListener("click", () => {
    formPostAnimal.classList.toggle("hidden");
});

abrirFiltros.addEventListener("click", () => {
    painelFiltros.classList.toggle("hidden");
});

animalSelect.addEventListener("change", () => {
    carregarRacasECores(animalSelect.value);
});

estadoSelect.addEventListener("change", () => {
    carregarCidades(estadoSelect.value);
});

function preencherSelect(select, lista, textoPadrao) {
    select.innerHTML = `<option value="">${textoPadrao}</option>`;

    lista.forEach(item => {
        const option = document.createElement("option");
        option.value = item;
        option.textContent = item;
        select.appendChild(option);
    });
}

function carregarRacasECores(animal) {
    preencherSelect(racaSelect, racas[animal] || [], "Raça");
    preencherSelect(corSelect, cores[animal] || [], "Cor");
}

async function carregarEstados() {
    try {
        const resposta = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome");
        const estados = await resposta.json();

        estadoSelect.innerHTML = `<option value="">Estado</option>`;

        estados.forEach(estado => {
            const option = document.createElement("option");
            option.value = estado.sigla;
            option.textContent = estado.nome;
            estadoSelect.appendChild(option);
        });
    } catch (erro) {
        console.error("Erro ao carregar estados:", erro);
    }
}

async function carregarCidades(uf) {
    cidadeSelect.innerHTML = `<option value="">Cidade</option>`;

    if (!uf) return;

    try {
        const resposta = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
        const cidades = await resposta.json();

        cidades.forEach(cidade => {
            const option = document.createElement("option");
            option.value = cidade.nome;
            option.textContent = cidade.nome;
            cidadeSelect.appendChild(option);
        });
    } catch (erro) {
        console.error("Erro ao carregar cidades:", erro);
    }
}

async function carregarPosts() {
    try {
        const resposta = await fetch(`${API_URL}/posts`);
        posts = await resposta.json();

        renderizarPosts(posts);
        montarFiltrosDinamicos(posts);
    } catch (erro) {
        console.error("Erro ao carregar posts:", erro);
    }
}

function renderizarPosts(lista) {
    cardsPets.innerHTML = "";

    if (lista.length === 0) {
        cardsPets.innerHTML = "<p>Nenhum animal encontrado.</p>";
        return;
    }

    lista.forEach((post) => {
        const card = document.createElement("div");
        card.classList.add("pet-card");

        const vacinas = post.vacinas && post.vacinas.length > 0
            ? post.vacinas.join(", ")
            : "Não informado";

        const ehDonoPost = Number(post.usuario_id) === Number(usuario.id);

        card.innerHTML = `
            ${post.adotado ? `<div class="faixa-adotado">ADOTADO</div>` : ""}

            <img src="${post.imagem_url || './images/paw (1).png'}" alt="${post.animal}">

            <div class="pet-card-content">
                <h3>${post.animal} - ${post.raca}</h3>

                <p><strong>Sexo:</strong> ${post.sexo}</p>
                <p><strong>Idade:</strong> ${post.idade}</p>
                <p><strong>Cor:</strong> ${post.cor}</p>
                <p><strong>Castrado:</strong> ${post.castrado}</p>
                <p><strong>Vacinas:</strong> ${vacinas}</p>
                <p><strong>Local:</strong> ${post.cidade}/${post.estado}</p>
                <p><strong>História:</strong> ${post.historia || "Não informado"}</p>
                <p><strong>Observações:</strong> ${post.observacoes || "Nenhuma"}</p>
                <p><strong>Publicado por:</strong> ${post.nome_usuario}</p>

                <div class="pet-actions">
                    <button class="btn-like" onclick="curtirPost(${post.id})">
                        ❤️ Curtir (${post.total_curtidas || 0})
                    </button>

                    ${
                        !ehDonoPost
                        ? `<button 
                            class="btn-interest" 
                            ${post.adotado ? "disabled" : ""}
                            data-post-id="${post.id}"
                            data-animal="${post.animal}"
                            data-dono="${post.nome_usuario}"
                            onclick="tenhoInteresse(this)">
                            ${post.adotado ? "Indisponível" : "Tenho interesse"}
                        </button>`
                        : ""
                    }

                    ${
                        ehDonoPost && !post.adotado
                        ? `<button class="btn-adopted" onclick="marcarAdotado(${post.id})">Marcar como adotado</button>`
                        : ""
                    }
                </div>
            </div>
        `;

        cardsPets.appendChild(card);
    });
}

btnPublicar.addEventListener("click", async () => {
    const vacinasSelecionadas = Array.from(document.querySelectorAll(".vacina:checked"))
        .map(vacina => vacina.value);

    const imagem = document.getElementById("imagem").files[0];

    const formData = new FormData();
    formData.append("usuario_id", usuario.id);
    formData.append("animal", document.getElementById("animal").value);
    formData.append("sexo", document.getElementById("sexo").value);
    formData.append("raca", racaSelect.value);
    formData.append("idade", document.getElementById("idade").value);
    formData.append("cor", corSelect.value);
    formData.append("vacinas", JSON.stringify(vacinasSelecionadas));
    formData.append("castrado", document.getElementById("castrado").value);
    formData.append("historia", document.getElementById("historia").value);
    formData.append("observacoes", document.getElementById("observacoes").value);
    formData.append("estado", estadoSelect.value);
    formData.append("cidade", cidadeSelect.value);

    if (imagem) {
        formData.append("imagem", imagem);
    }

    try {
        const resposta = await fetch(`${API_URL}/posts`, {
            method: "POST",
            body: formData
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(dados.mensagem || "Erro ao publicar.");
            return;
        }

        alert("Post publicado com sucesso!");

        limparFormularioPost();

        formPostAnimal.classList.add("hidden");
        carregarPosts();
    } catch (erro) {
        console.error("Erro ao publicar:", erro);
        alert("Erro ao conectar com o servidor.");
    }
});

function limparFormularioPost() {
    document.getElementById("animal").value = "";
    document.getElementById("sexo").value = "";
    document.getElementById("idade").value = "";
    document.getElementById("castrado").value = "";
    document.getElementById("historia").value = "";
    document.getElementById("observacoes").value = "";
    document.getElementById("imagem").value = "";

    preencherSelect(racaSelect, [], "Raça");
    preencherSelect(corSelect, [], "Cor");

    estadoSelect.value = "";
    cidadeSelect.innerHTML = `<option value="">Cidade</option>`;

    document.querySelectorAll(".vacina").forEach(vacina => {
        vacina.checked = false;
    });
}

async function curtirPost(postId) {
    await fetch(`${API_URL}/posts/${postId}/curtir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: usuario.id })
    });

    carregarPosts();
}

async function marcarAdotado(postId) {
    const confirmar = confirm("Confirmar que este animal foi adotado?");

    if (!confirmar) return;

    const resposta = await fetch(`${API_URL}/posts/${postId}/adotado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: usuario.id })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        alert(dados.mensagem || "Erro ao marcar como adotado.");
        return;
    }

    carregarPosts();
}

function montarFiltrosDinamicos(listaPosts) {
    montarGrupoFiltro("filtrosCores", "cor", listaPosts);
    montarGrupoFiltro("filtrosRacas", "raca", listaPosts);
    montarGrupoFiltro("filtrosEstados", "estado", listaPosts);
    montarGrupoFiltro("filtrosCidades", "cidade", listaPosts);
}

function montarGrupoFiltro(containerId, campo, listaPosts) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    const valores = [...new Set(listaPosts.map(post => post[campo]).filter(Boolean))].sort();

    valores.forEach(valor => {
        const label = document.createElement("label");
        label.innerHTML = `
            <input type="checkbox" class="filtro-check" data-campo="${campo}" value="${valor}">
            ${valor}
        `;

        container.appendChild(label);
    });

    document.querySelectorAll(".filtro-check").forEach(check => {
        check.addEventListener("change", aplicarFiltros);
    });
}

document.querySelectorAll(".filtro-check").forEach(check => {
    check.addEventListener("change", aplicarFiltros);
});

function aplicarFiltros() {
    const filtrosSelecionados = {};

    document.querySelectorAll(".filtro-check:checked").forEach(check => {
        const campo = check.dataset.campo;

        if (!filtrosSelecionados[campo]) {
            filtrosSelecionados[campo] = [];
        }

        filtrosSelecionados[campo].push(check.value);
    });

    const filtrados = posts.filter(post => {
        return Object.keys(filtrosSelecionados).every(campo => {
            return filtrosSelecionados[campo].includes(post[campo]);
        });
    });

    renderizarPosts(filtrados);
}

limparFiltros.addEventListener("click", () => {
    document.querySelectorAll(".filtro-check").forEach(check => {
        check.checked = false;
    });

    renderizarPosts(posts);
});

// ══════════════════════════════════════════
// CHAT WIDGET
// ══════════════════════════════════════════
let conversaAtiva = null;
let pollingInterval = null;

// ── Botão flutuante: abre/fecha lista ─────
function toggleListaConversas() {
    const lista = document.getElementById('chatLista');
    const janela = document.getElementById('chatJanela');
    janela.classList.add('hidden');
    lista.classList.toggle('hidden');
    if (!lista.classList.contains('hidden')) carregarListaConversas();
}

// ── Carrega lista de conversas ─────────────
async function carregarListaConversas() {
    const res = await fetch(`${API_URL}/minhas-conversas/${usuario.id}`);
    const conversas = await res.json();
    const container = document.getElementById('chatListaItems');

    if (!conversas.length) {
        container.innerHTML = '<p class="chat-vazio">Nenhuma conversa ainda.</p>';
        return;
    }

    container.innerHTML = conversas.map(c => {
        const outrasPessoa = Number(c.interessado_id) === Number(usuario.id)
            ? c.nome_dono
            : c.nome_interessado;
        const foto = c.imagem_url || './images/paw (1).png';
        const preview = c.ultima_mensagem || 'Sem mensagens ainda';

        return `
            <div class="chat-item" onclick="abrirConversa(${c.id}, '${c.animal}', '${outrasPessoa}')">
                <img class="chat-item-foto" src="${foto}" alt="${c.animal}">
                <div class="chat-item-info">
                    <div class="chat-item-nome">🐾 ${c.animal} · ${outrasPessoa}</div>
                    <div class="chat-item-preview">${preview}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ── Abre uma conversa pelo ID ──────────────
async function abrirConversa(conversaId, animal, outraPessoa) {
    conversaAtiva = { id: conversaId };
    document.getElementById('chatAnimalNome').textContent = `🐾 ${animal}`;
    document.getElementById('chatComQuem').textContent = `Conversando com: ${outraPessoa}`;
    document.getElementById('chatLista').classList.add('hidden');
    document.getElementById('chatJanela').classList.remove('hidden');

    await marcarComoLidas(conversaId);
    await carregarMensagens();
    iniciarPolling();
}

// ── Abre chat ao clicar "Tenho Interesse" ──
async function tenhoInteresse(btn) {
    const postId   = btn.dataset.postId || btn.dataset.postid;
    const animal   = btn.dataset.animal;
    const nomeDono = btn.dataset.dono;

    try {
        const res = await fetch(`${API_URL}/conversas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId, interessado_id: usuario.id })
        });
        const dados = await res.json();
        if (!res.ok) { alert(dados.mensagem); return; }

        await abrirConversa(dados.conversa.id, animal, nomeDono);
    } catch (e) {
        alert("Erro ao iniciar conversa.");
    }
}

// ── Carrega mensagens ──────────────────────
async function carregarMensagens() {
    if (!conversaAtiva) return;
    const res = await fetch(`${API_URL}/conversas/${conversaAtiva.id}/mensagens`);
    const msgs = await res.json();
    const container = document.getElementById('chatMensagens');
    const eraNoFundo = container.scrollHeight - container.scrollTop === container.clientHeight;

    container.innerHTML = '';
    msgs.forEach(msg => {
        const souEu = Number(msg.remetente_id) === Number(usuario.id);
        const div = document.createElement('div');
        div.className = `msg ${souEu ? 'msg-minha' : 'msg-deles'}`;
        div.innerHTML = `
            <span class="msg-autor">${souEu ? 'Você' : msg.remetente_nome}</span>
            <p>${msg.mensagem}</p>
        `;
        container.appendChild(div);
    });

    if (eraNoFundo || msgs.length > 0) container.scrollTop = container.scrollHeight;
}

// ── Envia mensagem ─────────────────────────
async function enviarMensagem() {
    const input = document.getElementById('chatInput');
    const texto = input.value.trim();
    if (!texto || !conversaAtiva) return;
    input.value = '';

    await fetch(`${API_URL}/conversas/${conversaAtiva.id}/mensagens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remetente_id: usuario.id, mensagem: texto })
    });
    await carregarMensagens();
}

// ── Polling a cada 3s ──────────────────────
function iniciarPolling() {
    pararPolling();
    pollingInterval = setInterval(carregarMensagens, 3000);
}
function pararPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
}

// ── Voltar para lista ──────────────────────
function voltarLista() {
    pararPolling();
    conversaAtiva = null;
    document.getElementById('chatJanela').classList.add('hidden');
    document.getElementById('chatLista').classList.remove('hidden');
    carregarListaConversas();
}

// Eventos do chat — usando delegação para garantir que funciona
document.addEventListener('click', function(e) {
    if (e.target.id === 'chatEnviar') enviarMensagem();
    if (e.target.id === 'fecharChat') {
        pararPolling();
        conversaAtiva = null;
        document.getElementById('chatJanela').classList.add('hidden');
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && document.activeElement.id === 'chatInput') {
        enviarMensagem();
    }
});

// Atualiza badge de mensagens não lidas
async function atualizarBadge() {
    try {
        const res = await fetch(`${API_URL}/mensagens-nao-lidas/${usuario.id}`);
        const dados = await res.json();
        const badge = document.getElementById('chatBadge');

        if (dados.total > 0) {
            badge.textContent = dados.total > 99 ? '99+' : dados.total;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch (e) {
        console.error("Erro ao buscar badge:", e);
    }
}

// Marcar como lidas ao abrir conversa
async function marcarComoLidas(conversaId) {
    await fetch(`${API_URL}/conversas/${conversaId}/mensagens/lidas`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: usuario.id })
    });
    atualizarBadge();
}

carregarEstados();
carregarPosts();

atualizarBadge();
setInterval(atualizarBadge, 5000);