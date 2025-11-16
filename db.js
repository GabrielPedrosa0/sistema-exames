const pgp = require("pg-promise")();

const cn = process.env.DATABASE_URL;

const db = pgp({
    connectionString: cn,
    ssl: { rejectUnauthorized: false }
});

module.exports = db;
