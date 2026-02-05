# Guía de Configuración: Backups en Google Drive

Para que el sistema realice copias de seguridad automáticas en Google Drive, necesitas una **Cuenta de Servicio (Service Account)**. Sigue estos pasos:

## 1. Crear el Proyecto y la Cuenta de Servicio en Google Cloud

1.  Ve a la [Consola de Google Cloud](https://console.cloud.google.com/).
2.  Crea un nuevo proyecto (o selecciona uno existente).
3.  En el menú lateral, ve a **"API y Servicios" > "Biblioteca"**.
4.  Busca **"Google Drive API"** y haz clic en **Habilitar**.
5.  Ahora ve a **"IAM y administración" > "Cuentas de servicio"**.
6.  Haz clic en **"Crear cuenta de servicio"**.
    *   **Nombre:** `backup-bot` (o lo que quieras).
    *   **Permisos:** Puedes dejarlo en blanco o darle "Propietario" (no es estrictamente necesario para Drive si usas carpetas compartidas, pero "Editor" ayuda).
7.  Una vez creada, búsca la cuenta en la lista y haz clic en los **tres puntos verticales** (acciones) > **Administrar claves**.
8.  Haz clic en **"Agregar clave" > "Crear clave nueva"**.
9.  Selecciona el formato **JSON**.
10. Se descargará un archivo `.json` a tu computadora. **¡Guárdalo bien!** Este es tu `GOOGLE_SERVICE_ACCOUNT_KEY`.

## 2. Preparar la Carpeta en Google Drive

Este paso es CRÍTICO. La "Cuenta de Servicio" es un usuario virtual con su propio email (algo como `backup-bot@tu-proyecto.iam.gserviceaccount.com`), pero no tiene su propio Google Drive "visible".

1.  Abre la clave JSON que descargaste y copia el campo `"client_email"`.
2.  Ve a tu **Google Drive personal** (o el de la empresa).
3.  Crea una carpeta llamada `SuperAir Backups`.
4.  Abre la carpeta. En la URL del navegador verás algo como `drive.google.com/drive/u/0/folders/1abcDEfg...`. El código al final es tu **`GOOGLE_DRIVE_FOLDER_ID`**.
5.  Haz clic derecho en la carpeta > **Compartir**.
6.  Pega el **email de la cuenta de servicio** y dale permisos de **Editor**.
    *   *Esto permite que el bot "vea" y escriba en esa carpeta de TU Drive.*

## 3. Configurar la Variable de Entorno

El archivo JSON descargado tiene múltiples líneas. Para usarlo como variable de entorno, lo ideal es convertirlo a una sola línea (string) o asegurarte de que tu plataforma (Easypanel/Docker) soporte saltos de línea.

**Formato para `.env` o Easypanel:**

```bash
GOOGLE_DRIVE_FOLDER_ID="1abcDEfg_tucodigo_de_carpeta"
GOOGLE_SERVICE_ACCOUNT_KEY='{"type": "service_account", "project_id": "...", ...}'
```

*Nota: Asegúrate de copiar TODO el contenido del JSON, incluidas las llaves `{ }`.*
