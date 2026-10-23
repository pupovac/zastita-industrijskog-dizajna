#!/bin/sh
# API container entrypoint.
#
# Applies pending Prisma migrations to the SQLite database on the mounted PVC,
# then hands off (exec) to the container CMD (node dist/main.js). `migrate
# deploy` only applies already-generated migrations (never creates or prompts),
# so it is safe to run on every start and is a no-op once the DB is current.
#
# The DB directory lives on the PVC (DATABASE_URL=file:/data/db/app.db). Create
# it if this is the very first boot on a fresh volume.
set -e

DB_DIR="$(dirname "${DATABASE_URL#file:}")"
mkdir -p "$DB_DIR" "${UPLOAD_DIR:-/data/uploads}"

echo "[entrypoint] applying Prisma migrations to ${DATABASE_URL} ..."
prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] migrations applied; starting: $*"
exec "$@"
