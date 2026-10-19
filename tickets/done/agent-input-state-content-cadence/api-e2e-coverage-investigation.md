# API/E2E Coverage Investigation — PB-001 `agent-input-state-content-cadence`

## Investigation Meta

- Requirements Doc: `tickets/in-progress/agent-input-state-content-cadence/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `.../investigation-notes.md`
- Solution Revision Record: `.../solution-revision-record.md`
- Design Spec (required on every route): `.../design-spec.md` (SR-001, Ready)
- Supplemental Task Artifacts: `.../evidence/` (design repro/probe logs; implementation `impl-*.log`)
- Design Review Report: `N/A — not applicable` (direct Small + Low route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `.../implementation-handoff.md` (IR-001)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `.../api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `.../api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Implementation Complete IR-001 (direct route) from `implementation_engineer`
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

All paths are relative to the worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-state-content-cadence`; the ticket folder is `tickets/in-progress/agent-input-state-content-cadence/`.

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

`AgentRun` must send each input-state revision at most once to its current listeners (REQ-001), so the per-connection content cadence holds text for its window. Every new revision must still reach every listener at once, after earlier pending content (REQ-002). Subscribe still gives a snapshot, and a revision first produced by a snapshot or pull read must still reach existing listeners (REQ-003). Boundaries keep flushing content first (REQ-004). The 7 existing cadence cases pass unweakened (REQ-005). AC-005 requires a real-stream proof through the real server plus the isolated-instance check. RSK-002: any other non-companion frame that flushes content early in a real stream is a `Design Impact`.

The fix is in `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` only (`publishedInputRevision`, `broadcastUnpublishedInputState`, reordered subscribe task). Scheduler, frame schema and clients are unchanged.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (live text answer), SCN-002 (queue a follow-up while the Agent answers), SCN-003 (hydrate on connect/reconnect), SCN-004 (interval change; repository case only).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1: a message sent while the Agent is idle. Admission → dispatch produces several revisions (queued/dispatching/cleared) before streaming starts. Trigger: the user sends the first message. It checks that real changes still arrive and that no repeats follow during the reply.
  - SCN-A2: the renderer reloads mid-reply (desktop window reload) — the real reconnect path of SCN-003. Trigger: reload in the isolated instance.
  - SCN-A3: two live subscribers to one run (the desktop renderer socket plus a second `/ws/agent/:runId` observer socket). Real use: a second window or a remote client on the same run. Used here to observe the frames the renderer gets, and to check that each subscriber gets each revision once.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 no repeat of a delivered revision | Changed | REQ-001; design DS-001; repro logs | Unit AC-002 case; new socket case; cadence cases; real stream (AC-005) |
