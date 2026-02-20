FROM node:20-alpine

WORKDIR /app

COPY server/package*.json ./
RUN npm ci --only=production

COPY server/dist ./dist
COPY server/src/scrapers ./src/scrapers

EXPOSE 4000

CMD ["node", "dist/index.js"]
