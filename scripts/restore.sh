#!/usr/bin/env bash
# Restores the database and the uploaded map images from a folder made by scripts/backup.sh.
# Run from the project folder on the server:  bash scripts/restore.sh backups/2026-10-09_01-00
# Before replacing anything it checks the backup files and saves the current data with backup.sh;
# restoring that safety copy the same way undoes the restore.
set -euo pipefail

if grep -q '^COMPOSE_FILE=' .env 2>/dev/null; then
  COMPOSE="docker compose"
else
  COMPOSE="docker compose -f docker-compose.prod.yml"
fi

SRC="${1:-}"
if [ -z "$SRC" ] || [ ! -f "$SRC/database.sql.gz" ] || [ ! -f "$SRC/maps.tar.gz" ]; then
  echo "Usage: bash scripts/restore.sh backups/<folder>"
  echo "The folder must contain database.sql.gz and maps.tar.gz. Backups found here:"
  ls -1d backups/*/ 2>/dev/null || echo "  (none)"
  exit 1
fi
SRC=$(cd "$SRC" && pwd)

echo "Checking the backup files..."
gzip -t "$SRC/database.sql.gz"
tar tzf "$SRC/maps.tar.gz" > /dev/null

echo "All current campaigns, characters and maps will be REPLACED with the backup from:"
echo "  $SRC"
read -r -p "Type yes to continue: " ANSWER
if [ "$ANSWER" != "yes" ]; then
  echo "Cancelled, nothing changed."
  exit 1
fi

$COMPOSE up -d --wait db
echo "Saving the current data first..."
SAFETY=$(BACKUP_KEEP_DAYS=36500 bash scripts/backup.sh | sed -n 's/^Backup written to //p')
echo "Current data saved to $SAFETY (to undo: bash scripts/restore.sh $SAFETY)"

trap '[ "${DONE:-}" = 1 ] || echo "RESTORE FAILED, the site is stopped. To get the previous data back run: bash scripts/restore.sh $SAFETY"' EXIT
$COMPOSE stop backend frontend
$COMPOSE exec -T db psql -q -v ON_ERROR_STOP=1 -U dm_assistant -d postgres \
  -c "DROP DATABASE IF EXISTS dm_assistant WITH (FORCE);" \
  -c "CREATE DATABASE dm_assistant OWNER dm_assistant TEMPLATE template0;"
gunzip -c "$SRC/database.sql.gz" | $COMPOSE exec -T db \
  psql -q -v ON_ERROR_STOP=1 --single-transaction -U dm_assistant -d dm_assistant > /dev/null
$COMPOSE run --rm --no-deps -T --user root -v "$SRC:/backup:ro" --entrypoint sh backend \
  -c "find /data/maps -mindepth 1 -delete && tar xzf /backup/maps.tar.gz -C /data/maps && chown -R 1001 /data/maps"
$COMPOSE up -d

DONE=1
echo "Restored from $SRC"
