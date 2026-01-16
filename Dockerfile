# Stage 1: Build the React Application
FROM node:20-alpine AS builder

WORKDIR /app

# Argumentos de construcción para variables de entorno de frontend (Vite)
# Se requiere la API_KEY durante el build para que Vite la inyecte en el cliente
ARG API_KEY
ENV API_KEY=$API_KEY

# Caché de dependencias para acelerar el despliegue
COPY package*.json ./
RUN npm install

# Copiar código fuente y generar el build optimizado de producción
COPY . .
RUN npm run build

# Stage 2: Servidor de Producción (Node.js)
FROM node:20-alpine

WORKDIR /app

# Instalación de utilidades esenciales del sistema
# tzdata: CRÍTICO para que los registros de inventario y citas usen la hora de México
RUN apk add --no-cache tzdata

# Configuración de Zona Horaria (SuperAir opera principalmente en MX)
ENV TZ=America/Mexico_City

# Variables de entorno por defecto (Pueden ser sobreescritas en el despliegue)
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# API Key para el backend (Cerebro IA Gemini/OpenAI)
ARG API_KEY
ENV API_KEY=$API_KEY

# Configuración de directorios para persistencia de datos (Facturas, PDFs, Logos)
# Se crean antes de cambiar al usuario 'node' para asegurar permisos de escritura
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Copiar archivos de definición de dependencias
COPY --chown=node:node package*.json ./

# Instalar únicamente dependencias de producción (omitiendo devDependencies)
RUN npm install --omit=dev

# Copiar la lógica del backend y los archivos estáticos del frontend generados por el builder
COPY --chown=node:node server ./server
COPY --chown=node:node --from=builder /app/dist ./dist

# Exponer el puerto configurado del ERP
EXPOSE 3000

# Verificación de salud del contenedor (Healthcheck)
# Asegura que el servicio esté respondiendo antes de enviarle tráfico real
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then((r) => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Seguridad Industrial: Ejecutar la aplicación como un usuario sin privilegios de raíz
USER node

# Comando de arranque para el servidor de SuperAir
CMD ["node", "server/index.js"]
