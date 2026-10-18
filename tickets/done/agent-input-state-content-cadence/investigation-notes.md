# Investigation Notes

## Investigation Meta

- Package identifier: `agent-input-state-content-cadence` (Project Task PB-001)
- Request / ticket: PB-001 — fix premature flushing of ordinary Agent response text when input-state events are published; first check that the defect still exists on current `origin/personal`.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-state-content-cadence`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-state-content-cadence`, branch `codex/agent-input-state-content-cadence`
- Resolved base remote / branch / revision: `origin/personal` @ `2f211340ee36b81cef74a74b2e042b5102c269d3` (`v1.5.6-beta.1-2-g2f211340ee`, fetched 2026-10-18)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from freshly fetched `origin/personal`; `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild` exit 0.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-18); `TESTING.md` (2026-10-18); architecture gate files are recorded in `design-spec.md`.
- Investigation status: Complete for requirements and architecture.

## Initial Request And Clarifications

- Original request: PB-001 from `/project_task_manager` (user go-ahead 2026-10-18: "dispatch immediately. But I am not sure whether that task is still valid. The software engineering team should be checking.").
- Clarifications received: none needed. The Task states "The engineering owner decides the smallest appropriate correction."
- User-supplied facts and constraints: product defect, not test or CI policy; do not weaken timing assertions; keep immediate queue-state projection and lifecycle/tool/error/terminal ordering; keep it separate from input-delivery refactors; no live-node repair or release is authorized by this Task itself (the "Done when" includes release with the next beta through the normal delivery route).
- Initial ambiguity: whether the defect still exists after the agent-loop, per-call TPS, collaboration and memory refactors. Resolved below: it does, in the same form.

## Product And Domain Understanding

