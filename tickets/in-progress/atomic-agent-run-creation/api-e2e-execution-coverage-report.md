# API/E2E Execution Coverage Report — atomic-agent-run-creation (autobyteus-349)

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/atomic-agent-run-creation/tickets/in-progress/atomic-agent-run-creation/`.

**Safety:**
- Every server of this round ran on a temporary data root created by the probe and removed afterwards.
- The user's data was read once, read-only, for record key names, the `activationState` value and file-name patterns. Nothing was written to it.
- No build of this branch was ever started on it.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; CRR-001 Pass (code `c533fc0b5b`, guard `93fa105819`, handoff `ded1b718e5`, review `1dca0e2ad6`).
- Deviations from the plan:
  - API-02B: a small AC-003 rerun adding a history-index check and a base-build listing of the same data.
  - API-03B to API-03E: repeats of the crash case to capture what the leftovers hold.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/atomic-agent-run-creation/tickets/in-progress/atomic-agent-run-creation/evidence/`

## Routing Classification

- Task size: `Small`; Architectural risk: `High`; Input route: `Reviewed`; Successful-output route: `Code Review`.
- Proportional test-code review decision: `Not Applicable` this round (result `Fail`; failure-origin review requested). No durable test code changed by API/E2E.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform | Build | Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | `1dca0e2ad6` (code `c533fc0b5b` + `93fa105819`), clean detached checkout | macOS 26 arm64, Node 22.23.1 | server `prebuild` + `build` | `node dist/app.js --port --data-dir <temp>`; data `.env` `APP_ENV=test`, `LMSTUDIO_HOSTS=<scripted model>`; throwaway `CODEX_HOME`. API-02 only: temporary `[349-DIAG]` timestamps around the startup stage (restored before API-02B; `grep -rl 349-DIAG dist` empty at the end) |
| ENV-2 | base `e87e6bb2b1` (includes autobyteus-339), clean detached checkout | same | server build | Contrast only |
| Runtimes | — | — | Codex CLI 0.166.0 (`gpt-6.1-terra`, effort medium) for codex activations; scripted LM Studio inference for native runs (no paid inference) | — |

## Cases

