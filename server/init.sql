
-- ... (mismo contenido anterior de creación de tablas) ...
-- (Se asume que las tablas ya existen por el script anterior, agregamos datos reales)

INSERT INTO products (code, name, description, price, cost, stock, min_stock, category, type, unit_of_measure) VALUES 
('HV-CS-12K', 'Carrier Minisplit 1 Ton 220v', 'Equipo solo frío, alta eficiencia, gas R410A', 8400.00, 5200.00, 15, 5, 'Equipos AC', 'product', 'Pza'),
('HV-CS-18K', 'Carrier Minisplit 1.5 Ton 220v', 'Equipo solo frío, ideal para áreas de 25m2', 12500.00, 8900.00, 8, 3, 'Equipos AC', 'product', 'Pza'),
('HV-MR-12K-INV', 'Mirage Inverter X 1 Ton', 'Tecnología Inverter, ahorro de energía 60%', 7200.00, 4800.00, 20, 10, 'Equipos AC', 'product', 'Pza'),
('MT-CO-1/4', 'Tubería de Cobre 1/4 (Rollo)', 'Rollo de 15 metros para instalación de AC', 1200.00, 850.00, 30, 10, 'Materiales', 'product', 'Mts'),
('MT-CO-1/2', 'Tubería de Cobre 1/2 (Rollo)', 'Rollo de 15 metros, espesor estándar', 1850.00, 1300.00, 25, 10, 'Materiales', 'product', 'Mts'),
('SV-INST-STD', 'Instalación Estándar 1 Ton', 'Mano de obra incluye hasta 4m de tubería', 1800.00, 800.00, 999, 0, 'Servicios', 'service', 'Jgo'),
('SV-MANT-PREV', 'Mantenimiento Preventivo', 'Limpieza con químico y revisión de presiones', 850.00, 150.00, 999, 0, 'Servicios', 'service', 'Jgo');

INSERT INTO vendors (name, rfc, email, status) VALUES 
('Carrier México S.A.', 'CME901010ABC', 'ventas@carrier.com.mx', 'Activo'),
('Mirage Distribuidora', 'MDI850505XYZ', 'pedidos@mirage.mx', 'Activo');

-- Vínculo inicial de stock en almacén central
INSERT INTO inventory_levels (warehouse_id, product_id, stock) 
SELECT 1, id, stock FROM products;
