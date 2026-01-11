# Configuración de n8n para SuperAir ERP

Este sistema utiliza **n8n** para la automatización de Leads y Procesamiento Fiscal.

## 1. Acceso
- URL: `http://localhost:5678` (o tu dominio en producción)
- Crea tu cuenta de administrador al iniciar por primera vez.

## 2. Configurar Credenciales (Postgres)
Para que n8n pueda escribir en la base de datos, debes configurar una credencial de PostgreSQL:

1. Ve a **Credentials** > **New**.
2. Busca "Postgres".
3. Usa estos datos (basados en docker-compose.yml):
   - **Host:** `db`
   - **Database:** `superair_db`
   - **User:** `superair`
   - **Password:** `secure_pass`
   - **Port:** `5432`
   - **SSL:** Off (Disable)

## 3. Importar Flujo
1. Ve a **Workflows** > **Import from File**.
2. Selecciona el archivo `n8n_workflow.json` incluido en este proyecto.
3. Activa el flujo (Switch "Active" en la esquina superior derecha).

## 4. Probando Webhooks

### Prueba Leads
Envía una petición POST a:
`http://localhost:5678/webhook/leads`
Body (JSON):
```json
{
  "name": "Prueba N8N",
  "email": "test@n8n.com",
  "phone": "5551234567",
  "source": "Facebook Ads",
  "notes": "Interesado en mantenimiento"
}
```

### Prueba CFDI (Fiscal)
El servidor Node.js ejecuta un CronJob cada 15 minutos que llama a:
`http://n8n:5678/webhook/process-cfdi`

Esto simulará la recepción de una factura XML y la guardará en el módulo de Ventas > Bóveda Fiscal.
