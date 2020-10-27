FROM node:15-alpine
WORKDIR /usr/src/memehub-config
COPY package*.json ./
RUN npm install
COPY . .
CMD [ "node", "index.js" ]