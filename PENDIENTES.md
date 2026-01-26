# Lista de Pendientes Técnicos y Refinamientos

Este documento detalla las tareas restantes para alcanzar una madurez del 100% en el sistema SuperAir ERP, asegurando que no haya "simulaciones" y que la seguridad sea robusta.

## 1. Tareas de Alta Prioridad (Seguridad y Estabilidad)

- [ ] **Eliminar exposición de API Key en Frontend:**
  -   Actualmente `vite.config.ts` define `'process.env.API_KEY': JSON.stringify(env.API_KEY)`.
  -   Esto expone la llave de Google Gemini al navegador.
  -   **Acción:** Eliminar esta línea de `vite.config.ts` y refactorizar cualquier módulo de React (ej. `Dashboard.tsx`, `Reports.tsx`) que use `new GoogleGenAI()` directamente. Estas llamadas deben pasar por un endpoint del backend (como se hizo con `/api/quotes/ai-audit`).

- [ ] **Validación de `server/services.js`:**
  -   Asegurar que el servicio `sendWhatsApp` maneje correctamente los timeouts y errores de red para no bloquear el hilo principal de Node.js.

## 2. Refinamientos de "Cero Simulación"

- [ ] **Módulo de Reportes (`Reports.tsx`):**
  -   Actualmente calcula métricas financieras descargando *todas* las cotizaciones y filtrándolas en el cliente (`quotes.filter(...)`).
  -   **Mejora:** Crear un endpoint `/api/reports/financial` que use `SUM()` y `GROUP BY` en SQL para delegar el cálculo pesado a la base de datos.

- [ ] **Calculadora de Carga Térmica (`Calculator.tsx`):**
  -   Actualmente es 100% lógica cliente (JavaScript).
  -   **Mejora:** Guardar los cálculos realizados en una tabla `leads` o `audit_logs` para que el equipo de ventas pueda dar seguimiento a qué usuarios usaron la calculadora.

- [ ] **Gestión de Archivos (PDFs/Imágenes):**
  -   La generación de PDFs (Cotizaciones) se hace con `jspdf` en el cliente.
  -   La subida de evidencias (`evidence_url` en Ordenes) espera una URL de texto.
  -   **Falta:** Implementar subida de archivos real (Multer) a disco o S3 para que las evidencias sean archivos reales y no solo links externos.

## 3. Integraciones Faltantes

- [ ] **Webhooks de Stripe/Pagos:**
  -   El registro de pagos actual es manual. Integrar una pasarela real automatizaría el estado "Pagado".

## 4. Próximos Pasos Recomendados

1.  Refactorizar `Dashboard.tsx` para usar un endpoint de métricas (`/api/dashboard/stats`) en lugar de pedir 3 arrays gigantes y calcular en frontend.
2.  Implementar el middleware de subida de archivos para "Evidencia Técnica".