| BEH-002 new revision immediate, after pending content | Preserved | REQ-002; DS-002 | New socket case; real queued-message stream (SCN-002) |
| BEH-003 snapshot on subscribe; snapshot/pull-advanced revision reaches existing listeners | Changed (subscribe order) / Preserved | REQ-003; DS-003 | Unit AC-004a/b; real reconnect (SCN-A2) |
| BEH-004 boundaries flush content first | Preserved | REQ-004 | Cadence cases 1-3, 6, 7; real stream trace ordering |
| BEH-005 interval change visible | Preserved | REQ-005 | Cadence case "uses a changed interval only…" |
| Subscribe-task reorder (`reconcileRecovery` before `listeners.add`) | Changed | Impl handoff Known Risks | Full server suites; team admission integration file |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `AgentRun` input-state publication | Unit cases (AC-002, AC-004a/b) | None material | — |
| API / transport / contract | Yes (observable frame sequence on `/ws/agent`) | Fewer `AGENT_INPUT_STATE` frames; cadence holds | In-process socket integration with a scripted backend | A real runtime's event batch shape and timing (many small deltas, status/usage/segment events) may contain another early-flush trigger (RSK-002) | Live API: built server + real LM Studio stream + socket capture |
| Frontend component / state | No (unchanged), consumer only | Web `agentInputStateHandler` dedupes by revision | Web spec 3/3 | Renderer hydration with fewer frames | Isolated instance |
| Browser integration / user journey | Indirect | Renderer shows queued message, streamed text | None in repo | Queue pending entry and text cadence in the real app | Isolated desktop instance |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Indirect | as above | — | — | Isolated desktop instance |
| Desktop shell / Electron-specific integration | No | Embedded server is the same server code | — | — | Isolated instance proves the packaged worktree build |
| Process / lifecycle | Yes (subscribe ordering, reconnect) | Snapshot on (re)subscribe | Unit AC-004a | Real reload mid-run | Isolated instance reload |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed coordination | Yes (input queue) | Queued message state | Unit + socket case | Real runtime queue dispatch after turn end | Live API |
| External integration | Indirect | Real LLM stream (LM Studio) | None | Real delta timing | Live API with local model |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-state-content-cadence`, branch `codex/agent-input-state-content-cadence`, HEAD `1496628f7d`.
- Project type and runtime stack: pnpm monorepo; Node 22 TypeScript server (Fastify, GraphQL, `@fastify/websocket`), Nuxt/Electron desktop client.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/TESTING.md` (same file in the worktree). No closer `TESTING*.md` under `autobyteus-server-ts`.
- Conflicting, missing, or unclear project instructions: TESTING.md › "Known baseline exception" names the two cadence cases as failing because of this defect; it says to remove the note when fixed. The implementation did not remove it. This is a docs-sync item for delivery (not a validation conflict).
- Required environment variables or secrets available: `Yes` — no secrets needed; LM Studio needs no key (default host `http://localhost:1234`).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, isolation, rules | Server unit/integration/typecheck commands; `test:integration:prepare`; build `dist` for suites that run `dist/app.js`; serialize builds; local model runs one at a time with `qwen/qwen3.6-35b-a3b`; isolated instance via `pnpm --silent isolated-app start --build`; never test the user's running app; stop what you start |
| `docs/isolated-app-instances.md` | Isolated desktop instance | `start --build` reports `instanceId`, `controlPort`, `backendUrl`; drive via browser-automation with `CHROME_REMOTE_DEBUGGING_PORT`, attach-only; `stop <instanceId>` |
| `AGENTS.md` (root) | Repo rules | Read DESIGN/TESTING/RELEASE |
| `autobyteus-server-ts/src/app.ts` | Server launch | `node dist/app.js --port <n> --host <h> --data-dir <dir>` |
| `src/config/streaming-content-flush-interval-setting.ts` | Cadence setting | `AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS`, default 500 ms (100–2000) |
| `tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | Existing GraphQL/WS run journey | `createAgentDefinition`, `providerModelCatalogSnapshots`, `createAgentRun`, `SEND_MESSAGE` via `/ws/agent/:runId` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` | Serialized; base-contrast build reverts `agent-run.ts` only, then restores and rebuilds | exit 0 | Restore `agent-run.ts` (`git diff` empty), rebuild |
| Real server | `autobyteus-server-ts` | `env -i PATH HOME=<tmp> TMPDIR node dist/app.js --port <free> --host 127.0.0.1 --data-dir <tmp>` | Clean env; own data dir and port | `/rest/health` | Kill owned PID; remove temp data dir |
| LM Studio | host | Already running; `qwen/qwen3.6-35b-a3b` already loaded (not by this run) | One local-model run at a time | `/v1/models` | Do not unload (not loaded by this run) |
| Isolated desktop instance | worktree | `pnpm --silent isolated-app start --build` | Own ports/data root; another person's instance `iso-54255-c1c9` exists and is left alone | `start` JSON `ok` | `pnpm --silent isolated-app stop <instanceId>`; `list` shows none of mine |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent definition + run on native AutoByteus runtime with LM Studio model | GraphQL `createAgentDefinition`, `createAgentRun` (public API) | Test-owned data dir / instance data root only | Removed with the data dir / instance |
| Interval setting | Server default 500 ms (also asserted from frame spacing) | — | — |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` (in-memory per live run). Nothing to validate beyond confirming no stored change (diff has no persistence code).

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/integration/agent/agent-status-websocket.integration.test.ts` — 7 existing cases incl. "coalesces a representative fine-grained canonical stream…" and "uses a changed interval only…" | Cadence window, boundary flush, interval change, status; `captureMessages` filters `AGENT_INPUT_STATE` | REQ-004, REQ-005 / AC-001 | Still Valid | Unchanged vs base (diff adds one case only) | Run ×3 |
| same file — new case "sends no repeated input state during a content window and a queued message's new revision right after the pending content" | 1 input-state frame across 4 batches; queued revision < 250 ms, after pending "abc" | REQ-001, REQ-002 / AC-002, AC-003 | Still Valid | Reviewed source | Run ×3; confirm it fails on base |
| `tests/unit/agent-execution/agent-run.test.ts` — new describe (4 cases) | No repeat; one broadcast per queued input; reconnect snapshot without duplicates; pull read / subscribe snapshot revisions reach existing listeners in order | REQ-001, REQ-003 / AC-002, AC-004a/b | Still Valid | Reviewed source; uses real `AgentRun` with a mocked backend | Run; confirm they fail on base |
| `tests/integration/agent-team-execution/team-agent-segment-admission.integration.test.ts` | Team segment admission; fixture now declares required backend members | AC-006 (baseline fix) | Still Valid (fixture corrected to the real `AgentRunBackend` contract) | Base log showed reconcile errors | Run in `test:integration` |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/agentInputStateHandler.spec.ts` | Client projection dedupes by revision | AC-006 | Still Valid | — | Run |
| Server `test:unit`, `test:integration`, `typecheck` | Regression | AC-006 | Still Valid | — | Run |

## Durable Coverage To Add

None planned. The implementation added the unit and socket coverage the design asked for. The real-stream proof needs a real model; the repository's live suites are gated by real providers, and a cadence-timing assertion on real LLM timing would be nondeterministic. It stays a ticket-owned temporary probe (see Temporary Executable Validation Plan). I will revisit this if the probe shows a gap the scripted socket case cannot express.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-run.test.ts --no-watch` | worktree | AC-002, AC-004 (unit) | Pass (46/46) | `evidence/api-unit-agent-run.log` |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent/agent-status-websocket.integration.test.ts --no-watch` ×3 | worktree | AC-001, AC-002, AC-003 | Pass (8/8 ×3) | `evidence/api-cadence-run-{1,2,3}.log` |
| 3 | Same two files with `agent-run.ts` temporarily at base `2f211340ee` | worktree; restored after | New tests detect the defect | Pass (4/4 new unit cases fail; socket: the 2 known cases + new case fail) | `evidence/api-base-new-tests.log` |
| 4 | `pnpm -C autobyteus-server-ts typecheck` | worktree | AC-006 | Pass | `evidence/api-typecheck.log` |
| 5 | `pnpm -C autobyteus-server-ts test:unit` | worktree | AC-006 | Pass (5846 passed / 7 skipped) | `evidence/api-test-unit.log` |
| 6 | `pnpm -C autobyteus-server-ts test:integration` | worktree (prepare already run by implementation) | AC-006 | Pass (396 passed / 68 skipped; 0 `reading 'kind'`) | `evidence/api-test-integration.log` |
| 7 | `pnpm -C autobyteus-web test:nuxt run services/agentStreaming/handlers/__tests__/agentInputStateHandler.spec.ts` | worktree | AC-006 consumer | Pass (3/3) | `evidence/api-web-agentInputStateHandler.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes` — several independent cases, long-running real-model and desktop-instance cases.
- Canonical ledger path: `tickets/in-progress/agent-input-state-content-cadence/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

