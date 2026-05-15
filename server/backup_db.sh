#!/bin/sh
# Backup Script for PostgreSQL
# Usage: ./backup_db.sh

BACKUP_DIR="/app/backups"
if [ ! -d "$BACKUP_DIR" ]; then
  echo "📁 Creating backup directory..."
  mkdir -p "$BACKUP_DIR" || { echo "❌ Error: Could not create backup directory"; exit 1; }
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/superair_backup_$TIMESTAMP.sql"

echo "📦 Starting backup to $FILENAME..."

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is not set"
  exit 1
fi

pg_dump --clean --if-exists --no-owner --no-privileges --file="$FILENAME" "$DATABASE_URL"

if [ $? -eq 0 ]; then
  echo "✅ Backup completed successfully: $FILENAME"
  # Retention policy: Keep last 7 days
  find "$BACKUP_DIR" -name "superair_backup_*.sql" -mtime +7 -delete
else
  echo "❌ Backup failed!"
  exit 1
fi

echo "☁️  Syncing with Google Drive..."
# Run the Node.js uploader
# Assuming node is available in the environment this runs in
cd "$(dirname "$0")" && node backup_to_drive.js
