# Investigation Notes - personal-first-run-db-discovery-bootstrap

## Context
- Reported behavior on personal desktop build:
  - Agents page shows: "Unable to fetch agent definitions at this time."
  - Discovery sync appears active, even though personal mode should not auto-enable discovery.

## Runtime Evidence
- Active desktop process:
  - `/Applications/AutoByteus.app/Contents/MacOS/AutoByteus /Applications/AutoByteus.app/Contents/Resources/server/dist/app.js --port 29695 --data-dir /Users/normy/.autobyteus/server-data`
- Active log file:
  - `/Users/normy/.autobyteus/logs/app.log`
- Repeated error:
  - `PrismaClientInitializationError`
  - `Error code 14: Unable to open the database file`
  - surfaced through GraphQL resolver: `Unable to fetch agent definitions at this time.`

## Root Cause
- `repository_prisma` initializes `PrismaClient` at module import time and loads default dotenv (`dotenv/config`) before app runtime data-dir config is finalized.
- Packaged server `.env` contains a machine-specific DB path:
  - `/Applications/AutoByteus.app/Contents/Resources/server/.env`
  - `DB_NAME=/Users/normy/autobyteus_org/autobyteus-server-ts/db/production.db`
  - `DATABASE_URL=file:/Users/normy/autobyteus_org/autobyteus-server-ts/db/production.db`
- That path does not exist on target machines, so early Prisma calls fail even though runtime app data DB is valid.

## Supporting Verification
- Runtime DB is present and readable:
  - `/Users/normy/.autobyteus/server-data/db/production.db`
- Direct Prisma query against runtime DB (manual node script) succeeds.
- Therefore issue is configuration ordering/source of truth, not DB corruption.

## Data Backup Completed
- Legacy app support backup:
  - `/Users/normy/Library/Application Support/autobyteus/backups/20260220-061126`
- Active runtime backup:
  - `/Users/normy/.autobyteus/backups/20260220-061149`
