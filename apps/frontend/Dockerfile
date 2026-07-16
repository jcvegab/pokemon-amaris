# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24-alpine
ARG NGINX_VERSION=alpine

FROM node:${NODE_VERSION} AS build
WORKDIR /app

ENV CI=true \
    HUSKY=0 \
    PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH"
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/frontend/tsconfig.json ./apps/frontend/
COPY apps/frontend/tsconfig.node.json ./apps/frontend/
COPY eslint.config.mjs ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @pokemon-amaris/frontend...

COPY apps/frontend ./apps/frontend

RUN pnpm --filter @pokemon-amaris/frontend build

FROM nginx:${NGINX_VERSION} AS runtime
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
