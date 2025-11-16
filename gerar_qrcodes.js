const Database = require('better-sqlite3');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const db = new Database('./database.db');

// Busca todos os exames
const exames = db.prepare("SELECT * FROM exames").all();

// Gera QR code para cada exame
exames.forEach(async (exame) => {
    const url = `http://localhost:3000/consulta/${exame.id}`;
    const filePath = path.join(__dirname, 'qrcodes', `exame_${exame.id}.png`);

    try {
        await QRCode.toFile(filePath, url, {
            color: {
                dark: '#000',  // QR code preto
                light: '#FFF'  // fundo branco
            }
        });
        console.log(`QR code gerado: ${filePath}`);
    } catch (err) {
        console.error('Erro ao gerar QR code:', err);
    }
});
