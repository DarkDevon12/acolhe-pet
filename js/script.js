// CADASTRO
let formCadastro = document.getElementById("formCadastro")

if (formCadastro) {

    formCadastro.addEventListener("submit", function (e) {

        e.preventDefault();

        let nome = document.getElementById("nome").value
        let email = document.getElementById("email").value
        let telefone = document.getElementById("telefone").value
        let cidade = document.getElementById("cidade").value
        let senha = document.getElementById("senha").value

        let usuario = {
            nome: nome,
            email: email,
            telefone: telefone,
            cidade: cidade,
            senha: senha
        }

        let usuarios = JSON.parse(localStorage.getItem("usuarios")) || []

        usuarios.push(usuario)

        localStorage.setItem("usuarios", JSON.stringify(usuarios))

        alert("Cadastro realizado com sucesso!")
        window.location.href = "login.html"
    })

}



// LOGIN
let formLogin = document.getElementById("formLogin")

if (formLogin) {

    formLogin.addEventListener("submit", function (e) {

        e.preventDefault()

        let email = document.getElementById("emailLogin").value
        let senha = document.getElementById("senhaLogin").value

        let usuarios = JSON.parse(localStorage.getItem("usuarios")) || []

        let usuarioValido = usuarios.find(usuario =>
            usuario.email === email && usuario.senha === senha
        )

        if (usuarioValido) {

            alert("Login realizado com sucesso!")

            window.location.href = "dashboard.html"

        } else {

            alert("Email ou senha incorretos")

        }

    })

}