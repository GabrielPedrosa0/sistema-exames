// db.js — seleciona automaticamente SQLite (local) ou PostgreSQL (Render)

const isProduction = process.env.NODE_ENV === "production";

let db = {};

if (!isProduction) {
    // -----------------------------
    //   SQLITE LOCAL
    // -----------------------------
    const Database = require("better-sqlite3");
    const sqlite = new Database("./database.db");

    db.any = (query, params = []) => {
        const stmt = sqlite.prepare(query.replace(/\$\d+/g, '?'));
        return stmt.all(params);
    };

    db.oneOrNone = (query, params = []) => {
        const stmt = sqlite.prepare(query.replace(/\$\d+/g, '?'));
        return stmt.get(params) || null;
    };

    db.none = (query, params = []) => {
        const stmt = sqlite.prepare(query.replace(/\$\d+/g, '?'));
        stmt.run(params);
        return;
    };

    console.log("🟦 Usando SQLite LOCAL");
} else {
    // -----------------------------
    //   POSTGRES NO RENDER
    // -----------------------------
    const pgp = require("pg-promise")();

    const cn = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    };

    db = pgp(cn);

    console.log("🟩 Usando PostgreSQL PRODUÇÃO");
}

module.exports = db;
