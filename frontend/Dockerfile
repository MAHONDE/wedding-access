FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html/

RUN sed -i 's|__API_BASE__|/api|g' /usr/share/nginx/html/index.html

EXPOSE 80
