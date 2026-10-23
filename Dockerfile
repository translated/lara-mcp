FROM node:22.23.4-alpine

ENV CI=true

RUN apk update && apk upgrade
RUN apk add curl

WORKDIR /opt
COPY . .

RUN npm install -g pnpm@latest-10
RUN pnpm install --frozen-lockfile
RUN pnpm build

CMD ["node", "dist/index.js"]