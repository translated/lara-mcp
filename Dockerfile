FROM node:22.13.1-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@latest-10
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run test
RUN pnpm run build


FROM node:22.13.1-alpine AS release

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-lock.yaml

ENV NODE_ENV=production

RUN npm install -g pnpm@latest-10
RUN pnpm install --frozen-lockfile --prod

EXPOSE 3000

ENTRYPOINT ["node", "/app/dist/index.js"]