- Product area: live Agent response streaming over the agent WebSocket (`/ws/agent/:runId`) and the server-side content cadence ("Live response streaming" setting, default 500 ms window, from `3b5144a0be`).
- Affected actors or systems: a user watching a live Agent response in chat; the web client's stream projector; any WebSocket consumer of the agent stream.
- Existing user or operational purpose: the cadence batches fine-grained text deltas into one frame per window so the renderer updates at a steady rate instead of once per token.
- Relevant terminology: *content* = `SEGMENT_CONTENT` frames; *companion* = non-content frame that may be forwarded without flushing pending content; *input state* = `AGENT_INPUT_STATE`, the revisioned projection of the run's input queue and recoverable-block state.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-18 | Doc | Task reference `followup-agent-input-state-flushes-content-cadence.md`, `integration-agent-status-websocket-tail.log.txt`, `cadence-diagnostic.json` | Prior trace (2026-10-17) | Cause traced to `AgentRun.publishInputState()` after every batch + scheduler classifying `AGENT_INPUT_STATE` as `FLUSH_THEN_FORWARD` | Re-verify on current base |
| 2026-10-18 | Command | `git fetch origin --tags`; `git describe --tags origin/personal` | Resolve base | `2f211340ee`, `v1.5.6-beta.1-2` | — |
| 2026-10-18 | Code | `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/agent-stream-content-cadence-scheduler.ts` | Current classifier | `SAFE_COMPANION_TYPES` = `AGENT_COMMAND_ACK`, `CONNECTED`, `TOKEN_USAGE_UPDATED`; `AGENT_STATUS` initializing/running forwarded without flush; everything else `FLUSH_THEN_FORWARD` | — |
| 2026-10-18 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` L92, L119, L160-166, L202, L283-287, L355, L378, L414-430 | Producer | `publishInputState()` is called after every canonical dispatched batch (L286) and on admission, dispatch result, recovery change and termination; it always dispatches. `inputStateEvent()` bumps `revision` only when the `{entries, recoverableBlock}` signature changes. `subscribeToEvents` sends a snapshot to the new listener only (L164). `getInputStateSnapshot()` (pull read) also calls `inputStateEvent()` and can advance the revision without broadcasting. | Design must handle snapshot-advanced revisions |
| 2026-10-18 | Code | `autobyteus-web/services/agentStreaming/handlers/agentInputStateHandler.ts` | Client contract | Client ignores a frame whose `revision <= previous.revision` for the same `run_instance_id` — repeated unchanged frames are no-ops on the client | Suppressing unchanged frames is client-invisible |
| 2026-10-18 | Code | `grep -rn AGENT_INPUT_STATE` over `src`, web, contracts | Consumers | Consumers: standalone mapper (`agent-run-event-message-mapper.ts`), collaboration adapter, team projector (`team-agent-event-websocket-projector.ts`), web projector/handler, e2e harness `frameDigest` (filters it out). Pull snapshots via `getInputStateSnapshots()` in team/org/standalone root views. No consumer treats the frame as a heartbeat. | — |
| 2026-10-18 | Code | `agent-team-stream-handler.ts` L73; `agent-stream-egress-control-composition.ts` | Scope of scheduler | The team stream uses the same `AgentStreamWebSocketEgress`/cadence scheduler | Team observation below |
| 2026-10-18 | Code/Contract | `stream-content-coalescing.ts` `isCoalescibleStreamContent`; `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts` L92; team projector L84 | Team content shape | Coalescing requires `payload.id`; team `SEGMENT_CONTENT` is a strict schema with `segment_id` (since `57ab99fcc4`, 2026-08-11) and no `id`, so team content is never coalesced (forwarded per delta). Static reading, not run. | Out-of-scope follow-up FU-001 |
| 2026-10-18 | Doc | `TESTING.md` "Green server suites" | Current testing policy | No baseline exception for these cases remains; "Every failure there is a real failure" | The 2 failures are an open product failure |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | A running Agent streams a text response; the user watches the chat | Runtime emits deltas → AgentRun dispatches canonical batch → WebSocket egress cadence holds content for the configured window → one coalesced frame per window | **Broken:** after each batch AgentRun publishes an unchanged `AGENT_INPUT_STATE`, which flushes pending content about 15 ms after the burst; the window never holds | Repro runs 1-3; probe-trigger log | High |
| BEH-002 | User | User sends or queues a message while an Agent runs; queue changes (admitted, dispatched, recovered) | `AGENT_INPUT_STATE` with a new revision is published immediately; the scheduler flushes pending content first, then forwards it | Queue projection is immediate and ordered after earlier content | agent-run.ts L202, L378; scheduler | High |
| BEH-003 | Contract | New WebSocket subscribes to a live run | `subscribeToEvents` delivers the current input-state snapshot to the new listener | New client gets the current queue state on connect/reconnect | agent-run.ts L160-166 | High |
| BEH-004 | System | Lifecycle/tool/error/terminal boundaries (segment start/end, turn completed, non-running status, errors, tool events) | Classified `FLUSH_THEN_FORWARD`: pending content always arrives before the boundary | Ordering invariant | scheduler `classifyMessage`; integration cases 1-3, 6, 7 pass | High |
| BEH-005 | Operational | Live response streaming interval setting changed while a socket is open | The next newly opened window uses the new interval | Covered by integration case "uses a changed interval…" (currently failing because of BEH-001) | test L379-436 | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `agent-run.ts` `publishInputState` / `inputStateEvent` | Producer of input-state projection; revision bumps on signature change | Redundant frames carry no new information (same revision) | Publish only revisions the listeners have not received |
| `agent-run.ts` `subscribeToEvents` snapshot | Per-listener snapshot, may advance revision | Snapshot must stay unconditional for the new listener | A revision first produced by a snapshot must still reach existing listeners |
| `agent-run.ts` `getInputStateSnapshot` | Pull read for root/team/org views | May advance revision without broadcast | Next publish must broadcast it |
| `agent-stream-content-cadence-scheduler.ts` | Cadence classifier | Changing it (option 1) would reorder real queue changes ahead of pending content | Left unchanged by chosen design |
| Web `agentInputStateHandler.ts` | Dedupes by revision | Unchanged frames are client no-ops | No client change needed |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: `AGENT_INPUT_STATE` WebSocket frame (`agentInputStateSchema`); unchanged shape.
- Existing readers, writers, or contracts that consume them: web stream projector, team projector, collaboration adapter.
- Evidence paths: see Source Log.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries: `AgentRun` listener fan-out (serialized through `dispatchQueue`); WebSocket egress scheduler.
- Existing structural surfaces that can support the approved behavior: `AgentRun` already owns `inputRevision`/`lastInputSignature`; the change stays inside that owner.
- Evidence paths: `agent-run.ts` L69-70, L160-166, L414-430.

### Potential Structural Impacts To Investigate

- API or external-contract change: None (frame shape and revision semantics unchanged; only redundant repeats stop).
- Persistence schema or invariant change: None.
- Security or privacy boundary change: None.
- Concurrency or lifecycle change: None new; all publishes and subscriptions already run on the run's `dispatchQueue`.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: None.
- Confirmed absent, present, or unknown: Confirmed absent.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent/agent-status-websocket.integration.test.ts --no-watch` ×3 on unmodified `2f211340ee` | BEH-001, BEH-005 | 3/3 runs: 2 failed / 5 passed — the same two cadence cases as on 2026-10-17 (`expected [SEGMENT_CONTENT] length 0 but got 1` at 350 ms) | **Defect still valid, same form** | `evidence/repro-run-1.log`, `-2.log`, `-3.log` |
| Temporary log in scheduler `FLUSH_THEN_FORWARD` when content is pending (reverted) | BEH-001 | Only trigger: `AGENT_INPUT_STATE {revision:1, entries:[], recoverableBlock:null}` — a revision the socket already received in its subscribe snapshot | Cause confirmed; the repeat is a duplicate of the snapshot revision | `evidence/probe-trigger-baseline.log` |
| Probe A (reverted): skip publish when revision equals last *broadcast* revision | Option 2, naive | Still 2 failed: the snapshot-delivered revision 1 was never "broadcast", so the first publish re-sent it | Design must count snapshot delivery | `evidence/probe-option2-integration.log`, `probe-option2-unit-agent-execution.log` |
| Probe B (reverted): track last delivered revision; a snapshot that advances the revision also broadcasts it to existing listeners; publish skips an already-delivered revision | Option 2, refined | 7/7 pass on 2 runs; 2282 unit tests pass (agent-execution, agent-streaming, agent-team-execution, agent-collaboration) | Feasible, smallest producer-side fix | `evidence/probe-option2b-integration-1.log`, `-2.log`, `probe-option2b-unit.log` |

