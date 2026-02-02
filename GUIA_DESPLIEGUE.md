# Guía de Despliegue y Actualización - SuperAir ERP

Para ver reflejados los cambios recientes (backend real, eliminación de leads, PDFs, etc.) en tu entorno de producción (Easypanel / Google AI Studio), sigue estos pasos:

## 1. Sincronización de Código (Git)

Como he estado trabajando en una rama separada, necesitas integrar estos cambios en tu rama principal (`main` o `master`).

### Si estás usando GitHub Desktop o Terminal:
1.  **Revisar cambios:** `git fetch origin`
2.  **Fusionar rama:** `git merge feat/delete-lead-and-fix-conversion-v2` (o el nombre de la última rama que envié).
3.  **Subir cambios:** `git push origin main`

## 2. Despliegue en Easypanel

Una vez que el código esté en GitHub/GitLab:

1.  **Easypanel detectará el push automáticamente** (si tienes configurado el webhook) y comenzará el "Build".
2.  **Forzar Rebuild (Opcional):** Si no ves cambios, ve a tu proyecto en Easypanel -> Servicio `app` -> "Deploy" -> "Rebuild without cache". Esto es importante porque hemos cambiado `package.json`.

## 3. Verificación de Base de Datos

Hemos añadido una **migración automática** en el arranque del servidor (`server/init.sql`) que:
1.  Crea la columna faltante `contact_name` en la tabla `clients`.
2.  Crea índices de rendimiento.

**No necesitas ejecutar SQL manualmente.** Simplemente al reiniciarse el contenedor `app`, este script se ejecutará y corregirá la base de datos automáticamente.

## 4. Notas sobre "Cero Simulación"

El sistema ahora **depende** de que la base de datos PostgreSQL (`db`) esté corriendo y sea accesible.
-   Si ves errores de conexión, verifica que el servicio `db` en Easypanel esté en estado "Running".
-   Los datos antiguos "mock" del Dashboard desaparecerán y verás ceros hasta que empieces a crear Leads, Cotizaciones y Ventas reales.

## 5. Solución de Problemas Comunes

-   **Error 401/Unauthorized:** Hemos arreglado esto en el frontend. Si persiste, cierra sesión y vuelve a entrar para renovar tu token JWT.
-   **No se generan PDFs:** Asegúrate de que el contenedor tenga permisos de escritura en `/tmp` (usamos streams, así que no debería ser crítico, pero es bueno revisar logs).
