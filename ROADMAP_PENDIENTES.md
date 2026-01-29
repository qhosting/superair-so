# Roadmap y Pendientes - SuperAir ERP

Este documento consolida el estado actual del proyecto, los logros recientes y la hoja de ruta para el desarrollo futuro.

---

## 1. Estado Actual (v1.3.1 - Producción)

El sistema opera bajo una arquitectura **Full Stack (React + Node.js + PostgreSQL)** completamente funcional. No existen módulos simulados; toda la información es persistente y segura.

### ✅ Módulos Completados
*   **Gestión Comercial:** Leads (CRM), Clientes 360°, Cotizaciones (PDF + IA).
*   **Operaciones:** Ventas (Cobranza), Inventario, Almacenes, Compras.
*   **Administración:** Usuarios (RBAC), Configuración Global, Reportes Financieros.
*   **Tecnología:** PWA (Instalable), Exportación Excel, Migraciones Automáticas de DB.
*   **DevOps:** Monitoreo (Sentry), Backups Automáticos, CI/CD (GitHub Actions).

---

## 2. Políticas de Desarrollo (Workflow)

*   **Git como Fuente de Verdad:** Todo cambio debe pasar por el repositorio. No realizar ediciones manuales directas en el servidor de producción.
*   **Ramas y Merges:** Las nuevas funcionalidades se desarrollan en ramas y se fusionan a `main` tras validación.
*   **Despliegue:** El push a `main` dispara la construcción de la imagen Docker y la publicación en el registro (CI/CD).

---

## 3. Hoja de Ruta (Roadmap)

### 🔴 Alta Prioridad (Inmediato / Mantenimiento)
Estas tareas están enfocadas en la calidad de los datos y la robustez del día a día.

- [ ] **Validación de Inputs (Input Masks):**
    - Implementar formato automático para teléfonos `(555) 123-4567` en formularios de Leads y Clientes.
    - Validar formato de RFC y Emails antes de enviar al servidor.
- [ ] **Testing E2E Crítico:**
    - Crear test automatizado para el flujo completo: *Crear Lead -> Convertir a Cliente -> Crear Cotización -> Aprobar -> Generar Orden*.

### 🟡 Mediano Plazo (Mejoras de Experiencia)
Mejoras para agilizar el trabajo de los operativos.

- [ ] **Optimización Móvil (Tablas):**
    - Refinar la vista de tablas complejas (Inventario, Ventas) en celulares, usando tarjetas (Cards) en lugar de filas horizontales para evitar scroll excesivo.
- [ ] **Modo Offline (Service Worker):**
    - Configurar estrategias de caché avanzadas para que los técnicos puedan consultar manuales o ver citas sin internet.
- [ ] **Notificaciones Push Nativas:**
    - Integrar claves VAPID para enviar alertas reales al celular (Citas nuevas, Stock bajo) incluso con la app cerrada.

### 🔵 Largo Plazo (Innovación)
Funcionalidades avanzadas para escalar el negocio.

- [ ] **Chatbot IA Bidireccional (WhatsApp):**
    - Conectar el backend con la API de Meta o WAHA para que un agente de IA responda dudas básicas de clientes y agende citas automáticamente.
- [ ] **Integración de Pagos Online:**
    - Generar enlaces de pago (Stripe/PayPal) en las cotizaciones para que los clientes paguen con tarjeta.
- [ ] **Portal de Cliente:**
    - Una vista simplificada donde el cliente final pueda loguearse para ver sus facturas, equipos y solicitar mantenimiento.

---

## 3. Logros Recientes (Changelog)

*   **Fix Clientes 360:** Se amplió la ventana de expediente y se reparó el botón de cierre que estaba bloqueado por elementos decorativos.
*   **Módulo Usuarios:** Se activó la creación y edición de usuarios reales (anteriormente faltaba la interfaz).
*   **Fix Leads:** Se corrigieron los permisos de API para permitir que los vendedores vean sus propios prospectos sin errores de sesión.
*   **Estabilidad DB:** Implementación de sistema de migraciones que repara automáticamente tablas faltantes (ej. `contact_name` en clientes).
*   **Infraestructura:** Implementación de **Sentry** (Monitoreo), **Backups Automáticos** (PostgreSQL Daily) y **CI/CD** (Docker Push a GHCR).
