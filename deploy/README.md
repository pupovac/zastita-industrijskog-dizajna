# Deployment

Two images, built from the root `Dockerfile` (`--target api|web`):

| Image          | Port | Contents                                                              |
| -------------- | ---- | --------------------------------------------------------------------- |
| `patent-api`   | 3000 | NestJS backend + Prisma (SQLite). Runs `prisma migrate deploy` at start, serves `/api`, health at `GET /api/healthz`. |
| `patent-web`   | 8080 | Vite/React SPA on nginx-unprivileged. Serves the bundle and reverse-proxies `/api` to the api Service. Health at `GET /healthz`. |

Build one locally:

```sh
docker build --target api -t patent-api .
docker build --target web -t patent-web .
```

## Single host

The web client calls the backend over a **relative `/api`** path, so the whole
app lives behind one hostname (`www.patent.drowranger.com`). The browser only
ever talks to nginx (the web image), which proxies `/api` to the api Service
in-cluster. No CORS, no API subdomain.

## Pipeline

`.github/workflows/images.yml`:

1. **Pull requests** that touch the image build (`Dockerfile`, `.dockerignore`,
   `deploy/docker/`, `package-lock.json`, the workflow) build both images without
   pushing.
2. **Pushes to `main`** build and push `<registry>/<project>/patent-{api,web}`
   tagged with the full commit SHA and `latest`.
3. If `ARGOCD_GITOPS_BUMP` is `true`, the `bump-deploy` job runs
   `kustomize edit set image` on `deploy/k8s/overlays/production/kustomization.yaml`
   and commits the new SHA to `main`. Argo CD syncs that commit.

### Repository settings

Secrets:

| Name              | Value                                                    |
| ----------------- | -------------------------------------------------------- |
| `HARBOR_USERNAME` | Harbor robot account name (push on the `patent` project) |
| `HARBOR_PASSWORD` | Harbor robot account secret                              |

Variables:

| Name                 | Required | Default                   |
| -------------------- | -------- | ------------------------- |
| `HARBOR_REGISTRY`    | yes      | — (`registry.drowranger.com`) |
| `HARBOR_PROJECT`     | no       | `patent`                  |
| `IMAGE_PREFIX`       | no       | `patent`                  |
| `ARGOCD_GITOPS_BUMP` | no       | off (`true` to enable)    |

## Database (SQLite on a PVC)

The api uses Prisma on SQLite. The DB file (`/data/db/app.db`) and uploaded /
generated documents (`/data/uploads`) live on a single `ReadWriteOnce` PVC
(`patent-data`, 5Gi, cluster-default `local-path`). The api runs **one replica**
with the `Recreate` strategy — SQLite tolerates no concurrent writers and
`local-path` is node-local, so the Deployment is pinned to one node
(`nodeSelector: {hardware: home-pc}`).

Migrations are applied automatically at container start by the entrypoint
(`prisma migrate deploy`), so a deploy of a new schema version needs no manual
step. Scaling out or surviving node loss means moving to PostgreSQL — the Prisma
schema is already written to be portable (see the repo root README).

## Cluster (one-time)

Kustomize base in `deploy/k8s/base`, production overlay in
`deploy/k8s/overlays/production` (namespace `patent`). The overlay targets the
Infra OSS k3s cluster:

- Ingress class `traefik`.
- TLS: the `cert-manager.io/cluster-issuer: letsencrypt-prod` annotation makes
  cert-manager issue `patent-tls`. Nothing to pre-create.
- DNS: the root domain has a wildcard, so `www.patent.drowranger.com` already
  resolves to Traefik — no new record.
- Images come from `registry.drowranger.com/patent/patent-{api,web}`.

The two cluster secrets the manifests reference are provided by the infra repo
(External Secrets), not git:

- `harbor-pull` (docker-registry pull secret) — `infra/apps/patent/harbor-pull-externalsecret.yaml`.

The Argo CD `Application` that syncs this overlay lives in the infra repo at
`apps/patent/application.yaml`.