Repository execution (orders 1–7) all passed; see the ledger events 1–7.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | AC-001 (8/8 ×3), AC-002/AC-003 (socket case), AC-004a/b (unit), AC-006 (suites) proven; new tests fail on base | AC-005 (real stream) not yet run | Live real-stream probe |
| Changed-boundary execution directness | 90% | Real `AgentRun` → real egress → real socket in-process | Scripted backend batches | Built server + real runtime |
| Cross-boundary integration realism and mock gap | 75% | Real egress and socket; backend scripted | Real runtime batch shape/timing (RSK-002) unexercised | Live LM Studio stream |
| Environment, configuration, identity, and fixture fidelity | 85% | Isolated test env; default 500 ms interval | Built `dist` and packaged app not exercised | Built server; isolated instance |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | Reconnect, pull read, subscribe-snapshot ordering unit-proven; termination path in the cadence file | Real reconnect mid-run | Live second subscriber; desktop reload |
| User-surface, browser, and desktop-shell confidence | 70% | Web handler spec dedupes by revision | No renderer journey | Isolated desktop instance |
| Durable regression coverage quality and relevance | 95% | Tests target the invariant, fail on base, unweakened existing cases | — | — |

- Overall post-repository confidence: 83.6% (simple average)
- Calculation method: simple average of the 7 applicable categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-005 pending)
- Any applicable category below `90%`: `Yes` — requirement proof, integration realism, environment fidelity, lifecycle, user surface
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: RSK-002; the real-product journey

## Broader Validation Decision (Mandatory)

