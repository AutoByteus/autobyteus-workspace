# Design Review Report — autobyteus-646 Runtime fallback on a usage limit

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/usage-limit-fallback-646/requirements-doc.md` (Approved, SR-003)
- Upstream Investigation Notes: `tickets/in-progress/usage-limit-fallback-646/investigation-notes.md`
- Upstream Solution Revision Record: `tickets/in-progress/usage-limit-fallback-646/solution-revision-record.md` (SR-001 … SR-003)
- Reviewed Design Spec: `tickets/in-progress/usage-limit-fallback-646/design-spec.md` (Ready, SR-003)
- Supplemental Task Artifacts Reviewed: None (no supplements); `handoff-architecture-review.md`; `follow-ups.md` (FU-646-01)
- Relevant Solution Revision IDs: SR-001 … SR-003
- Architecture Review Revision Record: `tickets/in-progress/usage-limit-fallback-646/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer handoff "Architecture Design Complete", `Large`/`High`, 2026-11-27. The founder approved the data contract and policy; the router template text (C-7) is pending him and does not block this review.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/usage-limit-fallback-646`, branch `codex/usage-limit-fallback-646` at `214300a403` (ticket docs only). Code read at the base `bc4351cad7` with `git show`:
  - `agent-execution/domain/agent-run-lifecycle-observer.ts`; `agent-run-platform-notices.ts:66-90`; `agent-run.ts:210-235`; `events/dispatch-processed-agent-run-events.ts`;
  - Codex: `events/codex-thread-lifecycle-event-converter.ts:48-105`, `events/codex-turn-event-converter.ts:56-85`, `thread/codex-thread-notification-handler.ts:75-110`;
  - `agent-collaboration/execution/backends/configured-agent-execution-handle.ts:200-265, 342, 394`; `configured-agent-activation-planner.ts:54-88`;
  - the callers of `replaceSelection` / `releaseRuntimeForUserStop`;
  - `standalone-agent-run-lifecycle-service.ts:227, 263`; `standalone-stopped-run-selection-updater.ts`; `delegated-run-idle-shutdown.ts:50-85`;
  - `docs/modules/model_routing.md:33-49`.

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`:
  - automatic stopping and switching of live runs (the shared run lifecycle);
  - new persistence;
  - the CM-12 layer order;
  - a built-in agent's instructions;
  - concurrency.
