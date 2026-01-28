-- ==========================================
-- LIMPIAR DATOS ANTERIORES
-- ==========================================
DELETE FROM precios_sucursal;
DELETE FROM catalogo_procedimientos;

-- ==========================================
-- INSERTAR PROCEDIMIENTOS BASE
-- ==========================================
INSERT INTO catalogo_procedimientos (nombre, precio) VALUES 
('Consulta Oftalmológica', 500.00),
('Catarata', 12500.00),
('Pterigión con autoinjerto', 10500.00),
('Pterigión simple', 6500.00),
('Cirugía de Glaucoma', 30000.00),
('Cirugía Refractiva LASIK', 35000.00),
('Inyección Intravítrea', 8000.00),
('Fotocoagulación Retinal', 12000.00),
('Vitrectomía', 40000.00);

-- ==========================================
-- PRECIOS POR SUCURSAL
-- ==========================================

-- PUEBLA (usa precios base del catálogo)
INSERT INTO precios_sucursal (procedimiento_id, sucursal, precio) VALUES
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Catarata'), 'Puebla', 12500.00),
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Pterigión con autoinjerto'), 'Puebla', 10500.00),
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Pterigión simple'), 'Puebla', 6500.00);

-- OAXACA (usa precios base del catálogo)
INSERT INTO precios_sucursal (procedimiento_id, sucursal, precio) VALUES
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Catarata'), 'Oaxaca', 12500.00),
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Pterigión con autoinjerto'), 'Oaxaca', 10500.00),
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Pterigión simple'), 'Oaxaca', 6500.00);

-- TLAXCALA (usa precios base del catálogo)
INSERT INTO precios_sucursal (procedimiento_id, sucursal, precio) VALUES
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Catarata'), 'Tlaxcala', 12500.00),
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Pterigión con autoinjerto'), 'Tlaxcala', 10500.00),
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Pterigión simple'), 'Tlaxcala', 6500.00);

-- CDMX (usa precios base del catálogo)
INSERT INTO precios_sucursal (procedimiento_id, sucursal, precio) VALUES
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Catarata'), 'CDMX', 12500.00),
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Pterigión con autoinjerto'), 'CDMX', 10500.00),
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Pterigión simple'), 'CDMX', 6500.00);

-- AGUASCALIENTES (usa precios base del catálogo)
INSERT INTO precios_sucursal (procedimiento_id, sucursal, precio) VALUES
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Catarata'), 'Aguascalientes', 12500.00),
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Pterigión con autoinjerto'), 'Aguascalientes', 10500.00),
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Pterigión simple'), 'Aguascalientes', 6500.00);

-- VILLAHERMOSA (precios especiales sin estudios)
INSERT INTO precios_sucursal (procedimiento_id, sucursal, precio) VALUES
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Catarata'), 'Villahermosa', 11000.00),
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Pterigión con autoinjerto'), 'Villahermosa', 7500.00),
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Pterigión simple'), 'Villahermosa', 5500.00);

-- GUERRERO (precios más bajos)
INSERT INTO precios_sucursal (procedimiento_id, sucursal, precio) VALUES
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Catarata'), 'Guerrero', 8500.00),
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Pterigión con autoinjerto'), 'Guerrero', 7000.00),
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Pterigión simple'), 'Guerrero', 5000.00);

-- MATAMOROS
INSERT INTO precios_sucursal (procedimiento_id, sucursal, precio) VALUES
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Catarata'), 'Matamoros', 11500.00),
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Pterigión con autoinjerto'), 'Matamoros', 10500.00),
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Pterigión simple'), 'Matamoros', 8000.00);

-- COZUMEL
INSERT INTO precios_sucursal (procedimiento_id, sucursal, precio) VALUES
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Catarata'), 'Cozumel', 11500.00),
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Pterigión con autoinjerto'), 'Cozumel', 10500.00),
((SELECT id FROM catalogo_procedimientos WHERE nombre = 'Pterigión simple'), 'Cozumel', 8000.00);

-- ==========================================
-- VERIFICACIÓN
-- ==========================================
SELECT 'Procedimientos insertados:' AS resultado;
SELECT * FROM catalogo_procedimientos ORDER BY id;

SELECT '' AS separador;
SELECT 'Precios por sucursal:' AS resultado;
SELECT 
    ps.id,
    cp.nombre AS procedimiento,
    ps.sucursal,
    ps.precio
FROM precios_sucursal ps
JOIN catalogo_procedimientos cp ON cp.id = ps.procedimiento_id
ORDER BY ps.sucursal, cp.nombre;