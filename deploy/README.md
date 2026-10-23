# Deployment

Two images, built from the root `Dockerfile` (`--target api|web`):

| Image          | Port | Contents                                                              |
| -------------- | ---- | --------------------------------------------------------------------- |
| `patent-api`   | 3000 | NestJS backend + Prisma (SQLite). Runs `prisma migrate deploy` at start, serves `/api`, health at `GET /api/healthz`. Ships the research documents (`docs/` → `/app/docs`, `RESEARCH_DOCS_DIR`). |
| `patent-web`   | 8080 | Vite/React SPA on nginx-unprivileged. Serves the bundle and reverse-proxies `/api` to the api Service. Health at `GET /healthz`. |

Build one locally:

```sh
docker build --target api -t patent-api .
docker build --target web -t patent-web .
```

## Research documents in the api image

The research import (`POST /api/projects/:id/research/import`, the „Uvezi
rezultate istraživanja" button in steps 2 and 3) and the local copies of the
sources (`GET /api/sources/:id/local-copies/:n`) are read from the repository
`docs/` directory at runtime. Production has no repo checkout, so the api image
**copies `docs/` to `/app/docs`** and sets `RESEARCH_DOCS_DIR=/app/docs`
(`Dockerfile`, target `api`). Do not exclude `docs/` in `.dockerignore`; no PVC
or manual copy is involved — a new build is what updates the documents.

`GET /api/healthz` returns `{"status":"ok","researchDocs":"ok"}`; `"missing"`
(plus `researchDocsMissing: [...]`) means the image was built without them.
The pipeline runs `deploy/docker/api-smoke-test.sh` against the freshly built
api image before pushing it: health probe, a research import into an empty
project (16 sources, 128 requirements, ≥ 24 report sections) and one local
copy download. Run it locally with:

```sh
docker build --target api -t patent-api .
deploy/docker/api-smoke-test.sh patent-api
```

## Single host

The web client calls the backend over a **relative `/api`** path, so the whole
app lives behind one hostname (`www.patent.drowranger.com`). The browser only
ever talks to nginx (the web image), which proxies `/api` to the api Service
in-cluster. No CORS, no API subdomain.

## Pipeline

`.github/workflows/images.yml`:

1. **Pull requests** that touch the image build (`Dockerfile`, `.dockerignore`,
   `deploy/docker/`, `docs/`, `package-lock.json`, the workflow) build both images
   without pushing; the api image is smoke-tested.
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

## AI review (Claude API) — `patent-api-secrets`

The api Deployment loads an **optional** secret `patent-api-secrets` through
`envFrom`. Without it the api starts normally and the „Proveri sa AI" button is
disabled with „AI provera nije konfigurisana"; `GET /api/healthz` reports
`"ai": "not_configured"`. The key never goes into git, Multica comments or the
web bundle; the applicant creates the secret directly on the cluster:

```sh
kubectl -n patent create secret generic patent-api-secrets \
  --from-literal=ANTHROPIC_API_KEY=sk-ant-...
```

Optional keys in the same secret (defaults in parentheses):

| Key                                | Default            | Meaning                                              |
| ---------------------------------- | ------------------ | ---------------------------------------------------- |
| `ANTHROPIC_MODEL`                  | `claude-opus-5-5`  | Model used for the review                            |
| `AI_MAX_CALLS_PER_PROJECT_PER_DAY` | `50`               | Daily cap of reviews per project                     |
| `AI_MAX_CONTEXT_CHARS`             | `300000`           | Max size of one step's context (otherwise refused)   |

To rotate or add keys, recreate the secret and restart the api
(`kubectl -n patent rollout restart deployment/patent-api`) — the value is read
once at start. `kubectl -n patent get secret patent-api-secrets` shows whether it
exists; `curl -s https://patent.drowranger.com/api/healthz` shows whether the api
picked it up.

The Argo CD `Application` that syncs this overlay lives in the infra repo at
`apps/patent/application.yaml`.
