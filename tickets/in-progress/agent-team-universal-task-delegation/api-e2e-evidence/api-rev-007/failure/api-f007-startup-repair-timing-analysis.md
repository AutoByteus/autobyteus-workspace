# API-F-007 — Server Restart Does Not Repair Stale Team Tasks Before Listen

- Revision: `API-REV-007`
- Source: `c853559929470e3455a7f7c160d4bd02a6a380dd`
- Scenario: `API-UTD-RESTART-007`
- Result: `Fail`
- Preliminary owner: implementation source, subject to focused `code_reviewer` confirmation
- Operational database action: `NONE`

## Required behavior

BEH-012, UC-017, R-041, AC-043, DS-009, and the persistence architecture contract require a server restart to strict-load each complete current Team package before listen/exposure, append exactly one interruption to stale `active`/`awaiting_review` tasks, write the matching execution settlement timestamp, validate, and only then admit the root. Explicit reopen must use the same loader. Live task work must never resume or replay.

## Real checked-disposable reproduction

1. A real AutoByteus coordinator delegated one formal task to `/worker` on the checked disposable target.
2. The real worker intentionally left the task active. Durable truth before shutdown was one `active` task and one matching task-Agent execution with `settled_at: null`.
3. API/E2E stopped only the owned server process and restarted the built server on the same owned runtime/database.
4. The server listened successfully.
5. Before any explicit restore, the public history queries still returned the task as `active`, with zero interruption updates and `settled_at: null`.
6. Only a later `restoreAgentTeamRun` call invoked repair. That call correctly changed the task to `interrupted`, appended exactly one restart interruption, wrote the identical recovery timestamp to `settled_at`, and exposed the restored root.
7. Terminate/restore a second time retained exactly one interruption and the same settled timestamp, proving the loader itself is idempotent.

## Source-origin determination

`server-runtime.ts` calls `TeamRunV1PackageCatalog.rebuild()` before listen. The catalog reads the three files, calls `validateTeamRunStatePackage()`, and admits the package, but it never invokes `TeamRunStatePackageLoader.loadAndRepair()`.

The repair loader exists and implements the required stale-task interruption/settlement. Repository-wide production call-site inspection finds its only invocation in `AgentTeamRunManager.restoreTeamRun()`. Therefore explicit restore is correct, while the server-restart entry point bypasses the authoritative repair owner.

This is not provider behavior, browser timing, stale coverage, migration input, or environment collision. The post-restart state is a direct public API observation of unchanged durable current-schema facts on the exact disposable target.

## Required correction

Route complete current Team packages discovered during startup through the same strict `TeamRunStatePackageLoader` before catalog admission/listen. Preserve root-local diagnostics and unavailability for repair write failure. Do not add a second repair planner, compatibility reader, retry/replay path, provider-specific behavior, or live-task recovery.

After source review passes, API/E2E must rerun this exact real lifecycle first and prove that the first post-listen public read already shows one `interrupted` task and matching non-null `settled_at`, before any explicit restore call.

## Evidence

- `../live/persistence/stale-task-active-turn.json`
- `../live/persistence/stale-task-post-restart.json`
- `../live/persistence/stale-task-restore-repair-assertion.json`
- `../live/persistence/stale-task-second-restore-idempotence.json`
- `api-f007-restart-repair-source-boundary-audit.log`
- `../environment/safe-target-preflight.log`
- `../environment/server-pid-lsof.log`
- `../environment/final-cleanup-verification.log`

