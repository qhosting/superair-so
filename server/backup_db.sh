#!/bin/sh
# Backup Script for PostgreSQL
# Usage: ./backup_db.sh

BACKUP_DIR="/app/backups"
mkdir -p $BACKUP_DIR

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/superair_backup_$TIMESTAMP.sql"

echo "📦 Starting backup to $FILENAME..."

# Ensure PGPASSWORD is set or .pgpass exists if needed, mostly handled by docker network internal trust or env vars
# Assuming standard PGHOST, PGUSER, PGDATABASE env vars are present in the node container context or linked via docker-compose

pg_dump --clean --if-exists --no-owner --no-privileges --file="$FILENAME" "$DATABASE_URL"

if [ $? -eq 0 ]; then
  echo "✅ Backup completed successfully: $FILENAME"

  # Retention policy: Keep last 7 days
  find $BACKUP_DIR -name "superair_backup_*.sql" -mtime +7 -delete
else
  echo "❌ Backup failed!"
  exit 1
fi
