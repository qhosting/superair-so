# --- STAGE 1: BUILD FRONTEND (Vite) ---
FROM node:20-alpine AS builder

WORKDIR /app

# Argumentos de construcción para inyectar variables en el bundle de Vite si fuera necesario
ARG API_KEY
ENV API_KEY=$API_KEY

# Instalación de dependencias
COPY package*.json ./
RUN npm install

# Copia de código y compilación
COPY . .
RUN npm run build

# --- STAGE 2: PRODUCTION SERVER (Node.js) ---
FROM node:20-alpine

WORKDIR /app

# Configuración de entorno y zona horaria (CDMX)
RUN apk add --no-cache tzdata
ENV TZ=America/Mexico_City
ENV NODE_ENV=production
ENV PORT=3000

# La API_KEY es necesaria en runtime para los servicios de Gemini en el backend
ARG API_KEY
ENV API_KEY=$API_KEY

# Crear carpeta de uploads para persistencia (si se usa volumen)
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Instalación de dependencias de producción únicamente
COPY --chown=node:node package*.json ./
RUN npm install --omit=dev

# Copiar el servidor y los archivos compilados del frontend
COPY --chown=node:node server ./server
COPY --chown=node:node --from=builder /app/dist ./dist

# Exponer el puerto de la aplicación
EXPOSE 3000

# Healthcheck para monitoreo automático en Easypanel/Docker
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then((r) => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Seguridad: Ejecutar como usuario no privilegiado
USER node

# Comando de inicio del servidor maestro
CMD ["node", "server/index.js"]
