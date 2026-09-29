# API/E2E Coverage Investigation

## Investigation Meta

All ticket artifacts are in `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/`.

- Requirements Doc: `requirements-doc.md` (SR-007, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-007)
- Design Spec: `design-spec.md` (SR-007, "SR-007 Tolerant Tree Reading — No Migration")
- Supplemental Task Artifacts: `solution-handoff.md` (routing context only; no behavior-defining supplements)
- Design Review Report: `design-review-report.md` (ARCH-REV-005)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-004)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-005, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A (not a delivery re-entry)
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 2 (API-REV-002; the ledger calls the executed work "Round 3", because an IR-003 run was superseded by SR-007 before it was reported)
- Trigger: code_reviewer CRR-005 pass (SR-007, IR-004); basis `HEAD` `origin/personal@8f57d16d1` plus the uncommitted IR-004 diff
- Prior Investigation Reviewed: round 1 (API-REV-001, Fail / AE-001, basis `8bffda045`)
- Latest Authoritative Investigation: this document, round 2. Round-1 results cover only `8bffda045` (R-9); the "Round 2 (API-REV-002) Basis" section below supersedes the round-1 persistence plan.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of changed durable tests)
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

- `delegate_task` is a pure spawn. It keeps its name and inputs and delivers the work packet, including the delegator address and run ID, as the child's first message.
  - On success it returns `{target_agent_run_id}`.
  - If a spawn fails after preparation starts, it returns `{target_agent_run_id: null, message}`.
  - Validation and recipient errors are still thrown as tool errors (REQ-001; C-03 accepted in review).
- `submit_task_result` and `review_task_result` are deleted from native and MCP surfaces. No task records, task status or transition notifications remain (REQ-002, REQ-003).
- Idle shutdown: a child that stays quiet for the grace period is shut down. The default is 600 000 ms, adjustable from 60 000 to 86 400 000 through `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS`.
  - Running or initializing work cancels the countdown; idle, offline or error re-arms it.
  - Pending tool approval is running work and is never shut down (REQ-004, REQ-005, REQ-016).
