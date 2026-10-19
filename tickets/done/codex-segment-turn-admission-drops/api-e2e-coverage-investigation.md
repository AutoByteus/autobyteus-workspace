# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `tickets/in-progress/codex-segment-turn-admission-drops/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `tickets/in-progress/codex-segment-turn-admission-drops/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/codex-segment-turn-admission-drops/solution-revision-record.md`
- Design Spec (required on every route): `tickets/in-progress/codex-segment-turn-admission-drops/design-spec.md` (SR-001, Ready; `Small` / `Low`)
- Supplemental Task Artifacts: `probes/*.py`, `evidence/residual-rollout-correlation.txt`, `evidence/all-rollout-correlation.txt` (Solution Designer evidence)
- Design Review Report: `N/A — not applicable` (direct low-risk route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `tickets/in-progress/codex-segment-turn-admission-drops/implementation-handoff.md` (IR-001, commit `dedaf77fba`)
- Implementation Revision Record: `tickets/in-progress/codex-segment-turn-admission-drops/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: Implementation Complete (IR-001) from `/software_engineering_team/implementation_engineer`, direct `Small` + `Low` route
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

The Codex exact-turn gate (`CodexThread.handleAppServerNotification` → `resolveCodexSegmentTurnAdmission`) must admit and reject exactly the same events as before (REQ-001, AC-004). Only its rejection logging changes (BEH-003):

- per run thread, one rejection account per rejected event's own turn id, plus one "no turn id" account;
- an account's first rejection writes one `[CodexSegmentTurnAdmissionRejected] { runtimeKind, runId, nativeEventName, reasonCode, itemType, turnId, activeTurnId }` line (REQ-002, REQ-003);
- later rejections are counted and written as `[CodexSegmentTurnAdmissionRejectedSummary] { runtimeKind, runId, turnId, count }` at the next `turn/started` / `turn/completed`, at app-server client close, and at thread release (`CodexThreadManager.releasePreparation`) (REQ-004);
- no item content is logged (DEC-003);
- the willRetry fix and its tests stay green (REQ-005, AC-007).

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (user Stops a Codex turn; Codex later reports tool items of the stopped turn while a new turn runs), SCN-002 (a whole turn's events arrive while the thread has no matching active turn).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-A1 Run closed with pending counts: the user terminates the run (`AgentRun.terminate()` → backend → `CodexThreadManager.releasePreparation`) after rejections were counted (AC-005; release with nothing pending writes nothing).
  - SCN-A2 Codex app-server process exits with pending counts: the real child process ends; `CodexAppServerClient` close → router → `CodexThread.handleClientClosed` flush (implemented boundary listed in the handoff; not an AC, but a real lifecycle where counts must not be lost, REQ-004 spirit).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): None recorded. The `CODEX_SEGMENT_TURN_OMISSION_UNLISTED` branch is unreachable from the product (handoff observation); it is exercised only by the unit admission matrix, not by a product scenario.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-003 rejection logging (bound, fields, summaries) | Changed | REQ-002..004; design DS-002 | Prove line counts, fields and summary moments through the real client/router/thread/backend path, not only on an isolated `CodexThread` |
| BEH-002 / BEH-004 admission outcomes | Preserved | REQ-001; AC-004 | Prove rejected events never reach AgentRun and the active turn's events still do, through the real backend + AgentRun |
| BEH-001 willRetry | Preserved | REQ-005; AC-007 | Reuse IMP-01/IMP-03 (same code) |
| Release path flush (`releasePreparation`) | Added call | handoff Key Files | Prove via the product termination path, not a direct method call |
| Client close flush (`handleClientClosed`) | Added call | handoff Key Files | Prove with a real child-process exit |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `CodexThread` gate call site, accounts, log formats | Unit tests on `CodexThread` with a mocked client (IMP-01) | Notifications not routed through the real JSON-RPC client and router; flush moments not driven through the real backend/AgentRun lifecycle | Scripted app-server integration (in-process server, real child process) |
| API / transport / contract | Yes (indirect) | Codex app-server notifications → `CodexAppServerClient` → `CodexClientThreadRouter` | None for rejection logging | Router delivery by `threadId` while no turn is active; ordering of turn boundary vs. late items over stdio | Same scripted integration |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | Server log only; no chat change (Non-Goal) | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | Run termination (`releasePreparation`), app-server exit (`handleClientClosed`) | IMP-01 manager unit test calls release with a stub client | Product termination path through `AgentRun.terminate()`; real process exit | Same scripted integration |
| Persisted-data transition | No | `Not Affected` (in-memory accounts, log text) | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes (contract read only) | Codex app-server v2 item notifications carry their own `turnId` | Rollout correlation (`evidence/*-rollout-correlation.txt`) | A live Codex run would only re-observe the documented shape; late items after Stop are timing-dependent | Live Codex: assessed in the report's broader-validation decision |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-segment-turn-admission-drops`, branch `codex/codex-segment-turn-admission-drops`
- Project type and runtime stack: pnpm monorepo; `autobyteus-server-ts` Node/TypeScript, vitest 4
- Project testing guideline path(s): `TESTING.md` (repository root). No closer `TESTING*.md` under `autobyteus-server-ts`.
- Conflicting, missing, or unclear project instructions: None
- Required environment variables or secrets available: `N/A` (no provider, no Codex binary; scripted app-server child)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing strategy | Server unit/integration layers; `test:integration:prepare` once, then `test:integration`; one file via `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; server suites must stay green (Rule 9); isolation via `tests/setup/test-environment-isolation.ts`; "Rerun by impact" |
| `AGENTS.md` (root), `autobyteus-server-ts/AGENTS.md` | Repository / package notes | Same commands; `--no-watch` |
| `autobyteus-server-ts/package.json` | Scripts | `test:unit` = `vitest run tests/unit`; `test:integration` = prerequisites check + `vitest run tests/integration` |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-input-terminal-release.test.ts` + `tests/fixtures/codex-owned-terminal-cli.mjs` | Existing pattern | Real `CodexAppServerClient` spawning a provider-free JSON-RPC child, real `CodexClientThreadRouter`, `CodexThreadManager`, `CodexAgentRunBackend`, `AgentRun` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Scripted Codex app-server child (new fixture) | per-test `mkdtemp` dir | spawned by `CodexAppServerClient` (`process.execPath <fixture>`) | stdio JSON-RPC; no network, no ports | `thread/start` response | `client.close()` / process exit; temp dir removed in `finally` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Codex thread/turn/item notifications | New test-owned fixture `tests/fixtures/codex-scripted-notification-cli.mjs` (`test/notify` emits the given notifications in order, distinct turn ids per `turn/start`, realistic interrupt order) | No user data, no `~/.codex`, test isolation applies | Temp cwd removed per test |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/.../codex/thread/codex-thread.test.ts` describe "CodexThread exact-turn rejection logging" | Per-AC line counts/fields on an isolated thread | AC-001..AC-003, AC-006, AC-008 | Still Valid | IMP-01 | Reuse |
| `tests/unit/.../codex/thread/codex-segment-turn-admission.test.ts` | Admission matrix + `eventTurnId` | AC-004 | Still Valid | IMP-01 | Reuse |
| `tests/unit/.../codex/thread/codex-segment-turn-rejection-accounts.test.ts` | first/pending/summaries | REQ-002/004 | Still Valid | IMP-01 | Reuse |
| `tests/unit/.../codex/thread/codex-thread-manager.test.ts` (AC-005 release test) | Release writes pending summaries | AC-005 | Still Valid | IMP-01 | Reuse |
| `codex-thread.test.ts` willRetry tests | willRetry diagnostic keeps turn active | AC-007 / REQ-005 | Still Valid | IMP-01, IMP-03 | Reuse |
| `tests/unit/.../codex/codex-input-terminal-release.test.ts` | Input/terminal release over a scripted child | Not this ticket | Out Of Scope | — | Pattern only; fixture not modified |
| `tests/integration/runtime-execution/codex-app-server/**`, `tests/integration/agent-execution/codex-*.integration.test.ts` | Codex thread/backend integration (mostly live-gated) | AC-007 regression | Still Valid | IMP-04 | Reuse; full `test:integration` run once |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001..AC-006, AC-008, AC-007 (willRetry) | `codex/thread/*` units | Reused | IMP-01 | Ran on `dedaf77fba`; `git diff --name-only dedaf77fba HEAD` touches only `tickets/` |
| API-02 | AC-007 | server `src` types | Reused | IMP-02 | Same commit, no source change since |
| API-03 | AC-004, AC-007 | full server unit suite | Reused | IMP-03 | Same commit, no source change since |
| API-04 | SCN-001; AC-002, AC-004, AC-006, AC-008; REQ-003 (no content) | scripted app-server → client → router → thread → backend → AgentRun | Durable | Stop T1 and T2 via `AgentRun.interrupt()`, start U; late `item/started`/`item/completed(commandExecution)` of T1, T2 (+ a second T1 item) while U runs; U's agent message; `turn/completed(U)` | Unit tests bypass the real client/router and AgentRun |
| API-05 | SCN-002; AC-001, AC-003, AC-008, QR-001, AC-004 | same path | Durable | No active turn: 438 governed events of turn X + 3 turn-id-less deltas; then user message → `turn/started(U)`; then 2 more X events; `turn/completed(U)` | Whole-turn burst through the real router by `threadId` with no active turn |
| API-06 | SCN-A1; AC-005 | `AgentRun.terminate()` → backend → `CodexThreadManager.releasePreparation` | Durable | Pending counts for Y, then terminate; a second run with nothing pending terminated | Release through the product termination path, not a direct method call |
| API-07 | SCN-A2; REQ-004 | real child-process exit → client close → router → `handleClientClosed` | Durable | Pending counts, then `test/exit` | Real process lifecycle |
| API-08 | AC-004, AC-007 regression | new integration file + existing `codex-input-terminal-release` (pattern neighbour) | Existing Test | `vitest run` on both | Ensure the new fixture/test is stable and neighbours unaffected |
| API-09 | AC-007 | full server integration suite | Existing Test | `pnpm -C autobyteus-server-ts test:integration` (after prerequisite check) | Not run by implementation; TESTING.md keeps it green |
| API-10 | AC-007 | server typecheck after test addition | Existing Test | `pnpm -C autobyteus-server-ts typecheck` | Test files are outside `src`, but confirm nothing else regressed |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-04..API-07 | `autobyteus-server-ts/tests/integration/agent-execution/codex-segment-turn-rejection-logging.integration.test.ts` + fixture `autobyteus-server-ts/tests/fixtures/codex-scripted-notification-cli.mjs` | Keeps the bounded logging and the unchanged admission proven across the real Codex client/router/backend/AgentRun path, including both flush lifecycles |

## Durable Coverage To Update

None

## Durable Coverage To Remove

None

## Live Environment And Fixture Plan (When Broader Validation Is Likely)

- Startup order and commands: none beyond the in-process integration test; the scripted app-server child is spawned per test.
- Environment choices that materially affect the run: test isolation (`tests/setup/test-environment-isolation.ts`); no `CODEX_HOME`, no provider.
- Seed data / fixtures: notifications passed through `test/notify`.
- Evidence to capture: vitest verbose output; the captured rejection lines printed by the test as a JSON receipt per case.
- Owned processes and temporary state to clean up: scripted children (closed per test), temp cwd.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Live Codex producing a late tool item after Stop | Timing-dependent in a real model run; costs credits; the notification shape is evidenced by 97 late items in user rollouts | Low: the gate reads the same fields the scripted stream sends | No | Decision recorded in the report |
| `CODEX_SEGMENT_TURN_OMISSION_UNLISTED` | Unreachable from the product (handoff observation) | None | No | Follow-up candidate already listed by implementation |

## Ambiguities Or Reroute Triggers

None

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: unit tests remain the per-AC regression net; the new integration test proves the same contract at the real transport and lifecycle boundaries.
- Update during execution: on app-server exit, the router calls `CodexThread.handleClientClosed` (flush) and then the manager's `handleUnexpectedThreadClosure` → `releasePreparation` (flush). API-07 therefore also asserts the pending count is written exactly once after both ran (mutation M2 in the report).
