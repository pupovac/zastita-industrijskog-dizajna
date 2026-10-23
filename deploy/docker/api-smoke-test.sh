#!/bin/sh
# Smoke test of a built api image: starts a container from it (throwaway SQLite
# DB in /tmp, no volume), waits for the health probe, then exercises the one
# feature that depends on files shipped in the image rather than code — the
# import of the phase 1–2 research documents (docs/). Fails if:
#   - /api/healthz does not answer or reports researchDocs != ok,
#   - the import into a fresh project does not yield 16 sources, 128
#     requirements and at least 24 report sections,
#   - a local copy of a source cannot be served.
#
# Usage: deploy/docker/api-smoke-test.sh <image>
# Run by .github/workflows/images.yml before the api image is pushed; usable
# locally after `docker build --target api -t patent-api .`. The container is
# published on a random free loopback port, so it never collides with a dev
# server running on the host.
set -eu

IMAGE="${1:?usage: api-smoke-test.sh <image>}"
NAME="patent-api-smoke-$$"

cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "--- container logs ($NAME) ---" >&2
    docker logs "$NAME" >&2 2>&1 || true
  fi
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT INT TERM

docker run -d --name "$NAME" -p 127.0.0.1::3000 \
  -e DATABASE_URL=file:/tmp/db/app.db -e UPLOAD_DIR=/tmp/uploads \
  "$IMAGE" >/dev/null
PORT="$(docker port "$NAME" 3000/tcp | head -n 1 | sed 's/.*://')"
BASE="http://127.0.0.1:${PORT}/api"

echo "[smoke] container $NAME on ${BASE}; waiting for healthz ..."
i=0
until HEALTH="$(curl -fsS "${BASE}/healthz" 2>/dev/null)"; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    echo "[smoke] FAIL: api did not become healthy within 60 s" >&2
    exit 1
  fi
  sleep 1
done
echo "[smoke] healthz: $HEALTH"
[ "$(printf '%s' "$HEALTH" | jq -r .researchDocs)" = ok ] || {
  echo "[smoke] FAIL: healthz reports researchDocs != ok (docs/ missing from the image?)" >&2
  exit 1
}

PROJECT_ID="$(curl -fsS -X POST "${BASE}/projects" -H 'Content-Type: application/json' -H 'X-Actor-Type: USER' \
  -d '{"name":"Smoke test"}' | jq -r .id)"
[ -n "$PROJECT_ID" ] && [ "$PROJECT_ID" != null ] || { echo "[smoke] FAIL: could not create a project" >&2; exit 1; }

SUMMARY="$(curl -fsS -X POST "${BASE}/projects/${PROJECT_ID}/research/import" -H 'X-Actor-Type: AGENT')"
echo "[smoke] import: $SUMMARY"
SOURCES="$(printf '%s' "$SUMMARY" | jq -r .sources)"
REQUIREMENTS="$(printf '%s' "$SUMMARY" | jq -r .requirements)"
SECTIONS="$(printf '%s' "$SUMMARY" | jq -r .reportSections)"
[ "$SOURCES" = 16 ] && [ "$REQUIREMENTS" = 128 ] && [ "$SECTIONS" -ge 24 ] || {
  echo "[smoke] FAIL: expected 16 sources, 128 requirements, >=24 sections; got $SOURCES / $REQUIREMENTS / $SECTIONS" >&2
  exit 1
}

STATUS="$(curl -fsS "${BASE}/projects/${PROJECT_ID}/research/import-status")"
[ "$(printf '%s' "$STATUS" | jq -r .imported)" = true ] || { echo "[smoke] FAIL: import-status: $STATUS" >&2; exit 1; }

# Every imported source with a local copy must serve it (Z-05 is the ZIS PDF manual).
SOURCE_ID="$(curl -fsS "${BASE}/projects/${PROJECT_ID}/sources" | jq -r '.[] | select(.code == "Z-05") | .id')"
[ -n "$SOURCE_ID" ] || { echo "[smoke] FAIL: source Z-05 not found after import" >&2; exit 1; }
COPY_FILE="$(mktemp)"
curl -fsS -o "$COPY_FILE" "${BASE}/sources/${SOURCE_ID}/local-copies/0"
HEAD="$(head -c 5 "$COPY_FILE")"
rm -f "$COPY_FILE"
[ "$HEAD" = "%PDF-" ] || { echo "[smoke] FAIL: local copy of Z-05 is not served (got: $HEAD)" >&2; exit 1; }

MISSING="$(curl -fsS "${BASE}/projects/${PROJECT_ID}/sources" | jq '[.[] | select(.code != null) | select((.localCopiesJson | fromjson | length) > 0)] | length')"
echo "[smoke] OK: healthz researchDocs=ok, import 16/128/${SECTIONS}, ${MISSING} sources with local copies, Z-05 copy served."
