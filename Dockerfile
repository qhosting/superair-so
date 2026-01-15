# Stage 1: Build the React Application
FROM node:20-alpine AS builder

WORKDIR /app

# Argumentos de construcción para variables de entorno de frontend (Vite)
ARG API_KEY
ENV API_KEY=$API_KEY

# Forzar entorno de desarrollo para instalar devDependencies y poder compilar
ENV NODE_ENV=development

# Caché de dependencias
COPY package*.json ./
RUN npm install

# Copiar código fuente y compilar
COPY . .
RUN npm run build

# Stage 2: Servidor de Producción (Node.js)
FROM node:20-alpine

WORKDIR /app

# Instalación de utilidades del sistema
# tzdata: Necesario para que los CronJobs de facturación usen la hora de México
RUN apk add --no-cache tzdata

# Configuración de Zona Horaria (SuperAir opera en MX)
ENV TZ=America/Mexico_City

# Variables de entorno por defecto (Sobrescribibles en docker-compose)
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# API Key para lógica de servidor (IA Gemini)
ARG API_KEY
ENV API_KEY=$API_KEY

# Configuración de directorios de persistencia
# Se crean antes de cambiar al usuario 'node' para asegurar permisos
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Copiar archivos de dependencias
COPY --chown=node:node package*.json ./

# Instalar solo dependencias de producción
RUN npm install --omit=dev

# Copiar el backend y el build del frontend
COPY --chown=node:node server ./server
COPY --chown=node:node --from=builder /app/dist ./dist

# Exponer el puerto del ERP
EXPOSE 3000

# Verificación de salud del contenedor
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then((r) => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Seguridad: Ejecutar como usuario no raíz
USER node

# Comando de arranque del sistema integral SuperAir
CMD ["node", "server/index.js"]
