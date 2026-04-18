const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
const saudacao = document.getElementById("saudacao");
const botaoLogout = document.getElementById("logout");

// Protege a página (se não estiver logado, volta pro login)
if (!usuario) {
    window.location.href = "login.html";
} else {
    saudacao.textContent = `Olá, ${usuario.nome}!`;
}

// Botão sair
botaoLogout.addEventListener("click", () => {
    localStorage.removeItem("usuarioLogado");
    window.location.href = "login.html";
});

