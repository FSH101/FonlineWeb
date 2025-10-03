FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm install --production --ignore-scripts || true

FROM base AS builder
COPY . .
RUN npm install
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/game-scripts ./game-scripts
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
