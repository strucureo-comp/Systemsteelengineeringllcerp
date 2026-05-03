#!/usr/bin/env bash
# Simple MongoDB backup script
# Usage: ./scripts/backup.sh /path/to/output (optional)

set -euo pipefail

OUT_DIR=${1:-./backups}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MONGO_URI=${MONGODB_URI:-mongodb://localhost:27017/bridgebreak}

mkdir -p "$OUT_DIR"

echo "Backing up MongoDB from $MONGO_URI to $OUT_DIR/backup_$TIMESTAMP"

if ! command -v mongodump >/dev/null 2>&1; then
  echo "Error: mongodump not found. Install MongoDB Database Tools." >&2
  exit 2
fi

mongodump --uri="$MONGO_URI" --archive="$OUT_DIR/backup_$TIMESTAMP.archive" --gzip

echo "Backup complete: $OUT_DIR/backup_$TIMESTAMP.archive"
