FROM node:14-alpine
WORKDIR /usr/src/memehub-config
COPY . .
RUN npm install
CMD [ "npm", "run", "start" ]