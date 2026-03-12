# dirty-apple API — multi-stage build
# stage 1: build TypeScript
FROM node:22-alpine AS builder
WORKDIR /build
COPY server/package*.json ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npx tsc --outDir dist

# stage 2: production image
FROM node:22-alpine AS production
WORKDIR /app
COPY --from=builder /build/dist ./dist
COPY server/package*.json ./
RUN npm ci --omit=dev
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]
