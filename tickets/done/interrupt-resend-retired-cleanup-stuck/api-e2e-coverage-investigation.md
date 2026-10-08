# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/requirements-doc.md` (SR-001, approved; DEC-001 = A)
- Investigation Notes: `.../interrupt-resend-retired-cleanup-stuck/investigation-notes.md`
- Solution Revision Record: `.../interrupt-resend-retired-cleanup-stuck/solution-revision-record.md`
- Design Spec (required on every route): `.../interrupt-resend-retired-cleanup-stuck/design-spec.md` (SR-002)
- Supplemental Task Artifacts: `.../interrupt-resend-retired-cleanup-stuck/evidence/` (screenshot, server log, repro probe, implementation E2E base reproduction, pre-existing server failures)
- Design Review Report: `.../interrupt-resend-retired-cleanup-stuck/design-review-report.md`
- Architecture Review Revision Record: `.../interrupt-resend-retired-cleanup-stuck/architecture-review-revision-record.md` (ARCH-REV-001)
- Implementation Handoff: `.../interrupt-resend-retired-cleanup-stuck/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `.../interrupt-resend-retired-cleanup-stuck/implementation-revision-record.md`
- Code Review Report: `.../interrupt-resend-retired-cleanup-stuck/code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `.../interrupt-resend-retired-cleanup-stuck/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `.../interrupt-resend-retired-cleanup-stuck/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `.../interrupt-resend-retired-cleanup-stuck/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Code review pass (CRR-001) from `/software_engineering_team/code_reviewer`
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

(`...` = `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of changed durable tests)
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

A standalone run whose runtime went offline (every AGY interrupt; any runtime crash/exit) must be restartable by the next send. The send waits (≤30 s) inside the run's transition lane for the previous runtime's exact release (`AgentRunManager.releaseRetiredRun`), then claims and restores in the same conversation. Failure/timeout returns the retryable `AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING` with plain text and is never quarantined. Exactly one replacement starts, only after the old runtime is confirmed stopped. Team members/delegated copies treat a failed previous release as retry-safe. No persisted-data change. AC-007 is user desktop verification (Delivery).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (interrupt + immediate send), SCN-002 (interrupt + later send), SCN-003 (runtime stops by itself, non-AGY), SCN-004 (team member / delegated copy), SCN-005 (in-process recovery after failed cleanup; restart recovery = AC-007 user check).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-001b: the user presses Send twice in the stopping window (double-click or quick follow-up) — real trigger: two `SEND_MESSAGE` frames on the same run WebSocket. Already in the fake-AGY E2E; added to the live AGY case.
  - SCN-001c: repeated interrupt/resend cycles on the same run (user steers twice in a row) — verifies the retired → released → re-published cycle is repeatable, not just once. Real trigger: Interrupt + Send twice in sequence.
  - The web client sends `SEND_MESSAGE` over `/ws/agent/<id>` directly (no `restoreAgentRun` before send; `autobyteus-web` only declares the mutation), so the WebSocket E2E is the real desktop wire path.
