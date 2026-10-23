# syntax=docker/dockerfile:1
# One Dockerfile, two images. Build a single one with `--target api|web`.
#
#   api  (port 3000) — NestJS backend + Prisma. Runs `prisma migrate deploy`
#                      at startup (entrypoint) against the SQLite DB on a PVC,
#                      then `node dist/main.js`. Serves everything under /api.
#   web  (port 8080) — the Vite/React SPA on nginx-unprivileged. nginx serves
#                      the static bundle and reverse-proxies /api to the api
#                      Service, so the whole app lives behind one hostname.
#
# The web client calls the backend over a RELATIVE `/api` path (see
# apps/web/src/api/client.ts), so there is nothing host-specific baked into the
# bundle — no build arg, no per-environment rebuild.

ARG NODE_VERSION=20

# --- Dependencies: root + both workspace manifests, then one `npm ci` layer
# that stays cached until package-lock.json changes. Prisma's `postinstall`
# needs the schema present to run `prisma generate`, so copy it before install.
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# Prisma schema must exist before `npm ci` so the api workspace postinstall
# (`prisma generate`) succeeds.
COPY apps/api/prisma apps/api/prisma
RUN npm ci --no-audit --no-fund

# --- Full source for the build stages.
FROM deps AS source
COPY tsconfig*.json ./
COPY apps apps

# ===========================================================================
# api
# ===========================================================================
FROM source AS build-api
RUN npm run build --workspace @zid/api

# Production node_modules for the api workspace only. Prisma's postinstall runs
# `prisma generate` again here so the generated client is present in the slim
# dependency tree that ships in the runtime image.
FROM node:${NODE_VERSION}-alpine AS prod-deps-api
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/api/prisma apps/api/prisma
RUN npm ci --omit=dev --workspace @zid/api --no-audit --no-fund

FROM node:${NODE_VERSION}-alpine AS api
ENV NODE_ENV=production PORT=3000
WORKDIR /app/apps/api
# The prisma CLI (a dev dependency) is needed at runtime for `migrate deploy`.
# Rather than ship all devDependencies, install just the pinned prisma CLI.
# The version MUST match @prisma/client in apps/api/package.json.
ARG PRISMA_VERSION=6.19.3
RUN npm install -g "prisma@${PRISMA_VERSION}" --no-audit --no-fund && npm cache clean --force
# App code + production deps (node_modules lives at the workspace root).
COPY --from=prod-deps-api /app/node_modules /app/node_modules
COPY --from=build-api /app/apps/api/dist ./dist
COPY --from=build-api /app/apps/api/package.json ./package.json
COPY --from=build-api /app/apps/api/prisma ./prisma
COPY deploy/docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh
# DB + uploads live under /data, which is a mounted PVC at runtime (writable);
# the rest of the filesystem can stay read-only.
ENV DATABASE_URL="file:/data/db/app.db" \
    UPLOAD_DIR="/data/uploads"
# Numeric so Kubernetes can enforce runAsNonRoot (the `node` user is uid 1000).
USER 1000:1000
EXPOSE 3000
ENTRYPOINT ["api-entrypoint.sh"]
CMD ["node", "dist/main.js"]

# ===========================================================================
# web
# ===========================================================================
FROM source AS build-web
RUN npm run build --workspace @zid/web

# Static site on unprivileged nginx (port 8080, non-root by default).
FROM nginxinc/nginx-unprivileged:1.29-alpine AS web
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-web /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
