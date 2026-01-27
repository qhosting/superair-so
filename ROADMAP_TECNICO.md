# Roadmap Técnico y Plan de Implementación - SuperAir ERP

## 1. Análisis de Situación Actual (Deep Dive)

**Estado General:**
El proyecto cuenta con una **arquitectura Frontend robusta y completa** (React 19, Tailwind) y un **esquema de base de datos bien definido** (PostgreSQL). Sin embargo, el **Backend (Node.js/Express) está incompleto**. Solo los módulos de CRM (Leads, Clientes y Activos) están funcionalmente conectados.

El resto de los módulos (Ventas, Inventarios, Compras, Cotizaciones) tienen su interfaz lista y conectada a endpoints teóricos, pero **dichos endpoints no existen en el servidor**, lo que generará errores 404 y fallos funcionales inmediatos.

### Auditoría de Módulos

| Módulo | Estado Frontend | Estado Backend | Veredicto |
| :--- | :--- | :--- | :--- |
| **Auth** | ✅ Completo | ✅ Implementado | Funcional (con brecha de seguridad). |
| **Dashboard** | ✅ Completo | ⚠️ Parcial | Funciona Health/Leads. Faltan endpoints de métricas reales. |
| **Leads (CRM)** | ✅ Completo | ✅ Implementado | **100% Funcional**. Incluye conversión a clientes. |
| **Clientes** | ✅ Completo | ✅ Implementado | **100% Funcional**. Incluye vista 360 y activos. |
| **Cotizaciones** | ✅ Completo | ❌ **Ausente** | Frontend llama a `/api/quotes`, pero no existe en el backend. |
| **Inventario** | ✅ Completo | ❌ **Ausente** | Faltan `/api/products`, `/api/warehouses`, cargas masivas. |
| **Ventas** | ✅ Completo | ❌ **Ausente** | Faltan `/api/orders`, pagos, cierre técnico. |
| **Compras** | ✅ Completo | ❌ **Ausente** | Faltan `/api/purchases`, `/api/vendors`, recepción de stock. |
| **Reportes** | ✅ Completo | ❌ **Ausente** | Depende de endpoints de cotizaciones y citas no implementados. |

---

## 2. Detección de Errores Críticos y "Mockups"

Se han identificado "Mockups Funcionales" (código que simula funcionalidad pero falla al ejecutarse) y errores de seguridad:

### 🔴 Errores de Backend (Endpoints Faltantes)
El frontend intenta consumir las siguientes rutas que **NO están definidas** en `server/index.js`:
1.  **Inventario:**
    -   `GET/POST/PUT/DELETE /api/products`
    -   `POST /api/products/bulk` (Importación CSV)
    -   `GET /api/warehouses`
    -   `POST /api/inventory/adjust`
2.  **Ventas y Cotizaciones:**
    -   `GET/POST /api/quotes`
    -   `POST /api/quotes/ai-audit` (IA)
    -   `GET /api/orders`
    -   `POST /api/orders/pay`
    -   `POST /api/orders/:id/remind` (WhatsApp)
    -   `POST /api/orders/:id/close-technical`
3.  **Compras:**
    -   `GET/POST /api/purchases`
    -   `GET/POST /api/vendors`
    -   `GET /api/fiscal/inbox`
    -   `POST /api/purchases/ai-suggest`

### 🔒 Errores de Seguridad
1.  **Credenciales Hardcodeadas (Backdoor):**
    -   En `server/index.js`: Se detectó lógica que permite login con `admin@qhosting.net` y contraseña fija. **Debe eliminarse inmediatamente**.
2.  **Exposición de API Key (Frontend):**
    -   En `vite.config.ts`, la variable `API_KEY` se inyecta al cliente: `'process.env.API_KEY': JSON.stringify(env.API_KEY)`.
    -   Esto expone la llave de Gemini/Google AI a cualquiera que inspeccione el código fuente del navegador. **Solución:** Mover todas las llamadas de IA al Backend.

---

## 3. Roadmap de Implementación

Este plan prioriza conectar los "cables sueltos" para que el sistema sea funcional real ("nada simulado").

### Fase 1: Cimientos de Inventario (Prioridad Alta)
Sin productos, no hay cotizaciones ni ventas.
- [ ] Crear endpoints CRUD para `products` (`server/index.js`).
- [ ] Crear endpoints para `warehouses`.
- [ ] Implementar `POST /api/products/bulk` para carga inicial.
- [ ] Implementar lógica de `warehouse_stock` (tabla relacional).

### Fase 2: Motor Comercial (Cotizaciones y Ventas)
- [ ] Implementar endpoints de `quotes` (Guardar, Listar, Editar).
- [ ] Implementar generación de `orders` al aceptar una cotización.
- [ ] Implementar `POST /api/quotes/ai-audit` (Mover lógica de IA al backend para proteger la Key).

### Fase 3: Operaciones y Finanzas
- [ ] Implementar `vendors` y `purchases`.
- [ ] Implementar lógica de recepción de compra (`/receive`) que incremente el stock real.
- [ ] Implementar registro de pagos en `orders`.

### Fase 4: Refactorización de Seguridad
- [ ] Eliminar backdoor de `admin@qhosting.net`.
- [ ] Centralizar todas las llamadas a `GoogleGenAI` en `server/services.js` y crear endpoints puente.
- [ ] Eliminar `process.env.API_KEY` de `vite.config.ts`.

---

## 4. Plan de Acción Inmediato (Siguientes Pasos)

Para que el usuario pueda empezar a usar el sistema realmente, recomiendo ejecutar las siguientes acciones de código:

1.  **Limpieza:** Borrar el bloque de código de "Backdoor" en `server/index.js`.
2.  **Backend Inventario:** Añadir las rutas de Productos y Almacenes en `server/index.js`.
3.  **Backend Cotizaciones:** Añadir las rutas de Cotizaciones.

Este análisis confirma que, aunque el "cascarón" (Frontend + DB) es excelente, el "motor" (Backend) está al 30% de su capacidad.