- Contrived scenarios (not tested): none recorded by the designer.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 AGY interrupt stops process | Preserved | design BEH-001 | Assert TURN_INTERRUPTED + interrupt ack accepted in E2E (fake and live) |
| BEH-002 send to offline standalone run restores and delivers | Changed | C-3, C-4 | Fake-AGY E2E, live AGY E2E, lifecycle real-manager unit, live Codex crash probe |
| BEH-003 release before claim; one restart | Changed | C-4, DS-002 | Fake-AGY process log ordering, live one-process check, unit concurrency |
| BEH-004 member retry safety | Changed | C-5 | Handle unit (failure variants); fake-AGY Team member E2E (success path); live Org/Team stop+message (existing LIVE-ORG-R7) |
| BEH-005 in-process retry after failed cleanup | Changed | C-1, C-4 | Lifecycle/coordinator unit (AC-008) |
| BEH-006 plain retryable text | Changed | C-1, C-2 | Coordinator ack unit (AC-004) |
| Registry refusal code `AGENT_RUN_ACTIVATION_CLEANUP_FAILED` → `..._PREVIOUS_RUNTIME_RELEASE_PENDING` | Removed/Changed | Removal plan | Grep for stale assertions of "retired cleanup" |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Registry/manager/lifecycle/handle | Unit + real-manager lifecycle tests | None material | — |
| API / transport / contract | Yes | WebSocket SEND_MESSAGE ack text/code | Fake-AGY WS E2E, coordinator unit | Ack failure text only unit-proven (cannot force a failed release at E2E deterministically) | — |
| Frontend component / state | No (message shown verbatim, AF-010) | — | — | — | — |
| Browser integration / user journey | Indirect | Error card text, status after resend | — | Final status after resend in UI | Delivery isolated desktop (AC-007) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No code change | — | — | — | — |
| Desktop shell / Electron | No | — | — | — | — |
| Process / lifecycle | Yes | AGY process stop vs restore ordering; Codex app-server exit | Fake-AGY process log | Real `agy` restore by conversation id after interrupt-stop (ASM-001); real stop timing; non-AGY real crash | Live AGY E2E; live Codex E2E |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed coordination | Yes (team/member) | Configured handle readiness | Handle unit | Real Team member over Team WS after AGY interrupt | Fake-AGY Team E2E; live Org/Team |
| External integration | Yes | `agy` CLI, `codex app-server` | Fake CLI | Real CLI behavior | Live runs (local logins; owned server/data) |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck` (branch `codex/interrupt-resend-retired-cleanup-stuck`)
- Project type: pnpm monorepo; server `autobyteus-server-ts` (Fastify, Vitest), Electron/Nuxt web
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/TESTING.md` (same content in the worktree); no closer `TESTING*.md` under `autobyteus-server-ts`
- Conflicting/unclear instructions: `pnpm -C autobyteus-server-ts typecheck` fails on base (TS6059); `tsc -p tsconfig.build.json --noEmit` used instead (recorded by implementation).
- Required secrets: none in the vault; live runs use the local `agy` (1.3.1) and `codex` (0.161.0) CLI logins, as the existing live suites do. Values not recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, rules | Server tests via `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; AGY fake: `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs`; AGY live: one gate per file (`RUN_AGY_RECOVERY_E2E=1` for the stop/recovery suite); Codex live: `RUN_CODEX_E2E=1`; never the user's app/data |
| `AGENTS.md` (root), `autobyteus-server-ts/AGENTS.md` | Repo conventions | Stage paths explicitly; no `git add -A` |
| `tests/e2e/helpers/studio-runtime-test-server.ts` | In-process Studio server | Test-owned app data dir via `appConfigProvider.config.setCustomAppDataDir` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process Studio server | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` in the test | Free port, temp data dir | GraphQL responds | `app.close()`; temp dir removed |
| Fake `agy` CLI | same | `ANTIGRAVITY_CLI_COMMAND` | Process log per run | `--version` | Server terminate; process log in temp dir |
| Real `agy` CLI | same | PATH `agy` | AGY quota (tiny prompts) | `agy --version` | terminateAgentRun / app.close; only processes whose ppid is the test worker and whose argv carries the run's `--agent` hash are touched |
| Real `codex app-server` | same | spawned by the server | Codex quota | `codex --version` | terminate / app.close; only the app-server child of the test worker is killed |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/Team definitions, runs | GraphQL create mutations in the test | Temp app data dir; user app (`/Applications/AutoByteus.app`, running) never touched | Definitions deleted, runs terminated, temp dir removed |
| Evidence JSON | `AGY_RECOVERY_EVIDENCE_DIR` / test evidence dir | Ticket evidence folder | Kept under `evidence/api-e2e/` |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`. Restore reads existing `run_metadata.json`/`platformAgentRunId` unchanged; the live cases assert the same AGY `--conversation` / Codex thread and recall of an earlier code (context continuity).

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Req / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-execution/runtime/agent-run-activation-registry.test.ts` (new cases) | Retired refusal uses retryable code/plain text; `getRetiredRun` | C-2, REQ-005 | Still Valid | R-01 pass | Keep |
| `tests/unit/agent-execution/agent-run-manager.test.ts` `releaseRetiredRun` | No-op, exact release then claim, joins in-flight | C-3, AC-003, AC-005 | Still Valid | R-01 pass | Keep |
| `tests/unit/agent-execution/standalone-agent-run-lifecycle-service.test.ts` (new) | Ack text, no quarantine, real-manager restore, one replacement, 30 s bound, retry after failure | AC-002..AC-005, AC-008, QR-001 | Still Valid | R-01 pass | Keep |
| `tests/unit/agent-collaboration/configured-agent-execution-handle.test.ts` (new) | Failed previous release (throw / not accepted) then success | AC-006 | Still Valid | R-01 pass | Keep |
| `tests/e2e/runtime/agy-interrupt-resend-transport.e2e.test.ts` | Fake-AGY WS: immediate + double send; later send; process ordering | AC-001, AC-002, AC-005 | Still Valid | R-02 pass | Extend with Team member case |
| `tests/e2e/runtime/agy-runtime-stop-recovery-live.e2e.test.ts` LIVE-ORG-R7 | Real AGY: Org root agent/Team member Stop → later message resumes | AC-006 (later-send live) | Still Valid | Code read | Run as live AC-006 evidence; add standalone + immediate-send cases |
| Other AGY fake suites (`agy-failure-transport`, `agy-background-task-transport`) | Share the fake CLI | Fixture coexistence | Still Valid | Implementation ran them | Rerun after fixture use |
| Tests asserting "still owns retired cleanup" | Old refusal | Removal plan | Stale / Remove | grep (see R-03) | Confirm none remain |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Req / AC / Design | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| E2E-TEAM-INT | Team member (configured handle) on AGY interrupted and immediately sent new work over the Team WebSocket; one restart after the old process exits, same conversation | AC-006, REQ-006, DS-003 | `tests/e2e/runtime/agy-interrupt-resend-transport.e2e.test.ts` | Only unit evidence existed for the member path at the real WS boundary |
| LIVE-STANDALONE-INT | Real `agy`: standalone run remembers a code; Stop mid-turn; immediate double send accepted and answered with recall of the code (ASM-001); exactly one `agy` process with `--conversation`; then a second Stop + later send; final status not error | AC-001, AC-002, AC-005, ASM-001 | `tests/e2e/runtime/agy-runtime-stop-recovery-live.e2e.test.ts` | Real CLI restore by conversation id after an interrupt-stop is the open assumption |
| LIVE-TEAM-INT | Real `agy`: Team member Stop mid-turn then immediate work; recall | AC-006 live | same file | Live member path with the immediate timing (R7 covers only later send) |
| LIVE-CODEX-EXIT | Real Codex: standalone run; the run's `codex app-server` is killed (runtime stops by itself); next send restarts and recalls | AC-003 live, SCN-003 | New `tests/e2e/runtime/codex-runtime-exit-resend.e2e.test.ts` (gated `RUN_CODEX_E2E=1`) | Non-AGY runtime exit only had fake-backend coverage |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| L-03 LIVE-ORG-R7 (baseline test fix) | `tests/e2e/runtime/agy-runtime-stop-recovery-live.e2e.test.ts` `stopMidTurn` | Wait for the Stop ack before reading it. AGY acknowledges Stop only after its process stops, which can land after `TURN_INTERRUPTED`. | The shipped fake-AGY E2E asserts the same ordering (`ack(interruptId)` is undefined right after `TURN_INTERRUPTED`). The interrupt path is unchanged by this ticket. | Observed as a race in the first full-file run (`stopAck: null`, `turnEnd: TURN_INTERRUPTED`, `agyGone: true`). After the fix, the full file passes 7/7. |

