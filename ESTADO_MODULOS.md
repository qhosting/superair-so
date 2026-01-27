# Estado Detallado de los Módulos del Sistema

Este documento presenta un análisis exhaustivo del estado actual de implementación de cada módulo en el ERP SuperAir, contrastando el frontend con el backend y destacando las áreas pendientes.

## 1. Tabla de Estado General

| Módulo | Frontend | Backend | Estatus General | Notas |
| :--- | :---: | :---: | :---: | :--- |
| **Autenticación** | ✅ | ✅ | **Completo** | Login, JWT, Roles, Backdoor eliminado. |
| **Dashboard** | ✅ | ✅ | **Completo** | Stats reales, IA (via proxy), WebSockets. |
| **Leads (CRM)** | ✅ | ✅ | **Completo** | CRUD, Conversión, Historial, Auth Fixed. |
| **Clientes** | ✅ | ✅ | **Completo** | CRUD, Vista 360, Activos, IA Análisis. |
| **Cotizaciones** | ✅ | ✅ | **Completo** | CRUD, PDF Backend, IA Audit. |
| **Ventas (Ordenes)**| ✅ | ✅ | **Completo** | Listado, Pagos, Evidencia (Upload), WhatsApp. |
| **Inventario** | ✅ | ✅ | **Completo** | Productos (CRUD), Bulk, Ajustes. |
| **Compras** | ✅ | ✅ | **Completo** | Proveedores, Órdenes, Recepción, IA Suggest. |
| **Reportes** | ✅ | ✅ | **Completo** | Financieros (SQL Agg), IA Analysis. |
| **Usuarios** | ✅ | ❌ | **Incompleto** | Frontend llama a `/api/users`, backend no lo tiene. |
| **Configuración** | ✅ | ❌ | **Incompleto** | Frontend llama a `/api/settings`, backend no lo tiene. |
| **Almacenes** | ✅ | ⚠️ | **Parcial** | Frontend llama a `/api/inventory/levels/:id` y `/api/inventory/transfer`, backend incompleto. |
| **Base de Conoc.** | ✅ | ❌ | **Incompleto** | Frontend llama a `/api/manuals`, backend no lo tiene. |
| **Citas** | ✅ | ⚠️ | **Parcial** | `GET` implementado, falta `POST/PUT` para crear citas. |
| **Landing Page** | ✅ | ❌ | **Incompleto** | Frontend llama a `/api/cms/content`, backend no lo tiene. |

## 2. Análisis de Brechas (Gap Analysis)

### 🔴 Módulos Críticos Faltantes en Backend

1.  **Gestión de Usuarios (`/api/users`, `/api/audit-logs`)**
    *   **Frontend (`Users.tsx`):** Intenta listar usuarios, ver logs de auditoría y "impersonar".
    *   **Backend:** No existen endpoints para listar usuarios (`GET /api/users`), ni logs (`GET /api/audit-logs`).
    *   **Impacto:** No se pueden gestionar empleados ni ver quién hizo qué.

2.  **Configuración del Sistema (`/api/settings`)**
    *   **Frontend (`Settings.tsx`):** Intenta leer/guardar configuraciones globales (marketing, tesorería, diseño).
    *   **Backend:** No existen endpoints `GET/POST /api/settings`.
    *   **Impacto:** La personalización del sistema no persiste.

3.  **Base de Conocimiento (`/api/manuals`)**
    *   **Frontend (`KnowledgeBase.tsx`):** Sistema completo de manuales con IA.
    *   **Backend:** Faltan todos los endpoints (`GET`, `POST`, `ai-generate`, `ai-ask`).
    *   **Impacto:** Módulo totalmente inoperativo.

4.  **CMS / Landing Page (`/api/cms/content`)**
    *   **Frontend (`LandingPage.tsx`, `LandingBuilder.tsx`):** Editor visual de la landing pública.
    *   **Backend:** No hay persistencia del contenido.
    *   **Impacto:** Los cambios en la web pública no se guardan.

### ⚠️ Módulos Parcialmente Implementados

1.  **Almacenes y Logística (`WarehouseManager.tsx`)**
    *   **Faltan:** `/api/inventory/levels/:id`, `/api/inventory/transfer`, `/api/inventory/transfers/pending/:id`, `/api/inventory/kits`.
    *   **Estado:** Solo existe `GET /api/warehouses`.

2.  **Citas (`Appointments.tsx`)**
    *   **Faltan:** `POST /api/appointments` (Crear), `PUT /api/appointments/:id` (Editar), `DELETE`.
    *   **Estado:** Solo existe `GET /api/appointments`.

## 3. Plan de Acción Recomendado

Para lograr el estado "100% Funcional", se deben implementar los siguientes controladores en `server/index.js`:

1.  **Prioridad 1: Usuarios y Configuración** (Base del sistema)
    *   Implementar CRUD de `users`.
    *   Implementar almacenamiento de `app_settings` (clave-valor JSON).
2.  **Prioridad 2: Operatividad (Citas y Almacenes)**
    *   Completar el flujo de Citas (Agendar, Reprogramar).
    *   Implementar lógica de Traspasos de Inventario (Transferencias entre almacenes).
3.  **Prioridad 3: Extras (Manuales y CMS)**
    *   Implementar tabla `manual_articles` y endpoints.
    *   Implementar persistencia del CMS.
