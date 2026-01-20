# Stage 1: Build the React Application (Vite)
FROM node:20-alpine AS builder

WORKDIR /app

# Argumentos de construcción para inyectar variables en el build de Vite
ARG API_KEY
ENV API_KEY=$API_KEY

# Configuración de resiliencia para NPM - Etapa de Construcción
# Se eliminan opciones no soportadas como network-timeout
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Instalación de dependencias
COPY package*.json ./
RUN npm install

# Copia de código fuente y construcción del bundle estático
COPY . .
RUN npm run build

# Stage 2: Production Server (Node.js Express)
FROM node:20-alpine

WORKDIR /app

# Configuración de entorno y zona horaria para México
RUN apk add --no-cache tzdata
ENV TZ=America/Mexico_City
ENV NODE_ENV=production
ENV PORT=3000

# El API_KEY es necesario en runtime para los servicios de Gemini en el backend
ARG API_KEY
ENV API_KEY=$API_KEY

# Crear directorios para persistencia de archivos
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Instalación de dependencias de producción únicamente
COPY --chown=node:node package*.json ./
RUN npm config set fetch-retries 5 && \
    npm install --omit=dev

# Copiar lógica del servidor y los archivos estáticos compilados
COPY --chown=node:node server ./server
COPY --chown=node:node --from=builder /app/dist ./dist

# Puerto expuesto para el ERP
EXPOSE 3000

# Verificación de salud (Healthcheck)
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then((r) => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Ejecución segura (No-root)
USER node

# Comando de inicio del servidor maestro
CMD ["node", "server/index.js"]
