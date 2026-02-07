FROM node:20-alpine AS base
WORKDIR /app

# Development stage — copies everything, installs all deps, runs with tsx watch
FROM base AS dev
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY plugins ./plugins

# Production dependencies only
FROM base AS deps
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# Build stage
FROM base AS build
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npx tsc

# Production stage
FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY backend/prisma ./prisma
COPY backend/package.json ./
COPY plugins ./plugins

EXPOSE 3001
CMD ["node", "dist/server.js"]