## Durable Coverage To Remove

None (implementation already replaced the old refusal assertions; R-03 confirms).

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| R-01 | `vitest run` registry, manager, lifecycle, handle unit files | `autobyteus-server-ts` | C-1..C-5 | Pass (88) | `evidence/api-e2e/R-01-focused-units.log` |
| R-02 | fake-AGY `agy-interrupt-resend-transport.e2e.test.ts` (as shipped) | `RUN_AGY_FAILURE_E2E=1`, fake CLI | AC-001/002/005 | Pass (2/2) | `evidence/api-e2e/R-02-fake-agy-e2e-initial.log` |
| R-03 | grep stale "retired cleanup" assertions | worktree | Removal plan | Pass (only the new negative assertion) | ledger #3 |
| E2E-TEAM-INT | fake-AGY E2E file incl. new Team member case | same | AC-006 at Team WS | Pass (3/3) | `evidence/api-e2e/E2E-TEAM-INT-first.log` |
| R-04 | fake-AGY interrupt-resend + failure + background-task + native-arguments E2E + `agy-failure-cli-routing` unit, ×3 | same | Flake check, shared-fixture coexistence | Pass (49 passed, 1 skipped, ×3) | `evidence/api-e2e/R-04-fake-agy-repeat-{1,2,3}.log` |
| R-05 | unit `agent-execution`, `agent-collaboration`, `standalone-agent-run-root`, `agent-team-execution`, `agent-org-execution`; integration `standalone-agent-run-root`, `agent-team-execution`, memory-layout | same | Regression | Pass (no regression): 1972 passed, 23 failed; all 23 are listed in the base failure inventory (`evidence/implementation-preexisting-server-test-failures.txt`) | `evidence/api-e2e/R-05-broader-suites.log` |
| R-06 | `npx tsc -p tsconfig.build.json --noEmit` | `autobyteus-server-ts` | Source typecheck | Pass | `evidence/api-e2e/R-06-tsc.log` |
| L-01..L-05, D-01 | Live cases (ledger) | Live CLIs / isolated desktop | AC-001/002/003/005/006 live, ASM-001 | See execution report | ledger |