| Case ID | Criteria | Boundary | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-001..AC-003 (unit), AC-005 | Repository | Reused IMP-01..IMP-05 | — | Pass | implementation-handoff Checks Run | per IMP row | No code change since `93fa105819` |
| API-00 | — | Builds | clean + base checkouts; server builds | ENV-1/2 | Pass | (progress log) | — | — |
| API-01-clean | AC-001 | Real server whose PATH has no `codex`; GraphQL `createAgentRun`: a codex run (CLI not installed) and a native run with an unknown model | `env -i PATH HOME USER LOGNAME TMPDIR node evidence/API-349-probe.mjs ac001 <clean>/autobyteus-server-ts evidence API-01-clean` | ENV-1 | Pass | `API-01-clean-result.json`, `-run.log`, `-server-nocodex.log` | `{"success":false,"message":"Error: Codex app server process error: Error: spawn codex ENOENT. …"}`; `{"success":false,"message":"Error: MODEL_IDENTIFIER_NOT_AVAILABLE"}`; `historyAfter: []`; `diskAfter: {}` | The caller gets the activation error; no row and no folder |
| API-01-base | AC-001 contrast | same on the base build | same, base | ENV-2 | Observed | `API-01-base-*` | same two errors; **2 history rows, 2 folders** with `preparedAt`, `startedAt: null` | What the change removes |
| API-02 | AC-003, N-4 | Real startup on a temp root seeded through real code (`prepareAgentRun`, `createAgentRun`, a native first message) plus minimal structure edits learned read-only. Shapes: E1 empty never-started; E2 empty with empty `context_files/` and `work_journal/`; CTX `context_files/note.txt` only; UNREADABLE record (`{ not json`); COLLAB never-started root with `collaboration/collaboration_tree.json`; MAY a real conversation with `startedAt` removed and `activationState: "ACTIVATED"`; STARTED; TASK a task-agent record (`taskAgent` section, `preparedAt`, no `startedAt`, record only). Plus 300 empty and 300 started bulk runs | `… ac003 <clean> 300 evidence API-02` | ENV-1 (diag) | Pass | `API-02-result.json`, `-run.log`, `API-02-server-seed.log`, `-restart-1.log`, `-restart-2.log` | `Removed empty never-started run '…' ('Seed E1-empty')`, `('Seed E2-empty-subfolders')`; `Kept run '…': its record could not be read: …`; `Empty never-started run removal skipped 1 folder(s) without a standalone run record`; E1/E2 `listed false onDisk false`; CTX/COLLAB/MAY/STARTED `listed true onDisk true`; TASK and UNREADABLE on disk; `bulkEmptyLeft 0`, `bulkStartedKept 300`, `removedLines 302`; N-4: `stage start` → `stage end` **4563 ms** (302 removals, 608 run folders), **124 ms** on the next start (306 folders, nothing to remove) | ≈ 15 ms per removal; the scan alone ≈ 0.4 ms per folder |
| API-02B | AC-003 (index, listing) | Same seed without bulk; history index read after restart; the same data started on the base build | `BASE_DIR=<base> … ac003 <clean> 0 evidence API-02B` | ENV-1, ENV-2 | Pass | `API-02B-result.json`, `-server-*.log` | index rows: E1/E2 `false`; CTX, UNREADABLE, COLLAB, MAY, STARTED `true`. The base build also hides UNREADABLE from the listing (`baseListedSameData false`) | The unreadable run's hidden listing is existing behavior; its row and folder are untouched |
| API-03 | AC-004 | (a) Crash: six staggered codex `createAgentRun` requests, SIGKILL of the server mid-way (up to 5 attempts); (b) stuck activation: `codex app-server` SIGSTOPped, a create in flight, SIGTERM (grace → bound → sweep). Relaunch copies of both data roots on the new and the base build | `… ac004 <clean> <base> evidence API-03` | ENV-1, ENV-2 | **Fail (crash case)** | `API-03-result.json`, `-run.log`, `API-03-server-*.log` | crash attempt 2: `preparedOnly 2`; `relaunch crash-new … listedAfter 2, onDiskAfter 2, log []` (new build keeps both, logs nothing); stuck: `exit {"code":1}`, `stopMs 11626`, the cut create left no run (`historyRows 1`) | F-API-001 |
| API-03B..E | AC-004 (what the leftovers hold) | Crash case repeated with leftover contents captured | `ONLY_CRASH=1 … ac004 … API-03B/C/D/E` | ENV-1 | Fail (same) | `API-03B..E-result.json`, `-run.log` | leftovers per crash: **record only** (removed at relaunch); **record + `raw_traces_active.jsonl` (2047–2048 B)**; **record + trace + `run_metadata.json.<pid>.<ts>.<hash>.tmp`** (800 B, a record **with** `startedAt`). Trace line: `"trace_type":"system_instruction"`, content `## Agent Identity …`. Relaunch on the new build: `listedAfter 1, onDiskAfter 1, log []` | The trace is the agent's system prompt written during activation; no user message was ever sent |
| API-04 | AC-005 | Two-step creation on the real server: `prepareAgentRun` (record only) → WS first message → turn → restart | `… ac005 <clean> evidence API-04` | ENV-1 | Pass | `API-04-result.json`, `-server-*.log` | before: `["/","/run_metadata.json"]`, `startedAt: false`; after the message: `startedAt: true` with traces, journal, snapshot; after restart `listed … "summary":"Two-step first message"`, `onDisk: true`, no removal line | — |
| API-05 | AC-005 (regression) | 284's gated stop-now E2E (creates, terminates, relaunches through the new stage) | `RUN_BUSY_STOP_NOW_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-05-gated-e2e.log` | `Tests  2 passed (2)` | — |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01-clean (two real activation failures), API-01-base (contrast), IMP-02 | Proven | — |
| AC-002 | Yes | IMP-02 (the real catalog refuses a started run, logged) | Proven (unit, temp root) | — |
| AC-003 | Yes | API-02, API-02B, IMP-01 | Proven | — |
| AC-004 | Yes | API-03, API-03B..E | **Not proven: fails** for a crash during activation (F-API-001). A record-only leftover is removed; a leftover with the activation's `system_instruction` trace, or a stale record `.tmp`, stays listed | — |
| AC-005 | Yes | API-04, API-05, IMP-05 | Proven (remote delegation by unit suite only) | — |

## Findings

**F-API-001: a create interrupted by a crash during activation leaves an empty run that the startup removal keeps.**
Preliminary classification: `Requirement Gap`. Failure-origin review requested.

