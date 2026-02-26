#!/bin/bash
# Copy a legacy Python SQLite DB into the Electron server-data directory.

set -euo pipefail

SOURCE_DB=""
TARGET_DATA_DIR=""
FORCE=false

usage() {
  echo "Usage: $0 --from <path/to/production.db> --to <server-data-dir> [--force]"
  echo "Example:"
  echo "  $0 --from /path/to/old/production.db --to ~/.autobyteus/server-data"
  echo ""
  echo "If --from is omitted, the script will try common legacy locations automatically."
  echo "If --to is omitted, it defaults to: ~/.autobyteus/server-data"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --from)
      SOURCE_DB="$2"
      shift 2
      ;;
    --to)
      TARGET_DATA_DIR="$2"
      shift 2
      ;;
    --force)
      FORCE=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [[ -z "$TARGET_DATA_DIR" ]]; then
  TARGET_DATA_DIR="${HOME}/.autobyteus/server-data"
  echo "No --to provided. Defaulting to: ${TARGET_DATA_DIR}"
fi

if [[ -z "$SOURCE_DB" ]]; then
  CANDIDATES=(
    "${WORKSPACE_ROOT}/autobyteus-server/db/production.db"
    "${WORKSPACE_ROOT}/autobyteus-server/server-data/db/production.db"
    "${HOME}/.config/autobyteus/server-data/db/production.db"
    "${HOME}/.autobyteus/server-data/db/production.db"
  )
  for candidate in "${CANDIDATES[@]}"; do
    if [[ -f "$candidate" ]]; then
      SOURCE_DB="$candidate"
      echo "Auto-detected legacy DB: ${SOURCE_DB}"
      break
    fi
  done
fi

if [[ -z "$SOURCE_DB" || -z "$TARGET_DATA_DIR" ]]; then
  usage
  exit 1
fi

if [[ ! -f "$SOURCE_DB" ]]; then
  echo "Source DB not found: $SOURCE_DB"
  exit 1
fi

TARGET_DB="${TARGET_DATA_DIR}/db/production.db"
mkdir -p "$(dirname "$TARGET_DB")"

if [[ -f "$TARGET_DB" && "$FORCE" != true ]]; then
  echo "Target DB already exists: $TARGET_DB"
  echo "Use --force to overwrite."
  exit 1
fi

cp "$SOURCE_DB" "$TARGET_DB"
echo "Legacy DB copied to: $TARGET_DB"

# Normalize legacy datetime strings to Prisma-friendly ISO-8601 (e.g., 2025-01-01T12:34:56.123456Z).
if command -v sqlite3 >/dev/null 2>&1; then
  echo "Normalizing legacy datetime columns for Prisma compatibility..."
  sqlite3 "$TARGET_DB" "
UPDATE prompts SET created_at=CASE WHEN created_at IS NOT NULL AND instr(created_at,'T')=0 THEN replace(created_at,' ','T')||'Z' ELSE created_at END,
                updated_at=CASE WHEN updated_at IS NOT NULL AND instr(updated_at,'T')=0 THEN replace(updated_at,' ','T')||'Z' ELSE updated_at END;
UPDATE agent_conversations SET created_at=CASE WHEN created_at IS NOT NULL AND instr(created_at,'T')=0 THEN replace(created_at,' ','T')||'Z' ELSE created_at END;
UPDATE agent_conversation_messages SET timestamp=CASE WHEN timestamp IS NOT NULL AND instr(timestamp,'T')=0 THEN replace(timestamp,' ','T')||'Z' ELSE timestamp END;
UPDATE token_usage_records SET created_at=CASE WHEN created_at IS NOT NULL AND instr(created_at,'T')=0 THEN replace(created_at,' ','T')||'Z' ELSE created_at END;
UPDATE agent_artifacts SET created_at=CASE WHEN created_at IS NOT NULL AND instr(created_at,'T')=0 THEN replace(created_at,' ','T')||'Z' ELSE created_at END,
                          updated_at=CASE WHEN updated_at IS NOT NULL AND instr(updated_at,'T')=0 THEN replace(updated_at,' ','T')||'Z' ELSE updated_at END;
UPDATE mcp_server_configurations SET created_at=CASE WHEN created_at IS NOT NULL AND instr(created_at,'T')=0 THEN replace(created_at,' ','T')||'Z' ELSE created_at END,
                                    updated_at=CASE WHEN updated_at IS NOT NULL AND instr(updated_at,'T')=0 THEN replace(updated_at,' ','T')||'Z' ELSE updated_at END;
"
  echo "Datetime normalization complete."
else
  echo "Warning: sqlite3 not found; skipped datetime normalization."
fi
