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
# App code + production deps (node_modules lives at the workspace root). The
# prisma CLI needed for `migrate deploy` is already inside node_modules
# (node_modules/.bin/prisma) — no separate global install (that was a redundant
# ~130 MB layer). The entrypoint invokes it via npx/.bin.
#
# node_modules is copied across SEVERAL layers on purpose. The registry
# (registry.drowranger.com) is fronted by Cloudflare, which rejects a single
# blob upload over its body-size cap with `413 Payload Too Large`. A single
# `COPY node_modules` is one ~400 MB blob and trips that. Splitting the biggest
# packages (and @prisma's sub-packages) into their own COPY layers keeps each
# pushed blob small enough to get through, without shrinking anything. If a new
# heavy dependency 413s the push later, give it its own COPY line here.
COPY --from=prod-deps-api /app/node_modules/@prisma/client /app/node_modules/@prisma/client
COPY --from=prod-deps-api /app/node_modules/@prisma/engines /app/node_modules/@prisma/engines
COPY --from=prod-deps-api /app/node_modules/@prisma /app/node_modules/@prisma
COPY --from=prod-deps-api /app/node_modules/prisma /app/node_modules/prisma
COPY --from=prod-deps-api /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=prod-deps-api /app/node_modules/effect /app/node_modules/effect
COPY --from=prod-deps-api /app/node_modules/pdf-parse /app/node_modules/pdf-parse
COPY --from=prod-deps-api /app/node_modules/typescript /app/node_modules/typescript
COPY --from=prod-deps-api /app/node_modules/rxjs /app/node_modules/rxjs
COPY --from=prod-deps-api /app/node_modules/docx /app/node_modules/docx
COPY --from=prod-deps-api /app/node_modules/pdfkit /app/node_modules/pdfkit
COPY --from=prod-deps-api /app/node_modules/dejavu-fonts-ttf /app/node_modules/dejavu-fonts-ttf
COPY --from=prod-deps-api /app/node_modules/fontkit /app/node_modules/fontkit
# Everything else (the long tail of smaller packages, incl. .bin, @nestjs, zod…).
COPY --from=prod-deps-api /app/node_modules /app/node_modules
COPY --from=build-api /app/apps/api/dist ./dist
COPY --from=build-api /app/apps/api/package.json ./package.json
COPY --from=build-api /app/apps/api/prisma ./prisma
# Research documents (phase 1–2 results: source records, local copies of the
# sources, the ZIS requirements matrix and the research report). The api reads
# them at runtime for `POST /api/projects/:id/research/import` and serves the
# local copies under `GET /api/sources/:id/local-copies/:n`, so they must ship
# in the image — there is no repo checkout in production and no PVC for them.
# RESEARCH_DOCS_DIR points the api at this copy; `GET /api/healthz` reports
# `researchDocs: ok|missing` so a build without them is visible right after deploy.
COPY docs /app/docs
ENV RESEARCH_DOCS_DIR=/app/docs
COPY deploy/docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh
# Put the workspace-root node_modules/.bin on PATH so `prisma` resolves at runtime.
ENV PATH="/app/node_modules/.bin:${PATH}"
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
