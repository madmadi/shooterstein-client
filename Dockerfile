# build stage
FROM node:8.12.0-alpine as build-stage
LABEL maintainer="mo@madmadi.me"
WORKDIR /app
COPY package*.json ./
RUN npm i -g npm@3.10.10
RUN npm i
COPY . .
RUN npm run build

# production stage
FROM nginx:1.15.5-alpine as production-stage
COPY --from=build-stage /app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

