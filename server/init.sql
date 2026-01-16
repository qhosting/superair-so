
-- --- LIMPIEZA TOTAL ---
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS fiscal_inbox CASCADE;
DROP TABLE IF EXISTS inventory_transfers CASCADE;
DROP TABLE IF EXISTS product_serials CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS cms_content CASCADE;
DROP TABLE IF EXISTS manual_reads CASCADE;
DROP TABLE IF EXISTS manual_articles CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS purchase_items CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS inventory_levels CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS inventory_kits CASCADE;
DROP TABLE IF EXISTS client_assets CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- --- SEGURIDAD Y STAFF ---
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Instalador',
    status VARCHAR(20) DEFAULT 'Activo',
    last_login TIMESTAMP,
    last_password_change TIMESTAMP DEFAULT NOW()
);

-- --- CRM Y LEADS ---
CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    source VARCHAR(50) DEFAULT 'Web',
    status VARCHAR(50) DEFAULT 'Nuevo',
    notes TEXT,
    ai_score INTEGER,
    ai_analysis TEXT,
    history JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL, -- Rastro de conversión
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    rfc VARCHAR(15),
    type VARCHAR(20) DEFAULT 'Residencial',
    status VARCHAR(20) DEFAULT 'Activo',
    notes TEXT,
    last_service TIMESTAMP,
    ltv DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- --- INVENTARIO AVANZADO ---
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    cost DECIMAL(12,2) NOT NULL,
    stock DECIMAL(12,2) DEFAULT 0,
    min_stock DECIMAL(12,2) DEFAULT 5,
    category VARCHAR(100),
    type VARCHAR(20) DEFAULT 'product',
    unit_of_measure VARCHAR(20) DEFAULT 'Pza',
    requires_serial BOOLEAN DEFAULT FALSE
);

CREATE TABLE product_serials (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id INTEGER,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'En Stock', -- En Stock, Vendido, Merma
    order_id INTEGER, -- Vinculado cuando se vende
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'Unidad Móvil',
    responsible_id INTEGER REFERENCES users(id)
);

CREATE TABLE inventory_levels (
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    stock DECIMAL(12,2) DEFAULT 0,
    PRIMARY KEY (warehouse_id, product_id)
);

CREATE TABLE inventory_transfers (
    id SERIAL PRIMARY KEY,
    from_warehouse_id INTEGER REFERENCES warehouses(id),
    to_warehouse_id INTEGER REFERENCES warehouses(id),
    status VARCHAR(50) DEFAULT 'Pendiente', -- Pendiente, Completado, Cancelado
    items JSONB NOT NULL, -- [{product_id, quantity, name}]
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- --- VENTAS Y FISCAL ---
CREATE TABLE quotes (
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

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER REFERENCES quotes(id),
    client_id INTEGER REFERENCES clients(id),
    client_name VARCHAR(255),
    total DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pendiente',
    profit_margin DECIMAL(5,2) DEFAULT 0,
    commission DECIMAL(12,2) DEFAULT 0,
    due_date DATE,
    evidence_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity DECIMAL(12,2),
    price DECIMAL(12,2),
    cost DECIMAL(12,2)
);

CREATE TABLE fiscal_inbox (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(100) UNIQUE,
    rfc_emitter VARCHAR(15),
    rfc_receiver VARCHAR(15),
    legal_name VARCHAR(255),
    amount DECIMAL(12,2),
    xml_url TEXT,
    status VARCHAR(50) DEFAULT 'Unlinked', -- Unlinked, Linked
    linked_resource_id INTEGER, -- ID de orden o compra
    created_at TIMESTAMP DEFAULT NOW()
);

-- --- NOTIFICACIONES ---
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id), -- NULL para global
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(20) DEFAULT 'info', -- success, error, warning, info
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- --- MANTENIMIENTOS Y CONTENIDO ---
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    client_name VARCHAR(255),
    technician VARCHAR(255),
    date DATE NOT NULL,
    time TIME NOT NULL,
    duration INTEGER DEFAULT 60,
    type VARCHAR(50) DEFAULT 'Instalación',
    status VARCHAR(50) DEFAULT 'Programada'
);

CREATE TABLE client_assets (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    brand VARCHAR(100),
    model VARCHAR(100),
    btu INTEGER,
    type VARCHAR(50),
    install_date DATE,
    last_service DATE,
    notes TEXT
);

CREATE TABLE app_settings (
    category VARCHAR(50) PRIMARY KEY,
    data JSONB NOT NULL
);

CREATE TABLE cms_content (
    id SERIAL PRIMARY KEY,
    content JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- --- DATOS SEMILLA ---
INSERT INTO users (name, email, password, role, status) VALUES 
('Admin SuperAir', 'admin@superair.com.mx', 'admin123', 'Super Admin', 'Activo');

INSERT INTO warehouses (name, type) VALUES ('Almacén Central QRO', 'Central');

INSERT INTO products (code, name, description, price, cost, stock, min_stock, category, type, unit_of_measure) VALUES 
('HV-CS-12K', 'Carrier Minisplit 1 Ton 220v', 'Equipo solo frío, alta eficiencia, gas R410A', 8400.00, 5200.00, 15, 5, 'Equipos AC', 'product', 'Pza'),
('HV-MR-12K-INV', 'Mirage Inverter X 1 Ton', 'Tecnología Inverter, ahorro de energía 60%', 7200.00, 4800.00, 20, 10, 'Equipos AC', 'product', 'Pza'),
('SV-MANT-PREV', 'Mantenimiento Preventivo', 'Limpieza con químico y revisión de presiones', 850.00, 150.00, 999, 0, 'Servicios', 'service', 'Jgo');

INSERT INTO inventory_levels (warehouse_id, product_id, stock) 
SELECT 1, id, stock FROM products;
