
-- --- SUPER AIR ERP: ESQUEMA MAESTRO ---

-- Usuarios y Seguridad
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Instalador',
    status VARCHAR(20) DEFAULT 'Activo',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Clientes y CRM
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
    last_service TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Activos de Clientes (Equipos Instalados)
CREATE TABLE IF NOT EXISTS client_assets (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    brand VARCHAR(100),
    model VARCHAR(100),
    btu INTEGER,
    type VARCHAR(50),
    install_date DATE,
    last_service DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Leads y Prospectos
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    source VARCHAR(100) DEFAULT 'Web',
    status VARCHAR(50) DEFAULT 'Nuevo',
    notes TEXT,
    history JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Productos y Servicios
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    cost DECIMAL(12,2) NOT NULL,
    stock DECIMAL(12,2) DEFAULT 0,
    min_stock DECIMAL(12,2) DEFAULT 5,
    category VARCHAR(100),
    unit_of_measure VARCHAR(20) DEFAULT 'Pza',
    type VARCHAR(20) DEFAULT 'product'
);

-- Almacenes y Unidades Móviles
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'Unidad Móvil',
    responsible_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Inventario por Almacén
CREATE TABLE IF NOT EXISTS warehouse_stock (
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    stock DECIMAL(12,2) DEFAULT 0,
    PRIMARY KEY (warehouse_id, product_id)
);

-- Kits de Inventario (Kartas de Carga)
CREATE TABLE IF NOT EXISTS inventory_kits (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_kit_items (
    kit_id INTEGER REFERENCES inventory_kits(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (kit_id, product_id)
);

-- Traspasos entre Almacenes
CREATE TABLE IF NOT EXISTS inventory_transfers (
    id SERIAL PRIMARY KEY,
    from_warehouse_id INTEGER REFERENCES warehouses(id),
    to_warehouse_id INTEGER REFERENCES warehouses(id),
    status VARCHAR(50) DEFAULT 'Pendiente',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_transfer_items (
    transfer_id INTEGER REFERENCES inventory_transfers(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (transfer_id, product_id)
);

-- Cotizaciones
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    total DECIMAL(12,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Borrador',
    payment_terms TEXT,
    items JSONB NOT NULL,
    public_token VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Órdenes de Venta y Cobranza
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id),
    total DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    cost_total DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pendiente',
    due_date DATE,
    evidence_url TEXT,
    profit_margin DECIMAL(5,2),
    items JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Proveedores
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rfc VARCHAR(15),
    email VARCHAR(255),
    phone VARCHAR(20),
    credit_days INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Activo'
);

-- Órdenes de Compra
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES vendors(id),
    warehouse_id INTEGER REFERENCES warehouses(id),
    total DECIMAL(12,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Borrador',
    fiscal_uuid VARCHAR(100),
    items JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agenda de Citas
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    technician_id INTEGER REFERENCES users(id),
    technician_name VARCHAR(255),
    date DATE NOT NULL,
    time TIME NOT NULL,
    duration INTEGER DEFAULT 60,
    type VARCHAR(100) DEFAULT 'Mantenimiento',
    status VARCHAR(50) DEFAULT 'Programada',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bóveda Fiscal
CREATE TABLE IF NOT EXISTS fiscal_inbox (
    uuid VARCHAR(100) PRIMARY KEY,
    rfc_emitter VARCHAR(15),
    rfc_receiver VARCHAR(15),
    legal_name VARCHAR(255),
    amount DECIMAL(12,2),
    xml_url TEXT,
    origin_email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Unlinked',
    received_at TIMESTAMP DEFAULT NOW()
);

-- Configuración del Sistema
CREATE TABLE IF NOT EXISTS app_settings (
    category VARCHAR(50) PRIMARY KEY,
    data JSONB NOT NULL
);

-- Manuales y Capacitación
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

CREATE TABLE IF NOT EXISTS manual_reads (
    article_id INTEGER REFERENCES manual_articles(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (article_id, user_id)
);

-- Logs Forenses
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_name VARCHAR(255),
    action VARCHAR(50),
    resource VARCHAR(100),
    resource_id VARCHAR(50),
    changes JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- --- DATOS INICIALES SEMILLA ---

-- Almacén Central por defecto
INSERT INTO warehouses (id, name, type) VALUES (1, 'Almacén Central Queretaro', 'Central') ON CONFLICT DO NOTHING;

-- Usuario Admin QHosting solicitado: admin@qhosting.net / x0420EZS*
INSERT INTO users (name, email, password, role, status) 
VALUES ('SuperAdmin QHosting', 'admin@qhosting.net', '$2a$10$Y5n2rM5kE/HlB8v5L6mFkO4P.r6n8Z7M9y2D8t2G1R9vK/lE4yS6g', 'Super Admin', 'Activo')
ON CONFLICT (email) DO NOTHING;

-- Admin de respaldo SuperAir
INSERT INTO users (name, email, password, role, status) 
VALUES ('Administrador Maestro', 'admin@superair.com.mx', '$2a$10$r6R9vK/lE4yS6g9oXp4oUeI.x7T9M2p8jW7F/2iY8uSg6z5X8y2', 'Super Admin', 'Activo')
ON CONFLICT (email) DO NOTHING;

-- Configuraciones de Identidad Base
INSERT INTO app_settings (category, data) 
VALUES ('general_info', '{"companyName": "SuperAir", "isMaintenance": false, "logoUrl": "https://cdn-icons-png.flaticon.com/512/1169/1169382.png"}')
ON CONFLICT (category) DO NOTHING;

-- Configuración de Diseño de Cotización por Defecto
INSERT INTO app_settings (category, data)
VALUES ('quote_design', '{"primaryColor": "#0ea5e9", "documentTitle": "Propuesta Técnica y Económica", "slogan": "Ingeniería en Confort", "footerNotes": "Garantía de 30 días en mano de obra.", "showIvaDetail": true, "showSignLine": true, "accentColor": "#0f172a"}')
ON CONFLICT (category) DO NOTHING;

-- Contenido Inicial de la Landing Page (Para evitar pantalla en blanco)
INSERT INTO app_settings (category, data)
VALUES ('landing_content', '[
    {"id": "h1", "type": "hero", "title": "Climatización de Alto Rendimiento", "subtitle": "Expertos en instalación y mantenimiento de aire acondicionado industrial y residencial.", "buttonText": "Cotizar ahora", "imageUrl": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2069"},
    {"id": "s1", "type": "services", "title": "Nuestras Soluciones", "subtitle": "Ingeniería aplicada al confort de tus espacios.", "items": [
        {"title": "Instalación", "desc": "Equipos Mini Split e Industriales con garantía de vacío.", "icon": "wrench", "image": "https://images.unsplash.com/photo-1621905252507-b354bcadcabc?q=80&w=2070"},
        {"title": "Mantenimiento", "desc": "Limpieza profunda y revisión de parámetros eléctricos.", "icon": "shield", "image": "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070"}
    ]}
]')
ON CONFLICT (category) DO NOTHING;
