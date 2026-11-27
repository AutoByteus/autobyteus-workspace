# Design Review Report — autobyteus-646 Runtime fallback on a usage limit

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/usage-limit-fallback-646/requirements-doc.md` (Approved, SR-003; AC-003 corrected at SR-004)
- Upstream Investigation Notes: `tickets/in-progress/usage-limit-fallback-646/investigation-notes.md`
- Upstream Solution Revision Record: `tickets/in-progress/usage-limit-fallback-646/solution-revision-record.md` (SR-001 … SR-009)
- Reviewed Design Spec: `tickets/in-progress/usage-limit-fallback-646/design-spec.md` (Ready, SR-004; § SR-004 Revisions governs)
- Supplemental Task Artifacts Reviewed: None (no supplements); `handoff-architecture-review.md`; `follow-ups.md` (FU-646-01)
- Relevant Solution Revision IDs: SR-001 … SR-009
- Architecture Review Revision Record: `tickets/in-progress/usage-limit-fallback-646/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4
- Trigger: Solution Designer handoff "Architecture Design Complete", `Large`/`High`, 2026-11-27. The founder approved the data contract and policy; the router template text (C-7) is pending him and does not block this review.
- Prior Review Round Reviewed: 3 (ARCH-REV-003, `Fail` at the 9-point bar); rounds 1–2
- Latest Authoritative Round: 4
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
| BEH-001 | System | Pass | Pass | Pass | Confirmed | AR-003, AR-004 resolved (R-3, R-4) |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | AR-002 resolved (R-2: CM-12 order preserved; history only after an exhaustion skip) |
| BEH-003 | User/System | Pass | Pass | Pass | Confirmed | AR-001 resolved (R-1) |
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

## Round 2 Delta Review (SR-004, commit `b40ee8d202`)

This delta supersedes the round-1 `Fail` cells in the verdict tables above. They now pass:
- Data Contract C-1;
- DS-001, DS-003, DS-004;
- the `RunRuntimeSwitcher` boundary;
- the reuse rows "observing every run" and "quiet stop";
- the root-kind and launch-preference allocation;
- the root files' mapping;
- the live member's persistence;
- the live-member example.

Code checked at `bc4351cad7` for this round:
- `agent-org-execution/container/live-agent-org-container.ts:131-132`; `agent-org-unit-runs.ts:11-25`;
- `active-collaboration-root-directory.ts:159-170`;
- `flat-team-execution-manager.ts:165-185, 218-225`;
- `configured-agent-execution-handle.ts:264-300, 404-414, 478`;
- `team-agent-platform-binding-committer.ts:28-30`, `team-run-selection-mutator.ts`, `team-run-execution-tree-mutator.ts`, `team-membership-committer.ts:102`.

| Finding | SR-004 response | Verification | Status |
| --- | --- | --- | --- |
| AR-001 | R-1: two root kinds, each in its own gate. Agent root: quiet stop → `StandaloneStoppedRunSelectionUpdater` (`run_metadata.json` pending switch) → continue notice (`activateSwitched`). Team root: the member handle's `tryPrepareTerminationIfQuiescent` → new `TeamMemberRuntimeSwitchCommitter` on `persistence.commitExecutionTreeMutation` (launch + `pendingRuntimeSwitch` in the live tree, then `replaceTree`) → `handle.replaceSelection` → `post_message` → the existing member switch in `initializeReady`. Restart consistency and failure outcomes are stated | The premise "an Org container claims no unit agent" holds now, not only in implementation: `LiveAgentOrgContainer.hasAgentExecution()`/`ownsAgentRun()` return `false` (`:131-132`), and units are ordinary Agent or Team runs (`agent-org-unit-runs.ts`). A member's quiescent termination does not fence the handle: `onFinished` only clears `agentRun` and disposes (`:478`); the fence is set only by `cancelActivation`/`fenceForRootShutdown`. So `isStopped()` → `replaceSelection` is allowed, and `post_message` reactivates through `initializeReady` with the pending switch. The tree mutation reuses the existing committer pattern (`team-agent-platform-binding-committer.ts`, `team-membership-committer.ts:102`) | Resolved |
| AR-002 | R-2: the CM-12 order is preserved. Exhaustion is checked on every layer's launch (own, team, inherited). History is used only when a layer was skipped as exhausted and the router did not choose. Other skips keep today's order | Matches REQ-003 and BEH-002's preserved column | Resolved |
| AR-003 | R-3: the detector publishes once per `(agentRunId, turn_id)` (bounded set, cleared on release; without a `turn_id`, once per run and second). The switch listener keeps one switch in flight per run; a second event is recorded, not acted on | Covers the three Codex events of one turn | Resolved |
| AR-004 | R-4: a `runPublished` source in `AgentRunPlatformNotices`' fan-out, then `subscribeToEvents`; the listener records the facts and schedules the work detached; collaboration-root runs only (`placeOf`); a debug log for unrelated limits reads | Matches `agent-run-lifecycle-observer.ts` and the synchronous delivery | Resolved |
| AR-005 | AC-003 now says continue notice, no re-send; the design's basis line updated | — | Resolved |
| Residuals | R-5: the exhaustion view reads the sealed files newest first, up to 31 days back, keeping events still in force. R-6: the router template is added only after the founder's approval is recorded | — | Taken in |

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Round 3 Re-Review (ARCH-REV-003, SR-004 at `b40ee8d202`): the 9-point bar

