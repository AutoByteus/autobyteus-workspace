# User Electron Nested History Failure Analysis

## Result

`Fail` — the user's real `~/.autobyteus/server-data` was not repaired, even though the production migration ledger says the repair migration succeeded.

## Environment Preserved

- Initial Electron PID `23582` / server PID `24203`: ticket worktree packaged app at `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`, port `29695`, `--data-dir /Users/normy/.autobyteus/server-data`.
- The user subsequently performed another real app stop/start. At the final audit the replacement Electron PID was `30790` and embedded server PID was `31397`; the latter again had `/Users/normy/.autobyteus/server-data/db/production.db` open and health returned `200`.
- No process, database, ledger row, or memory file was stopped or modified during diagnosis.

## Exact User Run

- Root TeamRun: `nested_classroom_test_team_83a531dc8def4e82bbc946a02661bb8a`
- Summary: `give student team a hard middle school math task`
- Created: `2026-08-20T16:38:54.598Z`
- Configured nested TeamRun: `student_study_group_d5e7da72c5e94cbe8e5b264b736de274`
- Configured Student One: `student_one_1914195019d548bcb18b3c769d726377`
- Four settled task-Team executions are present in the V1 tree and visible as rows in the user's screenshots.

## Expected Versus Observed

| Boundary | Expected after startup repair | Observed |
| --- | --- | --- |
| Configured Student One location | `<root>/student_study_group_d5e.../student_one_1914.../raw_traces_active.jsonl` | Canonical directory absent. Old flat `<root>/student_one_1914.../raw_traces_active.jsonl` exists, 37,825 bytes / 77 lines. |
| Configured Student Two location | `<root>/student_study_group_d5e.../student_two_96b4.../raw_traces_active.jsonl` | Canonical directory absent. Old flat trace exists, 4,878 bytes / 10 lines. |
| Task Student One locations | `<root>/<taskTeamRunId>/<agentRunId>/raw_traces_active.jsonl` for each task | All four canonical task directories absent. Old flat traces exist for all four Student One runs. |
| Configured Student One public projection | Non-empty conversation/activity/last activity | `conversation: 0`, `activities: 0`, `lastActivityAt: null`; Event Monitor `0`. |
| Task Student One projections | Non-empty for task runs with stored traces | `0/0/null`, Event Monitor `0`, while the corresponding old flat traces exist. |
| Direct-root Teacher control | Unchanged and non-empty | Pass: `90` conversation, `34` activities, Event Monitor `90`, non-null last activity. |
| Electron UI | Selecting configured/task Student One renders history | User screenshots show rows/task records but blank center history. This matches the empty public projections exactly. |

## Migration Ledger Mismatch

Production GraphQL reports:

- migration: `20260823_repair_team_agent_memory_layout`
- status: `SUCCEEDED`
- attempts: `1`
- summary: `Scanned 12; migrated 0; skipped 12; failed 0.`
- completed: `2026-08-23T09:05:09.870Z`
- log path: `.../autobyteus-server-ts/tests/.tmp/api-e2e-real-nested-classroom.OgUByB/logs/app-data-migrations/...`

That log path belongs to API/E2E's deleted isolated runtime, not the user's real data directory. No corresponding repair log exists under `/Users/normy/.autobyteus/server-data/logs/app-data-migrations`.

API/E2E round 1 already recorded an excluded restart attempt in the same period where `DATABASE_URL` was omitted and the process read the shared default database. The production ledger row's isolated-runtime log path demonstrates that an isolated-runtime success record was written into the shared production ledger. The exact write mechanism is inferred to be that disclosed misconfigured attempt; the ledger/path mismatch itself is direct evidence.

Because the production ledger now says `SUCCEEDED`, the packaged Electron startup does not rerun this migration against the actual user memory. `canRetry` is false and `recoveryAction` is `NONE`, so the normal Settings Retry path cannot repair it.

The final read-only probe was repeated after the user's later real packaged-app restart. It returned the same terminal ledger row, the same flat-only file sizes/line counts, and the same zero configured/task projections and Event Monitor counts. The restart therefore directly reconfirms that startup is skipping the unperformed real-data repair.

## Classification

- Immediate origin: API/E2E environment contamination from a test process that combined isolated app data with the shared production database.
- User-visible consequence: actual older data remains flat, canonical-only readers correctly return empty, and Electron has no history to render.
- Potential design/implementation impact: a new safe repair path or follow-up migration ID may be required because the existing production record is terminal `SUCCEEDED`. A one-off offline data/ledger repair is also possible but must not be performed without an approved, backed-up procedure.
- This is not evidence that the current canonical writer/reader fails on fresh data; API-REV-002 proved that fresh canonical runs work. It is evidence that the user's approved migration outcome has not occurred.

## Safety / Next Step

Do not move directories, edit `production.db`, delete the migration row, invoke an ad-hoc mutation, or stop the user's app during diagnosis. The solution designer/code reviewer should decide between:

1. a new follow-up production migration that detects remaining eligible flat V1 directories despite the old terminal record; or
2. an explicit backed-up offline recovery procedure for this installation, followed by real Electron restart/click verification.

The final recovery acceptance check must use this exact user run: stop Electron/server normally, start the packaged app again, click configured Student One and at least one data-bearing task Student One, and directly observe non-empty Conversation, Activity, and Event Monitor.
