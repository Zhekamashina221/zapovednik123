#!/bin/sh
set -e

DB_FILE="${DB_PATH:-/app/data/reserves.db}"
mkdir -p "$(dirname "$DB_FILE")" /app/uploads/photos

node /app/scripts/init-db-if-missing.js

exec "$@"
