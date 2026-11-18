# Handoff SR-002 — Architecture Design Complete (memory-sync-large-files)

- Package: `memory-sync-large-files`; Project Task `autobyteus-workspace-7` (Project `project_3165230d-b602-4efc-ac42-fb61a03f1ed5`), FU-001 of `autobyteus-workspace-6`
- From: Solution Designer (team coordinator, run `solution_designer_701e101b5b534002b91d94fca7efaad7`)
- Requested by: `/project_task_manager` (run `project_task_manager_89e33a2ea30f422fab0407e4dc2b13bb`)
- Classification: `Architecture Design Complete`, `task_size: Large`, `architectural_risk: High`
- Status: requirements `Approved` (SR-002; Solution Designer within the direction, user informed 2026-11-15); design `Ready`; nothing implemented.
- Worktree: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files`, branch `task/memory-sync-large-files`, base `origin/personal` @ `3d738de6e`; finalization target `origin/personal`; **no release** (Task: stop at merge-ready).
- Ticket folder: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files/tickets/in-progress/memory-sync-large-files/`

## RELEASE ORDER (must travel with this ticket to delivery)

This change must be released **before or in the same release as** `autobyteus-workspace-6` (large video attachments, 2 GiB default for video/audio). Without it, a node with Memory Sync on stops syncing all memory after the first attachment over ~37 MiB, and a 2 GiB file breaks the scan itself. Source overlap with `autobyteus-workspace-6`: none (manager, 2026-11-15); merge order is free.

## Original request (summary)

Reproduce; byte budget for batches; defined behaviour for a file bigger than the hub limit that never blocks the rest (skip with warning, or chunked/streamed transfer: propose and justify; large videos not as base64 blobs); a failing file must not poison later batches; clear logs/status for the owner; unit + integration tests (mixed batches, one oversize file, hub limit); stop at merge-ready. Manager: design for videos up to 2 GiB; never base64 a whole large file in one request; tell the manager when merge-ready.

## What was found (evidence in investigation-notes.md)

- Reproduced on two built server processes: one 40 MiB attachment, or two 20 MiB ones (under today's 25 MiB limit), make every run fail with `Request body is too large`; small files behind them never sync; the status names no file.
- Measured: base64 cannot carry ≥ 384 MiB; `fs.readFile` cannot read ≥ 2 GiB (the scan fails for every run); unchanged files are re-read every run.
- Real raw-trace files on the user's node are 40–54 MB: skipping large files would drop core memory → **transfer, not skip** (DEC-001).

## Solution (design-spec.md)

- Batches cut by count and by inline bytes (24 MiB raw → < 50 MiB request).
- Files > 8 MiB: raw-byte pieces (≤ 8 MiB) to a hub staging area named by SHA-256 (resumable via received bytes), committed by the batch with `contentEncoding: "staged"`; the hub verifies every operation before writing any; nothing partial is visible.
- Change detection by size + mtime; changed files hashed by streaming.
- Per-file outcomes: file failures recorded with reason and retry delay (1 min doubling to 1 h; Sync now retries at once; a changed file is retried at once); run-level errors (refusal, unreachable, hub disabled) stay job errors.
- Owner: GraphQL failure count + 20 most recent; Memory Sync card "N files could not be synced" (en, zh-CN); one log warning per new failure.
- Same-release contract (`DESIGN.md` rule 9): no mixed-version handling (SR-002 revised SR-001's REQ-008 accordingly).

## Documents

- `requirements-doc.md` (SR-002, Approved)
- `investigation-notes.md`
- `design-spec.md` (SR-002, Ready)
- `solution-revision-record.md`
- `follow-ups.md` (FU-001, FU-002; not urgent; sent when the ticket leaves the team)
- `probes/large-file-sync-probe.e2e.test.ts.txt` (reproduction; command in investigation notes)

## Open risks

- R-003 release order (above).
- `autobyteus-web/generated/graphql.ts` changes → fresh-start build at delivery (TESTING.md).
- Reverse proxies in front of a hub (FU-002).

## Expected next action

Independent architecture review of the SR-002 package. On Pass, the reviewer routes to implementation by its rules; on findings, back to the Solution Designer.

## Route record

- Handoff rules checked 2026-11-15: rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`.
- Sent with `send_message_to` to `/software_engineering_team/architecture_reviewer` (run `architecture_reviewer_60670f8f6eb84995b4139723af54d0fe`) on 2026-11-15: delivered.
