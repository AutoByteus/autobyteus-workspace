# API-REV-002 live setup isolation note

Two startup-only attempts occurred before the authoritative live run. Their
terminal logs are `server-live.log` and `server-live-restart.log`; both resolved
the default `/home/autobyteus/data/db/production.db`, reported **No pending
migrations to apply**, admitted/read caches, received no browser request, and
were stopped immediately. They are not counted as live scenario evidence.

The authoritative run began as PID 4410 at 2026-09-01T19:48:27Z after the
process environment was reduced with `env -i` and the retained data-root `.env`
was set to:

`DATABASE_URL=file:/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-evidence/API-REV-002/live/server-data/db/production.db`

The isolated SQLite file was created at 19:48:27Z and later modified by the
actual package/browser journeys. Definitions, history indexes, execution
packages, temp workspace, logs, and restart state were likewise contained
under `API-REV-002/live/server-data`. `/proc/4410/environ` is retained as
`backend-environment-before-restart.txt`; it contains only HOME/PATH/TERM/USER,
so no inherited database/config variables bypassed the retained `.env`.

This setup deviation is disclosed because startup touched the shared database
boundary even though no migration or browser mutation was observed. The actual
asserted journeys and persistence comparisons use only the isolated run.
