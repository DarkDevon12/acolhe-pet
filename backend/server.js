const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const pool = require("./db");
require("dotenv").config();
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(cors());
app.use(express.json());

// ── VALIDAÇÃO DE SENHA ──────────────────────────
function validarSenha(senha) {
    return (
        senha.length >= 8 &&
        /[A-Z]/.test(senha) &&
        /[a-z]/.test(senha) &&
        /\d/.test(senha) &&
        /[^A-Za-z0-9]/.test(senha)
    );
}

app.get("/", (req, res) => res.send("API Acolhe Pet funcionando."));

// ── CADASTRO ────────────────────────────────────
app.post("/cadastro", async (req, res) => {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha)
        return res.status(400).json({ mensagem: "Preencha todos os campos." });
    if (!validarSenha(senha))
        return res.status(400).json({ mensagem: "Senha fraca." });
    try {
        const existe = await pool.query("SELECT id FROM usuarios WHERE email = $1", [email]);
        if (existe.rows.length > 0)
            return res.status(400).json({ mensagem: "Email já cadastrado." });
        const hash = await bcrypt.hash(senha, 10);
        const result = await pool.query(
            "INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1,$2,$3) RETURNING id, nome, email",
            [nome, email, hash]
        );
        res.status(201).json({ mensagem: "Cadastro realizado.", usuario: result.rows[0] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ mensagem: "Erro interno." });
    }
});

// ── LOGIN ───────────────────────────────────────
app.post("/login", async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha)
        return res.status(400).json({ mensagem: "Digite email e senha." });
    try {
        const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
        if (result.rows.length === 0)
            return res.status(401).json({ mensagem: "Email ou senha incorretos." });
        const usuario = result.rows[0];
        if (!await bcrypt.compare(senha, usuario.senha_hash))
            return res.status(401).json({ mensagem: "Email ou senha incorretos." });
        res.json({ mensagem: "Login realizado.", usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ mensagem: "Erro interno." });
    }
});

// ── POSTS ───────────────────────────────────────
app.get("/posts", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, u.nome AS nome_usuario, COUNT(c.id) AS total_curtidas
            FROM posts_adocao p
            JOIN usuarios u ON u.id = p.usuario_id
            LEFT JOIN curtidas c ON c.post_id = p.id
            GROUP BY p.id, u.nome
            ORDER BY p.criado_em DESC
        `);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ mensagem: "Erro ao buscar posts." });
    }
});

app.post("/posts", upload.single("imagem"), async (req, res) => {
    const { usuario_id, animal, sexo, raca, idade, cor, vacinas, castrado, historia, observacoes, estado, cidade } = req.body;
    if (!usuario_id || !animal || !sexo || !raca || !idade || !cor || !castrado || !estado || !cidade)
        return res.status(400).json({ mensagem: "Preencha os campos obrigatórios." });
    try {
        let imagemUrl = null;
        if (req.file) {
            const nome = `${Date.now()}-${req.file.originalname}`;
            const { error } = await supabase.storage.from(process.env.SUPABASE_BUCKET).upload(nome, req.file.buffer, { contentType: req.file.mimetype });
            if (error) return res.status(500).json({ mensagem: "Erro ao enviar imagem." });
            imagemUrl = supabase.storage.from(process.env.SUPABASE_BUCKET).getPublicUrl(nome).data.publicUrl;
        }
        const vacinasArray = vacinas ? JSON.parse(vacinas) : [];
        const result = await pool.query(
            `INSERT INTO posts_adocao (usuario_id,animal,sexo,raca,idade,cor,vacinas,castrado,historia,observacoes,estado,cidade,imagem_url)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
            [usuario_id, animal, sexo, raca, idade, cor, vacinasArray, castrado, historia, observacoes, estado, cidade, imagemUrl]
        );
        res.status(201).json({ mensagem: "Post criado.", post: result.rows[0] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ mensagem: "Erro ao criar post." });
    }
});

app.post("/posts/:id/curtir", async (req, res) => {
    const { usuario_id } = req.body;
    try {
        await pool.query(
            "INSERT INTO curtidas (usuario_id, post_id) VALUES ($1,$2) ON CONFLICT (usuario_id, post_id) DO NOTHING",
            [usuario_id, req.params.id]
        );
        res.json({ mensagem: "Post curtido." });
    } catch (e) {
        res.status(500).json({ mensagem: "Erro ao curtir." });
    }
});

app.patch("/posts/:id/adotado", async (req, res) => {
    const { usuario_id } = req.body;
    try {
        const result = await pool.query(
            "UPDATE posts_adocao SET adotado = TRUE WHERE id = $1 AND usuario_id = $2 RETURNING *",
            [req.params.id, usuario_id]
        );
        if (result.rows.length === 0)
            return res.status(403).json({ mensagem: "Você só pode marcar seus próprios posts." });
        res.json({ mensagem: "Marcado como adotado.", post: result.rows[0] });
    } catch (e) {
        res.status(500).json({ mensagem: "Erro ao marcar adotado." });
    }
});

