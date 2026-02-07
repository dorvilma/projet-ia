FROM node:20-alpine AS base
WORKDIR /app

# Development stage — copies everything, installs deps, runs vite dev server
FROM base AS dev
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY . .

# Build dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

# Build stage
FROM deps AS build
COPY . .
RUN npm run build

# Production stage — serves built files via nginx
FROM nginx:1.25-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/dist /app/dist
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
