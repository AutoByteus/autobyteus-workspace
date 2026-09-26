# API/E2E Coverage Investigation — claude-sdk-streaming-input-session

(`...` = `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session`)

## Investigation Meta

- Requirements Doc: `.../requirements-doc.md` (SR-011, Approved)
- Investigation Notes: `.../investigation-notes.md`
- Solution Revision Record: `.../solution-revision-record.md`
- Design Spec: `.../design-spec.md` (SR-011)
- Supplemental Task Artifacts: `.../probe-evidence/` (evidence only)
- Design Review Report: `.../design-review-report.md` (ARCH-REV-004 Pass)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Implementation Handoff: `.../implementation-handoff.md` (IR-003)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report: `.../code-review-report.md` (CRR-002 Pass, 9.3/10)
- Code Review Revision Record: `.../code-review-revision-record.md`
- Delivery Revision Record: `N/A`
- API/E2E Revision Record: `.../api-e2e-revision-record.md` (created on completion)
- Current API/E2E Revision ID: `API-REV-002`
- API/E2E Test-Case Ledger: `.../api-e2e-test-case-ledger.md`
- Current Investigation Round: 2
- Trigger: code_reviewer CRR-004 Pass (HEAD `d3e227389`, IR-004 / SR-012 fix for API-F-001 / RSK-007)
- Prior Investigation Reviewed: round 1 (API-REV-001, Fail / 88%)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required` (durable test changes are planned)

## Current Requirement And Design Basis

Claude runs keep one streaming-input CLI process per AgentRun. The process opens lazily, is resumed after an unexpected exit, and is closed only by terminate, close or shutdown.
- `ClaudeTurnTracker` owns canonical turns, including turns the CLI starts itself; those are announced with `SYSTEM_TASK_NOTIFICATION`.
- Stop uses `interrupt({cancelQueued:true})`.
- Images are sent inline.
- The v1.4.78 policy env is removed.
- The shared AgentRun claim rule appends later input into the active turn for append-capable runtimes (Claude and Codex). A proven-undelivered append is requeued as the next `start_turn`.

ACs to prove: AC-001..AC-016 and QR-001..QR-003. Preserved behavior: REQ-010.

The code reviewer named these gaps: AC-014, AC-004, AC-016, AC-001/006, AC-007, AC-008, AC-009, AC-012, RSK-007, and the rendered web check of a replayed notice.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-004: one CLI process per run (REQ-001/006) | Changed | Design SPINE-4 | Live pid checks across turns, idle, restart |
| BEH-001/008: background tasks + provider-initiated turn (REQ-002/003/009) | Changed | SPINE-3 | Existing live AC-002 (both CLIs) + fake-CLI; history replay/web render |
| BEH-002/009: mid-turn delivery; shared claim rule (REQ-004/012) | Changed (Claude + Codex) | SR-011 | Live Claude AC-003, live Codex AC-014, team AC-004 (both runtimes), AC-016 race through real AgentRun + Claude session |
| BEH-003: Stop ends the turn only (REQ-005) | Changed | SPINE-5 | Live AC-005 with foreground command + surviving background task + pid |
| BEH-006: terminate closes the process and its tasks (REQ-007) | Changed | SPINE-4 | Live AC-008 orphan check |
| REQ-008: crash → visible error, resume | Added | SPINE-4 | Live AC-009 SIGKILL + RSK-007 usage fold |
| BEH-005: inline images (REQ-011) | Changed | Builder | Live AC-012 (no Read) + AC-013 (missing image) |
| BEH-007: restore resumes | Preserved | — | Live AC-007 (fresh manager + AgentRun + socket) |
| Memory trace `system_task_notification` + replay (web hydration) | Added | Persisted: Directly Usable | Unit (existing) + rendered web check |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Tracker, registry, session, process, AgentRun claim rule | Large unit suites (fake frames/backends) | Real CLI frame timing and process behavior | Live CLI |
| API / transport / contract | Yes | Websocket stream (TURN_*, SYSTEM_TASK_NOTIFICATION); `append_to_active_turn` dispatch | Fake-CLI websocket E2E | Real model/CLI | Live websocket E2E |
| Frontend component / state | Yes (small) | `runProjectionConversation.ts` maps replayed notice → existing segment | Web unit spec | Rendered output not inspected | Browser |
| Browser integration / user journey | Yes (small) | Run-history view of a Claude run with a notice | None | Render | Browser |
| Authentication / session / permissions | Indirect | Tool approval in a long-lived process | Live manager integration | — | Existing live |
| Desktop renderer / web-equivalent UI | Same as frontend | — | — | — | Browser (web-equivalent) |
| Desktop shell / Electron-specific | No | — | — | — | None |
| Process / lifecycle | Yes | CLI process lifetime, crash, terminate, restart | Unit with fakes | Real pids, orphans, SIGKILL | Live + `ps` |
| Persisted-data transition | Yes (additive trace) | `system_task_notification` trace + replay | Unit | Real run-history projection | Server + browser |
| Worker / queue / distributed | Yes | AgentRun input queue (shared) | Unit | Real Codex steer, team routing | Live Codex + team |
| External integration | Yes | Claude CLI (PATH 2.1.283, bundled 2.1.280), Codex app-server 0.156.1 | Live suites | CLI version drift | Live both CLIs |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session` (HEAD `b7c6d86b3`)
- Stack: pnpm monorepo; server Fastify + vitest; web Nuxt 3.
- Conflicting/unclear instructions: many E2E files still send the removed GraphQL `refType` member field (pre-existing since `37d05c7f7` flat agent organizations). They are not repaired here, and AC-004 gets a focused new test on the current schema.
- Secrets: local Claude CLI auth, and Codex logged in with ChatGPT. Available.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Test commands | `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch` |
| `implementation-handoff.md` "Environment" | Worktree setup | `prisma generate`, `prepare:shared` (done), and `nuxt prepare` for web |
| Live gates in tests | `RUN_CLAUDE_E2E=1`, `RUN_CODEX_E2E=1` | Live tests skip otherwise |
| `tests/helpers/claude-cli-executable-candidates.ts` | Two-CLI matrix | `CLAUDE_CODE_EXECUTABLE_PATH` selects the CLI |
| SDK 0.3.280 spawn | CLI argv | `--session-id=<uuid>` on create and the session id on resume, so `pgrep -f <sessionId>` finds the run's process |

