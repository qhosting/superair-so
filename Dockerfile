# Stage 1: Build the React Application (Vite)
FROM node:20-alpine AS builder

WORKDIR /app

# Argumento de construcción para que Vite pueda inyectar la API_KEY en el frontend
ARG API_KEY
ENV API_KEY=$API_KEY

# Configuración de resiliencia para NPM
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Instalación de dependencias de construcción
COPY package*.json ./
RUN npm install

# Copia de código fuente y ejecución del build
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

# La API_KEY es necesaria en runtime para los servicios de Gemini en el backend
ARG API_KEY
ENV API_KEY=$API_KEY

# Crear directorio para persistencia de archivos subidos
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Instalación de dependencias de producción únicamente
COPY --chown=node:node package*.json ./
RUN npm config set fetch-retries 5 && \
    npm install --omit=dev

# Copiar el código del servidor y los archivos estáticos compilados
COPY --chown=node:node server ./server
COPY --chown=node:node --from=builder /app/dist ./dist

# Exponer el puerto configurado
EXPOSE 3000

# Healthcheck para monitoreo en Easypanel/Docker
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then((r) => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Ejecutar como usuario no-root por seguridad
USER node

CMD ["node", "server/index.js"]
