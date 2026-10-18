# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` SR-001, approved by Solution Designer within the direction (user informed in the Solution Designer conversation, 2026-10-18)
- Behavior-defining supplements and their approval references: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-state-content-cadence/tickets/in-progress/agent-input-state-content-cadence/investigation-notes.md`
- Authorities read (design reading gate; 2026-10-18): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root), `autobyteus-server-ts/AGENTS.md`, `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` (area contract named by DESIGN.md); `references/design-examples.md` not used.
- Project design-principle conflicts or discrepancies: None. DESIGN.md rule 5 ("remove unnecessary work before adding complexity") directly supports the chosen correction.

## Current-State Read

`AgentRun` (`autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`) owns the input-state projection: `inputStateEvent()` builds `{run_instance_id, revision, entries, recoverableBlock}` and bumps `inputRevision` only when the `{entries, recoverableBlock}` signature changes; `publishInputState()` broadcasts that event to all run listeners **unconditionally**. It is called after every dispatched canonical batch (`onCanonicalEventsDispatched`), on admission, dispatch result, recovery change and termination. `subscribeToEvents` delivers a snapshot to the new listener only. `getInputStateSnapshot()` (pull read for root/team/org views) can also advance the revision without a broadcast. All publishes and subscriptions run on the run's serialized `dispatchQueue`.

The agent WebSocket egress (`AgentStreamContentCadenceScheduler`) correctly treats `AGENT_INPUT_STATE` as an ordering boundary (flush pending content, then forward). Because the producer re-sends an already-delivered revision after every batch, every burst is flushed about 15 ms in instead of at the window end (BEH-001; evidence: repro runs 1-3, probe-trigger log). Clients already ignore same-revision frames (`agentInputStateHandler.ts`), so the repeats carry no information.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale and supporting evidence: one production file (`agent-run.ts`, two private methods + one field); tests in two existing test files; one sentence in the protocol doc. Feasibility proven by Probe B (7/7 integration, 2282 unit tests).
- Architectural risk: `Low`
- Risk rationale and supporting evidence: no schema, persistence, security, deployment or ownership change; frame shape and revision semantics unchanged; concurrency model unchanged (all paths already serialized on `dispatchQueue`). The only observable stream change is that redundant same-revision `AGENT_INPUT_STATE` frames stop, which every consumer already treats as a no-op (grep of all consumers, investigation notes).
- Escalation trigger if implementation or validation discovers new impact: a consumer that depends on repeated input-state frames; another non-companion frame that also flushes content in a real stream (RSK-002); any need to change the scheduler classification or frame schema → return `Design Impact` to Solution Designer.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Repro ×3 | `evidence/repro-run-{1,2,3}.log` | 2 failed / 5 passed every run | Defect current | None |
| Trigger probe | `evidence/probe-trigger-baseline.log` | Only early-flush trigger: `AGENT_INPUT_STATE` revision 1, already in the subscribe snapshot | Fix the producer's redundant repeat | None for the test path |
| Probe A | `evidence/probe-option2-integration.log` | "Skip if equal to last broadcast" still fails: snapshot delivery is not counted | Track delivered revision including snapshots | None |
| Probe B | `evidence/probe-option2b-*.log` | Delivered-revision rule: 7/7 ×2, 2282 unit tests pass | Chosen design | Real-stream behavior (RSK-002) |
| Consumers grep | investigation notes Source Log | No heartbeat use; web dedupes by revision | Suppression is client-invisible | None |

## Intended Change

`AgentRun` broadcasts an input-state revision at most once to its current listeners. A snapshot that produces a revision new to existing listeners also broadcasts it, so nobody misses it. The cadence scheduler, frame schema and client stay unchanged.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002. `AgentRun` input-state publication (`agent-run.ts`); AgentRun unit tests; one new producer-to-socket integration case that does **not** filter `AGENT_INPUT_STATE`; one sentence in `docs/design/agent_websocket_streaming_protocol.md` (Client-Bound Content Cadence).
- Deliberately left alone: `AgentStreamContentCadenceScheduler` classification (it is correct to treat a real input-state change as a boundary); the two existing cadence cases and `captureMessages` (REQ-005, unweakened); team projector and collaboration adapter (they benefit automatically, no change needed); web client; input admission/recovery logic.
- Follow-ups:
  - FU-001: team-stream `SEGMENT_CONTENT` carries `segment_id` (strict presentation schema, since `57ab99fcc4`, 2026-08-11), but `isCoalescibleStreamContent` requires `payload.id`, so team-member content is apparently never coalesced on `/ws/agent-team/:teamRunId`. Static evidence only: `stream-content-coalescing.ts` L10-18, `agent-presentation-message-dtos.ts` L92, `team-agent-event-websocket-projector.ts` L84. Suggested Task: "Verify and fix the team-stream content cadence: team SEGMENT_CONTENT frames use `segment_id`, which the egress coalescer does not recognize; add a team-socket cadence integration case."
  - FU-002: `/ws/agent-org` and `/ws/agent-collaboration` (delegated child agents of a standalone run) send directly without any egress, so the Live response streaming setting does not apply there. No recorded decision. Product question for the user: should every chat surface honour the setting?
  - FU-003: stale streaming docs (`agent_websocket_streaming_protocol.md` endpoints/components/cadence scope; `docs/modules/agent_streaming.md` egress scope). Details are in investigation notes › Stale documentation found.
  - FU-004: `AgentRun` input-state cleanup: split the revision-advancing side effect out of `inputStateEvent()` (CC-001), consolidate the repeated `reconcileRecovery(); publishInputState();` pairs (CC-002), and correct the `captureMessages` comment (CC-003).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | REQ-001, REQ-005 / AC-001, AC-002, AC-005 | Agent streams text | Unchanged input state re-sent per batch, flushes content | No repeat of a delivered revision | DS-001 |
| BEH-002 | User | REQ-002, REQ-004 / AC-003 | User posts/queues a message | New revision broadcast and flushes earlier content | Preserved | DS-002 |
| BEH-003 | Contract | REQ-003 / AC-004 | Socket subscribes/reconnects; pull snapshot | Snapshot to new listener | Preserved; snapshot-produced revisions also reach existing listeners | DS-003 |
| BEH-004 | System | REQ-004 / AC-005, AC-006 | Boundaries | Flush-then-forward | Preserved (scheduler untouched) | DS-001 |
| BEH-005 | Operational | REQ-005 / AC-001 | Interval setting change | Observable again | Preserved | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `evidence/` | Repro and probe logs | REQ-001..005 | Feasibility and root-cause basis | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes` (narrow)
- Structural triggers: none fire. Repeated coordination: the publish rule lives in one owner (`AgentRun`). Authoritative boundary: no caller bypasses `AgentRun`; the egress is not changed. Empty indirection: no new layer. Responsibility overload: two private methods in the existing owner; `agent-run.ts` does not take on a new concern.
- Root cause classification: `Missing Invariant` — `AgentRun` owns the revisioned projection but does not enforce "publish a revision once", so a redundant frame reaches a consumer that rightly treats input-state changes as boundaries.
- Refactor needed now: `No`
- Evidence: Probe B; current code L160-166, L414-430.
- Design response: enforce the invariant in the owner (delivered-revision rule).
- Refactor rationale: the owner and boundaries are right; only the invariant is missing.
- Intentional deferrals and residual risk: FU-001 (team coalescing, separate cause).

