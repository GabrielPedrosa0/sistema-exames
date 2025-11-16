CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    senha TEXT,
    tipo TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exames (
    id SERIAL PRIMARY KEY,
    paciente_nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    nome_exame TEXT NOT NULL,
    status TEXT NOT NULL,
    resultado_url TEXT
);
