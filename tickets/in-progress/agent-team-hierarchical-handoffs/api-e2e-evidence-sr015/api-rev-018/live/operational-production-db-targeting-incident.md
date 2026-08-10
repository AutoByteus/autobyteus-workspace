# API-REV-018 Operational Database Targeting Incident

- Observed at: 2026-08-10T16:43:30Z
- Intended target: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/db/sr015-api-rev-018-20260810-1.db`
- Actual target reached by the first server-start attempt: `/Users/normy/.autobyteus/server-data/db/production.db`
- Cause: the server process inherited an already-exported `DATABASE_URL`; dotenv intentionally did not overwrite inherited values (`injecting env (0)`), so the isolated data-root `.env` was not authoritative.
- Command: `node dist/app.js --host 127.0.0.1 --port 60018 --data-dir .../tests/.tmp/sr015-api-rev-018-20260810-1`
- Observed effects: Prisma reported no pending schema migrations. Startup then ran the required canonical-identity app-data migration against the operational DB and reported `status: FAILED`, `attempts: 2`, `failedCount: 203`, after which startup halted. This may have updated durable app-data migration attempt/failure metadata. Exact row-level effects have not been inspected because further reads/writes against the operational database are forbidden for this validation.
- Process outcome: the attempted server exited/halted before listening on port 60018.
- Rollback: **not attempted**. No automatic rollback, record reset, deletion, or repair was performed.
- User Electron process: PID 11918 remained the pre-existing opener of `production.db`; it was not stopped.
- Existing user-held manual test stack: ports 60004/31004 and its isolated database remained running and were not repointed/stopped.
- Corrective guard for all subsequent attempts: launch via `env -i`/explicit allowlist or explicit `DATABASE_URL`, `AUTOBYTEUS_SERVER_HOST`, and `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`; verify the running PID's open SQLite path with `lsof` before any browser/API mutation.

Authoritative raw evidence: `server.log` in this directory.