Worktree source returned to base after probes (`git diff --stat` empty for `autobyteus-server-ts`).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User via PTM (2026-10-18) | Check validity first; fix if still present | Direct | Repro recorded first | None |
| Task description | Engineering owner decides the smallest correction; keep queue projection immediate and boundary ordering | Direct | DEC-001 decided by Solution Designer | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| `agentInputStateSchema` (`@autobyteus/agent-presentation-contracts`) | current | Revisioned snapshot; clients dedupe by revision | web handler | None |

## Persisted Data And State Facts

- Affected stored or external subject: None (in-memory projection only).
- Remaining evidence gap: None.

## Product Design Request Context

- Product Design request in the current input: `Not stated`

## Product Design Findings

- N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/repro-run-{1,2,3}.log` | Solution Designer | Validity re-check on current base | BEH-001, BEH-005 | REQ-001, AC-001 | Final | Evidence only |
| `evidence/probe-trigger-baseline.log` | Solution Designer | Trigger identification | BEH-001 | REQ-001 | Final | Evidence only |
| `evidence/probe-option2*.log` | Solution Designer | Feasibility of the chosen correction | BEH-001..003 | REQ-001..003 | Final | Evidence only; probes reverted |
| Task context files under `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_4577620f-5db7-454c-9cc4-f33f201b0366/context/` | API/E2E engineer (project-tool-split) | Original 2026-10-17 trace | BEH-001 | — | Historical | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | A pull snapshot (`getInputStateSnapshot`) or a subscribe snapshot can advance the revision without a broadcast | Existing listeners would miss a change if publish compared against the last broadcast only | Design rule: compare against the last revision delivered to all current listeners; a snapshot that advances the revision broadcasts it | Addressed in design |
| RSK-002 | Risk | Other non-safe companions might also flush in real streams | Fix might not restore cadence in a real run | Real-stream proof (AC-005) | Open until validation |
| FU-001 | Unknown | Team-stream `SEGMENT_CONTENT` uses `segment_id`, so the cadence never coalesces team member content (static reading) | Team chats likely stream per delta | Out of scope; follow-up for PTM | Recorded |

## Architecture Investigation Findings

- Entry: runtime batch → `AgentRun.publishSourceEvents` → `dispatchProcessedAgentRunEvents` → listeners (`AgentStreamHandler.forwardRunEvent` → `AgentStreamWebSocketEgress.send` → filters → `AgentStreamContentCadenceScheduler.accept`) → `onCanonicalEventsDispatched` → `publishInputState()` → same listeners → scheduler classifies `AGENT_INPUT_STATE` as `FLUSH_THEN_FORWARD` → pending content flushed early.
- Root cause: the producer re-publishes an unchanged, already-delivered input-state revision after every batch (redundant event); the scheduler correctly treats a real input-state change as an ordering boundary.
- All publishes, subscriptions and snapshot deliveries run on the run's serialized `dispatchQueue`, so a single "last delivered revision" field is race-free. `getInputStateSnapshot()` is synchronous and called from root/team view builders outside the queue; it may advance `inputRevision`, which the rule handles by broadcasting on the next publish.

## How The Defect Got In And Why It Stayed Unnoticed (SR-002, user request 2026-10-18)

| Date | Commit | What happened | Evidence |
| --- | --- | --- | --- |
| 2026-08-06 | `3b5144a0be` | Server-side content cadence added to the standalone and Team egress. Its classifier is an allow-list: any message type not listed as a safe companion flushes pending content. | `git show --stat 3b5144a0be` |
| 2026-08-11 | `57ab99fcc4` | Team content renamed to `segment_id` (strict presentation schema). The coalescer still requires `id`, so Team content apparently stopped coalescing silently (FU-001). | `git log -S"segment_id: event.details.segmentId"` |
| 2026-09-01 / 09-30 | `37d05c7f71`, `c2f69edde2` | Org (`/ws/agent-org`) and collaboration-root (`/ws/agent-collaboration`) streams added. They call `connection.send` directly and have no egress, so no cadence applies (FU-002). No design spec records this as a decision. | `agent-org-stream-handler.ts` L56-93; `agent-collaboration-stream-handler.ts` L76-99 |
| 2026-09-30 | `6908ccff48` | Held-input recovery: `publishInputState()` after every dispatched batch. The large commit changed unit tests only. The integration test double had no `compactionRecovery`, so input-state publication failed inside that test and no `AGENT_INPUT_STATE` frame reached the socket: **the one test that would have caught the regression could not see it.** | `c29d502d6c` commit message; `git show 6908ccff48 --stat` |
| 2026-10-08 | `c29d502d6c`, `2613322c73` | Baseline-greening (I7) updated the double; the two cadence cases started failing and were reported as PB-001. The same commit made `captureMessages` drop `AGENT_INPUT_STATE` ("not part of this status/content contract"), which hides the trigger from the trace, and TESTING.md recorded a "Known exception". | `git show c29d502d6c`; `git log -S'baseline exception' -- TESTING.md` |
| 2026-10-17 | `7af116e8de` | Exception note removed from TESTING.md on the user's direction; the project-tool-split API/E2E engineer re-traced the cause. | Task context files |
| 2026-10-18 | — | Confirmed still valid on `2f211340ee`. | `evidence/repro-run-*.log` |

Contributing factors (not blame): (1) the cadence classifier fails closed. That is correct for ordering, but any new per-batch message type silently disables the cadence, and no test asserted "no non-content frame during a plain text burst". (2) The integration suite was not kept green before 2026-10-08, so a stale test double hid the regression. (3) Once known, the failure was parked as a documented exception for 10 days instead of becoming a Task. (4) The test comment calls `AGENT_INPUT_STATE` a companion while production treats it as a boundary.

### Stale documentation found (static reading, 2026-10-18)

| Doc | Stale statement | Current code | Follow-up |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` › Endpoints, Core Components | Lists only `/ws/agent` and `/ws/agent-team` | Also `/ws/agent-org/:orgRunId` and `/ws/agent-collaboration/:runId` (`src/api/websocket/agent.ts` L161, L182), with handlers `agent-org-stream-handler.ts` and `agent-collaboration-stream-handler.ts` | FU-003 |
| Same doc › Client-Bound Content Cadence; `docs/modules/agent_streaming.md` › WebSocket Content Egress | "Each connection owns one presentation-only egress"; "Each standalone or Team session owns one `AgentStreamWebSocketEgress`" | True for standalone only in effect: Team content is not coalescible (FU-001); Org and collaboration streams have no egress (FU-002) | FU-003 |
| Same doc | No statement about when `AGENT_INPUT_STATE` is published or how the cadence treats it | — | In scope (one sentence, design-spec) |