- Independent Architecture Review required by the classification: `Yes`.
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`, with one inconsistency in the requirements text (AR-005).
- Approved requirements / intended behavior understood:
  - A terminal usage-limit failure is recognized (REQ-001) and published as a run event on a node hub, with listeners reacting (REQ-009).
  - The exhaustion is remembered until its reset, or 1 h when no reset is known (REQ-002, DEC-006).
  - New delegations skip an exhausted default (REQ-003).
  - The fallback is chosen by the Model Router, else by history (REQ-004, DEC-001/004).
  - The run switches with the existing hand-over and gets a continue message (REQ-005), with one notice row (REQ-006).
  - With no usable fallback, the run stays in Error with the list (REQ-007).
  - No loops (REQ-008).
  - This covers every run, Team and Org members included (DEC-003), is on by default (DEC-002), and does not switch back (DEC-005).
- Relevant existing behavior and evidence confirmed:
  - A node-level observer of every published run exists: `AgentRunManager` → `AgentRunLifecycleObserver.runPublished`, fanned out by `AgentRunPlatformNotices` to its sources. `AgentRun.subscribeToEvents` gives each run's events.
  - Listeners are delivered synchronously inside the run's dispatch queue (`dispatch-processed-agent-run-events.ts`, `deliver(event)` not awaited).
  - Codex `ERROR` carries `error_scope`/`error_effect`; the converter drops `codexErrorInfo` (`codex-thread-lifecycle-event-converter.ts:52-101`), as C-4 says.
  - Standalone: a run is stopped quietly with `agentRunManager.tryPrepareAgentRunTerminationIfQuiescent(run)` (what idle shutdown uses, `delegated-run-idle-shutdown.ts:68-75`), without `terminatedAt`. The activation reads `metadata.pendingRuntimeSwitch` and runs `activateSwitched` with the hand-over (`standalone-agent-run-lifecycle-service.ts:227, 263`).
  - Members: the handle starts a switch from `execution.pendingRuntimeSwitch` (`configured-agent-activation-planner.ts:54-56`; handle `:394`). The handle offers `releaseRuntimeForUserStop()` and `replaceSelection(selection)` (only while stopped) (`:214-228`), but **neither has a production caller today**: no Team or Org code switches one member of a live root (see AR-001).
  - The delegation layer order is own default → team default → router (on) → delegator's launch → refuse (`model_routing.md:33-49`).
- Scope guardrail confirmed: UC-001…004 are in scope. Out of scope: several accounts, native API limits, switch-back, router changes beyond DEC-004, the cost budget (FU-646-01). Preserved: the switch and hand-over semantics, CM-6/7, routing decision records, the CM-12 layer order.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (AR-001 → REQ-005, DEC-003, AC-003; AR-002 → BEH-002 preserved column, REQ-003; AR-003 → REQ-008, AC-004; AR-004 → REQ-009, REQ-001).
- Remaining material ambiguity: AR-005 (requirements text).
- Statements about existing code: the cited facts match. The design does not name the existing primitives its central new operation relies on (AR-001).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Fail | Needs Correction | AR-003 (duplicate terminal errors per turn), AR-004 (where the detector attaches) |
| BEH-002 | System | Fail | Pass | Fail | Needs Correction | AR-002 (the history layer's scope against the preserved CM-12 order) |
| BEH-003 | User/System | Pass | Pass | Fail | Needs Correction | AR-001 (switching a live run, a member above all, is not specified) |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present; root cause; refactor decision | Pass | Feature: a new subsystem plus a launch-check change; the cause is measured (notes §1) | — |

## Data Contract Verdict

| Record / Message | Each Field Has A Meaning, A Writer And A Reader? | Identities, Relationships And Lifecycle Are Explicit? | Each In-Scope Flow Walked Through It, With An Example Per Case? | Checked Against Existing Data And Real Dependencies? | The Layers Above Follow It Without Mappings, Recomputed Facts Or Second Copies? | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| C-1 run event + C-1b hub rules | Pass | Fail | Pass | Pass (Codex schema; limits fixtures) | Pass | Fail: AR-003. C-1 has no identity of the failure it reports, and nothing says one failed turn publishes once. Codex emits up to three terminal `ERROR`s for one failed turn |
| C-2 switch record | Pass | Pass | Pass | N/A (new) | Pass | Pass |
| C-3 exhaustion (derived) | Pass | Pass | Pass | Pass | Pass | Pass (one stored fact, one owner). See Residual Risks for how far back the view reads |
| C-4 `error_kind` | Pass | Pass | Pass | Pass | Pass | Pass |
| C-5 notice, continue message, error notice | Pass | Pass | Pass | N/A | Pass | Pass |
| C-6 setting | Pass | Pass | Pass | N/A | Pass | Pass |
| C-7 switch request and tool | Pass | Pass | Pass | N/A | Pass | Pass (the template text is pending the founder) |
| C-8 launch history (derived) | Pass | Pass | Pass | Pass (counted on the Mac) | Pass | Pass |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 detect | Pass | Pass | N/A | Pass | Fail | Pass | Fail (AR-004: the spine starts at "observes every published run" without the attach point or the detached execution; AR-003: no once-per-turn rule) |
| DS-002 publish | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 switch | Pass | Fail | N/A | Pass | Fail | Pass | Fail (AR-001: `root.switchAgentRuntime` is one node standing for an unspecified sequence per root kind; AR-003: no in-flight guard per run) |
| DS-004 delegate | Pass | Fail | N/A | Pass | Pass | Pass | Fail (AR-002) |
| DS-005 exhaustion | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RunEventHub` | Pass | Pass | Pass | Pass | Detectors get a narrowed `publish` |
| `RunRuntimeSwitcher` → root `switchAgentRuntime` | Pass | Fail | Pass | Fail | AR-001: which internals of each root (handle, selection, persistence) the operation drives is not stated |
| `FallbackChooser` | Pass | Pass | Pass | Pass | One owner for the router and history layers |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-events/` (depends on nothing above it; the composition subscribes listeners) | Pass | Pass | Pass | Pass | — |
| Detector → `AvailableAgentRuntimesService` (one runtime) | Pass | Pass | Pass | Pass | — |

Composition root / Principle 16: `Pass` (the composition builds the hub and subscribes listeners; detectors receive `publish`).

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `RunEventHub.publish/subscribe` | Pass | Pass | Pass | Low | Pass |
| `RuntimeExhaustionView.isExhausted` | Pass | Pass | Pass | Low | Pass |
| `RunRuntimeSwitcher.switchAgentRuntime(agentRunId, launch, notice)` | Pass | Pass | Pass | Low | Pass (the root side is AR-001) |
| `FallbackChooser.choose` | Pass | Pass | Pass | Low | Pass |
| Router tool `submit_runtime_switch` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass`.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Observing every run | Fail | N/A | N/A | Fail | AR-004: `AgentRunLifecycleObserver.runPublished` (fanned out by `AgentRunPlatformNotices`) exists and is the natural attach point; the design doesn't name it |
| Runtime switch and hand-over | Pass | Pass | N/A | Pass | Reused (pending switch, `activateSwitched`, `ConfiguredAgentSwitchAttempt`) |
| Quiet stop | Fail | N/A | N/A | Fail | AR-001: standalone has `tryPrepareAgentRunTerminationIfQuiescent`; members have the unused `releaseRuntime*`/`replaceSelection`. The design names neither |
| Usage limits | Pass | Pass | N/A | Pass | `AvailableAgentRuntimesService` |
| Router queue | Pass | Pass | N/A | Pass | `RoutingRequestQueue` |
| JSONL log with sealing | Pass | Pass | N/A | Pass | As the routing decision log |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-events/` (new) | Pass | Pass | Pass | Pass | — |
| `model-routing/` (chooser, switch records, request, tool) | Pass | Pass | Pass | Pass | — |
| Root kinds (`switchAgentRuntime`) | Fail | Pass | Pass | Fail | AR-001 |
| `launch-preferences/` + `CollaboratorLaunchResolver` | Pass | Pass | Fail | Fail | AR-002 |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Fallback choice (switch + delegation) | Pass | Pass | Pass | Pass | `FallbackChooser` used by both |
| JSONL sealing log | Pass | Pass | Pass | Pass | — |

## Shared Structure Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-1 envelope + per-kind `data` | Pass | Pass | Pass | Pass | Pass | Trimmed with the founder; an envelope with per-kind data, not optional-field soup |
| C-2 | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers: `Pass`. Vocabulary (P15): `Pass` ("usage limit", "exhausted" and "switch" are defined; "run event" is distinct from per-run streams and platform notices).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New `run-events/*`, `model-routing/services/fallback-chooser.ts`, `stores/switch-record-log.ts`, `run-history/services/agent-launch-history.ts`, `agent-collaboration/execution/services/run-runtime-switcher.ts` | Pass | Pass | N/A | Pass | — |
| Root files (three kinds), member handle, Team/Org persistence | Fail | Pass | N/A | Fail | AR-001: the touched root, handle and persistence files are not named |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-events/` with `detectors/` and `listeners/` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| "Blocked check only with routing on" for exhaustion | Pass | Pass | Pass | Pass | Live blocked and signed-out reads stay tied to routing |
| Unused member `releaseRuntimeForUserStop` / `replaceSelection` | N/A | N/A | N/A | Pass | They become used if AR-001 adopts them; otherwise the implementer's touched-file check decides |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| New subsystem and records | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `run-events/`, `switches_*.jsonl`, setting | `Not Affected` (new; absent setting = on) | Pass | Pass | N/A | Pass | — |
| A live member's pending switch and new selection in the Team/Org tree | Not stated | Fail | N/A | N/A | Fail | AR-001 |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Eleven steps | Pass | Pass | Pass | Pass (step 5 is where AR-001's sequence lands) |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| C-1, C-2, C-5, C-7 shapes and texts | Yes | Pass | N/A | Pass | — |
| Switching one live member (the review's focus) | Yes | Fail | N/A | Fail | AR-001 |

## Material Premise Validation (Only When Needed)

### `MP-001` — One failed Codex turn produces more than one terminal `ERROR`

- Related approved requirement: REQ-008 ("at most one switch per runtime per turn"), AC-004 ("no loop"), REQ-005 (one continue message).
- Initiating basis kind: `System`. A Codex turn fails on the usage limit, the incident's case.
- Forward path (current code), one failed turn can yield:
  - the `error` notification → `ERROR` terminal with that `turn_id` (`codex-thread-notification-handler.ts:101-110`; the converter `:52-101`);
  - `turn/completed` with status `failed` → `ERROR` `CODEX_TURN_FAILED` terminal (`codex-turn-event-converter.ts:69-77`);
  - a thread status `error`/`failed` → `ERROR` `CODEX_THREAD_STATUS_FAILED` terminal (`codex-thread-notification-handler.ts:75-91`).
  The design's detector decides "usage limit" by `error_kind`, or by reading the limits after any terminal turn error. So each of these events can be detected and published.
- Consequence: two or three C-1 events for one failure. The switch listener handles each: the second picks the same fallback (the first runtime is now exhausted) and calls `switchAgentRuntime` again while the first switch is in flight. That risks a second continue message or a second hand-over for one turn. The exhaustion view, the design's only loop guard, does not stop this.
- Reachability: `Reachable`.
- Review consequence: AR-003.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| AC-003 says "the same input runs on the fallback"; REQ-005 and C-5 say the input is not sent again, and a continue message is sent | Tests are written from the AC | AR-005 | Open |

## Review Decision

`Fail`.

## Findings

### AR-001 — Switching a live run, and one member of a live Team or Org, is not specified

- Type: `Design Impact`; severity: High.
- Protects: REQ-005 and AC-003 (switch and continue, through the existing hand-over); DEC-003 (every run, Team and Org members included); the preserved switch semantics.
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Problem: the review's focus is one line: "in its gate: stop the agent quietly …, write the pending switch for that agent, post the notice". It doesn't state the existing primitives, their order, who drives it, or where state is persisted:
  - **Standalone:** the primitives exist. Quietly terminate the host with `agentRunManager.tryPrepareAgentRunTerminationIfQuiescent(run)`, as idle shutdown does, with no `terminatedAt`. Write `pendingRuntimeSwitch` into `run_metadata.json` (the stopped-run selection path). The next input runs `activateSwitched` with the hand-over. The design names none of these, nor how a host just released is "stopped" for the selection writer while its root stays registered.
  - **Team/Org member:** nothing does this today. The handle has `releaseRuntimeForUserStop()` / `releaseRuntime(false)` and `replaceSelection({…, pendingRuntimeSwitch})` (only while stopped), but they have no production caller. `replaceSelection` changes only the handle's in-memory `execution`. The design does not say:
    - which owner writes the member's pending switch, and its new runtime and model after the hand-over, into the live Team's or Org's tree on disk;
    - so what a restart mid-switch, or after it, restores the member on;
    - how the member's handle is re-activated within the root's gate.
- Required update: write the sequence per root kind, with one driver (the root, in its gate), the primitives in call order and the persistence owner. For example, for a member:
  1. verify the member is quiet;
  2. `releaseRuntime(false)`;
  3. `replaceSelection` with the pending switch;
  4. persist the member's execution spec in the tree through the root's persistence coordinator;
  5. `postMessage(continue notice)`.
  - State what happens to the root's other members, and to the switched member's Error status meanwhile.
  - Name the touched files and add the tests (a live Team member switch, then a restart).
- Why proportionate: it uses existing primitives; the missing parts are the order and the persistence owner.
- Recipient: Solution Designer.

### AR-002 — The history layer's scope in the delegation order is not stated

- Type: `Design Impact`, or a `Requirement Gap` if the wider scope is intended; severity: Medium.
- Protects: BEH-002's preserved column ("the layer order of CM-12 / model_routing.md"); REQ-003.
- Problem:
  - Today: own default → team default → router (when on) → the delegator's launch → refuse (`model_routing.md:33-42`).
  - The design inserts history before the delegator's launch (DS-004; Policy 7) but doesn't say whether that holds only when a default was skipped **because it is exhausted** (REQ-003), or for every skip (runtime not installed, model missing, blocked with routing on).
  - The second would change the preserved order for cases this ticket does not ask about.
  - It also doesn't say whether the team's default (layer 2) is checked for exhaustion too.
- Required update: state the layer order exactly. One option: own default and team default, each skipped when unusable or exhausted → router (on) → history, only when a default was skipped as exhausted → the delegator's launch → refuse. If history is meant for every skip, it goes to the founder as a change to the preserved CM-12 order.
- Recipient: Solution Designer.

### AR-003 — One failure must publish once and switch once

- Type: `Design Impact`; severity: Medium.
- Protects: REQ-008, AC-004, REQ-005 (one continue message).
- Problem: MP-001. Several terminal `ERROR`s for one failed turn become several C-1 events, and the switch listener has no guard per run.
- Required update: name one rule and its owner. For example, the detector publishes at most once per `(agentRunId, turn_id)` (Codex carries `turn_id`; for others, once per failed turn by their own boundary). The switch listener keeps at most one switch in flight per `agentRunId` and ignores an event for a run already switching. Add a test with the three Codex events.
- Recipient: Solution Designer.

### AR-004 — DS-001's start: where the detector attaches, and that it runs detached

- Type: `Design Impact`; severity: Low.
- Protects: REQ-009, REQ-001; Principle 4 (capability reuse).
- Problem:
  - "Observes every published run of a collaboration root" names no mechanism. The natural one exists: a source on `AgentRunLifecycleObserver.runPublished` (fanned out by `AgentRunPlatformNotices`), then `run.subscribeToEvents`, released on `runReleased`.
  - Run listeners are delivered synchronously inside the run's dispatch queue. The detector's limits read (up to 18 s), the publish and the listeners (a 40 s router wait, then stopping this same run) must therefore run detached from the dispatch, never awaited inside it.
- Required update: name the attach point, and state that detection runs detached and outside the run's gate. Note which `AgentRunManager`s it observes: the node's, not an application execution scope's (whose runs are excluded anyway).
- Recipient: Solution Designer.

### AR-005 — Requirement and design texts disagree on the failed input and the basis

- Type: `Requirement Gap` (text); severity: Low.
- Problem:
  - AC-003 says "the same input runs on the fallback". REQ-005 and C-5 say the input is not sent again, and a continue message is sent instead.
  - The design's basis line still says "requirements SR-002 … DEC-002/003/005/006 to be confirmed", while the requirements are Approved at SR-003 with those decisions accepted.
- Required update: correct AC-003 to REQ-005's wording, and the design's basis line.
- Recipient: Solution Designer.

## Classification

`Design Impact` (AR-001, AR-002, AR-003, AR-004) and `Requirement Gap` (AR-005, and AR-002 if its wider scope is intended). Route: Solution Designer.

## Recommended Recipient

Solution Designer.

## Residual Risks

- **The router template (C-7)** is a built-in agent's instructions pending the founder (lesson L1). Implementation must not ship text he has not seen.
- **The exhaustion view's rebuild window.** It reads "recent" events at startup, but weekly limits (Claude, Codex) last up to 7 days, and the log seals at 4 MB. State the window (for example, events whose `resetAt`, or `at + 1 h`, is still in the future, across the sealed files) so a restart doesn't forget a week-long exhaustion.
- **A limits read after every terminal turn error** on non-Codex runtimes (up to 18 s, 0 tokens) runs for unrelated errors too. That is acceptable, but log its outcome.
- **A burst of events** queues behind the one-at-a-time router; each falls back to history after 40 s (as designed).
- **Non-Codex recognition** depends on the limits read after the error (design Risks); API/E2E uses recorded payloads.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass`. MP-001 is reachable, with a forward witness from current Codex code.
- Notes: The data contract is sound and trimmed: C-1 envelope with per-kind data, C-2, C-3 derived from one stored fact, and C-4…C-8. So are the hub's rules, router first with history as the safety net, the dependency direction and the switch records. The blocking gaps:
  - the central new operation (switching a live run, a Team/Org member above all) has no specified sequence or persistence owner;
  - the history layer's scope against the preserved CM-12 order;
  - one failure must publish once and switch once;
  - DS-001's attach point.
