FROM node:20-alpine AS deps
WORKDIR /app/server

COPY server/package.json server/package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app/server

COPY --from=deps /app/server/node_modules ./node_modules
COPY server/tsconfig.json ./tsconfig.json
COPY server/src ./src
COPY server/game-scripts ./game-scripts
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app/server

ENV NODE_ENV=production

COPY --from=builder /app/server/dist ./dist
COPY --from=deps /app/server/node_modules ./node_modules
RUN npm prune --omit=dev
COPY server/package.json ./package.json
COPY server/game-scripts ./game-scripts
COPY client /app/public

EXPOSE 8080

CMD ["node", "dist/index.js"]
