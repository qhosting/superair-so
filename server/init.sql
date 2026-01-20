
-- --- TABLAS MAESTRAS (EXISTENTES Y NUEVAS) ---
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Instalador',
    status VARCHAR(20) DEFAULT 'Activo',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS manual_articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[],
    pdf_url TEXT,
    version VARCHAR(20) DEFAULT '1.0',
    author_name VARCHAR(255),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- NUEVA: Rastreo de lectura obligatoria para instaladores
CREATE TABLE IF NOT EXISTS manual_reads (
    article_id INTEGER REFERENCES manual_articles(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (article_id, user_id)
);

CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    rfc VARCHAR(15),
    type VARCHAR(20) DEFAULT 'Residencial',
    status VARCHAR(20) DEFAULT 'Activo',
    ltv DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    cost DECIMAL(12,2) NOT NULL,
    stock DECIMAL(12,2) DEFAULT 0,
    min_stock DECIMAL(12,2) DEFAULT 5,
    category VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS app_settings (
    category VARCHAR(50) PRIMARY KEY,
    data JSONB NOT NULL
);

-- --- DATOS INICIALES DEL MANUAL ---
INSERT INTO manual_articles (title, category, content, version, author_name) 
VALUES ('Seguridad en Alturas y Uso de Escaleras', 'Seguridad', '1. Siempre usar arnés de seguridad... 2. Verificar puntos de anclaje...', '1.0', 'Ingeniería SuperAir')
ON CONFLICT DO NOTHING;

INSERT INTO manual_articles (title, category, content, version, author_name) 
VALUES ('Protocolo de Vacío y Pruebas de Hermeticidad', 'Instalación', 'El vacío debe alcanzar al menos 500 micrones para garantizar...', '2.1', 'Ingeniería SuperAir')
ON CONFLICT DO NOTHING;

INSERT INTO app_settings (category, data) 
VALUES ('general_info', '{"companyName": "SuperAir", "isMaintenance": false}')
ON CONFLICT DO NOTHING;
