
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

CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'Unidad Móvil',
    responsible_id INTEGER REFERENCES users(id)
);

-- NUEVA: Control de existencias por ubicación específica
CREATE TABLE IF NOT EXISTS warehouse_inventory (
    warehouse_id INTEGER REFERENCES warehouses(id),
    product_id INTEGER REFERENCES products(id),
    stock DECIMAL(12,2) DEFAULT 0,
    PRIMARY KEY (warehouse_id, product_id)
);

-- NUEVA: Plantillas de carga (Kits)
CREATE TABLE IF NOT EXISTS inventory_kits (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_kit_items (
    kit_id INTEGER REFERENCES inventory_kits(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (kit_id, product_id)
);

-- NUEVA: Registro de movimientos entre almacenes
CREATE TABLE IF NOT EXISTS inventory_transfers (
    id SERIAL PRIMARY KEY,
    from_warehouse_id INTEGER REFERENCES warehouses(id),
    to_warehouse_id INTEGER REFERENCES warehouses(id),
    status VARCHAR(50) DEFAULT 'Pendiente',
    items JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    client_name VARCHAR(255),
    total DECIMAL(12,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Borrador',
    payment_terms TEXT,
    items JSONB,
    public_token VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    technician VARCHAR(255),
    date DATE NOT NULL,
    time TIME NOT NULL,
    type VARCHAR(50) DEFAULT 'Instalación',
    status VARCHAR(50) DEFAULT 'Programada'
);

CREATE TABLE IF NOT EXISTS app_settings (
    category VARCHAR(50) PRIMARY KEY,
    data JSONB NOT NULL
);

-- --- DATOS DE ARRANQUE ---
INSERT INTO users (name, email, password, role, status) 
VALUES ('Admin SuperAir', 'admin@superair.com.mx', 'admin123', 'Super Admin', 'Activo')
ON CONFLICT DO NOTHING;

INSERT INTO warehouses (name, type) VALUES ('Almacén Central Queretaro', 'Central') ON CONFLICT DO NOTHING;

INSERT INTO app_settings (category, data) 
VALUES ('general_info', '{"companyName": "SuperAir", "isMaintenance": false}')
ON CONFLICT DO NOTHING;
