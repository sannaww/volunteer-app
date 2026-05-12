#!/bin/sh
set -eu

restore_file="${POSTGRES_RESTORE_FILE:-}"
db_name="${POSTGRES_DB:-postgres}"
db_user="${POSTGRES_USER:-postgres}"

if [ -z "$restore_file" ]; then
  echo "[initdb] POSTGRES_RESTORE_FILE is not set. Skipping restore."
  exit 0
fi

if [ ! -f "$restore_file" ]; then
  echo "[initdb] Restore file not found at $restore_file. Skipping restore."
  exit 0
fi

echo "[initdb] Restoring database $db_name from $restore_file"

if [ "$(head -c 5 "$restore_file")" = "PGDMP" ]; then
  pg_restore \
    --verbose \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --username "$db_user" \
    --dbname "$db_name" \
    "$restore_file"
else
  psql \
    --username "$db_user" \
    --dbname "$db_name" \
    --set ON_ERROR_STOP=1 \
    --file "$restore_file"
fi

echo "[initdb] Database restore completed."
