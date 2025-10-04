FROM node:20-alpine AS deps
WORKDIR /app

COPY server/package.json server/package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app

COPY server/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
COPY server/tsconfig.json ./tsconfig.json
COPY server/src ./src
COPY server/game-scripts ./game-scripts
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY server/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev

COPY --from=builder /app/dist ./dist
COPY server/game-scripts ./game-scripts
COPY client ./public

ENV PUBLIC_DIR=/app/public

EXPOSE 8080

CMD ["node", "dist/index.js"]
