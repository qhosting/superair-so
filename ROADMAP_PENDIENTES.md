# 📋 ROADMAP PENDIENTES - SuperAir ERP

**Documento de Gestión de Tareas**  
**Fecha de Creación:** Febrero 2026  
**Última Actualización:** 01 Febrero 2026

---

## 🎯 Objetivo

Este documento lista las **tareas críticas, features pendientes y deuda técnica** del sistema SuperAir ERP, organizadas por prioridad para guiar el roadmap de desarrollo post-producción.

---

## 🚨 TAREAS CRÍTICAS (Seguridad y Bugs)

**Prioridad: ALTA** - Requieren atención inmediata

### 🔐 Seguridad

- [ ] **SEC-001**: Implementar rotación automática de JWT tokens (Refresh tokens)
  - **Descripción:** Actualmente los JWT expiran en 24h sin mecanismo de renovación
  - **Impacto:** Riesgo de secuestro de sesión si un token es comprometido
  - **Esfuerzo:** 2-3 días

- [ ] **SEC-002**: Configurar SSL/TLS en contenedor de producción
  - **Descripción:** El servidor escucha en HTTP plano (puerto 3000)
  - **Impacto:** Datos sensibles viajan sin encriptación
  - **Esfuerzo:** 1 día (configurar Nginx como reverse proxy con Let's Encrypt)

- [ ] **SEC-003**: Proteger endpoint de base de datos PostgreSQL
  - **Descripción:** El puerto 5432 está expuesto en Docker Compose
  - **Impacto:** Vector de ataque si el contenedor queda expuesto públicamente
  - **Esfuerzo:** 0.5 días (remover exposición de puerto, usar red interna Docker)

- [ ] **SEC-004**: Implementar 2FA (Autenticación de dos factores)
  - **Descripción:** Roles Admin y Contador deberían tener 2FA obligatorio
  - **Impacto:** Protección contra compromiso de credenciales
  - **Esfuerzo:** 3-5 días (integrar TOTP con QR codes)

- [ ] **SEC-005**: Auditoría de dependencias (npm audit)
  - **Descripción:** Verificar vulnerabilidades conocidas en paquetes npm
  - **Impacto:** Exposición a CVEs públicos
  - **Esfuerzo:** 1 día (ejecutar `npm audit fix` y validar)

### 🐛 Bugs Críticos

- [ ] **BUG-001**: Fuga de memoria en WebSocket (Socket.io)
  - **Descripción:** Sockets no se limpian correctamente en desconexiones abruptas
  - **Impacto:** El servidor puede quedarse sin memoria después de ~10,000 conexiones
  - **Esfuerzo:** 2 días (implementar `disconnect` handlers adecuados)

- [ ] **BUG-002**: Validación de archivos subidos (Multer)
  - **Descripción:** No hay validación de MIME types ni tamaño máximo estricto
  - **Impacto:** Posible subida de archivos maliciosos o DoS por archivos grandes
  - **Esfuerzo:** 1 día (agregar whitelist de extensiones y límite 10MB)

- [ ] **BUG-003**: Race condition en conversión de leads
  - **Descripción:** Múltiples clics en "Convertir a Cliente" pueden crear clientes duplicados
  - **Impacto:** Integridad de datos
  - **Esfuerzo:** 1 día (implementar locks transaccionales o idempotencia)

- [ ] **BUG-004**: Healthcheck fallando en contenedor por timeout
  - **Descripción:** El healthcheck de 10s puede fallar si la DB tarda en responder
  - **Impacto:** Kubernetes/Docker Swarm puede reiniciar el contenedor innecesariamente
  - **Esfuerzo:** 0.5 días (aumentar timeout a 15s o cachear status)

---

## ⭐ FEATURES NECESARIAS PARA PRODUCCIÓN

**Prioridad: MEDIA-ALTA** - Funcionalidades que mejorarán la experiencia de usuario y robustez del sistema

### 📊 Analytics y Monitoreo

- [ ] **FEAT-001**: Integrar Sentry para tracking de errores
  - **Descripción:** Sentry ya está en dependencias pero no configurado
  - **Impacto:** Visibilidad de errores en producción (frontend + backend)
  - **Esfuerzo:** 1 día
  - **Dependencias:** `@sentry/node`, `@sentry/react`

- [ ] **FEAT-002**: Dashboard de métricas de negocio en tiempo real
  - **Descripción:** Panel con KPIs actualizados cada minuto (conversión, ventas del día)
  - **Impacto:** Toma de decisiones informada
  - **Esfuerzo:** 3 días (usar Redis pub/sub + WebSockets)

- [ ] **FEAT-003**: Logs centralizados (ELK Stack o similar)
  - **Descripción:** Agregar un contenedor de logging (Elasticsearch + Kibana o Loki)
  - **Impacto:** Troubleshooting eficiente en producción
  - **Esfuerzo:** 4-5 días

### 💾 Backup y Recuperación

- [ ] **FEAT-004**: Backup automático de PostgreSQL
  - **Descripción:** Script `backup_db.sh` existe pero no está en cron
  - **Impacto:** Pérdida de datos en caso de fallo de disco
  - **Esfuerzo:** 1 día (configurar cron + subida a S3/Google Cloud Storage)

- [ ] **FEAT-005**: Estrategia de disaster recovery
  - **Descripción:** Documentar y probar procedimiento de restauración completa
  - **Impacto:** RTO (Recovery Time Objective) actualmente desconocido
  - **Esfuerzo:** 2 días (documentación + drill de recuperación)

### 🧾 Facturación Electrónica (México)

- [ ] **FEAT-006**: Integración con PAC para CFDI 4.0
  - **Descripción:** Generar facturas fiscales válidas (SAT México)
  - **Impacto:** Requisito legal para B2B en México
  - **Esfuerzo:** 10-15 días (integrar Finkok, PAC, o similar)

- [ ] **FEAT-007**: Catálogo de productos con clave SAT
  - **Descripción:** Agregar campo `clave_sat` a tabla `products`
  - **Impacto:** Necesario para facturación válida
  - **Esfuerzo:** 2 días (migración DB + UI)

### 📱 Aplicación Móvil (Técnicos de Campo)

- [ ] **FEAT-008**: PWA funcional offline
  - **Descripción:** `vite-plugin-pwa` está instalado pero no completamente configurado
  - **Impacto:** Técnicos podrían registrar órdenes sin internet
  - **Esfuerzo:** 5-7 días (service workers, IndexedDB sync)

- [ ] **FEAT-009**: App nativa React Native (opcional)
  - **Descripción:** Versión iOS/Android nativa para mejor experiencia móvil
  - **Impacto:** Acceso a cámara, GPS, notificaciones push nativas
  - **Esfuerzo:** 30-45 días (nuevo proyecto)

### 🔗 Integraciones Externas

- [ ] **FEAT-010**: Sincronización con QuickBooks/Conta
  - **Descripción:** Exportar ventas y compras a software contable
  - **Impacto:** Reducción de doble captura
  - **Esfuerzo:** 7-10 días (API de QuickBooks)

- [ ] **FEAT-011**: Mercado Pago / Stripe para pagos en línea
  - **Descripción:** Permitir a clientes pagar cotizaciones vía link
  - **Impacto:** Acelera cobranza
  - **Esfuerzo:** 5 días (webhooks + UI)

- [ ] **FEAT-012**: Google Calendar bidireccional
  - **Descripción:** Sincronizar citas en ambas direcciones
  - **Impacto:** Mejor gestión de agendas de técnicos
  - **Esfuerzo:** 3 días (Google Calendar API ya está en dependencias)

### 📧 Comunicaciones

- [ ] **FEAT-013**: Templates de email profesionales
  - **Descripción:** Diseñar plantillas HTML para cotizaciones, recordatorios, etc.
  - **Impacto:** Imagen profesional
  - **Esfuerzo:** 2 días (usar MJML o similar)

- [ ] **FEAT-014**: Notificaciones push en navegador
  - **Descripción:** Alertas de nuevos leads, pagos recibidos, etc.
  - **Impacto:** Reactividad del equipo de ventas
  - **Esfuerzo:** 2 días (Web Push API)

### 🎨 UX/UI

- [ ] **FEAT-015**: Modo oscuro (Dark Mode)
  - **Descripción:** Implementar tema oscuro en toda la aplicación
  - **Impacto:** Preferencia de usuarios, reduce fatiga visual
  - **Esfuerzo:** 4-5 días (Tailwind dark: variant)

- [ ] **FEAT-016**: Onboarding interactivo para nuevos usuarios
  - **Descripción:** Tour guiado al primer login
  - **Impacto:** Reduce curva de aprendizaje
  - **Esfuerzo:** 3 días (librería como Intro.js)

- [ ] **FEAT-017**: Accesibilidad (WCAG 2.1 AA)
  - **Descripción:** Navegación por teclado, lectores de pantalla, contraste
  - **Impacto:** Inclusión, cumplimiento legal en algunos mercados
  - **Esfuerzo:** 7-10 días (auditoría + remediación)

---

## 🛠️ DEUDA TÉCNICA

**Prioridad: MEDIA-BAJA** - Refactorización y optimización para mantenibilidad a largo plazo

### 🔄 Refactorización de Código

- [ ] **TECH-001**: Migrar `server/index.js` a arquitectura modular
  - **Descripción:** El archivo tiene 51,141 bytes (todo en un solo archivo)
  - **Impacto:** Dificulta mantenimiento y testing
  - **Esfuerzo:** 5-7 días (separar en `routes/`, `controllers/`, `middlewares/`)

- [ ] **TECH-002**: Tipado estricto en backend (migrar a TypeScript)
  - **Descripción:** El servidor está en JavaScript plano
  - **Impacto:** Errores de tipo en runtime, peor DX
  - **Esfuerzo:** 10-15 días (migración gradual)

- [ ] **TECH-003**: Extraer componentes React duplicados
  - **Descripción:** Hay patterns repetidos (tablas, modales, formularios)
  - **Impacto:** DRY violation, inconsistencias de UI
  - **Esfuerzo:** 3-4 días (crear componentes genéricos)

- [ ] **TECH-004**: Optimizar queries SQL (índices y N+1)
  - **Descripción:** Algunas queries no tienen índices en columnas frecuentes
  - **Impacto:** Rendimiento degrada con volumen de datos
  - **Esfuerzo:** 2-3 días (EXPLAIN queries, agregar índices)

### 📝 Documentación

- [ ] **TECH-005**: JSDoc completo en funciones críticas
  - **Descripción:** Muchas funciones no tienen documentación inline
  - **Impacto:** Dificulta onboarding de nuevos desarrolladores
  - **Esfuerzo:** 3 días

- [ ] **TECH-006**: Swagger/OpenAPI para API REST
  - **Descripción:** No hay documentación autogenerada de endpoints
  - **Impacto:** Integración de terceros es difícil
  - **Esfuerzo:** 2 días (swagger-jsdoc + swagger-ui-express)

- [ ] **TECH-007**: Diagramas de arquitectura (C4 Model)
  - **Descripción:** Falta documentación visual de arquitectura
  - **Impacto:** Dificulta comunicación con stakeholders
  - **Esfuerzo:** 2 días (usar draw.io o PlantUML)

### ⚡ Performance

- [ ] **TECH-008**: Lazy loading de módulos React
  - **Descripción:** Todos los módulos se cargan en bundle inicial
  - **Impacto:** Time to Interactive alto (~800KB bundle)
  - **Esfuerzo:** 2 días (React.lazy + Suspense)

- [ ] **TECH-009**: Caché de respuestas API con Redis
  - **Descripción:** Redis solo se usa para sesiones, no para caché de datos
  - **Impacto:** Queries repetitivas golpean la DB innecesariamente
  - **Esfuerzo:** 3 días (estrategia de invalidación)

- [ ] **TECH-010**: CDN para assets estáticos
  - **Descripción:** Imágenes y JS se sirven desde el contenedor app
  - **Impacto:** Latencia alta para usuarios geográficamente distantes
  - **Esfuerzo:** 1 día (configurar CloudFront o similar)

### 🧪 Testing

- [ ] **TECH-011**: Aumentar cobertura de unit tests a >80%
  - **Descripción:** Actualmente hay tests mínimos de ejemplo
  - **Impacto:** Regresiones no detectadas
  - **Esfuerzo:** 10-15 días (escribir tests para servicios críticos)

- [ ] **TECH-012**: Tests de carga (K6 o Artillery)
  - **Descripción:** No se ha probado concurrencia alta
  - **Impacto:** Comportamiento bajo carga desconocido
  - **Esfuerzo:** 3 días (escribir escenarios + ejecutar)

- [ ] **TECH-013**: Visual regression testing
  - **Descripción:** Cambios CSS pueden romper UI sin detección
  - **Impacto:** Bugs visuales en producción
  - **Esfuerzo:** 2 días (Percy.io o Chromatic)

### 🔧 DevOps

- [ ] **TECH-014**: Kubernetes Helm Charts
  - **Descripción:** Docker Compose no es ideal para clusters de producción
  - **Impacto:** Escalabilidad horizontal limitada
  - **Esfuerzo:** 5-7 días (crear charts, probar en Minikube)

- [ ] **TECH-015**: Canary deployments
  - **Descripción:** Actualmente se despliega todo o nada
  - **Impacto:** Riesgo alto en despliegues
  - **Esfuerzo:** 3 días (configurar en CI/CD)

- [ ] **TECH-016**: Secrets management (Vault o similar)
  - **Descripción:** API Keys en variables de entorno plano
  - **Impacto:** Rotación de secretos es manual
  - **Esfuerzo:** 4 días (integrar HashiCorp Vault o AWS Secrets Manager)

---

## 📊 Matriz de Priorización

| ID | Tarea | Prioridad | Esfuerzo | Impacto | Puntaje (I/E) |
|----|-------|-----------|----------|---------|---------------|
| SEC-002 | SSL/TLS | ALTA | 1d | CRÍTICO | ⭐⭐⭐⭐⭐ |
| SEC-003 | Proteger DB | ALTA | 0.5d | CRÍTICO | ⭐⭐⭐⭐⭐ |
| BUG-004 | Fix Healthcheck | ALTA | 0.5d | ALTO | ⭐⭐⭐⭐⭐ |
| FEAT-004 | Backup Auto | ALTA | 1d | CRÍTICO | ⭐⭐⭐⭐⭐ |
| SEC-001 | Refresh Tokens | ALTA | 2d | ALTO | ⭐⭐⭐⭐ |
| BUG-002 | Validación Files | ALTA | 1d | ALTO | ⭐⭐⭐⭐ |
| FEAT-001 | Sentry | MEDIA | 1d | ALTO | ⭐⭐⭐⭐ |
| FEAT-006 | Facturación CFDI | MEDIA | 15d | CRÍTICO | ⭐⭐⭐⭐ |
| TECH-001 | Modularizar server | MEDIA | 7d | MEDIO | ⭐⭐⭐ |
| FEAT-015 | Dark Mode | BAJA | 5d | BAJO | ⭐⭐ |

---

## 🎯 Sprints Sugeridos (Q1 2026)

### Sprint 1 (Semana 1-2): Seguridad Crítica
- SEC-002, SEC-003, SEC-005, BUG-002, BUG-004

### Sprint 2 (Semana 3-4): Monitoreo y Backup
- FEAT-001 (Sentry), FEAT-004 (Backup), FEAT-005 (DR)

### Sprint 3 (Semana 5-7): Facturación Fiscal
- FEAT-006, FEAT-007

### Sprint 4 (Semana 8-10): Deuda Técnica
- TECH-001, TECH-008, TECH-011

---

## 📌 Notas Finales

- **Criterios de Priorización:** Seguridad > Estabilidad > Funcionalidad > Performance > Deuda Técnica
- **Método Ágil:** Se recomienda gestión con Scrum (sprints de 2 semanas)
- **Ownership:** Asignar un responsable (DRI) por cada tarea crítica
- **Revisiones:** Este roadmap debe revisarse mensualmente

---

**Documento Vivo** - Se actualizará conforme se completen tareas o surjan nuevas prioridades.

**Última Actualización:** 01 Febrero 2026  
**Próxima Revisión:** 01 Marzo 2026
