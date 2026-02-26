# Aggregated Validation

## Acceptance Criteria Run (2026-02-26)

- `AC-1` Pass:
  - `bash ./scripts/personal-docker.sh up -p personal-live`
  - Result: all-in-one + 1 remote started, fixtures seeded, remote sync success (`target=remote-1 processed=5 created=5 updated=0 deleted=0 skipped=0`).
- `AC-2` Pass:
  - `bash ./scripts/personal-docker.sh ports -p personal-live`
  - Result: web/backend/gateway/noVNC/VNC/chrome-debug endpoints printed.
- `AC-3` Pass:
  - `bash ./scripts/personal-docker.sh logs -p personal-live`
  - Result: log stream starts correctly with no script crash.
- `AC-4` Pass:
  - `pnpm -C autobyteus-server-ts test tests/unit/config/logging-config.test.ts tests/unit/logging/http-access-log-policy.test.ts tests/unit/logging/runtime-logger-bootstrap.test.ts tests/unit/config/app-config.test.ts`
- `AC-5` Pass:
  - `pnpm -r build`

## Runtime Checks
- `curl -fsS http://127.0.0.1:<backend-port>/rest/health` => `{"status":"ok","message":"Server is running"}`
- GraphQL fixture presence confirmed via `agentTeamDefinitions` query (`Professor Student Team`).
- Main container log files exist:
  - `/home/autobyteus/data/logs/server.log`
  - `/home/autobyteus/data/logs/web.log`
  - `/home/autobyteus/data/logs/gateway.log`

## Issues Found During Validation and Fixes
- Fixed `logs` command crash when optional args were omitted.
- Fixed gateway runtime lock-path setup by aligning memory mount and ensuring reliability lock directories exist.

## Validation Decision
Pass
