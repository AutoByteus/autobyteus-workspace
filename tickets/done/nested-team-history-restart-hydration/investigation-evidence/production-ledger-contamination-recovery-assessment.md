# Production Ledger Contamination Recovery Assessment

## Status

- Trigger: `API-REV-003`, `NTH-USER-ELECTRON-001`, `NTH-MIG-REAL-001`, and `CRR-005` / `CR-002`.
- Decision date: 2026-08-24.
- User approval: explicit. The user approved deleting the single false migration row, stopped the packaged app, and explicitly instructed the team to perform the cleanup.
- Supported-scope decision: arbitrary cross-root/shared-ledger pairing is not a supported product lifecycle. This was an API/E2E isolation incident, not a reason for permanent product machinery.
- Selected recovery: one stopped-state, backed-up deletion of the exact contaminated ledger row, followed by normal startup of the reviewed package so the existing migration ran against the real paired filesystem/database.
- Production source change: none.
- Manual memory-directory movement: none.
- Result: completed successfully.

## Failure Boundary

The original filesystem migration did not fail. API/E2E paired an isolated filesystem runtime with the production database and wrote a false terminal record for `20260823_repair_team_agent_memory_layout`. The row said `SUCCEEDED`, attempt 1, `Scanned 12; migrated 0; skipped 12; failed 0.`, and its `log_path` belonged to the deleted isolated test runtime. The real nested histories therefore remained flat and the normal runner skipped them.

The immediate origin remains the API/E2E environment defect recorded by `CRR-005`. The exact contaminating process is not overstated; the isolated log path in the production row is direct evidence.

## Approved Scope

- One app-data filesystem root and its operational database are one paired deployment state.
- API/E2E must isolate both app-data and `DATABASE_URL`.
- Cross-root/shared-ledger re-pairing remains unsupported.
- No follow-up migration ID, generic terminal-success retry, ledger fingerprint, migration-framework change, runtime fallback, Memory Sync change, or new release is authorized.
- The incident exception permitted only the exact stopped-state row reset after a verified backup; normal product code still owned all directory transformation.

## Backup And Exact Mutation

Because resetting the row makes the original migration rescan all admitted current-V1 roots, the backup covered the full possible mutation scope rather than only the reported TeamRun:

- entire `/Users/normy/.autobyteus/server-data/memory/agent_teams` tree;
- `/Users/normy/.autobyteus/server-data/db/production.db`;
- `/Users/normy/.autobyteus/server-data/db/production.db.secret.key`;
- any active SQLite `-wal`, `-shm`, or `-journal` sidecar (none existed).

Verified backup:

`/Users/normy/.autobyteus/incident-backups/nested-team-history-restart-hydration/20260824T055235+0200`

It contains 9,202 memory files and passed a checksum comparison. With the app stopped and no open database handles, one `BEGIN IMMEDIATE` transaction verified the exact false row's ID/status/attempt/summary/log path, deleted exactly one row, asserted zero remaining matches, and committed. `PRAGMA quick_check` returned `ok`. A second checksum comparison proved no memory file changed during the row cleanup.

## Normal Packaged Migration Result

The user started the reviewed package:

`/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`

The existing migration then ran normally against `/Users/normy/.autobyteus/server-data` and recorded:

- status: `SUCCEEDED`;
- attempts: `1`;
- summary: `Scanned 112; migrated 9; skipped 103; failed 0.`;
- real log: `/Users/normy/.autobyteus/server-data/logs/app-data-migrations/20260823_repair_team_agent_memory_layout-2026-08-24T03-59-47-402Z.log`.

For exact affected root `nested_classroom_test_team_83a531dc8def4e82bbc946a02661bb8a`, verification covered all six previously data-bearing configured/task nested members:

- all flat sources absent;
- all execution-tree-derived canonical targets present;
- every target directory byte-identical to its stopped-state backup source;
- every public projection and Event Monitor page non-empty.

Configured Student One returned 60 conversation entries, 17 activities, 60 Event Monitor events, and non-null last activity. The four data-bearing task Student One executions also returned non-empty Conversation, Activity, and Event Monitor data.

Execution evidence:

- `/Users/normy/.autobyteus/incident-backups/nested-team-history-restart-hydration/20260824T055235+0200/migration-row-deletion.log`
- `/Users/normy/.autobyteus/incident-backups/nested-team-history-restart-hydration/20260824T055235+0200/post-restart-migration-verification.json`
- `/Users/normy/.autobyteus/incident-backups/nested-team-history-restart-hydration/20260824T055235+0200/verification-summary.txt`

## Option Disposition

| Option | Decision | Rationale |
| --- | --- | --- |
| Backed-up exact-row reset for this incident | Approved and completed | Smallest safe correction for a team-caused false row; reused the reviewed deterministic migration |
| New follow-up production migration | Rejected | Permanent product behavior for an unsupported re-pairing lifecycle would overreach |
| Manual memory-directory moves | Rejected | Would bypass V1 admission, canonical scope, ledger, and package acceptance |
| Generic retry/delete of terminal success | Rejected | Would weaken every migration's contract |
| Ledger/data-root fingerprinting | Separate future investigation | Broader schema/deployment policy not needed for this incident |
| Runtime canonical-then-flat fallback | Rejected | Would restore two competing current layouts |

## Workflow Disposition

The `CRR-005` recovery Requirement Gap is resolved by explicit user approval and successful execution. No recovery implementation pass is required because no production source change was selected. API/E2E must reconcile this evidence, record the isolation correction, and supersede `API-REV-003`'s real-data failure after completing any still-required cold packaged/browser confirmation. Delivery remains blocked only until the formal reports are updated; the actual migration recovery is successful.
