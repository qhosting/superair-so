# Lista de Pendientes Técnicos y Refinamientos

Este documento detalla el estado actual de las tareas técnicas del sistema SuperAir ERP.

## 1. Tareas de Alta Prioridad (Seguridad y Estabilidad)

- [x] **Eliminar exposición de API Key en Frontend:**
  -   Se eliminó la inyección de `process.env.API_KEY` en `vite.config.ts`.
  -   Todas las llamadas a Google GenAI ahora se realizan desde el backend.

- [x] **Validación de `server/services.js`:**
  -   El servicio `sendWhatsApp` está implementado y se utiliza en el backend para recordatorios de pago.

## 2. Refinamientos de "Cero Simulación"

- [x] **Módulo de Reportes (`Reports.tsx`):**
  -   Se implementó `/api/reports/financial` para realizar agregaciones SQL en el servidor.
  -   El frontend consume este endpoint en lugar de calcular métricas localmente.

- [x] **Calculadora de Carga Térmica (`Calculator.tsx`):**
  -   Se implementó `/api/calculator/log` para registrar el uso de la herramienta en la base de datos (tabla `audit_logs`).

- [x] **Gestión de Archivos (PDFs/Imágenes):**
  -   Se implementó la subida de archivos con `multer` en el endpoint `/api/upload`.
  -   El módulo de Ventas permite subir evidencia técnica (imágenes/PDFs) real.

## 3. Funcionalidades Avanzadas

- [x] **Generación de PDF en Backend:**
  -   Implementado endpoint `/api/quotes/:id/pdf` usando `pdfkit`.

- [x] **Notificaciones en Tiempo Real:**
  -   Implementado `Socket.io` para actualizaciones automáticas en Dashboard y Leads.

- [x] **Tests Automatizados:**
  -   Configurado Jest y Playwright. Scripts `test` y `test:e2e` funcionales.

## 4. Integraciones Faltantes (Futuro)

- [ ] **Webhooks de Stripe/Pagos:**
  -   El registro de pagos actual es manual. Integrar una pasarela real automatizaría el estado "Pagado".

## 5. Próximos Pasos Recomendados

- [ ] Implementar CI/CD Pipeline en proveedor Cloud.
- [ ] Optimización de índices de base de datos (Script inicial creado).