- Wake-on-message: a message by run ID from inside the child's root restores the child with its context and then delivers. A message that arrives during shutdown is delivered after restore, and any message from outside the root is rejected (REQ-006 to REQ-008, QR-002, QR-003).
- Root reopen leaves every child shut down and wakeable. Root stop shuts every child down. Root open-work counts running work only (REQ-009 to REQ-011).
- API and UI: the GraphQL task query and REST task routes are gone, and the collaboration panel shows Messages only. The members tree uses the standard status indicator, with shut-down children shown as `offline`, plus a "Started by" line (REQ-013, REQ-014).
- Persistence (SR-007, supersedes the round-1 migration basis): trees are read tolerantly and written exactly (REQ-018, AC-020, AC-021). There is no schema version field, `settledAt` is ignored on read, `delegatorAgentRunId` is optional on read and always written for new children, and there is **no migration**. Old task-records files are never read or written, and old conversations still render (REQ-014, REQ-015). The public DTO has no `schema_version`, and old children carry `delegator_agent_run_id: null`, so no "Started by" line appears for them (R-13, R-14).
- Everything above applies to Team and Org roots on AutoByteus, Codex and Claude (REQ-017).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 `delegate_task` result and packet | Changed | REQ-001, AC-001, design AR-003 | Result shape per runtime (native and MCP) must be proven live; the unit and integration tests prove only the shape |
| BEH-002/003 submit and review tools | Removed | REQ-002, AC-002 | Prove the tools are absent from the live tool catalog and never called |
| BEH-004 idle shutdown | Added | REQ-004, 005, 016; AC-004, 005, 006 | Real-runtime timing at a 60 s grace; approval-pending children per runtime |
| BEH-005 wake-on-message | Added | REQ-006 to 008; AC-007 to 012; QR-002, QR-003 | Real provider restore with conversation context (AutoByteus memory, Codex thread, Claude session); cross-root rejection; race |
| BEH-006 reopen | Changed | REQ-009, AC-013 | Terminate, restore root, message an earlier child |
| BEH-007 root stop | Preserved | REQ-010, AC-014 | Live children stop with the root |
| BEH-008 root open-work | Changed | REQ-011, AC-015 | An errored child counts as quiet; no focused test exists yet |
| BEH-009 UI | Changed | REQ-013, AC-017 | Component specs and implementation fixture-page probes exist; real backend-to-UI check is a candidate |
| BEH-010 records and API removal | Removed | REQ-014, AC-018, AC-019 | GraphQL and REST absence; MCP output union; upgrade of real installed data |
| BEH-011 LLM contract text | Changed | REQ-012, AC-016 | Unit coverage exists (hash-pinned contract and description tests) |
| BEH-012 notifications | Changed | REQ-003, 015 | Only the spawn packet reaches the child; old notifications still render |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `RootTaskExecutionLifecycle`, schedule, leases, adapters, registries | Lifecycle unit tests (fake adapter); Org suite with real registries and handle doubles; Team integration test with a backend double | Real `AgentRun` status transitions and quiescence per runtime | Live API (real runtimes) |
| API / transport / contract | Yes | Tool result union (native and MCP), GraphQL and REST removal, stream contract `TASK_EXECUTION_STARTED`, `offline` status | Contract e2e (hermetic), description tests | Live GraphQL schema and REST 404; the MCP output schema at a protocol version that emits it | Hermetic API e2e plus live runtimes |
| Frontend component / state | Yes | Messages-only panel, members tree status, "Started by" | Web component specs, two fixture-page browser probes | Real backend stream into real UI | Browser (candidate) |
| Browser integration / user journey | Yes | Open a run with children; shut-down child shown `offline`; select opens its conversation | Fixture-page probes only | Live data through the real server | Browser (candidate) |
| Authentication / session / permissions | Yes (root boundary) | Wake only within the sender's root | Router unit test | Real cross-root `send_message_to` | Live API |
| Desktop renderer / web-equivalent UI | Yes | Same as the web UI | As above | As above | Browser against a real server |
| Desktop shell / Electron-specific integration | No | No shell, preload or IPC change | N/A | N/A | None |
| Process / lifecycle | Yes | Grace timers, shutdown, restore, root stop and reopen | Unit and integration tests with controllable clocks | Real timers, real provider processes (Codex app server, Claude SDK session) | Live API |
| Persisted-data transition | Yes | Team tree v3, Org tree v2 migration; records untouched | Migration unit suite, full-registry startup test with released fixtures | Real installed data volume and shapes | Migration probe on an APFS clone of the real install |
| Worker / queue / distributed coordination | Yes (per-root FIFO) | Wake queued behind a shutdown | Queue ordering unit test; lease-held skip | Wake arriving while a real shutdown is in flight | Unit durable case plus a live probe |
| External integration | Yes | Codex MCP tools, Claude MCP tools, LM Studio | None live for this change | Provider session resume after shutdown | Live API |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle` (branch `codex/task-delegation-resource-lifecycle`, base `8bffda045`, uncommitted)
- Project type and runtime stack: pnpm monorepo. The server is TypeScript on Node with Fastify, Mercurius GraphQL, Prisma/SQLite and vitest (forks, no file parallelism). The web app is Nuxt 3 with vitest and Electron.
- Project testing guideline:
  - **Round 1** (base `8bffda045`): `No project testing guideline found`. That was correct then: `TESTING.md` arrived upstream later, in commits `1a035ed15` and `509e62f8f`.
  - **Round 2** (rebased basis): `TESTING.md` at the worktree root applies. The round-2 investigation first carried the stale round-1 line and was corrected after execution. The mapping below shows that the executed plan follows the guideline, with the deviations listed.
- Conflicting, missing or unclear instructions:
  - My shell inherits the user's running AutoByteus desktop server environment: `DATABASE_URL` (production DB), `AUTOBYTEUS_DATA_DIR`, `AUTOBYTEUS_MEMORY_DIR` (`~/.autobyteus/server-data`), definition and skill paths, and Claude Code session variables.
  - `tests/setup/prisma-env.ts` overrides only `DATABASE_URL`, and the e2e harness sets only the app data dir. An inherited `AUTOBYTEUS_MEMORY_DIR` would point memory writes at the user's real data.
  - Every run therefore uses the sanitized wrapper `/tmp/tdrl-api-e2e/senv.sh` (`env -i` keeping `HOME`, `PATH`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `LMSTUDIO_HOSTS` and explicit `RUN_*` flags).
- Required environment variables or secrets available: `Yes`. Codex CLI 0.157.1 and Claude Code 2.1.283 are installed and authenticated through `HOME`. LM Studio at `127.0.0.1:1234` serves `qwen/qwen3.6-35b-a3b` and others. No values are recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Server test commands | `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch` |
| `autobyteus-server-ts/vitest.config.ts` | Runner config | `pool: forks`, `fileParallelism: false`, Prisma setup files; one SQLite test DB per worktree (`tests/.tmp`), so never run two server vitest processes at once |
| `autobyteus-server-ts/tests/setup/prisma-env.ts` | Test DB | Forces `DATABASE_URL` and `DATABASE_URL_TEST` to the worktree test DB |
| `autobyteus-server-ts/.env.test` | Test env | `APP_ENV=test`, sqlite |
| `autobyteus-server-ts/tests/e2e/helpers/studio-runtime-test-server.ts` | Live e2e harness | In-process studio server on port 0, with the agent-tools MCP host listening |
| `autobyteus-server-ts/tests/e2e/helpers/live-runtime-secret-vault-helpers.ts` | Provider keys | Imports provider keys from env aliases into the test vault |
| `tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts`, the old `mixed-task-delegation.e2e.test.ts` | Established live patterns | Gates `RUN_LMSTUDIO_E2E`, `RUN_CODEX_E2E`, `RUN_CLAUDE_E2E`; `CODEX_APP_SERVER_APPROVAL_POLICY=untrusted`; Codex MCP tool name `mcp__autobyteus_agent_tools__send_message_to` |
| `autobyteus-web/AGENTS.md`, `README.md`, `nuxt.config.ts` | Web tests and backend wiring | `pnpm test:nuxt <path> --run`; `BACKEND_NODE_BASE_URL` points the Nuxt app at a server |
| `autobyteus-server-ts/src/app.ts` | Standalone server | `--port`, `--host`, `--data-dir` |
| `autobyteus-server-ts/src/config/task-execution-idle-shutdown-setting.ts` | Grace setting | Read from `process.env` first at arm time; the minimum is 60 000 ms |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process studio server (live e2e) | `autobyteus-server-ts` | Started by the test in `beforeAll` | Temp app data dir; port 0 | `fastify.listen` resolves | `afterAll` closes the server and deletes the temp dirs |
| Codex app server | Spawned per run by the server | — | Uses the user's `~/.codex` auth | Model catalog query | Terminated with the team runs |
| Claude Agent SDK | Spawned per run by the server | — | Uses the user's `~/.claude` auth | Model catalog query | Terminated with the team runs |
| LM Studio | Already running (user-owned) | Not started or stopped by me | Read-only use | `/v1/models` | Not touched |
| Standalone server over a cloned install (upgrade probe) | `autobyteus-server-ts` | `--data-dir <clone>` on a free port | APFS clone (`cp -c`) of `~/.autobyteus/server-data`; DB copied with `sqlite3 .backup` | GraphQL health | Kill the owned PID and delete the clone |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent and Team definitions | GraphQL `createAgentDefinition` / `createAgentTeamDefinition` in a temp app data dir | Never the user's definitions | Deleted in `afterEach`; the temp dir is removed |
| Provider keys | `initializeLiveRuntimeSecretVaultFromEnvironment` | Worktree test DB only | Test DB reset by the harness |
| Pre-change installed data | APFS clone of the user's real install | The original is never written; the clone is in `/tmp` | Clone deleted after the probe |

## Persisted Data Transition Coverage Basis

> **Round 2 (SR-007) decision:** `Directly Usable — No Migration`. The round-1 basis below is historical. The current evidence plan is the design's "SR-007 → Evidence obligations", items 3 and 4, set out in "Round 2 (API-REV-002) Basis".

- Round-1 approved decision (historical): `Migration Required` for trees (Team v2→v3, Org v1→v2). Task-records files are `Not Affected` on disk.
- References: `design-spec.md` › "Persisted Data / State Transition Decision" / "Migration Plan"; `implementation-handoff.md` › "Persisted Data Transition Check".
- Representative existing-data setup: the user's real install. Its logs show `20260926_team_context_file_execution_locators_v1` completed on 2026-09-27, so it is past `TeamContextFileExecutionLocatorsV1`, which is the precondition C-07 requires for a byte-identical records check. It holds 564 Team and 29 Org packages.
- Evidence planned:
  - Hash every task-records file before and after startup and confirm they are byte-identical.
  - Check tree schema versions and migration dispositions.
  - Confirm the old runs appear in run history and member projections render old task packets and notifications.
  - Run a second startup to confirm idempotence.
  - On the upgraded clone, attempt a restore of a pre-change child as observation for the requirements "Unknowns".
- Migration-specific completion and recovery: idempotent rerun, per-package dispositions, and a failure never blocking startup. The unit suite already covers malformed, missing and orphan cases.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-collaboration/root-task-execution-lifecycle.test.ts` | Result shape, grace timing, cancel/re-arm, error arms, leases, precheck, restore failure | AC-001, 004, 005, 011; AR-001 | Still Valid | 15/15 pass | Add the QR-002 case (wake queued behind an in-flight shutdown) |
| `tests/unit/agent-collaboration/root-task-execution-command-queue.test.ts` | FIFO ordering, admission close, fail-stop | QR-002 basis | Still Valid | 3/3 pass | None |
| `tests/unit/agent-org-execution/agent-org-task-idle-shutdown.test.ts` | Org spawn with one tree write, idle shutdown, wake, context-unavailable, timer disposal | AC-001, 003, 004, 007, 011, 014 (Org) | Still Valid; the handle double's `hasOpenExecutionWork` omits `error` (the real handle counts it) | Real `ConfiguredAgentExecutionHandle.hasOpenExecutionWork` includes `error` | Update the double to mirror the real predicate; add the AC-015 errored-child case |
| `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Team pure spawn, v3 tree, shutdown and wake, context-unavailable, nested delegator, target validation | AC-001, 003, 004, 007, 011 (Team) | Still Valid | Pass | None |
| `tests/unit/agent-team-execution/flat-team-execution-manager-routing.test.ts` | Real `FlatTeamExecutionManager` routing | — | Still Valid | — | Add the AC-015 Team case (errored task Agent is not open work; errored configured member still is) |
| `tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts` | Manifest only has `delegate_task`; descriptions; MCP input schema at protocol 2025-03-26 | AC-002, 016 | Still Valid | Pass | Add the MCP output-schema union at 2025-06-18 (AC-019) |
| `tests/unit/agent-team-execution/agent-team-collaboration-llm-contract.test.ts` | Hash-pinned contract text | AC-016 | Still Valid | Pass | None |
| `tests/unit/agent-communication/global-agent-run-message-router.test.ts` | Same-root wake routing; live-only outside the root | AC-007, 012 | Still Valid | Pass | Prove live |
| `tests/unit/app-data-migrations/task-execution-delegator-tree-v1-app-data-migration.test.ts`, `definition-nonmutation-startup.test.ts` | Migration dispositions, idempotence, full-registry upgrade | AC-018 | Still Valid | Pass | Prove on real data |
| `tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts` | `TASK_EXECUTION_STARTED` parse and retired-event rejection | BEH-010/011 contract | Still Valid | Pass | None |
| `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Drives `submit_task_result`, `review_task_result`, `TASK_DELEGATION_EVENT`, `task_id`/`status` results | Old BEH-002/003 | Stale / Replace | Imports the removed `teamTaskDelegationPayloadSchema`; asserts removed tools and result shapes | Rewrite as live spawn → converse → shutdown → wake across runtimes |
| `tests/e2e/run-history/nested-team-history-restart.e2e.test.ts` | Uses `submit_task_result` as a historical tool name in trace fixtures | REQ-015 (old history renders) | Still Valid | Handoff note | None |
| Web component specs and the two fixture-page probes (`task-agent-peer-sidebar-probe.mjs`, `task-agent-monitor-visibility-probe.mjs`) | Members tree rows, `offline`, "Started by", Messages-only panel | AC-017 | Still Valid (implementation evidence) | Handoff | Consider a real-server browser check |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `mixed-task-delegation.e2e.test.ts` › "AutoByteus coordinator delegates work and reviews a concrete task-agent result/revision cycle" | `submit_task_result` / `review_task_result` flow, `TASK_CHANGED` events, `{task_id, status, target_agent_run_id}` result | Tools, records, status and events are deleted | REQ-001 to 003; design Removal Plan | New live cases LIVE-001 (per-runtime spawn → reply → shutdown → wake) | — |
| Same file › "delegates to an agent-team target with the same visible activation copy" | `TASK_TEAM_ACTIVATED` and task DTO | Event and DTO removed | Design DS-006 | LIVE-003 (task Team spawn → shutdown → coordinator wake) | — |
| Same file › "uses the shared intent contract across AutoByteus, Codex, and Claude…" | Task activation events, `task_id` result, no `TASK_CHANGED` after a message | Same | Same | LIVE-001 covers delegation and a follow-up by run ID across all three runtimes | The "intent choice" (LLM picks `delegate_task` versus `send_message_to`) is a prompt-quality evaluation, not an approved acceptance criterion of this ticket; AC-016 text is unit-covered |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| DUR-001 | Team root open-work excludes an errored task Agent | AC-015; design "Open work" guidance | `tests/unit/agent-team-execution/flat-team-execution-manager-routing.test.ts` | No focused test exists (CRR-002 residual risk) |
| DUR-002 | Org root: errored child is quiet, armed, shut down; open-work false throughout | AC-015, AC-004 (AR-001) | `tests/unit/agent-org-execution/agent-org-task-idle-shutdown.test.ts` (+ helper fidelity fix) | Same |
| DUR-003 | Wake queued behind an in-flight shutdown restores after it completes | QR-002, AC-007 | `tests/unit/agent-collaboration/root-task-execution-lifecycle.test.ts` | Deterministic race ordering; the live probe cannot time it exactly |
| DUR-004 | `delegate_task` MCP output schema is the two-shape union | AC-019, REQ-001 | `tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts` | The output schema is emitted only at MCP ≥ 2025-06-18; the current test uses 2025-03-26 |
| DUR-005 | GraphQL task query and REST task routes absent on the real server; tool catalog has no submit/review | AC-019, AC-002 | New `tests/e2e/agent-team-runs/task-delegation-api-surface.e2e.test.ts` (hermetic) | No coverage asserts absence on the running server |
| DUR-006 | Live real-runtime lifecycle (LIVE-001 to LIVE-005) | AC-001 to 007, 009, 010, 012 to 015 | Rewrite of `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` (gated by `RUN_LMSTUDIO_E2E`, `RUN_CODEX_E2E`, `RUN_CLAUDE_E2E`) | Design test obligation; the stale file must be replaced |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| DUR-002 | `tests/unit/agent-org-execution/helpers/task-publication-handles.ts` | Handle double `hasOpenExecutionWork` counts `error` like the real `ConfiguredAgentExecutionHandle` | Fidelity for AC-015 | Rerun every suite that uses the helper |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / AC / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| Three scenarios of the old `mixed-task-delegation.e2e.test.ts` | Assert removed tools, events and result shapes | REQ-001 to 003 | Replaced by DUR-006 (same path) |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec tsc --noEmit -p tsconfig.build.json` | `autobyteus-server-ts`, sanitized env | Source typecheck | Pass | Console |
| 2 | `pnpm exec vitest run --no-watch` (19 focused files: lifecycle, queue, Org idle, migration, startup, Team integration, router, LLM contract, tool tests, schema, readiness, termination, persistence, contract e2e) | Same | Changed-boundary unit and integration | Pass (92 tests) | Console |
| 3 | DUR-001 to DUR-005 new cases | Same | AC-015, QR-002, AC-019 | Planned | — |
| 4 | Broader affected suites (server unit, architecture, integration, hermetic e2e; web unit) | Same | Regression versus the implementation baseline | Planned | — |
| 5 | DUR-006 live e2e (per case) | `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1`, `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS=60000` | Real runtimes | Planned | Ledger |

## Test-Case Ledger Plan

- Ledger required: `Yes`. The run has multiple long-running live cases (each at least one 60 s grace), real LLM nondeterminism and context-compression risk.
- Canonical ledger path: `tickets/in-progress/task-delegation-resource-lifecycle/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Case granularity: one independently meaningful journey or probe

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| REPO-001 | Focused repository suites | All (unit and integration) | vitest | Order 2 above | 1 | Pass counts |
| REPO-002 | New durable cases DUR-001 to DUR-005 | AC-015, QR-002, AC-019, AC-002 | vitest | Per file | 2 | Pass |
| REPO-003 | Broader regression (server unit, architecture, integration, e2e hermetic; web unit) | Regression | vitest | Suite dirs | 3 | Failures equal to the baseline set |
| LIVE-001 | Per-runtime spawn → reply → quiet → grace shutdown → wake by run ID with context → reply; open-work false | AC-001, 002, 003, 004, 007, 015, 016; REQ-017 | Live Team root (AutoByteus, Codex, Claude children) | DUR-006 | 4 | Result shape, `TASK_EXECUTION_STARTED`, `offline` at ≥ grace, recall token in reply |
| LIVE-002 | Child awaiting tool approval past grace is not shut down (per runtime) | AC-006 | Live Team root | DUR-006 | 5 | No `offline` while approval is pending; shutdown after approval and quiet |
| LIVE-003 | Task Team shutdown as a whole; coordinator wake; grandchild wakes a shut-down child | AC-009, AC-010 | Live Team root | DUR-006 | 6 | Offline for all task Team members; restored coordinator reply; child restored by the grandchild's message |
| LIVE-004 | Cross-root run-ID message is rejected; child not restored | AC-012, QR-003 | Two live roots | DUR-006 | 7 | `TARGET_AGENT_RUN_NOT_ACTIVE`-style rejection, no status for the child |
| LIVE-005 | Root stop shuts children; reopen; message an earlier child restores it with context | AC-013, AC-014 | Live Team root terminate and restore | DUR-006 | 8 | Children offline after stop; reply with the recall token after reopen |
| PROBE-QR002 | Message arriving during a real shutdown is delivered after restore | QR-002 | In-process live server with a delay seam on the shutdown | Temporary spec | 9 | Order: shutdown finishes → restore → reply |
| PROBE-ORG | Org root live spawn → shutdown → wake (one runtime) | REQ-017, AC-004, AC-007 (Org) | Live Org root | Temporary or durable (decided after the Team cases) | 10 | Same as LIVE-001 for the Org |
| PROBE-UPG | Real installed data upgrade | AC-018 | Standalone server over an APFS clone | Temporary script | 11 | Records hashes identical; trees v3/v2; runs load; old conversations render; idempotent rerun |
| BROWSER-001 | Real-server UI: members tree child `offline` with "Started by"; Messages-only panel; old run conversation renders | AC-017, AC-018 | Nuxt dev with `BACKEND_NODE_BASE_URL` to an owned server | browser-automation skill | 12 (if the confidence gap remains) | DOM assertions and screenshots |

