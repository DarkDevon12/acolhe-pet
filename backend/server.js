const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const pool = require("./db");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

function validarSenha(senha) {
    const minimoCaracteres = 8;
    const temMaiuscula = /[A-Z]/.test(senha);
    const temMinuscula = /[a-z]/.test(senha);
    const temNumero = /\d/.test(senha);
    const temEspecial = /[^A-Za-z0-9]/.test(senha);

    return (
        senha.length >= minimoCaracteres &&
        temMaiuscula &&
        temMinuscula &&
        temNumero &&
        temEspecial
    );
}

app.get("/", (req, res) => {
    res.send("API Acolhe Pet funcionando.");
});

/*app.get("/teste-banco", async (req, res) => {
    try {
        const resultado = await pool.query("SELECT NOW()");
        res.json({
            funcionando: true,
            horarioBanco: resultado.rows[0]
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            funcionando: false,
            erro: "Erro ao conectar no banco"
        });
    }
});*/

app.post("/cadastro", async (req, res) => {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({
            mensagem: "Preencha todos os campos."
        });
    }

    if (!validarSenha(senha)) {
        return res.status(400).json({
            mensagem: "A senha deve ter no mínimo 8 caracteres, com letra maiúscula, minúscula, número e caractere especial."
        });
    }

    try {
        const emailExistente = await pool.query(
            "SELECT id FROM usuarios WHERE email = $1",
            [email]
        );

        if (emailExistente.rows.length > 0) {
            return res.status(400).json({
                mensagem: "Este email já está cadastrado."
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const resultado = await pool.query(
            "INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, nome, email",
            [nome, email, senhaHash]
        );

        return res.status(201).json({
            mensagem: "Cadastro realizado com sucesso.",
            usuario: resultado.rows[0]
        });
    } catch (erro) {
        console.error("Erro ao cadastrar:", erro);
        return res.status(500).json({
            mensagem: "Erro interno no servidor."
        });
    }
});

app.post("/login", async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            mensagem: "Digite email e senha."
        });
    }

    try {
        const resultado = await pool.query(
            "SELECT * FROM usuarios WHERE email = $1",
            [email]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensagem: "Email ou senha incorretos."
            });
        }

        const usuario = resultado.rows[0];
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

        if (!senhaCorreta) {
            return res.status(401).json({
                mensagem: "Email ou senha incorretos."
            });
        }

        return res.status(200).json({
            mensagem: "Login realizado com sucesso.",
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });
    } catch (erro) {
        console.error("Erro no login:", erro);
        return res.status(500).json({
            mensagem: "Erro interno no servidor."
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});