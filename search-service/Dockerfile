#  use the official node js 18 image with alpine linux as base image

FROM node:18-alpine

WORKDIR /use/src/app

COPY package*.json ./

RUN npm ci --only=prodcution

COPY . .

EXPOSE 3004

CMD ["node","src/server.js"]