## Decisions Revised During Execution

- **Team definitions are flat.** `TeamMemberInput` has no `refType`, and the Team integration suite asserts "retired configured-Team recipient in a flat Team root". A task Team can therefore only be delegated under an Agent Org root. LIVE-003 (AC-009/010) moved to an Org root; that also covers REQ-017 for Orgs (PROBE-ORG folded in).
- **Stale shared e2e helper.** `tests/e2e/helpers/team-run-metadata-helpers.ts` required `schema_version === 2`, but this change bumped the public Team tree DTO to 3, so it silently resolved no members for 9 live e2e files. Decision: `Needs Update`, updated to 3.
- **Live coordinator runs on Claude.** A local reasoning model as coordinator once streamed reasoning indefinitely. AutoByteus, Codex and Claude all remain delegated-child runtimes.
- **QR-002 anchor.** The grace is measured from the start of the quiet streak, not the last quiet status: Claude emits `idle` at teardown, and re-arms only move the deadline later.

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | Every AC has unit or integration evidence | Live runtime behavior of AC-006/007/009/013 is not proven by repository tests | Live runs |
| Changed-boundary execution directness | 75% | Real Org registries and a real `FlatTeamExecutionManager` | Provider runtimes are doubles | Live runs |
| Cross-boundary integration realism and mock gap | 70% | Team integration uses a backend double | Provider session resume, router across roots | Live runs |
| Environment, configuration, identity, and fixture fidelity | 80% | Released-shape fixtures | Real installed data | Real-install upgrade probe |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | Manual clocks, lease/queue ordering | Real timers, stop/reopen, approval hold | Live lifecycle |
| User-surface, browser, and desktop-shell confidence | 75% | Web specs plus implementation fixture-page probes | Real server into real UI; Org rendering | Browser on real data |
| Durable regression coverage quality and relevance | 85% | Focused suites plus new DUR cases | Stale live e2e | Rewrite |