### Code-cleanliness observations in the touched area

| ID | Where | Observation | Disposition |
| --- | --- | --- | --- |
| CC-001 | `agent-run.ts` `inputStateEvent()` | Reads like a getter but advances `inputRevision`; it is called from publish, subscribe and the pull read `getInputStateSnapshot()`. That hidden side effect is why the fix needs careful published-revision bookkeeping. | In scope only as far as the fix needs; a split into "compute" and "advance" is a follow-up (FU-004) |
| CC-002 | `agent-run.ts` (7 call sites) | `this.reconcileRecovery(); this.publishInputState();` is repeated inline at several sites | FU-004 |
| CC-003 | `agent-status-websocket.integration.test.ts` `captureMessages` comment | Calls `AGENT_INPUT_STATE` a companion outside the contract; production treats it as a cadence boundary | Kept unchanged (REQ-005); the new AC-002/AC-003 case covers the gap; the comment wording is a follow-up for the test owner (FU-004) |
| CC-004 | Two content shapes | Standalone `SEGMENT_CONTENT` uses `id`; presentation/Team/collaboration use `segment_id` | Part of FU-001 |

## Requirement Implications

- The defect is current; the Task proceeds to fix (Done-when branch b).
- Unchanged repeats are client no-ops, so removing them changes nothing visible except restoring the cadence.
- Real changes must keep flushing pending content first (ordering), which rules out the "safe companion" option as the preferred correction.

## Notes For Architecture Design

- Scenarios to realize: SCN-001..SCN-004.
- Constraints: no weakening of the two cases; keep `captureMessages` filtering as is; keep scheduler classification; snapshot on subscribe unconditional.
