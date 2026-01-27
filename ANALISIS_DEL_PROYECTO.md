# Análisis Detallado del Proyecto: SuperAir ERP

Este documento contiene un análisis técnico detallado del repositorio **SuperAir ERP**, un sistema de gestión para empresas de climatización (HVAC).

## 1. Resumen Ejecutivo
SuperAir ERP es una aplicación web completa (Full Stack) diseñada para administrar operaciones de instalación y mantenimiento de aire acondicionado. Incluye módulos para gestión de clientes (CRM), cotizaciones, inventario, ventas, reportes y automatización de flujos de trabajo.

## 2. Pila Tecnológica (Tech Stack)

### Frontend (Interfaz de Usuario)
- **Framework**: React 19
- **Build Tool**: Vite
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Iconos**: Lucide React
- **Gráficos**: Recharts
- **Generación de PDF**: jsPDF
- **Enrutamiento**: React Router DOM (HashRouter)

### Backend (Servidor)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Seguridad**: JWT (JSON Web Tokens) para autenticación, Bcrypt para hashing de contraseñas.
- **Base de Datos**: PostgreSQL (librería `pg`).
- **Caché/Colas**: Redis.
- **Integraciones**:
  - **Google GenAI (Gemini)**: Para análisis técnico de equipos HVAC.
  - **OpenAI**: Listado en dependencias.
  - **WhatsApp**: Vía WAHA (WhatsApp HTTP API).
  - **Email**: Nodemailer.

### Infraestructura y Contenedores
- **Docker & Docker Compose**: Orquestación de servicios.
- **Servicios definidos**:
  - `app`: La aplicación principal (Frontend servido + API Backend).
  - `db`: Base de datos PostgreSQL 15.
  - `redis`: Base de datos en memoria.
  - `n8n`: Automatización de flujos de trabajo (Low-code).
  - `waha`: API para integración con WhatsApp.

## 3. Estructura del Proyecto

- **`src/` (implícito en raíz y módulos)**:
  - **`modules/`**: Contiene la lógica de negocio modularizada (Dashboard, Clientes, Ventas, Inventario, etc.).
  - **`components/`**: Componentes reutilizables de UI.
  - **`context/`**: Manejo de estado global (Auth, Notificaciones).
  - **`App.tsx`**: Configuración de rutas y layout principal.

- **`server/`**:
  - **`index.js`**: Punto de entrada del servidor Express. Define endpoints API y sirve el frontend estático.
  - **`db.js`**: Configuración de conexión a PostgreSQL.
  - **`init.sql`**: Esquema inicial de la base de datos (tablas, relaciones).

- **Automatización**:
  - **`n8n_workflow.json`**: Flujo de automatización preconfigurado para Leads y Procesamiento Fiscal.
  - **`README_N8N.md`**: Instrucciones específicas para n8n.

## 4. Funcionalidades Clave Detectadas

1.  **Gestión de Prospectos (Leads) y Clientes**:
    - Captura de leads, conversión a clientes.
    - Vista 360 del cliente con historial de activos (equipos), citas y cotizaciones.
2.  **Activos y Mantenimiento**:
    - Registro de equipos instalados (Marca, Modelo, BTU).
    - **Diagnóstico IA**: Uso de Gemini (`@google/genai`) para analizar la obsolescencia de equipos y generar recomendaciones técnicas automáticas.
3.  **Ventas y Cotizaciones**:
    - Generación de cotizaciones con enlaces públicos (`/view/quote/:token`).
    - Módulo de punto de venta y compras.
4.  **Inventario y Almacenes**:
    - Gestión de productos y múltiples almacenes.
5.  **Herramientas Públicas**:
    - Constructor de Landing Pages (`LandingBuilder`).
    - Calculadora de carga térmica (referenciada como módulo).

## 5. Visualización de Cambios en Google AI Studio

Para responder a la pregunta: **"¿Cómo hacemos para que tus cambios también los visualice en Google AI Studio?"**

Como agente de IA, mis modificaciones se realizan directamente sobre el repositorio de código (Git). Para ver estos cambios reflejados en tu entorno de Google AI Studio, depende de cómo estés utilizando la herramienta:

1.  **Si usas Google AI Studio como entorno de prototipado conectado a Git (o Project IDX)**:
    - Debes realizar una operación de **Pull** o Sincronización desde el control de versiones.
    - Comando típico en terminal: `git pull origin <nombre-de-la-rama>`.
    - Esto descargará los archivos modificados (como este análisis) a tu entorno.

2.  **Si estás visualizando una "App" desplegada desde AI Studio**:
    - Es probable que necesites volver a desplegar o actualizar la fuente de datos si está conectada a este repositorio.

3.  **Recomendación**:
    - Utiliza siempre el control de versiones (Git) como la fuente de verdad.
    - Revisa los cambios que he enviado (commits) y fusiónalos (merge) en tu rama principal si estás satisfecho.

## 6. Observaciones de Seguridad
- Se detectó una credencial de administración hardcodeada en `server/index.js` (Línea 64 aprox). Se recomienda encarecidamente eliminarla o usar variables de entorno seguras para producción.
- La base de datos expone el puerto 5432 en el contenedor, asegúrese de protegerlo con firewalls si se despliega en un servidor público.
