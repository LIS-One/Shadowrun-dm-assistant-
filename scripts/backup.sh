#!/usr/bin/env bash
# Backs up the database and the uploaded map images into ./backups/<date>/
# and deletes backups older than BACKUP_KEEP_DAYS (default 14).
# Run from the project folder on the server:  bash scripts/backup.sh
set -euo pipefail

# Uses COMPOSE_FILE from .env when present (see .env.production.example).
if grep -q '^COMPOSE_FILE=' .env 2>/dev/null; then
  COMPOSE="docker compose"
else
  COMPOSE="docker compose -f docker-compose.prod.yml"
fi
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP=$(date +%Y-%m-%d_%H-%M)
DEST="backups/$STAMP"
mkdir -p "$DEST"

$COMPOSE exec -T db pg_dump -U dm_assistant dm_assistant | gzip > "$DEST/database.sql.gz"

# Runs as root to read the volume, then hands the archive back to the current user.
$COMPOSE run --rm --no-deps -T --user root -v "$(pwd)/$DEST:/backup" --entrypoint sh backend \
  -c "tar czf /backup/maps.tar.gz -C /data/maps . && chown $(id -u):$(id -g) /backup/maps.tar.gz"

find backups -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} +

echo "Backup written to $DEST"
ls -lh "$DEST"