**Why a third round.** The user asked for an honest quality score and set the bar for architecture at 9 out of 10. Round 2 passed SR-004 as workable. Measured against 9, it is about **7.5**. Under the rule "rulings hold unless new evidence shows a problem", this round names the evidence:
- AR-006 rests on defects found today at base;
- AR-007…AR-009 are quality gaps the raised bar does not accept. I say so in each finding rather than calling them defects.

**Honest assessment.**
- Strong, and unchanged by this round:
  - the run event hub (the run reports one fact; listeners decide);
  - one stored fact behind "exhausted";
  - a data contract trimmed to fields with readers;
  - one owner for the fallback choice;
  - the preserved CM-12 order;
  - once-per-failure detection.
- Below 9:
  - the live switch is assembled from flows built for other purposes, and it inherits their rules (AR-006);
  - "this run is being switched" is held twice (AR-007);
  - "this error is a usage limit" is decided by two rules in two owners (AR-008);
  - the new logs grow forever (AR-009).

With AR-006…AR-009 resolved I would score it 9.

Code read at `bc4351cad7` for this round:
- `agent-execution/services/standalone-stopped-run-selection-updater.ts:25-165`;
- `standalone-agent-run-eligibility.ts:1-30`;
- `agent-run-service.ts:370-385`;
- `standalone-agent-run-lifecycle-service.ts:95, 144-150`;
- `agent-team-execution/services/team-run-selection-mutator.ts`;
- `model-routing/stores/routing-decision-log.ts:10-13, 95, 194`.

### AR-006 — The automatic switch runs a person's Save, and inherits its refusals and gaps

