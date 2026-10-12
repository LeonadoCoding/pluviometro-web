# ==========================================
# Estágio 1: Build do Frontend (React + Vite)
# ==========================================
FROM node:22-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ==========================================
# Estágio 2: Backend + Servidor de Produção
# ==========================================
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Instala dependências do servidor
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copia código do backend e seed
COPY server/src ./server/src
COPY server/seed_data.json ./server/seed_data.json

# Copia build estático do cliente
COPY --from=client-builder /app/client/dist ./client/dist

# Cria diretório de persistência do banco SQLite
RUN mkdir -p /app/data

VOLUME ["/app/data"]
EXPOSE 3000

WORKDIR /app/server
CMD ["node", "src/server.js"]
