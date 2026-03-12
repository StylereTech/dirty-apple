FROM node:20-alpine

WORKDIR /app

# Install all deps (including devDeps for tsc)
COPY server/package*.json ./
RUN npm ci

# Copy source and build
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

# Prune dev deps
RUN npm prune --production

EXPOSE 4000

CMD ["node", "dist/index.js"]