| Component | Working Directory | Start / Setup | Notes | Readiness | Cleanup |
| --- | --- | --- | --- | --- | --- |
| In-test Fastify + agent websocket | server-ts | test harness, port 0 | Real AgentRun + real Claude backend/session + real SDK/CLI | CONNECTED | close in `finally` |
| Studio runtime test server (team, AC-004) | server-ts | `startStudioE2eRuntimeServer` + GraphQL | Temp app-data dir | listen | terminate team run, delete defs, close |
| Codex app-server | per test | `CodexAppServerClientManager` | `codex app-server` | startup ready | `clientManager.close()` |
| Backend + web for render check | superrepo | to decide (see Broader Validation) | — | — | — |

| Data / Fixture / Identity | Mechanism | Safety | Cleanup |
| --- | --- | --- | --- |
| Temp workspaces, marker files, PNG fixture | `mkdtemp` | Isolated | `rm` |
| Claude/Codex identity | Local CLI auth | No secrets in logs (checked) | — |
| Parent Claude Code env | Stripped (`buildStandaloneClaudeProcessEnv` / `env -u`) | Mimics a server process | — |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration` (additive `system_task_notification` trace; older traces lack `sender_id`).
- Evidence planned: the existing unit tests for memory/replay; the rendered replay of a live notice through the real run-history projection. Older runs need no migration (the reader ignores unknown types; existing tests).

## Existing Durable Coverage Inventory

| Path / Scenario | Intent | Related | Validity | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| Unit: claude session/tracker/builder/manager/backend, client/streaming session, input admission, agent-run, codex backend/thread, memory/replay | New behavior | AC-003..016 (unit) | Still Valid | C01: 845/851. The 6 failures are in 3 files outside the changed areas and fail identically on base (C01b) | Keep |
| `tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` (fake CLI AC-005/003/002 + live interrupt) | Websocket turn lifecycle | AC-002/003/005 | Still Valid | C02 pass | Keep; add the AC-016 race case |
| `tests/e2e/runtime/claude-agent-background-task.e2e.test.ts` (live, both CLIs) | AC-002 live | AC-002, QR-002 | Still Valid | C02 pass | Keep |
| `tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` | Streaming transport, resume, MCP, cancelQueued ×2 CLIs | AC-001 (transport), RSK-006 | Still Valid | C02 pass 6/6 | Keep |
| `tests/integration/agent-execution/claude-session-manager.integration.test.ts` | Approval, deny, auto-exec, interrupt, terminate, restore | REQ-010, AC-007 (transcript) | Still Valid | C02 pass 9/9 | Keep |
| `tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts` | Backend events live | REQ-010 | Still Valid (2 Agent Tools MCP cases stub `not_exposed`, pre-existing) | Handoff | Run for regression |
| `tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` (live) | Codex backend events | Codex regression | Still Valid | To run | Add the AC-014 case |
| `tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts`, `codex-team-…`, others with `refType` | Team roundtrip | REQ-010 | `Out Of Scope` (stale on base: GraphQL `refType` removed; nested team members no longer exist in the schema) | C03 | Not repaired; new focused AC-004 test instead; reported |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Evidence | Planned Path | Why Durable |
| --- | --- | --- | --- | --- |
| E2E-LIFE-01 | Same pid across 3 turns and after idle, with context | AC-001, AC-006, QR-001/002 | `tests/e2e/runtime/claude-agent-streaming-session-lifecycle.e2e.test.ts` (gated) | Core REQ-001/006 invariant; detects regressions to per-turn processes |
| E2E-LIFE-02 | Mid-turn user message during a foreground command; one turn; both inputs complete once | AC-003, QR-003 | same | Live proof beyond the fake CLI |
| E2E-LIFE-03 | Stop during a foreground command; same pid; background task survives; next message answered | AC-005 | same | Live proof of the IC-1 Stop path |
| E2E-LIFE-04 | Terminate with a running background task → no CLI or task process remains | AC-008, QR-001 | same | Orphan guard |
| E2E-LIFE-05 | SIGKILL CLI mid-turn → visible error; next message resumes with context; usage fold sane | AC-009, REQ-008, RSK-007 | same | Crash path is otherwise unit-only |
| E2E-LIFE-06 | Restart simulation: fresh manager/AgentRun/socket restores; new pid resumes; recalls a fact | AC-007, BEH-007 | same | Restore path with recall (existing test only checks the transcript) |
| E2E-LIFE-07 | Inline image answered without Read; missing image is non-fatal | AC-012, AC-013 | same | Live image contract |
| E2E-RACE-01 | Append reaches Claude after the turn settled → requeued as next `start_turn`; resolves once at its own turn | AC-016, QR-003 | add a case to `claude-agent-websocket-interrupt-resume.e2e.test.ts` (fake CLI, real AgentRun + session) | Deterministic cross-component proof of CR-001/undelivered mapping |
| E2E-CODEX-01 | User message to a busy Codex agent → `turn/steer` into the same turn; resolves at that turn | AC-014 | add a case to `codex-agent-run-backend-factory.integration.test.ts` (gated `RUN_CODEX_E2E`) | Newly reachable production path |
| E2E-TEAM-01 | Teammate `send_message_to` to a busy member is delivered into its running turn (Claude and Codex workers) | AC-004, AC-014 (teammate) | `tests/e2e/runtime/team-busy-member-mid-turn-delivery.e2e.test.ts` (gated) | Team routing on the current schema |

## Durable Coverage To Update / Remove

- Update:
  - `tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts`: the harness also returns `agentRun`; adds the AC-016 case.
  - `tests/e2e/runtime/claude-agent-background-task.e2e.test.ts`: moved onto the shared live harness (behavior unchanged).
  - `tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts`: adds the AC-014 case.
- Added helper: `tests/e2e/helpers/claude-live-agent-harness.ts` (shared real AgentRun + Claude backend + websocket harness, pid lookup, stream waits).
- Remove: none.

## Repository Coverage Execution Plan And Results

All cases and evidence are in the ledger (`api-e2e-test-case-ledger.md`, C01–C15). Summary:

| Order | Scope | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Changed-area unit suites | 845/851; 6 pre-existing (identical on base) | c01 |
| 2 | Existing live Claude suites (baseline, PATH 2.1.283 + bundled 2.1.280) | 21/21 | c02 |
| 3 | New lifecycle E2E (AC-001/006, 003, 005, 008, 009, 007, 012/013) × 2 CLIs | All pass | c04–c10, c05-c06-c08-rerun-hardened |
| 4 | New RSK-007 usage E2E × 2 CLIs | **Fail** (first turn after a crash reopen: usage suppressed, `claude_sdk_selected_regressed`) | c08, c08b probe |
| 5 | AC-016 race (fake CLI, real AgentRun + session) + control | Pass; control fails as expected | c11, c11b |
| 6 | AC-014 live Codex steer + control | Pass; control fails as expected | c12, c12b |
| 7 | AC-004 team busy member (Claude + Codex workers) + control | Pass; control fails as expected (2 worker turns) | c13, c13d |
| 8 | Live regressions (Claude + Codex backends) | Pass except pre-existing, base-identical failures | c14a–f |
| 9 | Browser: replayed notice in run history (real dev stack) | Pass | c15 |
| 10 | `tsc -p tsconfig.json --noEmit` for the new/changed test files | 0 errors (outside the known TS6059) | console |

## Test-Case Ledger Plan

- Ledger required: `Yes` (many independent live cases, minutes each, interruption risk).
- Path: `.../api-e2e-test-case-ledger.md`; initialized before new execution.

## Post-Repository Confidence Scorecard (Mandatory)

The live suites are gated repository tests, so they count as repository evidence here. The browser check (C15) is the broader step.

| Category | Score | Supports | Remaining Uncertainty | Could Improve |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 75% | AC-001..AC-016 directly proven (live on both CLIs where applicable; AC-010/015 unit; AC-016 deterministic fake CLI) | **RSK-007 / REQ-010: usage of the first turn after a crash reopen is lost** (design escalation trigger) | Fix, then rerun the RSK-007 case |
| Changed-boundary directness | 95% | Real SDK/CLI processes (pid, argv), real Codex app-server, real GraphQL team runtime | — | — |
| Integration realism / mock gap | 95% | Only AC-016 uses a fake CLI (intentional, deterministic race); every other case is live | Model compliance varies (mitigated by process-level assertions) | — |
| Environment / identity / fixture | 90% | Both CLIs; parent session env stripped; clean dev stack | api-key auth mode not live-tested; Codex model substituted (gpt-5.6-luna) | api-key live run |
| Failure / lifecycle / recovery | 75% | Crash, Stop, terminate, restart, orphans all proven | Crash reopen loses one turn's usage | Fix + rerun |
| User surface / browser | 90% | Replayed notice rendered in the real web app | The live (non-replay) notice was not rendered in a browser here (existing component, unchanged) | Live-render check |
| Durable regression coverage | 95% | Gated live tests for every gap AC, each new-path case discriminates (controls fail on base / without the flag) | The live tests need `RUN_CLAUDE_E2E` / `RUN_CODEX_E2E` | — |

- Overall: **88%** (simple average)
- Every critical AC directly proven: `Yes` for AC-001..016; **No** for the preserved token-usage accounting after a crash reopen (RSK-007 / REQ-010)
- Categories below 90%: requirement proof (75%), failure/lifecycle (75%)
- 95% target met: `No`

## Broader Validation Decision

- Decision: `Required`
- Modes:
  - Live API: real CLI and Codex app-server through the real AgentRun/backend/websocket stack, plus the GraphQL team runtime.
  - Browser: rendered replay of a Claude background-task notice in the run-history conversation. This is a web-equivalent surface, so no desktop shell is needed.
- Browser rationale: the web change is small, but it is only unit-verified and the reviewer flagged it. A real server with a Claude run whose history contains a notice, rendered in the web app, closes the gap.

## Temporary Executable Validation Plan

| Scenario | Probe | Proves | Why Not Durable |
| --- | --- | --- | --- |
| WEB-01 | Server + web dev server + browser tools | Replayed notice renders | Needs a full-stack dev setup and a live model; screenshots/DOM as evidence |

## Not Tested / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| api-key auth mode live | No vault key in this environment; the env merge is covered by unit tests | Low | Delivery or user verification |
| Existing stale team/matrix E2Es (`refType`) and stale Codex factory cases | Pre-existing test staleness, fails on base too | Low for this change (AC-004 covered by the new test) | Separate test-maintenance ticket |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recipient |
| --- | --- | --- | --- |
| RSK-007: after an unexpected CLI exit, the resumed process restarts cumulative `modelUsage` at 0; the reconciler treats this as a regression and suppresses that turn's usage (`accounting_total_tokens: null`, `claude_sdk_selected_regressed`). A clean close/restore continues totals correctly | Preliminary `Design Impact` (explicit design escalation trigger: "the usage reconciler … loses usage in the streaming lifecycle"); code_reviewer confirms the origin | C08 (both CLIs), C08b raw vs persisted table | `/code_reviewer` (failure-origin review) |
| Stale `refType` E2E fixtures | Out of scope (pre-existing) | C03 | Reported |

## Investigation Decision

- Execution completed: `Yes`
- Durable coverage added/updated: `Yes`
- Post-repository confidence: 88%
- Broader validation: `Required`, executed (browser C15 pass)
- Result: `Fail` (RSK-007); reroute to `/code_reviewer` for failure-origin review


## Round 2 Update (API-REV-002)

- Delta since round 1 (`git diff b7c6d86b3..HEAD -- src`):
  - Claude usage emission marks the first observation of each resume-opened process (`claude_sdk_series_restart`).
  - `TokenUsageUpdatedPayload` carries the marker.
  - The reconciler admits main-loop usage for a marked observation and re-anchors.
  - The client warns on an inherited `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`.
  - No change to turn, input, interrupt, process, team or Codex paths.
- Coverage decisions:
  - Durable RSK-007 case: `Needs Update`, done. Added the clean shutdown + restore leg; asserts the series-restart mark, the `claude_sdk_series_restart_main_loop_delta` flag and accounting == main loop on restart turns; other turns are cumulative deltas; no `regressed` flag.
  - All other durable coverage: `Still Valid`.
- Re-validation choice (proportionate):
  - prior failure first (C08-R);
  - unit suites incl. token-usage (C16);
  - the full live lifecycle file (C17);
  - live Claude regressions that emit usage (C18);
  - OBS-2 warning probe (C19).
  - Not re-run: C12 Codex steer, C13 team, C15 browser. Those paths are unchanged, and the shared reconciler only affects Claude `claude_sdk_result` observations.

### Post-Repository / Final Confidence Scorecard (Round 2)

| Category | Score | Supports | Remaining Uncertainty |
| --- | --- | --- | --- |
| Requirement and AC proof | 95% | AC-001..AC-016 proven (round 1, unchanged paths re-run in C17/C18); RSK-007 fixed and proven live on both CLIs, incl. restore | Restart turns count main-loop usage only (design-accepted approximation: auxiliary selected-model calls in that one turn are excluded) |
| Changed-boundary directness | 95% | Real CLI crash/restore through the production token-usage persistence pipeline | — |
| Integration realism / mock gap | 95% | Live everywhere except the deliberate AC-016 fake-CLI race | — |
| Environment / identity / fixture | 92% | Both CLIs; clean env; OBS-2 warning verified live | api-key auth mode not live-tested (no key available); the change only moves key resolution to once per process open, which is unit-covered |
| Failure / lifecycle / recovery | 95% | Crash, Stop, terminate, restart, and usage across crash and restore | — |
| User surface / browser | 95% | Round-1 C15: replayed notice rendered via the same `system-task-notification` segment the live stream uses (live notice events asserted on the websocket); no web change since | — |
| Durable regression coverage | 95% | Gated live tests for every gap AC; each new path discriminates (controls) | Live tests gated (repo convention) |

- Overall: **94.6%** (simple average). No category below 90%; every critical AC and the RSK-007 preserved behavior are directly proven.
- The 95% default target is narrowly missed only by the environment category. The gap needs an Anthropic API key, which isn't available in this environment. The targeted surface would be a live api-key-mode run, recorded as a residual for delivery/user verification. No material broader-validation risk remains.
- Broader validation: round-1 browser evidence still applies (no web or projection change).
- Result: `Pass`. Route to `/code_reviewer` for the proportional test-code review.
