# User-requested live startup log check — 2026-09-27

Package startup-performance-20260927; evidence-only observation during DR-001 user
verification. Not Delivery Completed, release authorization, new design or incident
finding. User report via Delivery: "this time it's starting very fast"; requests
read-only confirmation from actual running app/logs. R1/D1 unchanged.

## Identity and scope
Observed08:01–08:02UTC (10:01–10:02Europe/Berlin). Main PID68792,backend PID69702,
parent68792. Both executables and backend entrypoint are under:
/Users/normy/autobyteus_org/autobyteus-worktrees/startup-performance/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app
Backend --port29695 --data-dir/Users/normy/.autobyteus/server-data. lsof confirms
production.db open and port29695 listening. Renderer file URL also names candidate.
This is the fresh unsigned local personal candidate,still labeled1.4.88,not the
installed /Applications release or an API temporary benchmark profile.

## Latest launch timeline (UTC; add2hours for local time)
-07:59:50: process start from ps,second precision.
-07:59:54.625: Application started log marker.
-07:59:54.878: Starting internal server.
-07:59:55.770: backend PID69702 spawned.
-07:59:56.721→57.014: Prisma startup check;no pending schema migrations.
-07:59:58.488: server listening on29695.
-07:59:58.685: Electron health check successful;Server is ready.

Internal-server-start→health-ready=3.807s,versus the prior recorded33.846s segment.
Application-started log→ready=4.060s. Process start→ready approximately8.7s,but ps
is second-resolution and this is not first-paint timing. Differences in cache/load
mean these observations are not a universal performance guarantee. Current direct
GET/rest/health returnedHTTP200,{status:ok,message:Server is running}.

## Same-ID migration behavior
SQLite URI mode=ro plus PRAGMA query_only queried ONLY the relevant ledger row:
20260926_team_context_file_execution_locators_v1 remains SUCCEEDED_WITH_WARNINGS,
attempt3,started_at1790485286025,completed_at1790485440870,updated05:04:00UTC.
These match pre-candidate recorded values;no new attempt on this launch. Existing
attempt log remains05:04:00.869UTC. Bundled runner has the terminal-success/warning
skip condition. This supports normal skip,not a conversion replay or forced success.
363originals plus manifest remain;latest file mtime05:03:59.409UTC,well before this
launch. This is stat evidence,not a new full-byte preservation audit.

## Expected reason for improvement
Inspected bundled readiness module:structural scan remains;no reference validator
or dependency closure. Logs show timely readiness without migration/startup failure.
No live I/O instrumentation performed,so logs alone do not prove zero history reads;
API-REV-001's controlled counters and bundled source support the intended removal.
This is consistent with approved design and user-observed faster opening.

## Errors and warnings are not all zero
Latest-launch ERROR-labelled stderr includes Prisma update banner,tool overwrite,
MCP INFO messages,missing raw trace files reported AFTER readiness,ignored Codex
features.voice_transcription setting and unrouted deprecationNotice. No migration
or startup-blocking failure observed. Do not call every stderr line a fatal error,
or claim all historical data loaded correctly. No config/history fixes attempted.

## Evidence and boundaries
Read incoming handoff-summary.md,release-deployment-report.md,
evidence/delivery/build-manifest.json and api-e2e-execution-coverage-report.md.
Raw curated observation:
/Users/normy/autobyteus_org/autobyteus-worktrees/startup-performance/tickets/in-progress/startup-performance/evidence/solution-designer/live-startup-check.json
Logs read:/Users/normy/.autobyteus/logs/app.log and
/Users/normy/.autobyteus/server-data/logs/server.log. No app restart,provider turn,
conversion invocation,production file/ledger edit,install,publish or cleanup.
Only task evidence documents written. Ordinary app activity continued independently.
Workspace/base/finalization unchanged:codex/startup-performance,
base8bffda04575eaa7198fae186856699011ad5c04b,target personal. Source/tests owned by
other specialists left untouched. Delivery owns acceptance/finalization/release.

## Routing
get_handoff_rules evaluated: no rule matches evidence-only log confirmation.
No new architecture package or Delivery Completed receipt gap;do not duplicate
handoffs. Return findings directly to user as requested. No release approval inferred.