- Type: `Design Impact` (and a `Requirement Gap` for the peer-started case); severity: High. This is a defect, not a preference.
- Protects: DEC-003 (every run, delegated runs included), REQ-005, BEH-003; the existing FU-008 behavior (a run's registered root follows a saved selection).
- Problem: R-1's Agent root writes the switch through `StandaloneStoppedRunSelectionUpdater.update`, the person's Settings Save for a stopped run.
  - **It refuses a run another node started.** `plan()` refuses any runtime change when `!canSwitchRuntime(metadata)` ("Only a started standalone Agent run that no peer node started can", `standalone-stopped-run-selection-updater.ts:130-137`; `canSwitchRuntime` excludes `isPeerStarted`, `standalone-agent-run-eligibility.ts:16-17`). So a cross-node delegated run (autobyteus-587) that hits its limit gets `switch_failed`. DEC-003 says delegated runs switch, and the design does not mention this exclusion.
  - **Its texts are a person's.** Its refusals ("Stop it, reopen Settings, and try again") would become C-2 `switch_failed` reasons and notice text.
  - **The root doesn't follow.** Only `AgentRunService.updateStoppedSelection` refreshes the registered root's inherited launch after a Save (`agent-run-service.ts:377-385`, FU-008); R-1 calls the lifecycle's updater below it. After an automatic switch, the run's root would keep the exhausted launch as what its own delegations inherit.
  - The Team side reuses the stopped-Team Save mutation (`team-run-selection-mutator.ts`, "the saves of a stopped Team's scopes") with the same question about its rules.
- Required update:
  - Make the automatic switch one owned operation per root, with its own explicit rules: which runs may switch automatically, and the texts.
  - Build it from the commit primitives, not the person's Save: `historyCatalogService.commitRunRuntimeSwitch` for an Agent root; the tree mutation for a Team member.
  - Include the root's follow of the new launch.
  - For a peer-started run, state the outcome with evidence (why `canSwitchRuntime` excludes it: AR-016 of autobyteus-316). If it cannot switch, DEC-003 narrows and the founder decides (Requirement Gap).
- Recipient: Solution Designer.

### AR-007 — "This run is being switched" is held twice

- Type: `Design Impact` (quality, required for 9); severity: Low. Not a defect today.
- Protects: Principle 11 (one fact, one owner); REQ-008.
- Problem: R-3 adds an in-memory map of runs with a switch in flight. The run's own state already says it: during and after a switch, the root holds a pending switch, or its launch is no longer the failed runtime. Two representations can disagree. For example, after a restart the map is empty while a pending switch from R-1 step 2 is still there.
- Required update: let the root's switch operation (AR-006) decide in its gate from its own state. An event whose failed runtime is not the run's current launch, or a run that already has a pending switch, is ignored. Remove the map. Keep the detector's once-per-turn rule (R-3), which is a different fact.
- Recipient: Solution Designer.

### AR-008 — "This error is a usage limit" is decided by two rules in two owners

- Type: `Design Impact` (quality, required for 9); severity: Medium.
- Protects: Principles 4, 11 and 13 (one owner per fact; runtime knowledge in the runtime subsystem); REQ-001.
- Problem:
  - C-4 has Codex's converter set `error_kind`, while for every other runtime the detector in `run-events/` infers it by reading that runtime's limits after any terminal error.
  - One fact, two owners, and runtime-specific behavior outside the runtime layer. The detector also starts a limits read (up to 18 s, external calls) for every unrelated terminal error of every non-Codex run.
- Required update:
  - Every runtime backend owns its classification and emits `error_kind: "usage_limit"` (Codex from `codexErrorInfo`; the others from their own signal, including a limits read after the error, inside that backend).
  - `ERROR` carries the reset time when the backend knows it.
  - The detector becomes runtime-agnostic: it reads `error_kind` and publishes.
- Recipient: Solution Designer.

### AR-009 — The new logs grow without bound

- Type: `Design Impact` (quality, required for 9), with the window a product choice; severity: Low.
- Protects: Principle 5 (operational cost of stored data); DESIGN rule 7.
- Problem:
  - `run-events/` and `switches_*.jsonl` seal at 4 MB and keep every file forever, copying the routing decision log, which has the same gap (`routing-decision-log.ts:10-13, 95, 194`: seal, never delete).
  - Their readers need at most 31 days: exhaustion 31, router switch history 30.
  - Volume is small for this ticket alone, but the hub is built for more kinds (FU-646-01 watches token usage on every run).
- Required update:
  - Retention in the log owner, shared by all three logs: delete sealed files older than the longest reader window.
  - The window for switch history, which the router learns from, is the founder's choice. Propose a default, e.g. 90 days.
- Recipient: Solution Designer.

## Round 4 Review (ARCH-REV-004, SR-009 at `67b5c2f429`)

**Score: about 8.5.** AR-006 … AR-009 are resolved, and the shape is now close to 9. Two narrow gaps remain; both are one-decision fixes.

Code read at `bc4351cad7` and on the branch for this round:
- `docs/design/collaboration_model.md` CM-7, CM-10;
- the 461 records for AR-016;
- `general-process-run-supervisor.ts:283-325` (the lifecycle service is built first; the root manager receives it as `agentServices.activateRunAgent`);
- `standalone-agent-run-root-manager.ts:204-212` (`refreshInheritedLaunch` reads the metadata and calls `root.setInheritedLaunch`);
- `standalone-agent-run-root.ts:279` (`setInheritedLaunch`, a plain setter);
- `utils/sealed-jsonl-log.ts` (the branch's shared log owner).

| Prior finding | SR-009 response | Verification | Status |
| --- | --- | --- | --- |
| AR-006 | R-11: the automatic switch is its own operation per root, with its own checks and texts. It uses the commit primitive `commitRunRuntimeSwitch` (Agent) and the tree mutator's member function through `TeamMemberRuntimeSwitchCommitter` (Team), not the person's Save. Peer-started runs switch on their own node | CM-10: "the node that runs a delegated run owns it: runtime, memory, message log and lifecycle … the run's launches are its own facts on its node, read while a view shows them". The 461 record (AR-016) only assigned the `isPeerStarted` test to switch eligibility; no recorded reason ties the exclusion to anything but the person's Settings. The planned two-server E2E proves it, and DEC-003 holds | Resolved; the root follow's placement is AR-010 |
| AR-007 | R-12: no map; the root acts only when the current launch equals the failed runtime and model and there is no pending switch, else `already_switched` | One state, also across a restart. It still lets a same-runtime fallback (Opus → Sonnet) act on its own later failure | Resolved |
| AR-008 | R-13: each backend classifies (`error_kind: usage_limit`); the detector is runtime-agnostic; scope and reset come from the availability service | One owner per fact. Codex carries the signal on all three of a turn's errors | Resolved for Codex; AR-011 for the runtimes that classify by a later read |
| AR-009 | R-14: `SealedJsonlLog.removeSealedOlderThan`: run events 31 d, switches 90 d (DEC-008, asked of the founder), routing decisions kept | The routing log's "All" period is visible behavior, so that change is the founder's; the reason holds | Resolved (see Residual Risks for the routing log follow-up) |

### AR-010 — The root follow points back against the composition

- Type: `Design Impact`; severity: Low.
- Protects: Principles 9 and 16 (dependency direction, composition order); FU-008.
- Problem:
  - R-11 makes `StandaloneAgentRunRootManager.refreshInheritedLaunch(runId)` step 3 of `StandaloneAgentRunLifecycleService.switchRuntimeAutomatically`.
  - The composition builds the lifecycle service first and hands it to the root manager (`general-process-run-supervisor.ts:283-325`: `agentServices.activateRunAgent → lifecycleService`). A lifecycle → root-manager call reverses that dependency and needs the manager connected after construction.
  - It also calls back into the root manager for the very root that is driving the switch, inside its gate.
- Required update: the root, which drives the switch, sets its own inherited launch from the committed metadata the lifecycle returns (`this.setInheritedLaunch(launchConfigurationOf(committed))`, what `refreshInheritedLaunch` does at `:206-212`). The lifecycle operation stays below the root and does not know the root manager.
- Recipient: Solution Designer.

### AR-011 — For runtimes classified by a later limits read, how the result reaches the event is not stated

- Type: `Design Impact`; severity: Medium.
- Protects: REQ-001, REQ-009; Principle 17 (the `ERROR` event's contract, C-4 / R-13).
- Problem:
  - R-13 has the Antigravity and Grok backends (and Claude, if the SDK gives no signal) classify by "a limits read after a terminal turn error" (up to 18 s).
  - The classification is a field on the `ERROR` event, and the detector acts only on `ERROR` with `error_kind`.
  - The design doesn't say which of two shapes applies: (a) the backend delays its `ERROR` until the read completes, which holds the run's error status and every later event up to 18 s; or (b) it emits `ERROR` at once and a second event when the read classifies it, which needs its kind and fields in the contract, and the detector listening for it.
- Required update: choose one and write it into C-4 and R-13. My recommendation is (b): an `ERROR` now and an `ERROR_CLASSIFIED {turn_id, error_kind}` (or equivalent) later, with the detector acting on either, still once per `(agentRunId, turn_id)` (R-3). Also say what the run's view shows meanwhile.
- Recipient: Solution Designer.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Fail` (round 4, at the 9-point bar). The architecture is now about 8.5. AR-010 and AR-011 are the last two gaps; with them resolved I would score it 9.

## Findings

Open: AR-010 (Low), AR-011 (Medium). AR-001 … AR-009 are resolved.

## Classification

`Design Impact` (AR-010, AR-011). Route: Solution Designer.

## Recommended Recipient

Solution Designer. The implementation engineer may proceed with R-11 (except where the root follow sits), R-12 and R-14, and with Codex's classification. Hold the root-follow placement, and classification for Claude (if no SDK signal), Antigravity and Grok.

## Residual Risks

- **DEC-008** (switch records kept for 90 days) is pending the founder. 90 days is the default until then.
- **The routing decision log** still grows without bound. Its retention is a founder decision (the "All" period). The Solution Designer should record it as a follow-up.
- **Peer-started switch:** the two-server E2E planned in R-11 is the proof. If it shows the delegating node caches the launch, that is a Design Impact.
- **The router template (R-6)** still waits for the founder.

## Latest Authoritative Result

- Review Decision: `Fail` (ARCH-REV-004)
- Score: about 8.5 now; 9 with AR-010 and AR-011 resolved.
- Material-Premise Gate: `Pass`.
- Notes: R-11, R-12 and R-14 are accepted as designed; keep them.
