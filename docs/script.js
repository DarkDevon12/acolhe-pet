const API_URL = "https://acolhe-pet.onrender.com";

// =========================
// VALIDAÇÃO DE SENHA
// =========================
function validarSenha(senha) {
    const minimoCaracteres = 8;
    const temMaiuscula = /[A-Z]/.test(senha);
    const temMinuscula = /[a-z]/.test(senha);
    const temNumero = /\d/.test(senha);
    const temEspecial = /[^A-Za-z0-9]/.test(senha);

    if (senha.length < minimoCaracteres) {
        return {
            valida: false,
            mensagem: "A senha deve ter pelo menos 8 caracteres."
        };
    }

    if (!temMaiuscula) {
        return {
            valida: false,
            mensagem: "A senha deve conter pelo menos 1 letra maiúscula."
        };
    }

    if (!temMinuscula) {
        return {
            valida: false,
            mensagem: "A senha deve conter pelo menos 1 letra minúscula."
        };
    }

    if (!temNumero) {
        return {
            valida: false,
            mensagem: "A senha deve conter pelo menos 1 número."
        };
    }

    if (!temEspecial) {
        return {
            valida: false,
            mensagem: "A senha deve conter pelo menos 1 caractere especial."
        };
    }

    return {
        valida: true
    };
}

// =========================
// CADASTRO
// =========================
const formCadastro = document.getElementById("formCadastro");

if (formCadastro) {
    formCadastro.addEventListener("submit", async function (e) {
        e.preventDefault();

        const nome = document.getElementById("nome").value.trim();
        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value;
        const confirmarSenha = document.getElementById("confirmarSenha").value;

        if (!nome || !email || !senha || !confirmarSenha) {
            alert("Preencha todos os campos.");
            return;
        }

        const resultadoSenha = validarSenha(senha);

        if (!resultadoSenha.valida) {
            alert(resultadoSenha.mensagem);
            return;
        }

        if (senha !== confirmarSenha) {
            alert("As senhas não coincidem.");
            return;
        }

        try {
            const resposta = await fetch(`${API_URL}/cadastro`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    nome,
                    email,
                    senha
                })
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                alert(dados.mensagem || "Erro ao cadastrar usuário.");
                return;
            }

            alert("Cadastro realizado com sucesso!");
            window.location.href = "login.html";
        } catch (erro) {
            console.error("Erro no cadastro:", erro);
            alert("Não foi possível conectar ao servidor.");
        }
    });
}

// =========================
// LOGIN
// =========================
const formLogin = document.getElementById("formLogin");

if (formLogin) {
    formLogin.addEventListener("submit", async function (e) {
        e.preventDefault();

        const email = document.getElementById("emailLogin").value.trim();
        const senha = document.getElementById("senhaLogin").value;

        if (!email || !senha) {
            alert("Digite email e senha.");
            return;
        }

        try {
            const resposta = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    senha
                })
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                alert(dados.mensagem || "Email ou senha incorretos.");
                return;
            }

            // Mantém só os dados básicos do usuário logado
            localStorage.setItem("usuarioLogado", JSON.stringify(dados.usuario));

            alert("Login realizado com sucesso!");
            window.location.href = "dashboard.html";
        } catch (erro) {
            console.error("Erro no login:", erro);
            alert("Não foi possível conectar ao servidor.");
        }
    });
}