- Decision: `Required` (AC-005 requires it; RSK-002 is not provable with a scripted backend).
- Selected execution mode: `Live API` (built worktree server + real LM Studio stream + socket capture, with a base-build contrast) then `Project Desktop Validation` (isolated desktop instance of the worktree build).
- Specific confidence gap: a real runtime's batch shape and timing may contain another early-flush trigger (RSK-002); real queue and reconnect behavior in the product.
- Why the selected mode can materially improve confidence: it runs the real native runtime, the real event mapper, the real egress on a real socket, with real token-delta timing. The base contrast shows that the probe would detect the defect. The isolated instance proves the packaged build and the renderer journey.
- Expected confidence after the selected validation: ≥ 95%.
- Browser-specific decision and rationale: no standalone browser probe. The renderer is unchanged; the isolated desktop instance covers the user journey.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron with an embedded server.
- Testing guideline, README, or development instructions used: TESTING.md, `docs/isolated-app-instances.md`.
- Web-equivalent behavior: streamed text rendering, queued-message display, reconnect hydration.
- Shell-specific or lifecycle behavior: none changed.
- Chosen validation approach: isolated instance of the worktree build (`start --build`), driven through the renderer, with a second observer socket on the instance backend.
- Effect on any already-running desktop application: `None` (separate ports and data root; the user's app and the other instance are untouched).
- Behavior not directly proven and confidence consequence: none material. Executed as planned, with one change: the queued message came from a second `/ws/agent` client, because the standalone composer's primary action is Stop while Running (see Ambiguities). See the execution report.

## Live Environment And Fixture Plan

- Startup order and commands: (1) `pnpm -C autobyteus-server-ts build`; (2) the probe script starts `node dist/app.js` on a free port with a temp data dir and a clean env; (3) GraphQL creates an agent definition and a run (`runtimeKind: autobyteus`, LM Studio qwen model); (4) the observer socket connects, then sends a message asking for a long plain-text answer; (5) mid-reply it sends a second message (queued), then opens a second socket (reconnect snapshot); (6) it records every frame with a monotonic timestamp until both turns are idle; (7) terminate run, kill server, remove data dir. Base contrast: revert `agent-run.ts` to base, rebuild, rerun the same probe, restore and rebuild.
- Environment choices that materially affect the run: clean env (`env -i`), default 500 ms interval, `qwen/qwen3.6-35b-a3b`.
- Health / readiness checks: `/rest/health`, model catalog lists the LM Studio model.
- Seed data / fixtures: created through GraphQL only.
- Test identities: none.
- Requirement-linked journeys: LIVE-01 (AC-005, SCN-001, SCN-A1), LIVE-02 (AC-003 real, SCN-002), LIVE-03 (AC-004a real reconnect, SCN-003/A3), LIVE-04 base contrast; DESK-01 isolated instance journey.
- Evidence to capture: full JSONL frame traces, computed summaries (content-frame gaps, input-state revisions per socket, ordering checks), server logs, screenshots and DOM assertions from the instance.
- Owned processes and temporary state to clean up: probe server PID, temp data dir, isolated instance and its data root.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| LIVE-01..04 | `evidence/live-stream-probe.mjs` against built `dist/app.js` + LM Studio | AC-005, real AC-003/AC-004a, RSK-002 | Needs a local model; real token timing is nondeterministic; the deterministic contract is already in the socket integration case |
| DESK-01 | Isolated desktop instance + browser-automation + observer socket | Product journey, packaged build | The repository's isolated-instance layer is manual by design |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Team-stream coalescing | Out of scope (FU-001) | Known separate defect | No | FU-001 (Solution Designer follow-up) |
| `/ws/agent-org`, `/ws/agent-collaboration` cadence | Out of scope (FU-002) | — | No | FU-002 |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| TESTING.md "Known baseline exception" note becomes stale once fixed | Not a reroute; docs-sync item | TESTING.md L165-167 | Delivery Engineer (docs sync) |
| SCN-002 trigger "Send while running": in the standalone desktop composer, the primary action is Stop while Running (`autobyteus-web/services/runSubmission/agentPrimaryAction.ts`), so Enter interrupts. A queued input there comes from another `/ws/agent` client (second window, remote/mobile client) or from collaboration/compaction-held input | Not a reroute; existing unchanged behavior, outside this ticket's scope. The server behavior REQ-002 governs is proven through the real `SEND_MESSAGE` command (LIVE-02, DESK-01) | `evidence/desk/04-after-m2.png`; instance log L367-371 | Informational for Solution Designer (scenario wording); no change requested |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Post-repository confidence: 83.6%; final after broader validation: 96.0% (execution report)
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: execution completed; see `api-e2e-execution-coverage-report.md`.
