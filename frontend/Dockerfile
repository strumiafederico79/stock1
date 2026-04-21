FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm config set registry https://registry.npmjs.org/ \
 && npm config set fund false \
 && npm config set audit false \
 && npm install --include=dev \
 && test -x node_modules/.bin/vite \
 && node -e "console.log('vite', require('./node_modules/vite/package.json').version)"

COPY . .
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN test -x node_modules/.bin/vite \
 && ./node_modules/.bin/vite build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
