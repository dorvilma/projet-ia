FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

FROM deps AS build
COPY . .
RUN npm run build

FROM nginx:1.25-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/dist /app/dist
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