- **Trigger (AC-004 shape):** a `createAgentRun` whose server process ends during activation (SIGKILL, crash, OS kill).
- **Observed in 5 crash samples, with 1–3 leftovers each** (API-03, API-03B..E):
  - some leftovers hold only the record, and the new build removes them at relaunch;
  - most also hold `raw_traces_active.jsonl` with one `system_instruction` trace (the agent's system prompt, 2 KB, written during activation);
  - some also hold an orphaned atomic-write temp file `run_metadata.json.<pid>.<ts>.<hash>.tmp`, whose content is the record **with** `startedAt`. The crash hit between the temp write and the rename of the started commit.
- **What the stage does with them:** it reads both kinds of file as content and keeps the run without any log line. The run stays in history as an empty `offline` run, exactly as on the base build.
- **No user content is involved:** no user message was ever sent to these runs.
- **Why a requirement decision:**
  - The implementation follows REQ-002 literally ("its folder holds no file besides the record"), which the user approved after the read-only count.
  - That count's six empty runs were record-only (failed activations before any trace).
  - Interrupted activations, the case AC-004 and the problem statement name ("if the server stops during the start, it stays too"), usually write the system-instruction trace first.
  - REQ-002 and AC-004 therefore disagree for this shape. Widening what "empty" means changes which stored runs are deleted, which is the user's decision (DEC-001).
- **Possible directions (not decided here):**
  - count a run as empty when, besides its record, it holds only activation artifacts: a raw-trace file whose entries are all `system_instruction`, and stale `run_metadata.json.*.tmp` files;
  - keep the strict rule and accept these leftovers as a recorded residual;
  - prevent the trace write before `startedAt` is committed (a design change).
- **Not affected:** the stuck-activation + SIGTERM variant left no run (the cut create never persisted; `historyRows 1`).
- **Reproduce:** `env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" ONLY_CRASH=1 node evidence/API-349-probe.mjs ac004 <built server> <base server> <out dir> <id>`, then read `crash[].leftoverDisk` and `relaunch.crash-new`.

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 70% | 80% | AC-001, AC-002, AC-003, AC-005 proven | AC-004 fails (F-API-001) | Resolve F-API-001 |
| Changed-boundary directness | 75% | 95% | Real server, real startup, real activation failures, real crash | — | — |
| Integration realism | 70% | 93% | Real codex spawn failures, scripted native inference, real catalog and disk | Native inference scripted | — |
| Environment / fixture fidelity | 80% | 93% | Shapes seeded through real code; May and task-agent shapes from read-only key names | Synthetic edits for May/unreadable/task | — |
| Failure / edge / lifecycle | 70% | 80% | Crash and stuck-activation interruptions, bulk, unreadable, symlink (unit) | F-API-001 | — |
| User surface / desktop | N/A | N/A | Server-only change | — | — |
| Durable regression quality | 90% | 90% | IMP-01..03 with mutations | AC-004's crash shape has no durable case | Add with the fix |

- Overall post-repository: 76%; final: 88.5% (simple average over the six applicable categories).
- Every critical AC directly proven: `No` (AC-004).
- Categories below 90%: requirement proof 80%, failure/edge 80%.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed). Mode: `Live API` / `Lifecycle` on real server processes and temporary data roots.
- Gap addressed: unit tests use synthetic shapes. Real activations and crashes produce shapes the unit tests did not model; this is how F-API-001 was found.

## Persisted-Data Transition Checks (When Applicable)

- Approved decision: `Discard` of content-free never-started runs at each startup.
- Representative existing data:
  - shapes seeded through real code on temporary roots;
  - the May shape from a real conversation edited to the read-only-learned keys (`activationState: "ACTIVATED"`, no `startedAt`);
  - never the user's data.
- Transition followed without an unnecessary migration: `Yes`. No version-specific branch was observed.
- Residual: F-API-001. The first start on the user's real data (removing the 6 record-only runs) is not run here.

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`. Legacy retention: `No` (`cleanupStalePreparedRuns` removed). Compatibility-only durable coverage: `No`.

## Durable Coverage Changed In The Codebase

- `No`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Native LLM | Scripted LM Studio-compatible SSE | Credential-free; the native runtime is real | — |
| A runtime that cannot start | Server PATH without `codex`; unknown native model | Real activation failures through real code | — |
| Crash | SIGKILL of the real server process | A real interruption at the process boundary | Timing-dependent; repeated until a leftover appeared |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Clean and base checkouts, run temp root `ar349-api.*` | Yes | `git worktree remove --force`, prune, `rm -rf` | Removed |
| Temporary data roots (one per probe run) | Yes | Removed by the probe (`rootRemoved: true`) | Removed |
| Servers, codex app-servers (incl. a SIGSTOPped one and crash orphans) | Yes | SIGTERM/SIGKILL by recorded PID (descendants recorded before each SIGKILL) | No `ar349` process left |
| `[349-DIAG]` lines in `dist/server-runtime.js` | Yes | Restored from backup before API-02B; checkout removed | Removed |
| Read-only scan script for key names (`/tmp/ro349`) | Yes | Deleted right after use | Removed |
| `evidence/API-349-probe.mjs` | Yes | Kept as evidence | Kept |

## Residual Risks

- F-API-001 (open).
- FU-001..FU-004 (handoff).
- N-4 measured: a startup with many removals costs about 15 ms per removed run. A normal start scans quickly (124 ms for about 300 folders).
- Remote delegation's two-step flow was not exercised across nodes (unchanged code; unit suite).

## Preliminary Classification (On `Fail`)

- F-API-001: `Requirement Gap`. REQ-002's approved emptiness rule does not cover the activation artifacts a crash leaves, so AC-004 cannot pass under it. The owner may judge it a `Design Impact`, if the design should instead prevent those artifacts or define them as non-content within the approved intent.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-004 (F-API-001).
- Preliminary classification and recommended owner: F-API-001 `Requirement Gap` → failure-origin review.
- Next recipient from `get_handoff_rules`: code reviewer.
- Notes: D1 and D2 behave exactly as specified:
  - a failed activation leaves nothing and returns its error;
  - startup removes only record-only never-started runs and keeps every other shape, including unreadable records and task agents;
  - the two-step flow is unchanged.