// ── CHAT ────────────────────────────────────────

// Cria ou retorna conversa existente
app.post("/conversas", async (req, res) => {
    const { post_id, interessado_id } = req.body;
    if (!post_id || !interessado_id)
        return res.status(400).json({ mensagem: "Dados insuficientes." });
    try {
        const post = await pool.query("SELECT usuario_id, adotado FROM posts_adocao WHERE id = $1", [post_id]);
        if (post.rows.length === 0) return res.status(404).json({ mensagem: "Post não encontrado." });

        const dono_post_id = post.rows[0].usuario_id;
        if (Number(dono_post_id) === Number(interessado_id))
            return res.status(400).json({ mensagem: "Você não pode conversar consigo mesmo." });

        const existente = await pool.query(
            "SELECT * FROM conversas WHERE post_id = $1 AND interessado_id = $2",
            [post_id, interessado_id]
        );
        if (existente.rows.length > 0)
            return res.json({ conversa: existente.rows[0] });

        const nova = await pool.query(
            "INSERT INTO conversas (post_id, dono_post_id, interessado_id) VALUES ($1,$2,$3) RETURNING *",
            [post_id, dono_post_id, interessado_id]
        );
        res.status(201).json({ conversa: nova.rows[0] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ mensagem: "Erro ao criar conversa." });
    }
});

// Lista conversas do usuário logado
app.get("/minhas-conversas/:usuario_id", async (req, res) => {
    const { usuario_id } = req.params;
    try {
        const result = await pool.query(`
            SELECT 
                c.*,
                p.animal, p.imagem_url,
                u_dono.nome AS nome_dono,
                u_int.nome AS nome_interessado,
                (
                    SELECT m.mensagem FROM mensagens m
                    WHERE m.conversa_id = c.id
                    ORDER BY m.criado_em DESC LIMIT 1
                ) AS ultima_mensagem,
                (
                    SELECT m.criado_em FROM mensagens m
                    WHERE m.conversa_id = c.id
                    ORDER BY m.criado_em DESC LIMIT 1
                ) AS ultima_mensagem_em
            FROM conversas c
            JOIN posts_adocao p ON p.id = c.post_id
            JOIN usuarios u_dono ON u_dono.id = c.dono_post_id
            JOIN usuarios u_int ON u_int.id = c.interessado_id
            WHERE c.dono_post_id = $1 OR c.interessado_id = $1
            ORDER BY ultima_mensagem_em DESC NULLS LAST
        `, [usuario_id]);
        res.json(result.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ mensagem: "Erro ao buscar conversas." });
    }
});

// Lista mensagens de uma conversa
app.get("/conversas/:id/mensagens", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT m.*, u.nome AS remetente_nome
            FROM mensagens m
            JOIN usuarios u ON u.id = m.remetente_id
            WHERE m.conversa_id = $1
            ORDER BY m.criado_em ASC
        `, [req.params.id]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ mensagem: "Erro ao buscar mensagens." });
    }
});

// Envia mensagem
app.post("/conversas/:id/mensagens", async (req, res) => {
    const { remetente_id, mensagem } = req.body;
    if (!remetente_id || !mensagem)
        return res.status(400).json({ mensagem: "Dados insuficientes." });
    try {
        const result = await pool.query(
            "INSERT INTO mensagens (conversa_id, remetente_id, mensagem) VALUES ($1,$2,$3) RETURNING *",
            [req.params.id, remetente_id, mensagem]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ mensagem: "Erro ao enviar mensagem." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

// Conta mensagens não lidas do usuário
app.get("/mensagens-nao-lidas/:usuario_id", async (req, res) => {
    const { usuario_id } = req.params;
    try {
        const result = await pool.query(`
            SELECT COUNT(*) AS total
            FROM mensagens m
            JOIN conversas c ON c.id = m.conversa_id
            WHERE 
                m.remetente_id != $1
                AND m.lida = FALSE
                AND (c.dono_post_id = $1 OR c.interessado_id = $1)
        `, [usuario_id]);
        res.json({ total: Number(result.rows[0].total) });
    } catch (e) {
        res.status(500).json({ mensagem: "Erro ao contar mensagens." });
    }
});

// Marcar mensagens como lidas (adicione essa rota)
app.patch("/conversas/:id/mensagens/lidas", async (req, res) => {
    const { usuario_id } = req.body;
    try {
        await pool.query(`
            UPDATE mensagens 
            SET lida = TRUE 
            WHERE conversa_id = $1 AND remetente_id != $2
        `, [req.params.id, usuario_id]);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ mensagem: "Erro ao marcar como lida." });
    }
});