## Terminology

- *Published input revision*: the highest input-state revision that every current listener of the run has received.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: None. The unconditional broadcast is replaced in place.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`

## Persisted Data / State Transition Decision

- Decision: `Not Affected` — the input-state projection is in-memory per live run; nothing is stored.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-004, BEH-005 | Runtime emits a delta batch | Coalesced frame on the client socket | `AgentRun` (events) / egress (cadence) | The broken path |
| DS-002 | Primary End-to-End | BEH-002 | User posts/queues a message | Client shows pending/dispatched input | `AgentRun` | Must stay immediate and ordered |
| DS-003 | Bounded Local | BEH-003 | `subscribeToEvents` / `getInputStateSnapshot` | Listener has current revision | `AgentRun` | Snapshot-advanced revisions |

## Primary Execution Spine(s)

- DS-001: `Runtime backend batch -> AgentRun.publishSourceEvents -> listeners (AgentStreamHandler.forwardRunEvent) -> AgentStreamWebSocketEgress -> CadenceScheduler (hold for window) -> client socket`; then `onCanonicalEventsDispatched -> AgentRun.publishInputState -> (revision already published: no event)`.
- DS-002: `Client postUserMessage -> AgentRun.postUserMessage (admission, revision++) -> publishInputState (new revision: broadcast) -> egress (flush pending content, forward) -> web agentInputStateHandler`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Deltas reach the egress and wait for the window; the post-batch input-state check finds the revision already published and sends nothing, so the window holds | AgentRun, egress scheduler | AgentRun / scheduler | Revision bookkeeping |
| DS-002 | A real queue change produces a new revision, which is broadcast at once; the scheduler flushes earlier content before it | AgentRun, egress, web handler | AgentRun | — |
| DS-003 | On subscribe, if the current revision is new to existing listeners, it is broadcast to them first; then the new listener gets its snapshot | AgentRun | AgentRun | — |

## Spine Actors / Main-Line Nodes

Runtime backend; `AgentRun`; `AgentStreamHandler`/`AgentStreamWebSocketEgress`; `AgentStreamContentCadenceScheduler`; web stream projector.

## Ownership Map

- `AgentRun`: owns input-state revision, signature and (new) the published revision; owns listener fan-out and ordering via `dispatchQueue`.
- Egress/scheduler: owns per-connection cadence and boundary classification (unchanged).
- Web handler: owns client projection and revision dedupe (unchanged).

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — no facade involved.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Unconditional broadcast in `publishInputState` | Re-sends delivered revisions | Delivered-revision rule in the same method | In This Change | No dead code found in `agent-run.ts` input-state methods |

## Return Or Event Spine(s) (If Applicable)

Covered by DS-001/DS-002 (event fan-out is the path).

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AgentRun`. DS-003: `dispatchQueue task -> reconcileRecovery -> inputStateEvent (maybe revision++) -> [revision > published: broadcast to existing listeners, published = revision] -> add listener -> deliver snapshot`. It matters because a revision produced here (or by a pull read) would otherwise never reach existing listeners.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Published-revision bookkeeping (one field) | DS-001..003 | AgentRun | Decide "new to listeners?" | Enforce publish-once invariant | Placing it in the egress would need per-connection state and would not help team/collaboration consumers |

