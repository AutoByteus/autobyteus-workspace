# API/E2E Execution Coverage Report — claude-sdk-streaming-input-session

(`...` = `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session`)

## Execution Round Meta

- Requirements Doc: `.../requirements-doc.md` (SR-011)
- Investigation Notes: `.../investigation-notes.md`
- Solution Revision Record: `.../solution-revision-record.md`
- Design Spec: `.../design-spec.md` (SR-011)
- Supplemental Task Artifacts: `.../probe-evidence/` (evidence only)
- Design Review Report: `.../design-review-report.md` (ARCH-REV-004)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Implementation Handoff: `.../implementation-handoff.md` (IR-004)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report: `.../code-review-report.md` (CRR-004 Pass, SR-012 delta)
- Code Review Revision Record: `.../code-review-revision-record.md`
- Delivery Revision Record: `N/A`
- Coverage Investigation: `.../api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `.../api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `.../api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2
- Trigger: code_reviewer CRR-004 Pass (HEAD `d3e227389`, IR-004 / SR-012 / ARCH-REV-005 IC-5: fix for API-F-001)
- Prior Round Reviewed: round 1 (API-REV-001, Fail / 88%, API-F-001)
- Latest Authoritative Round: 2

## Routing Classification

- Task size: `Large`; Architectural risk: `High`
- Input route: `Reviewed`; Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (durable test changes attached)

## Investigation And Execution Basis

- Investigation completed before durable changes and execution: `Yes`
- Plan followed: `Yes`, with two in-flight revisions, each recorded:
  - RSK-007 was split from AC-009 into its own case after the first run exposed the usage loss.
  - Foreground commands were hardened after discovering the CLI's `sleep N; …` guard (OBS-1).
- Reroute required during execution: `Yes`. RSK-007 is a design escalation trigger; it is routed at the end of the round, and every other case was completed first.

## Test-Case Ledger Reconciliation

- Ledger initialized before execution: `Yes`. Every case was recorded immediately after execution: `Yes`. Reconciled: `Yes`.
- Cases not started or interrupted: none. The C14a combined batch was interrupted at the 10-min tool limit; its suites were rerun individually (C14b/c) and passed.

| Case | Final Result | Evidence |
| --- | --- | --- |
| C01 unit | Pass (6 pre-existing, base-identical) | c01 |
| C02 live baseline | Pass 21/21 | c02 |
| C03 old team E2E setup | Blocked by pre-existing stale fixture | c03 |
| C04 AC-001/006 | Pass ×2 CLIs | c04-c05 |
| C05 AC-003 | Pass ×2 CLIs | c04-c05, hardened rerun |
| C06 AC-005 | Pass ×2 CLIs | c06-c07, hardened rerun |
| C07 AC-008 | Pass ×2 CLIs | c06-c07 |
| C08 AC-009 / **RSK-007** | AC-009 Pass ×2; **RSK-007 Fail ×2** | c08, c08b |
| C09 AC-007 | Pass ×2 CLIs | c08-c09-c10 |
| C10 AC-012/013 | Pass ×2 CLIs | c08-c09-c10 |
| C11 AC-016 | Pass (+ control fails without the flag) | c11, c11b |
| C12 AC-014 | Pass (+ control fails on the base claim rule) | c12, c12b |
| C13 AC-004 | Pass Claude + Codex workers (+ control fails) | c13, c13d |
| C14 regressions | Pass except pre-existing, base-identical failures | c14a–f |
| C15 browser replay | Pass | c15 |

## Compatibility / Legacy Scope Check

- Compatibility in scope: `No`. Legacy retention observed: `No`. The policy env is gone. AutoByteus sets neither variable (C04/C05 argv and CLI tool behavior; C15 showed an *inherited* value still passes through, OBS-2).
- Persisted-data transition: `Directly Usable — No Migration`, followed. The new trace is replayed by the real projection and rendered (C15). Older runs are unaffected (reader ignores unknown types; existing unit coverage).
- Compatibility-only durable coverage: `No`.

## Changed Boundary And Evidence Matrix

| Scenario | Req / AC | Boundary | Mode | Evidence Type | Result |
| --- | --- | --- | --- | --- | --- |
| E2E-LIFE-01 | AC-001, AC-006, QR-001/002 | CLI process lifetime | Live websocket, pgrep/argv | Durable (gated) | Pass |
| E2E-LIFE-02 | AC-003, REQ-004, QR-003 | AgentRun append → Claude session | Live | Durable | Pass |
| E2E-LIFE-03 | AC-005, REQ-005 | Stop via `interrupt({cancelQueued})` | Live + process checks | Durable | Pass |
| E2E-LIFE-04 | AC-008, REQ-007, QR-001 | Terminate → process tree | Live + `ps` | Durable | Pass |
| E2E-LIFE-05a | AC-009, REQ-008 | Unexpected exit → resume | Live SIGKILL | Durable | Pass |
| E2E-LIFE-05b | RSK-007, REQ-010 (usage), REQ-003 | Crash reopen → token-usage pipeline | Live, production event pipeline | Durable | **Fail** |
| E2E-LIFE-06 | AC-007, BEH-007 | Restart → restore → resume | Live | Durable | Pass |
| E2E-LIFE-07 | AC-012, AC-013, REQ-011 | Inline image blocks | Live | Durable | Pass |
| E2E-RACE-01 | AC-016, QR-003 | `CLAUDE_APPEND_TURN_MISMATCH` → requeue | Fake CLI, real AgentRun + session | Durable | Pass |
| E2E-CODEX-01 | AC-014 | AgentRun claim → Codex `turn/steer` | Live Codex | Durable (gated `RUN_CODEX_E2E`) | Pass |
| E2E-TEAM-01 | AC-004, AC-014 teammate | Team `send_message_to` → busy member | Live GraphQL team runtime | Durable (gated) | Pass ×2 runtimes |
| Existing live suites | AC-002, AC-011, REQ-010, RSK-006 | — | Live | Durable (existing) | Pass (pre-existing failures only) |
| WEB-01 | REQ-003 history | Replay → web hydration → rendered segment | Real dev stack + browser | Temporary | Pass |

## Validation Confidence Scorecard

| Category | Post-Repository | Final | Change | Final Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 75% | 75% | — | All ACs proven | RSK-007 usage loss (REQ-010 preserved accounting) |
| Changed-boundary directness | 95% | 95% | — | Real processes | — |
| Integration realism / mock gap | 95% | 95% | — | Only AC-016 uses a fake CLI (intended) | — |
| Environment / identity / fixture | 90% | 90% | — | Both CLIs, clean env | api-key mode; Codex model substituted |
| Failure / lifecycle / recovery | 75% | 75% | — | Crash/Stop/terminate/restart proven | Crash-reopen usage loss |
| User surface / browser | 85% | 90% | +5 | C15 rendered replay | Live notice render not re-checked in a browser |
| Durable regression coverage | 95% | 95% | — | Discriminating gated tests | Gated |

- Overall post-repository: 87%; Overall final: **88%** (simple average)
- Every critical AC directly proven: AC-001..016 yes. Preserved token-usage accounting after a crash reopen: **no**.
- Final categories below 90%: requirement proof, failure/lifecycle
- 95% target met: `No`

## Broader Validation Decision And Execution

- Decision `Required`: live API (in gated suites) plus browser (C15).
- C15 setup: `pnpm dev` (project-documented; backend 127.0.0.1:8000, web 127.0.0.1:3000, worktree-local `.autobyteus/development`). Readiness came from `DEV_SERVER_READY` / `DEV_WEB_READY` plus HTTP checks. A live Claude run was created through GraphQL `createAgentRun` + websocket, then terminated; the browser opened the run from Workspaces history.
- Environment choice that mattered: `CLAUDE_CODE_*` / `BASH_*` variables inherited from this agent's own environment had to be unset (OBS-2).

| Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| Live run on the dev backend | Notice + Claude-started turn | `run_in_background:true` → notice `Background task completed: … (completed)` → Read → "done" | c15-run.json | Pass |
| Replay in the web app | Notice rendered in the conversation from history | Offline run shows `.system-task-notification` segment between STARTED and the Read/"done" turn | c15-replayed-notice-rendered.png, DOM chain | Pass |

## Desktop Application Validation

- Not required: the web-equivalent renderer was validated in the browser; no shell change.

## Platform / Runtime Targets

- macOS arm64, Node 22; PATH Claude CLI 2.1.283; SDK-bundled 2.1.280 (SDK 0.3.280); codex-cli 0.156.1 with model gpt-5.6-luna; Claude model `haiku`.

## Lifecycle / Persisted-Data Checks

- `Directly Usable`: the new trace type is written, replayed and rendered (C15); no migration.
- No version-specific branch observed.
- Residual: RSK-007, see below.

## Tests Implemented Or Updated

| Path | Change | Requirement | Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/helpers/claude-live-agent-harness.ts` | Added | Shared live harness (real AgentRun + Claude backend + websocket; pid lookup) | Used by the files below |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-streaming-session-lifecycle.e2e.test.ts` | Added | AC-001/003/005/006/007/008/009/012/013, RSK-007 (×2 CLIs) | 14 pass; RSK-007 ×2 fail (finding) |
| `autobyteus-server-ts/tests/e2e/runtime/team-busy-member-mid-turn-delivery.e2e.test.ts` | Added | AC-004, AC-014 teammate | Pass ×2 |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` | Updated | AC-016 case; the harness returns `agentRun` | Pass 5/5 |
| `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` | Updated | AC-014 case | Pass |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-background-task.e2e.test.ts` | Updated | Moved onto the shared harness (no behavior change) | Pass ×2 |

## Tests Removed

None.

## Durable Coverage Changed In The Codebase

- Yes (paths above). Uncommitted in the worktree. Not yet sent for proportional test review, because the round result is Fail.

## Other Execution Artifacts

- `.../api-e2e-evidence/`: all logs (c01–c15), the browser screenshot, the C15 driver script and run record. No credentials (checked).

## Temporary Execution Methods / Scaffolding

| Method | Why | Cleanup |
| --- | --- | --- |
| `tmp-rsk007-usage-probe.e2e.test.ts` | Raw vs persisted usage table for RSK-007 | Deleted |
| Base-source controls (checkout base `src`/files, then restore) | Pre-existing failure checks and discrimination | Restored; `git diff -- src` empty |
| Flag-disable control in `claude-agent-run-backend.ts` | AC-016 discrimination | Restored from backup |
| `pnpm dev` stack + browser tab | C15 | Stopped; `.autobyteus/development` (created by this run) and temp dirs removed; tab closed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Claude CLI (AC-016 only) | Fake streaming CLI behind the real `ClaudeSdkClient` | A deterministic end-of-turn race is not reproducible live | None for the decision logic |
| Agent Tools MCP (in-process harnesses) | `not_exposed` activator | Not part of these ACs | Covered by the team E2E through the real server |

## Round 2 Execution (API-REV-002)

| Case | Scope | Result | Evidence |
| --- | --- | --- | --- |
| C08-R | Prior failure API-F-001 recheck, extended with clean shutdown + restore (both CLIs) | Pass: restart turns flagged `claude_sdk_series_restart_main_loop_delta`, accounting == main loop (PATH 13,771 / 13,927; bundled 13,700 / 13,848); other turns exact cumulative deltas; no `regressed`; 1 observation per turn | r2-c08r-rsk007-rerun.log |
| C16 | Changed-area unit suites incl. token-usage | 950/956; the same 6 base-identical failures | r2-c16-unit.log |
| C17 | Live lifecycle file, all non-usage cases ×2 CLIs | 14/14 | r2-c17a/b |
| C18 | Live background ×2, websocket (incl. AC-016), client, manager | 22/22 | r2-c18a/b |
| C19 | OBS-2 warning (temporary live probe) | One warning per process open; the operator value is not overridden | r2-c19 |

Not re-run (paths unchanged since round 1; the shared reconciler change applies only to Claude `claude_sdk_result` observations): C12 Codex steer, C13 team busy member, C15 browser replay. Their round-1 evidence stands.

## Validation Confidence Scorecard (Round 2, authoritative)

| Category | Round 1 | Round 2 Final | Change | Evidence | Residual |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 75% | 95% | +20 | RSK-007 fixed and proven live, incl. restore | Design-accepted approximation: a restart turn counts main-loop usage only |
| Changed-boundary directness | 95% | 95% | — | Production persistence pipeline observed | — |
| Integration realism / mock gap | 95% | 95% | — | — | — |
| Environment / identity / fixture | 90% | 92% | +2 | OBS-2 warning verified live | api-key auth mode not live (no key available) |
| Failure / lifecycle / recovery | 75% | 95% | +20 | Crash and restore usage accounting correct | — |
| User surface / browser | 90% | 95% | +5 | Replay rendered with the same segment component as the live path; live notice events asserted on the websocket | — |
| Durable regression coverage | 95% | 95% | — | RSK-007 case extended (restart flag + restore) | Gated |

- Overall final: **94.6%**; no category below 90%; every critical AC directly proven.
- 95% default target: narrowly not met, only because of the api-key-mode gap, which needs a credential not available here. That is recorded as a residual for delivery/user verification. No material broader-validation risk.

## Result Summary

| Result | Scenarios | Summary |
| --- | --- | --- |
| Pass | All E2E-LIFE cases incl. 05b (RSK-007), RACE-01, CODEX-01, TEAM-01, WEB-01, regressions, OBS-2 | AC-001..AC-016 and RSK-007 proven |
| Out Of Scope | Stale `refType` E2Es; stale Codex factory cases; 6 unit and 2 Claude MCP-stub failures | Pre-existing, identical on base |

## Prior Failure Resolution

| Failure | Round-1 Classification | Resolution | Evidence |
| --- | --- | --- | --- |
| API-F-001 (RSK-007: first turn after a crash reopen lost its usage) | Design Impact (confirmed via SR-012 / ARCH-REV-005) | Resolved in IR-004 (series-restart mark + main-loop admission). Proven live on both CLIs, including the clean restore path | r2-c08r-rsk007-rerun.log; the round-1 failing run (c08) is the control |

## Cleanup Performed

- Round 1: see the ledger (dev stack, CLI state, controls restored).
- Round 2: temp probe deleted; 38 CLI task/session dirs removed; no leftover processes; `git diff -- src` empty.

## Tests Implemented Or Updated (cumulative)

| Path | Change | Round-2 Delta |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/helpers/claude-live-agent-harness.ts` | Added | — |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-streaming-session-lifecycle.e2e.test.ts` | Added | RSK-007 case extended: restore leg, series-restart mark/flag assertions, accounting == main loop on restart turns |
| `autobyteus-server-ts/tests/e2e/runtime/team-busy-member-mid-turn-delivery.e2e.test.ts` | Added | — |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` | Updated (AC-016; the harness returns `agentRun`) | — |
| `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` | Updated (AC-014) | — |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-background-task.e2e.test.ts` | Updated (shared harness) | — |

No tests removed.

## Residual Risks

- api-key auth mode not live-validated (no key available); unit-covered.
- A restart turn counts main-loop usage only (design-accepted; documented in `token_usage.md`).
- Pre-existing stale E2Es (`refType`, Codex factory status-hint and model) are outside this change.
- OBS-1: the Claude CLI blocks `sleep N; …` foreground chains, which pushes models toward background execution.

## Preliminary Classification

- N/A (Pass).

## Recommended Recipient

- `/code_reviewer`: proportional test-code review (Large / High route).

## Latest Authoritative Result

- Result: **`Pass`**
- Final validation confidence: 94.6%
- 95% target met: `No`, narrowly (api-key-mode residual only); no category below 90%
- Broader validation: `Required`; executed in round 1 (browser C15), still valid (no web or projection change)
- Critical criteria lacking proof: none
- Next recipient: `/code_reviewer` (proportional test-code review)