- Overall post-repository confidence: 77% (simple average)
- Every critical acceptance criterion directly proven: `No` (live-only criteria)
- Any applicable category below `90%`: `Yes` (all)
- Default clean-confidence target of `95%` met: `No`, so broader validation is required (see below)

## Broader Validation Decision

- Decision: `Required`
- Selected execution modes: `Live API` (real runtimes), `Lifecycle` (stop, reopen, race), a real-data migration probe, and `Browser` if the UI gap remains
- Specific confidence gap: repository tests replace provider runtimes, provider session resume, real status transitions, approval states and real installed data with doubles. The design and review name AC-006, AC-007, AC-009, AC-013, AC-018 and QR-002 as needing live validation.
- Expected confidence after selected validation: ≥ 95% if the live cases pass

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| PROBE-QR002 | Temporary vitest spec with the in-process studio server; `vi.spyOn` on the shutdown path to hold the shutdown open while a message arrives | Zero message loss across a real shutdown/restore | It patches production internals for timing; DUR-003 is the durable ordering proof |
| PROBE-UPG | Standalone server over an APFS clone of the user's install | AC-018 on real data | It depends on the user's private data |
| BROWSER-001 | Owned Nuxt dev plus an owned server | AC-017/AC-018 rendering | Real-data browser journey; the web specs and probes stay the durable coverage |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Desktop shell | Not changed | None | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None | — | — | — |

