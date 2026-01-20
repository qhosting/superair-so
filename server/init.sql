
-- --- TABLAS MAESTRAS ---
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Instalador',
    status VARCHAR(20) DEFAULT 'Activo',
    created_at TIMESTAMP DEFAULT NOW()
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
    category VARCHAR(100),
    unit_of_measure VARCHAR(20) DEFAULT 'Pza'
);

CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    order_id INTEGER, -- Vínculo opcional con orden de venta
    technician VARCHAR(255),
    date DATE NOT NULL,
    time TIME NOT NULL,
    duration INTEGER DEFAULT 60, -- Minutos estimados
    actual_duration INTEGER, -- Minutos reales tras cierre
    type VARCHAR(50) DEFAULT 'Instalación',
    status VARCHAR(50) DEFAULT 'Programada',
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
    category VARCHAR(50) PRIMARY KEY,
    data JSONB NOT NULL
);

-- --- DATOS DE ARRANQUE ---
INSERT INTO users (name, email, password, role, status) 
VALUES ('Admin SuperAir', 'admin@superair.com.mx', 'admin123', 'Super Admin', 'Activo')
ON CONFLICT DO NOTHING;

INSERT INTO app_settings (category, data) 
VALUES ('general_info', '{"companyName": "SuperAir", "isMaintenance": false}')
ON CONFLICT DO NOTHING;