Baseline failures (TESTING.md rule 9): the 23 `tests/integration/agent-team-execution` failures (and the wider 213-test base inventory) fail on base `ace86bf1f` too. Cause found for these 23: stale test doubles after earlier team-execution refactors, for example `TypeError: input.factory.beginMaterialization is not a function` in `agent-team-run-manager.integration.test.ts`, and readiness doubles that are never called in `configured-scope-readiness.test.ts`. This is a test-maintenance item outside this ticket's boundary and too large for this round, so it is reported to the accountable owner as its own item. It is not caused by this change.

## Test-Case Ledger Decision

- Ledger required: `Yes` — several independent long-running live cases with external CLIs and quota.
- Canonical ledger path: `.../interrupt-resend-retired-cleanup-stuck/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | Unit tests cover AC-003..AC-006, AC-008 and QR-001. The fake-AGY WS E2E covers AC-001, AC-002, AC-005 and AC-006. | ASM-001 (real AGY restore after interrupt-stop) is open. AC-003 is proven only with fake backends. | Live AGY and live Codex runs |
| Changed-boundary execution directness | 90% | The real server, WebSocket, registry, manager and lifecycle all run in the fake-AGY E2E. | The CLI is emulated. | Live CLIs |
| Cross-boundary integration realism and mock gap | 75% | The fake CLI models exit delay and conversation binding. | Real process stop timing and restore semantics | Live CLIs |
| Environment, configuration, identity, and fixture fidelity | 80% | Test-owned server and data | No real CLI login or model | Live CLIs |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | Unit tests with real termination cover failure, timeout, join and retry. The E2E covers the double send. | Real stop and kill lifecycle | Live crash and stop cases |
| User-surface, browser, and desktop-shell confidence | 85% | WS ack text and `AGENT_STATUS` frames | Rendered chat after Stop+Send in the desktop app | Isolated desktop journey |
| Durable regression coverage quality and relevance | 92% | Requirement-linked tests that discriminate base from fix | The live paths lack durable tests. | Add live cases |

- Overall post-repository confidence: 85% (simple average 85.0%)
- Every critical acceptance criterion directly proven: `No` (ASM-001 / AC-001 on real AGY)
- Any applicable category below `90%`: `Yes` — realism 75%, environment 80%, requirement proof 85%, user-surface 85%, failure 88%
- Default clean-confidence target met: `No` → broader validation `Required`

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Live API` (real `agy` and `codex` through the in-process Studio server's GraphQL/WebSocket) — `Lifecycle` process evidence; plus `Project Desktop Validation` (D-01: isolated desktop instance of this worktree's build, real `agy`), added during execution to close the user-surface gap (AC-001 verification intent includes desktop-app verification).
- Gap addressed: ASM-001 (real AGY restore by conversation id after interrupt-stop), real stop/restore timing and one-process invariant; AC-003 on a real non-AGY runtime; AC-006 live immediate timing.
- Why it improves confidence: the fake CLI emulates exit timing and binding only; the real CLI's restore semantics and process lifetime are the remaining material uncertainty.
- Browser-specific decision: Not required for API/E2E. No web code changed; the web shows `ack.message` verbatim and the status from the same `AGENT_STATUS` frames asserted at the WS boundary. AC-007 (installed user app with the stuck run) is Delivery/user desktop verification on an isolated build.

