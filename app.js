const express = require('express');
const Database = require('better-sqlite3');
const QRCode = require('qrcode');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const db = new Database('./database.db');

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'chave-secreta',
    resave: false,
    saveUninitialized: true
}));

// ------------------ Middlewares de proteção ------------------
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

app.post('/login', (req, res) => {
    const { cpf, senha } = req.body;

    // Verifica se é admin
    let stmt = db.prepare("SELECT * FROM usuarios WHERE cpf = ? AND senha = ?");
    let usuario = stmt.get(cpf, senha);

    if (!usuario) {
        // Verifica se é paciente
        stmt = db.prepare("SELECT * FROM usuarios WHERE cpf = ? AND tipo='paciente'");
        usuario = stmt.get(cpf);
    }

    if (!usuario) return res.render('login', { erro: 'CPF/SENHA inválidos' });

    req.session.usuario = { id: usuario.id, nome: usuario.nome, tipo: usuario.tipo, cpf: usuario.cpf };

    if (usuario.tipo === 'admin') res.redirect('/admin');
    else res.redirect('/paciente');
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

// ------------------ QR Code geral ------------------
app.get('/qr', async (req, res) => {
    const url = `http://localhost:3000/`;
    const qrDataURL = await QRCode.toDataURL(url);
    res.render('qr', { qrDataURL, url });
});

// ------------------ Página inicial ------------------
app.get('/', (req, res) => res.render('home'));

// ------------------ Página do admin ------------------
app.get('/admin', verificaAdmin, (req, res) => {
    const pacientes = db.prepare("SELECT * FROM usuarios WHERE tipo='paciente'").all();
    const pacientesComExames = pacientes.map(p => {
        const exames = db.prepare("SELECT * FROM exames WHERE cpf = ?").all(p.cpf);
        return { ...p, exames };
    });
    res.render('admin', { pacientes: pacientesComExames });
});

// Adicionar novo exame e criar paciente automático
app.post('/admin', verificaAdmin, (req, res) => {
    const { paciente_nome, cpf, nome_exame, status, resultado_url } = req.body;

    let stmt = db.prepare("SELECT * FROM usuarios WHERE cpf = ? AND tipo='paciente'");
    let paciente = stmt.get(cpf);

    if (!paciente) {
        stmt = db.prepare("INSERT INTO usuarios (nome, cpf, senha, tipo) VALUES (?, ?, ?, 'paciente')");
        stmt.run(paciente_nome, cpf, null);
    }

    stmt = db.prepare(`
        INSERT INTO exames (paciente_nome, cpf, nome_exame, status, resultado_url)
        VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(paciente_nome, cpf, nome_exame, status, resultado_url || null);

    res.redirect('/admin');
});

// Marcar exame como pronto
app.post('/admin/marcar-pronto', verificaAdmin, (req, res) => {
    const { exame_id, resultado_url } = req.body;
    db.prepare("UPDATE exames SET status = 'pronto', resultado_url = ? WHERE id = ?")
      .run(resultado_url || null, exame_id);
    res.redirect('/admin');
});

// Remover paciente
app.post('/admin/remover', verificaAdmin, (req, res) => {
    const { cpf } = req.body;
    db.prepare("DELETE FROM exames WHERE cpf = ?").run(cpf);
    db.prepare("DELETE FROM usuarios WHERE cpf = ? AND tipo='paciente'").run(cpf);
    res.redirect('/admin');
});

// ------------------ Página do paciente ------------------
app.get('/paciente', verificaPaciente, (req, res) => {
    const cpf = req.session.usuario.cpf;
    const stmt = db.prepare("SELECT * FROM exames WHERE cpf = ?");
    const exames = stmt.all(cpf);

    res.render('lista_exames', { paciente: req.session.usuario.nome, exames });
});

// ------------------ Iniciar servidor ------------------
app.listen(3000, () => console.log('Servidor rodando em http://localhost:3000'));
