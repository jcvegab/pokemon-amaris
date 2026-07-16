# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:24-alpine

# ---- builder ----
FROM ${NODE_IMAGE} AS builder
WORKDIR /app

ENV CI=true \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY tsconfig.base.json ./
COPY eslint.config.mjs ./
COPY apps/backend/package.json apps/backend/
COPY apps/backend/tsconfig.json apps/backend/tsconfig.build.json apps/backend/
COPY apps/backend/nest-cli.json apps/backend/
COPY apps/backend/prisma apps/backend/prisma
COPY apps/backend/src apps/backend/src

RUN pnpm install --frozen-lockfile --filter @pokemon-amaris/backend...

RUN pnpm --filter @pokemon-amaris/backend prisma:generate
RUN pnpm --filter @pokemon-amaris/backend build

# ---- runtime ----
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN corepack enable \
    && apk add --no-cache wget \
    && addgroup -S app && adduser -S app -G app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/

RUN pnpm install --frozen-lockfile --filter @pokemon-amaris/backend... --prod \
    && pnpm --filter @pokemon-amaris/backend prisma:generate

COPY --from=builder /app/apps/backend/dist apps/backend/dist
COPY --from=builder /app/apps/backend/prisma apps/backend/prisma

WORKDIR /app/apps/backend
USER app

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=6 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["sh", "-c", "node ./node_modules/prisma/build/index.js db push --skip-generate --schema=./prisma/schema.prisma && node dist/main.js"]
