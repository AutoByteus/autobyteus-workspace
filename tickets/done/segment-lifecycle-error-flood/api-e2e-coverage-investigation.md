# API/E2E Coverage Investigation — segment-lifecycle-error-flood

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-002)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001, SR-002)
- Design Spec (required on every route): `design-spec.md` (Ready, SR-002)
- Supplemental Task Artifacts: `probes/claude-provider-turn-segment-race.probe.test.ts`, `evidence/probe-run-base-1c718202b2.txt`, `experiments/` (evidence only)
- Design Review Report: `design-review-report.md` (round 2, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, round 1, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code reviewer's implementation-review Pass (CRR-001) for code commit `f4490d258a`, ticket docs `a3b67e23f5`
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this document, round 1

All paths are relative to the ticket folder `/Users/normy/autobyteus_org/autobyteus-worktrees/segment-lifecycle-error-flood/tickets/in-progress/segment-lifecycle-error-flood/`.

## Current Requirement And Design Basis

- REQ-001/REQ-002 (Critical): only ordered stream evidence ends a turn; a live runtime snapshot that is ahead of the queue never ends one. When Claude starts turns back to back (background task finished → task-notification turn → self-started turn), both turns keep their text, the text is saved in run memory, and status is `running` while the newer turn works, `idle` after (AC-001..AC-003, AC-007).
- REQ-003/REQ-004 (High): a real segment lifecycle rejection gives at most one plain-language notice per turn, only in the current turn; the server log gets one detailed `[AgentSegmentLifecycleRejected]` line per turn account and count summaries `[AgentSegmentLifecycleRejectedSummary]` at lifecycle boundaries (AC-004, AC-005).
- REQ-005: preserved snapshot-only current turn, other diagnostics, DTO contract (AC-006).
- Design: `AgentTurnLedger` shared rule, both states delegate; transformer `rejection()` + boundary flush; termination logs release summaries. Classification Medium / High, reviewed route.
- Handoff: `Legacy / Compatibility Removal Check` clean (no compatibility mechanisms, dead code removed); `Persisted Data Transition Check` = `Not Affected`. Matches the code-review findings; no active signal.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (Claude continues on its own after its background task finishes), SCN-002 (rejected segment event), SCN-003 (snapshot-only current turn).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-001 through the real product stack: a user sends a message over the agent WebSocket asking Claude to run a Bash command in the background and end its turn; the real Claude CLI (haiku) finishes the task and continues on its own. Trigger: real Claude CLI frames, not scripted frames. This is the only way to show that the real CLI's frame timing produces the race shape and that the fix holds under it.
  - SCN-001 in the desktop app (AC-007): same journey, driven through the UI of an isolated desktop instance of this worktree's build, with the server log and run memory of that instance.
  - ASM-001 (other runtimes): an ordinary turn of another runtime after the shared-state change. Covered by the full server suites (reused) and, optionally, one ordinary Codex turn in the isolated instance.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 second back-to-back turn keeps its text | Changed | requirements, probe, CRR-001 base run | Scripted regression (reused) + new live Claude E2E + desktop journey |
| BEH-007 first turn's queued text kept | Changed | experiment X5 | Scripted regression (reused); live shape only if the CLI writes text in the task-notification turn |
| BEH-002 status `running` during newer turn | Changed | probe X2 | Scripted regression (reused) + live status sampling + desktop status indicator |
| BEH-003 ≤1 notice per turn, bounded log | Changed | DEC-002/003 | Unit tests (reused); live run asserts zero rejection lines in the normal case |
| BEH-008 snapshot-only current turn | Preserved | E1 | Full unit/integration (reused) |
| BEH-006 other diagnostics | Preserved | — | Full suites (reused) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Turn ledger, both lifecycle states, segment transformer, termination logging | Unit tests incl. scripted Claude regression (IMP-02/03) | None material for the logic | — |
| API / transport / contract | Yes (event stream content, not shape) | Canonical events → agent WebSocket | Integration (IMP-05) with scripted backends | Real CLI frame timing never exercised | Gated live Claude E2E over the real agent WebSocket |
| Frontend component / state | No (card unchanged; receives fewer events) | — | — | — | Desktop journey observes it |
| Browser integration / user journey | Indirect | Chat shows text, no red cards, status dot | None | User-visible outcome of AC-007 | Isolated desktop instance |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Indirect | as above | None | as above | Isolated desktop instance |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | Run turn lifecycle, termination release summary | Unit (AC-005c) | — | — |
| Persisted-data transition | No (`Not Affected`) | Run memory gains previously dropped records via unchanged writer | Scripted regression asserts memory | Real run memory under real CLI | Live E2E with the real memory recorder; desktop run memory |
| Worker / queue / distributed coordination | Yes | Per-run dispatch queue vs live snapshot | Scripted burst in unit test | Real CLI timing | Live E2E |
| External integration | Yes | Claude CLI / Agent SDK | Scripted SDK only | Real CLI | Live E2E (both CLI candidates) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/segment-lifecycle-error-flood`, branch `codex/segment-lifecycle-error-flood`
- Project type and runtime stack: pnpm workspace; Fastify/TypeScript server (`autobyteus-server-ts`), Nuxt/Electron desktop (`autobyteus-web`); vitest
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/segment-lifecycle-error-flood/TESTING.md` (identical to the superrepo root's); no closer `TESTING*.md` under `autobyteus-server-ts`
- Conflicting, missing, or unclear project instructions: TESTING.md names `scripts/browser` "from the browser-automation skill"; the launcher found on this machine is `/Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser` (the `autobyteus_mcps` checkout has no `scripts/`).
- Required environment variables or secrets available: `Yes` — the host Claude CLI is signed in (`claude auth status`: loggedIn, claude.ai). No secret values recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, rules | Server unit/integration/typecheck commands; gated runtime suites (`RUN_*`) run with a clean env, signed-in CLIs need real `HOME`, `USER`, `LOGNAME`; skip ≠ pass; real-provider runs only when needed; isolated instance for full product journeys; never touch the user's running app or `~/.autobyteus` |
| `docs/isolated-app-instances.md` | Isolated desktop instance | `pnpm --silent isolated-app start --build`, use returned `instanceId`/`controlPort`, browser automation with `CHROME_REMOTE_DEBUGGING_PORT=<controlPort> BROWSER_AUTOMATION_ATTACH_ONLY=1`; embedded server gets a system-baseline env incl. home (so the host Claude login is reachable); stop with `isolated-app stop` |
| `autobyteus-server-ts/tests/e2e/helpers/claude-live-agent-harness.ts` | Live Claude harness | Real AgentRun + ClaudeAgentRunBackend + ClaudeSession + real SDK/CLI behind the real agent WebSocket; optional `memoryDir`; `useStandaloneClaudeCli` strips parent Claude Code env |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-background-task.e2e.test.ts` | Existing gated live background-task suite | `RUN_CLAUDE_E2E=1`; runs once per CLI candidate (`path-claude`, `sdk-bundled-claude`) |
| `AGENTS.md` (root) | Repo rules | Read TESTING.md before validation |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Live Claude E2E (in-process server stack) | `autobyteus-server-ts` | `env -i PATH HOME USER LOGNAME TMPDIR RUN_CLAUDE_E2E=1 pnpm exec vitest run <file> --no-watch` | haiku, a few cents per case; Fastify on port 0 | Test's own WebSocket open | Test `afterEach` closes session, app, temp dirs |
| Isolated desktop instance | worktree root | `pnpm --silent isolated-app start --build` | Builds the worktree; own data root and ports; another instance (`iso-54255-c1c9`, not ours) is running and is left alone | JSON `ok: true` with `instanceId`, ports | `pnpm --silent isolated-app stop <instanceId>`; `list` shows none of ours |
| Browser automation | — | `/Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser` attach-only on our `controlPort` | — | `list-tabs` | Nothing to stop (attach-only) |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Claude sign-in | Host Claude CLI login (real `HOME`) | Never edit `~/.claude`; each live run adds sessions to the user's Claude history (recorded) | Kept by Claude; reported |
| Live test workspace and memory | `fs.mkdtemp` in the test | Test-owned temp dirs | Removed by the test |
| Desktop agent definition and workspace | Created through the instance UI / its GraphQL | Instance-owned data root only | Data root removed with the instance (ownsDataRoot) |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-execution/backends/claude/claude-provider-turn-race.test.ts` (new in `f4490d258a`) | Scripted burst: 0 notices, texts delivered and in memory, status running mid-turn / idle after | AC-001..AC-003 | Still Valid | IMP-02; fails on base per CRR-001 | Reuse IMP-02 |
| `tests/unit/agent-execution/events/agent-turn-ledger.test.ts`, `agent-segment-lifecycle-event-transformer.test.ts`, `lifecycle-status-event-transformer.test.ts`, `agent-run.test.ts` | Ledger rule, single notice, bounded log (a–d), termination summary | AC-004, AC-005, REQ-001/002 | Still Valid | IMP-02 | Reuse IMP-02 |
| `tests/integration/agent/agent-status-websocket.integration.test.ts`, `tests/integration/agent-team-execution/team-agent-segment-admission.integration.test.ts` | Intentionally changed per design (late ended-turn event → no notice) | AC-006, REQ-003 | Still Valid (changes match design spec l.287–289) | IMP-05 | Reuse IMP-05 |
| Whole server unit / integration / typecheck | Regression | AC-006, ASM-001 | Still Valid | IMP-01/03/05 | Reuse |
| `tests/e2e/runtime/claude-agent-background-task.e2e.test.ts` (gated live) | Background task listed running→completed; notice; Claude-initiated turn reports "done" | SCN-001 (background-task feature); relevant because the self-started turn passes through the changed lifecycle | Still Valid | Assertions do not depend on lifecycle diagnostics; does not assert absence of lifecycle notices, status, or memory | Run its first case (`shows a background Bash command…`) as an existing live regression (API-07) |
| `tests/e2e/runtime/claude-team-member-background-task.e2e.test.ts`, `claude-delegated-background-task.e2e.test.ts` | Team/delegated variants | SCN-001 variants | Still Valid | — | Out of scope for this round's run: same session/backend/AgentRun path as the standalone case; Team members use the same AgentRun pipeline |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-006 | Server typecheck | Reused | IMP-01 | Ran on `f4490d258a`; `git diff --name-only f4490d258a HEAD` touches only `tickets/` |
| API-02 | AC-001..AC-005 | Ledger, states, transformer, termination, scripted Claude → AgentRun → memory | Reused | IMP-02 | Same commit; CRR-001 additionally showed the regression test fails on base |
| API-03 | AC-006, ASM-001 | Whole server unit suite | Reused | IMP-03 | Same commit |
| API-04 | AC-006, ASM-001 | Whole server integration suite incl. the 2 intentionally changed tests | Reused | IMP-05 (prepared by IMP-04) | Same commit |
| API-05 | AC-001, AC-003, AC-007 (server half), REQ-003/004 normal case | Real Claude CLI → SDK → ClaudeSession → backend → AgentRun → agent WebSocket + real memory recorder | Durable (new gated live E2E) | `RUN_CLAUDE_E2E=1` clean env; `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-self-started-turn-lifecycle.e2e.test.ts --no-watch`; per CLI an `idle` and a `loaded` variant (round-3 revision, see below) | Scripted frames prove the logic; only the real CLI proves its frame timing produces the shape and the fix holds |
| API-06 | Regression value of API-05 (idle) | same, base source | Temporary Probe | Same command with the 4 modified `src` files temporarily checked out from `1c718202b2`, then restored (`git status` clean) | Shows whether the live case detects the defect; not durable (base source is not a test asset) |
| API-06b | AC-001/AC-003 under real CLI + emulated server load | same stack; every pipeline batch +25 ms async | Temporary Probe | `probes/claude-live-queue-lag.probe.test.ts` copied temporarily to `tests/e2e/runtime/`, run on base src and on HEAD, copy deleted | Added after API-06 showed the race needs queue lag (the user's run was on a busy server). Its logic was then made durable as the `loaded` variant of API-05 |
| API-06c | Regression value of the final durable file | final API-05 file on base src | Temporary Probe | As API-06 with the final file | Confirms the committed test itself fails on the defect |
| API-07 | SCN-001 preserved background-task behavior | Existing gated live suite, first case | Existing Test | `vitest run tests/e2e/runtime/claude-agent-background-task.e2e.test.ts -t "shows a background Bash command"` | Background-task listing + Claude-initiated turn through the changed lifecycle |
| API-08 | AC-007 | Isolated desktop instance of this worktree's build, UI journey | Journey | `isolated-app start --build`; create a Claude Agent SDK agent; send the background-task prompt; observe the self-started turn's text, no red card, status Running during it; read instance server log and the run's `raw_traces_active.jsonl` | AC-007 verification intent; TESTING.md "full real-product journey" |
| API-09 | ASM-001 (optional) | Isolated instance, ordinary Codex turn | Journey | Same instance, Codex agent, one ordinary message; no lifecycle notice, status idle after | Optional confirmation beyond suites |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-05 | `autobyteus-server-ts/tests/e2e/runtime/claude-self-started-turn-lifecycle.e2e.test.ts` | The bug was found only in real use; the existing live background-task suite would not catch it (it asserts only that some text contains "done"; it does not assert zero lifecycle notices, status during the self-started turn, run memory or rejection log lines). A gated live suite keeps the real-CLI shape covered whenever Claude live suites run. Revision during execution: (1) two parallel background tasks, because a single task usually gives one provider turn, while two tasks finishing together give the reported T1 (notice only) + T2 (work) shape; (2) a setup precondition that both tasks started; (3) a `loaded` variant (+25 ms async per pipeline batch), because on an idle machine the queue never lags and the test passed on base (API-06); with the load it fails on base (API-06b/06c). Load is real use: the reported run was on a busy server (450 ms between the two notices in the user's run memory). |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron + Nuxt renderer, embedded server
- Testing guideline, README, or development instructions used: TESTING.md, `docs/isolated-app-instances.md`
- Web-equivalent behavior: chat text, error cards, status indicator (renderer)
- Shell-specific or lifecycle behavior: none changed
- Chosen validation approach and why it fits the project: isolated instance `--build` of the worktree, driven through browser automation attach-only on the instance's `controlPort`; it is the surface AC-007 names and it runs the real embedded server with the real Claude CLI
- Server/frontend setup when browser validation is used: provided by the instance
- How the run avoids disturbing an already-running desktop application: own data root, own ports; the other running instance `iso-54255-c1c9` and the user's app are not touched

## Live Environment And Fixture Plan

- Startup order and commands: live E2E first (cheapest real-CLI proof), then `isolated-app start --build`
- Environment choices that materially affect the run: clean env with real `HOME`, `USER`, `LOGNAME` (signed-in Claude), model `haiku` in live E2E; desktop agent with the Claude Agent SDK runtime and the default/cheapest Claude model offered
- Health / readiness checks: WebSocket open (live E2E); `start` JSON `ok: true`, UI loaded (desktop)
- Seed data / fixtures: one agent definition and one workspace created through the instance UI/GraphQL
- Test identities: host Claude login
- Requirement-linked journeys: SCN-001 (AC-007)
- Evidence to capture: WebSocket message type sequence and lifecycle `ERROR` count, status samples, memory traces, captured warn lines (live E2E); DOM text, status, error card count, screenshots, instance server log grep, run memory excerpt (desktop)
- Owned processes and temporary state to clean up: our isolated instance and its data root; test temp dirs

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| BEH-007 under the real CLI | Depends on Claude writing text in the task-notification turn, which the prompt cannot force | Low: scripted AC-002 case proves the rule | No | None |
| Team / delegated background-task live variants | Same AgentRun pipeline as the standalone case; cost | Low | No | None |
| AC-004/AC-005 under a real runtime | No supported runtime emits invalid segment events on demand | Low: unit tests capture the logger directly | No | None |
| API-09 optional Codex ordinary turn in the instance | The instance was started without a test-owned `CODEX_HOME` (TESTING.md: only `CODEX_HOME` passes through); ASM-001 is already covered by the reused full unit and integration suites | Low | No | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| Design spec l.348 says summary field `rejectedAfterFirst`; interface table, REQ-004 and code use `count` | Not a reroute (document wording; already in CRR-001 residual risks) | design-spec.md l.214 vs l.348 | Delivery / Solution Designer at finalization |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (one new gated live E2E file)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: Reused results (API-01..API-04) hold because no source or test file changed between `f4490d258a` and `a3b67e23f5`.
