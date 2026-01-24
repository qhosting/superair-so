# --- STAGE 1: BUILD FRONTEND (Vite) ---
FROM node:20-alpine AS builder

WORKDIR /app

# Argumento de construcción para la API_KEY (necesaria para el bundle de Vite si se usa en el cliente)
ARG API_KEY
ENV API_KEY=$API_KEY

# Copiar archivos de configuración de dependencias
COPY package*.json ./

# Instalar todas las dependencias para la construcción
RUN npm install

# Copiar el resto del código fuente del frontend y backend
COPY . .

# Compilar el frontend (Vite genera la carpeta /dist)
RUN npm run build

# --- STAGE 2: PRODUCTION SERVER (Node.js) ---
FROM node:20-alpine

WORKDIR /app

# Configuración de entorno y zona horaria de México
RUN apk add --no-cache tzdata
ENV TZ=America/Mexico_City
ENV NODE_ENV=production
ENV PORT=3000

# La API_KEY es vital para el funcionamiento de los servicios de IA en el backend
ARG API_KEY
ENV API_KEY=$API_KEY

# Preparar directorio de persistencia para archivos subidos
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Copiar solo los archivos necesarios para instalar dependencias de producción
COPY --chown=node:node package*.json ./

# Instalar únicamente dependencias de producción para reducir el tamaño de la imagen
RUN npm install --omit=dev

# Copiar el servidor (Node.js/Express) y el frontend compilado (dist)
COPY --chown=node:node server ./server
COPY --chown=node:node --from=builder /app/dist ./dist

# Exponer el puerto de servicio
EXPOSE 3000

# Healthcheck para monitoreo en Easypanel/Docker
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then((r) => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Seguridad: Ejecutar como usuario sin privilegios root
USER node

# Comando de inicio del servidor maestro
CMD ["node", "server/index.js"]
