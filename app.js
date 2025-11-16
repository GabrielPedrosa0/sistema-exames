const express = require('express');
const QRCode = require('qrcode');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const db = require('./db'); // PostgreSQL

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'chave-secreta',
    resave: false,
    saveUninitialized: true
}));

// ------------------ Middlewares ------------------
function verificaAdmin(req, res, next) {
    if (req.session.usuario && req.session.usuario.tipo === 'admin') next();
    else res.redirect('/login');
}

function verificaPaciente(req, res, next) {
    if (req.session.usuario && req.session.usuario.tipo === 'paciente') next();
    else res.redirect('/login');
}

// ------------------ Login ------------------
app.get('/login', (req, res) => res.render('login', { erro: null }));

app.post('/login', async (req, res) => {
    const { cpf, senha } = req.body;

    let usuario = await db.oneOrNone(
        "SELECT * FROM usuarios WHERE cpf=$1 AND senha=$2",
        [cpf, senha]
    );

    if (!usuario) {
        usuario = await db.oneOrNone(
            "SELECT * FROM usuarios WHERE cpf=$1 AND tipo='paciente'",
            [cpf]
        );
    }

    if (!usuario) return res.render('login', { erro: 'CPF/SENHA inválidos' });

    req.session.usuario = {
        id: usuario.id,
        nome: usuario.nome,
        tipo: usuario.tipo,
        cpf: usuario.cpf
    };

    if (usuario.tipo === 'admin') res.redirect('/admin');
    else res.redirect('/paciente');
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

// ------------------ QR Code geral ------------------
app.get('/qr', async (req, res) => {
    const url = `https://seu-dominio.onrender.com/`;
    const qrDataURL = await QRCode.toDataURL(url);
    res.render('qr', { qrDataURL, url });
});

// ------------------ Página inicial ------------------
app.get('/', (req, res) => res.render('home'));

// ------------------ Página do admin ------------------
app.get('/admin', verificaAdmin, async (req, res) => {
    const pacientes = await db.any("SELECT * FROM usuarios WHERE tipo='paciente'");

    const pacientesComExames = [];
    for (const p of pacientes) {
        const exames = await db.any("SELECT * FROM exames WHERE cpf=$1", [p.cpf]);
        pacientesComExames.push({ ...p, exames });
    }

    res.render('admin', { pacientes: pacientesComExames });
});

// Adicionar novo exame e criar paciente automático
app.post('/admin', verificaAdmin, async (req, res) => {
    const { paciente_nome, cpf, nome_exame, status, resultado_url } = req.body;

    let paciente = await db.oneOrNone(
        "SELECT * FROM usuarios WHERE cpf=$1 AND tipo='paciente'",
        [cpf]
    );

    if (!paciente) {
        await db.none(
            "INSERT INTO usuarios (nome, cpf, senha, tipo) VALUES ($1, $2, $3, 'paciente')",
            [paciente_nome, cpf, null]
        );
    }

    await db.none(
        `INSERT INTO exames (paciente_nome, cpf, nome_exame, status, resultado_url)
         VALUES ($1, $2, $3, $4, $5)`,
        [paciente_nome, cpf, nome_exame, status, resultado_url || null]
    );

    res.redirect('/admin');
});

// Marcar exame como pronto
app.post('/admin/marcar-pronto', verificaAdmin, async (req, res) => {
    const { exame_id, resultado_url } = req.body;

    await db.none(
        "UPDATE exames SET status='pronto', resultado_url=$1 WHERE id=$2",
        [resultado_url || null, exame_id]
    );

    res.redirect('/admin');
});

// Remover paciente
app.post('/admin/remover', verificaAdmin, async (req, res) => {
    const { cpf } = req.body;

    await db.none("DELETE FROM exames WHERE cpf=$1", [cpf]);
    await db.none("DELETE FROM usuarios WHERE cpf=$1 AND tipo='paciente'", [cpf]);

    res.redirect('/admin');
});

// ------------------ Página do paciente ------------------
app.get('/paciente', verificaPaciente, async (req, res) => {
    const cpf = req.session.usuario.cpf;

    const exames = await db.any(
        "SELECT * FROM exames WHERE cpf=$1",
        [cpf]
    );

    res.render('lista_exames', {
        paciente: req.session.usuario.nome,
        exames
    });
});

// ------------------ Iniciar servidor ------------------
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));
