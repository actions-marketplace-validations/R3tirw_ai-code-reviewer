FROM node:20-slim

WORKDIR /app

COPY package.json .
COPY src/ ./src/

RUN npm install --production

ENTRYPOINT ["node", "/app/src/index.js"]
