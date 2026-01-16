
# Stage 1: Build the React Application
FROM node:20-alpine AS builder

WORKDIR /app

# Argumentos de construcción
ARG API_KEY
ENV API_KEY=$API_KEY

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine

WORKDIR /app
RUN apk add --no-cache tzdata
ENV TZ=America/Mexico_City
ENV NODE_ENV=production
ENV PORT=3000

# API Key para IA en backend
ARG API_KEY
ENV API_KEY=$API_KEY

# Directorios de persistencia
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

COPY --chown=node:node package*.json ./
RUN npm install --omit=dev

COPY --chown=node:node server ./server
COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then((r) => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

USER node
CMD ["node", "server/index.js"]
