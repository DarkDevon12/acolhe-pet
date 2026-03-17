//verifica se existe user logado

let usuario = JSON.parse(localStorage.getItem("usuarioLogado"))

if(usuario){

//mostra o nome do user

    document.getElementById("saudacao").textContent = "Olá, " + usuario.nome

}else{

    window.location.href = "login.html"

}

//botao sair

document.getElementById("logout").addEventListener("click", function(){

    localStorage.removeItem("usuarioLogado")

    window.location.href = "login.html"

})

