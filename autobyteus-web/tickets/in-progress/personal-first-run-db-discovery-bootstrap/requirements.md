# Requirements - personal-first-run-db-discovery-bootstrap

## Status
Design-ready

## Goal
Ensure personal desktop build boots with a valid SQLite configuration on first install and existing installs, so agent definitions load successfully without manual environment edits.

## In-Scope
- Electron server launch environment setup for personal desktop runtime.
- Deterministic DB env wiring (`DB_NAME`, `DATABASE_URL`) to app data directory.
- Discovery defaults for personal mode (disabled unless explicitly enabled by caller env).
- Regression tests for runtime env builder behavior.
- Fresh-install validation checklist.

## Acceptance Criteria
1. On startup, backend Prisma queries use `~/.autobyteus/server-data/db/production.db` and do not bind to packaged machine-specific DB paths.
2. Agents page loads without `Unable to fetch agent definitions at this time.` caused by DB open failure.
3. Personal desktop defaults discovery to disabled unless explicitly enabled via environment variables.
4. Behavior is consistent across macOS, Linux, and Windows server manager launch paths.
5. Automated test coverage exists for runtime env composition and path normalization.

## Constraints
- Keep existing server CLI invocation unchanged (`dist/app.js --port ... --data-dir ...`).
- Do not require user migration steps for existing data.

## Risks
- Discovery default change may impact users expecting implicit discovery; mitigate by honoring explicit env overrides.
- Packaged `.env` may still contain stale values; runtime launch env must override safely.