## Ownership Boundaries

`AgentRun` is the authoritative producer of input-state events; consumers depend on it only through listeners and `getInputStateSnapshot()`. The publish-once rule stays inside `AgentRun`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRun.subscribeToEvents` / listeners | revision, signature, published revision | AgentStreamHandler, collaboration adapter, team projector | Consumers deduping or filtering input state themselves | N/A |

## Dependency Rules

Unchanged. Egress must not learn about input-state revisions; `AgentRun` must not learn about cadence.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentRun.subscribeToEvents(listener)` | run event stream | Snapshot + live events | — | Behavior refined per DS-003 |
| `AgentRun.getInputStateSnapshot()` | input state | Pull read | — | Unchanged; may advance revision, broadcast on next publish |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `subscribeToEvents` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| New field | `publishedInputRevision` | Yes | Low | Comment: "highest revision every current listener has received" |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Publish-once rule | `AgentRun` revision/signature | Extend | Owner already computes revisions | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/domain` | Input-state publication | DS-001..003 | AgentRun | Extend | — |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent-execution/domain/agent-run.ts` | agent-execution | AgentRun | Publish-once rule | Existing owner | Yes (`inputStateEvent`) |

## Reusable Owned Structures Check

N/A — no repeated structure introduced.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentInputStateDto` | Yes | Yes | Low | Unchanged |

## Final File Responsibility Mapping

Same as draft.

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | File (Modify) | AgentRun | Add `publishedInputRevision`; `publishInputState` skips an already-published revision; `subscribeToEvents` broadcasts a snapshot-produced new revision to existing listeners before delivering the new listener's snapshot | Owner of the projection | Cadence or transport knowledge |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run.test.ts` | File (Modify) | — | AC-002 (unit level), AC-004 (a, b) | Existing AgentRun tests | — |
| `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts` | File (Modify: add one case only) | — | AC-002/AC-003 at socket level with a capture that keeps `AGENT_INPUT_STATE`; existing 7 cases unchanged | Existing producer-to-socket harness | Changes to existing cases or `captureMessages` |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | File (Modify) | — | One sentence in "Client-Bound Content Cadence": `AGENT_INPUT_STATE` is sent only for a revision the subscriber has not received; a new revision is a boundary that flushes earlier content | Area contract | — |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-execution/domain` | Main-Line Domain-Control | Yes | Low | Unchanged |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Publish-once | `const event = this.inputStateEvent(); const revision = event.payload.revision; if (revision === this.publishedInputRevision) return; this.publishedInputRevision = revision; dispatchRuntimeEvent({ listeners: this.listeners, event, … });` | Comparing against a "last broadcast" value that ignores snapshot delivery (Probe A fails) | Snapshot already carries revision 1 to the socket |
| Subscribe | In the queued task: `reconcileRecovery(); const event = inputStateEvent(); if (revision !== published) { published = revision; broadcast(event) to existing listeners } listeners.add(listener); listener(event)` | Broadcasting after adding the listener (double delivery to the new listener) or never broadcasting (existing listeners miss it) | DS-003 correctness |
| Fix location | Producer `AgentRun` | Adding `AGENT_INPUT_STATE` to `SAFE_COMPANION_TYPES` | Would forward real queue changes ahead of older pending text (BEH-002/BEH-004) and keep sending redundant frames |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep sending unchanged frames for "safety" | Some consumer might rely on them | Rejected | No consumer relies (grep); clients dedupe by revision |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Add the AgentRun unit tests (AC-002 unit, AC-004 a/b); they fail on base for the redundant-repeat case.
2. Implement the publish-once rule in `agent-run.ts`.
3. Add the socket-level case that keeps `AGENT_INPUT_STATE` (no repeat during a burst; a posted/queued message mid-window gives an immediate new revision after the pending content).
4. Run the cadence file ≥3 times, server `test:unit`, `test:integration`, `typecheck`, web `agentInputStateHandler` spec.
5. Update the protocol doc sentence.
6. Downstream: real-stream regression proof (AC-005) and isolated-instance check per TESTING.md.

## Key Tradeoffs

- Producer fix vs scheduler fix: the producer fix removes the cause and keeps strict ordering for real changes; the scheduler fix would be one line but reorders real changes and leaves redundant traffic. Chosen: producer fix (DEC-001).

## Risks

- RSK-001 (snapshot-advanced revisions) — handled by DS-003 and the pull-read rule; covered by AC-004.
- RSK-002 (other flush triggers in real streams) — covered by AC-005; if found, return `Design Impact`.

## Guidance For Implementation

- Keep the change inside `AgentRun`; do not touch the scheduler, mapper, projector or client.
- Do not modify the 7 existing cases or `captureMessages`.
- Termination paths call `publishInputState()` too; the rule applies uniformly (a terminal change produces a new revision and is still sent).
