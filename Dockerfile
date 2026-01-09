# Stage 1: Build the React Application
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for Vite build)
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React app (Output goes to /app/dist)
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies (Express, PG)
RUN npm install --only=production

# Copy the server code
COPY server ./server

# Copy the built static files from the builder stage
COPY --from=builder /app/dist ./dist

# Environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Expose the port
EXPOSE 3000

# Start the Express server
CMD ["node", "server/index.js"]
