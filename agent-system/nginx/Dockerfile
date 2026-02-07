FROM nginx:1.25-alpine
COPY nginx.conf /etc/nginx/nginx.conf
# SSL certs will be mounted via Docker named volume or added at runtime
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