## Round 2 (API-REV-002) Basis

### What changed upstream since round 1

- **IR-003 / CRR-004:**
  - AR-004: released migrations use a frozen strict module.
  - AR-005: a single liveness predicate; wake runs through the retained handle.
  - CR-003: fixes AE-001 (Org rows show "Started by" and no "Task:" label).
- **SR-007 / IR-004 / CRR-005:**
  - DEC-008: tolerant read and exact write, with no version field.
  - The `20261001` migration is deleted.
  - R-13: the public DTO `schema_version` is removed, and Team `delegator_agent_run_id` is nullable.
  - R-14: no delegator means no "Started by" line.
- **Rebase** onto `origin/personal@8f57d16d1`; this includes `grok_build` and collaboration tools such as `get_handoff_rules`.

### Evidence obligations and planned surfaces

| Obligation (design "SR-007 → Evidence obligations" and CRR-005) | Planned Surface | Case IDs |
| --- | --- | --- |
| Item 1: tolerant reading (AC-020), exact writing (AC-021), and V1 still rejected | Implementation unit and admission suites, rerun as focused repository checks | R3-REPO-001 |
| Item 2: released-migration regression | Implementation suite `released-run-tree-skip-version-upgrade` plus the migration unit suites | R3-REPO-001 |
| Item 3: skip-version chain through both startup entrypoints; repeat startup runs nothing | Released-shape fixture (18 released ledger rows before `20260901`), started through the standalone `node dist/app.js` and the packaged worktree desktop app (`pnpm isolated-app`), each followed by a second startup | R3-11, R3-12, R3-13 |
| Item 4: installed-data copy. The same roots are admitted (8 tree-less excluded); no tree or records file changes (hashes); old children show no starter; a new delegation writes a version-less tree with a delegator; wake and shutdown work on a new child | APFS copy of `~/.autobyteus/server-data` plus a `sqlite3 .backup`. One copy per entrypoint, never the live profile | R3-2 … R3-8 |
| Item 5 and CRR-005: AC-006, AC-007, AC-009, AC-013 per runtime, plus QR-002 | Live suite `mixed-task-delegation.e2e.test.ts` (4 tests), plus a temporary QR-002 probe | R3-10, R3-14 |
| Real-app UI: "Started by" on new children (Team and Org), none on old ones, no "Task:" | Packaged worktree desktop app on the installed-data copy, driven with browser-automation (attach-only) | R3-7, R3-8 |
| C-11 / OBS-001 wake latency | Temporary probe: a configured Claude bystander in the same root during a wake on each runtime | R3-PROBE-C11 |
| Regression | Server unit, architecture, integration and hermetic e2e suites; web unit suite; compared with the round-1 base lists and the IR-004 handoff counts | R3-REPO-003 |