## Desktop Application Validation Decision

- Desktop framework: Electron + Nuxt, embedded server.
- Web-equivalent behavior: error card text and status rendering (unchanged code; WS frames asserted).
- Shell-specific behavior: none changed.
- Chosen approach: server WS/GraphQL with live CLIs; desktop verification left to Delivery (AC-007).
- Effect on the running user app: None. `/Applications/AutoByteus.app` is running and is not touched; process checks filter by ppid = test worker and per-run `--agent` hash.

## Live Environment And Fixture Plan

- Startup: in-process Studio server per test file with a temp app data dir.
- Environment: `RUN_AGY_RECOVERY_E2E=1` (AGY live file), `RUN_CODEX_E2E=1` (Codex live file), `AGY_RECOVERY_EVIDENCE_DIR=<ticket evidence>`; `ANTIGRAVITY_CLI_COMMAND` unset for live.
- Readiness: GraphQL create succeeds; WS open.
- Fixtures: test-created definitions; tiny prompts (remember/recall codes; one long `sleep` command to interrupt).
- Evidence: per-case JSON (frames summary, acks, process lists, statuses), vitest logs.
- Cleanup: terminate runs, delete definitions, close server, remove temp dirs; verify no leftover `agy`/`codex app-server` children.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| None planned | — | — | — |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| AC-007 installed-build recovery of the user's stuck run | Requires the user's app/data; forbidden for API/E2E | Low (restart path unchanged, AF-011) | Delivery / user verification |
| AC-004 failed/timed-out release at the WS boundary | A real release failure cannot be produced deterministically (AGY SIGKILL escalation always ends the process) | Low (unit-proven at the coordinator ack boundary with real error classes) | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| LIVE-ORG-R7 read the Stop ack before it arrived (a timing race in an existing live test) | `Local Fix` (test, API/E2E-owned; already applied) | `evidence/api-e2e/L-05-live-agy-recovery-full-file.log`, `evidence/api-e2e/live-agy-full/live-org-r7.json` | API/E2E (done) |
| 23 base failures in `tests/integration/agent-team-execution` (stale doubles) | Baseline item, outside this ticket | R-05 log; base inventory | Separate item for the team-execution test owner (reported in the handoff) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added)
- Post-repository confidence: 85% (final after broader validation: 95.4%, see report)
- Broader validation decision: `Required` (Live API)
- Reroute Required Before Validation Execution: `No`