### Existing coverage decisions revised in round 2

| Path | Decision | Reason |
| --- | --- | --- |
| `tests/e2e/helpers/team-run-metadata-helpers.ts` | `Needs Update` → updated again | It filtered on the DTO `schema_version` (3 in round 1). R-13 removed that field, so the helper silently returned no members. It now recognizes the tree by shape only |
| `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` › LIVE-002 | `Needs Update` → updated | After the rebase, members may call `get_handoff_rules`, which under `autoExecuteTools: false` also waits for approval. That is correct AC-006 behavior, but it kept the child busy. The test now denies any extra approval request from the gate children after the planned approval |
| Same file, tree assertions | Still Valid (the implementation updated them in IR-004 to `not.toHaveProperty("schemaVersion")`) | Matches AC-021 |
| `tests/e2e/app-data-migrations/hierarchical-team-run-config-graphql.e2e.test.ts`, `team-run-v1-production-upgrade.e2e.test.ts` | Out Of Scope (pre-existing failures) | Both already fail at base. They need an owner outside this ticket |

### `TESTING.md` compliance (round 2)

| Guideline item | What was done | Status |
| --- | --- | --- |
| Server tests (backend logic, persistence, runtimes) | Server unit, architecture, integration and e2e via vitest (the same suites as `pnpm -C autobyteus-server-ts test` and `pnpm test:e2e`) | Done |
| Web unit tests (`test:nuxt`) | `NUXT_TEST=true vitest run` | Done |
| Electron main-process tests (`test:electron`) | `pnpm -C autobyteus-web test:electron --run`: 36 files / 187 tests pass (run after the handoff; the shell is unchanged by the ticket) | Done |
| Real-provider E2E | Ran the gated live suite directly with `RUN_LMSTUDIO_E2E`, `RUN_CODEX_E2E` and `RUN_CLAUDE_E2E`, with provider keys imported by the harness from the env. I did not use the `pnpm test:e2e:real` wrapper or its preflight | Equivalent layer; the wrapper was not used |
| Rule 1: worktree build in an isolated desktop instance for the full product journey and embedded-server startup | `pnpm -C autobyteus-web build:electron:mac`, then `pnpm isolated-app start --from-worktree` (1.4.91-beta.7), driven with browser-automation (attach-only, reported control port) | Done |
| Rule 2: never test against the user's running AutoByteus or its data | Every test target was an isolated instance, a standalone server or a test-owned DB on **copies**. The design (item 4) explicitly requires an installed-data copy, so `~/.autobyteus/server-data` was read once to clone it and was never written. **Deviation:** the user's running app received read-only GraphQL queries (the root listing and member projections) as the comparison baseline. Nothing was written, and nothing was started or stopped | Deviation (read-only), disclosed |
| Rule 3: use the ports `start` reports | Yes | Done |
| Rule 4: credentials through the importer | Not needed: the copies carry the install's own vault, and the Codex/Claude CLIs use `HOME` auth | N/A |
| Rule 5: stop what you started; `isolated-app list` empty | 4 instances stopped via `isolated-app stop`; `pnpm --silent isolated-app list` → `[]` | Done |
| Rule 6: assertions first | DOM text and aria-label checks, API results and hashes; screenshots are supporting only | Done |
| Packaged Electron harness (`test:e2e:electron`, `:isolation`, `:isolated-app`) | Not run: the ticket changes no launch-profile, isolation or packaged-launch mechanics, and the packaged worktree app was launched successfully 4 times | Not required (by the guideline's selection table) |
| Browser dev-path probes | Not run this round: the real desktop instance is the stronger surface for the same renderer journey | Superseded by the isolated instance |

### Environment and safety decisions (round 2)

- **Writer not stopped.** Design item 4 asks for a stopped-writer copy, but the live app hosts this agent session and cannot be stopped. Mitigations:
  - an APFS clone plus a `sqlite3 .backup`;
  - a change check during the copy (no root changed in the round-3 copy);
  - comparison against the live app through read-only GraphQL only.
- **Server identity.** Server processes need `USER` and `LOGNAME` for Claude authentication. They run with `env -i HOME USER LOGNAME SHELL LANG PATH TMPDIR`.
- **One copy per entrypoint.** Each desktop instance uses its own data root under `/private/tmp/tdrl-api-e2e/r3/`: `desktop-root` (worktree app), `release-root` (installed release, for the OBS-002 comparison) and `fresh-root` (worktree app, for the OBS-002 first-open check).

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (round 2: the helper and the LIVE-002 approval handling)
- Round-1 outcome: `Fail`, 90% (AE-001).
- Round-2 outcome and confidence: see the execution report (API-REV-002).
- Broader validation decision: `Required`, executed
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: every test command runs under `/tmp/tdrl-api-e2e/senv.sh` to isolate the run from the user's live AutoByteus data.
