# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-unavailable-model/tickets/in-progress/stopped-run-unavailable-model/requirements-doc.md` (Approved, SR-006)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-unavailable-model/tickets/in-progress/stopped-run-unavailable-model/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-unavailable-model/tickets/in-progress/stopped-run-unavailable-model/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-unavailable-model/tickets/in-progress/stopped-run-unavailable-model/design-spec.md` (SR-006, `Ready`)
- Supplemental Task Artifacts Reviewed: `probes/autobyteus-53-repro.test.ts`
- Relevant Solution Revision IDs: SR-001..SR-006
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-unavailable-model/tickets/in-progress/stopped-run-unavailable-model/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: the SR-006 revision from `/solution_designer` (2026-11-23), responding to ARCH-REV-001
- Prior Review Round Reviewed: 1 (ARCH-REV-001, `Fail`: AR-001, AR-002)
- Latest Authoritative Round: 2
- Current-State Evidence Basis:
  - The worktree is now at `1f761bc8db`, the current `origin/personal`.
  - Round 1 evidence stays valid for the unchanged sections. That evidence was read at `8430d9ef12` and the parts the design relies on were re-checked on `1f761bc8db`: the rule, `selectionContextFor`, the selection service, eligibility, the updater, the Team plan and mutator, the options callers, the pending-switch parser, the native factory, the 599 fresh-session step and the glossary.
  - Round 2 opened each refreshed citation at its line on `1f761bc8db`:
    - the three save callers (`updater:136`, `team-run-delegated-launch-plan.ts:35`, `agent-org-run-manager.ts:247`);
    - the options callers (`studio-run-model-config-service.ts:70`, `agent-org-run-service.ts:87`);
    - the three launch validators (`agent-org-run-service.ts:157`, `launch-usability-check.ts:158`, `model-routing-settings.ts:137`);
    - `runtime-switch.ts:36` (`buildRuntimeSwitchBetween`) and `:59` (`buildSessionRenewal`);
    - `standalone-agent-run-lifecycle-service.ts:282` and `configured-agent-activation-planner.ts:127`;
    - `GLOSSARY.md:435, 455, 462`.
  - I re-ran the Data Contract's read-only scan of `~/.autobyteus/server-data` myself (see N-4).

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged from round 1. The shared switch rule and the validation contract change across every stopped-run surface, and `pendingRuntimeSwitch` gets a new persisted state. The size grows by three one-line builders.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. This is the user's rule (DEC-003). The Solution Designer decided the details within it (DEC-005..DEC-009).
  - DEC-009 settles AR-001 the way REQ-003 already said: a third model equal to or bigger than the reference resumes the session; a smaller or unknown one stays pending.
  - REQ-004 and AC-006 (a)-(d) now agree with REQ-003.
  - The user's rule is unchanged, so no renewed user approval is needed.
- Relevant existing behavior and evidence confirmed: Yes (round 1, re-checked on `1f761bc8db`).
- Scope guardrail confirmed: Yes.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: Yes (none remain).
- Remaining material ambiguity: None.
- Statements about existing code the design relies on, opened at their cited lines:
  - all refreshed citations are correct;
  - the corrected model-routing statement is correct (`model-routing-settings.ts:2, 105, 137`).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001/002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass: AC-006 (a)-(d) match the decision table and the rule's target shape | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | — |
| DEC-006 | User | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/autobyteus-53-repro.test.ts` | Pass | Pass | Pass | Pass (still reproduces on `1f761bc8db`) | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | `Behavior Change` | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant` (`runtime-selection-rule.ts:48-77`; `run-model-selection-service.ts:120-125`) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Yes, small | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Decision table, rule shape, file mapping | — |

## Data Contract Verdict

| Record / Message | Each Field Has A Meaning, A Writer And A Reader? | Identities, Relationships And Lifecycle Are Explicit? | Each In-Scope Flow Walked Through It, With An Example Per Case? | Checked Against Existing Data And Real Dependencies It Relies On? | The Layers Above Follow It Without Mappings, Recomputed Facts Or Second Copies? | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Stored `pendingRuntimeSwitch` (new legal state: same runtime on both sides) | Pass | Pass (create, keep, clear; at most one per record) | Pass (UC-001..003, REQ-004 (a)-(d), RS-08, AC-009, DEC-007, launch validators) | Pass (read-only scan; parser; native factory; probe), with N-4 | Pass | Pass |
| Context `handOver`, `currentModelIdentifier` (meaning narrowed); valid result `continuation`; `RuntimeSelection.continuation` | Pass (all eight builders named, including the three launch validators with `no_session`) | Pass (`continuation` lives for one save) | Pass | Pass | Pass (one decision owner; the rule throws on a runtime mismatch) | Pass |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 save | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 activation (reused, incl. 599's shared fresh-session step) | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 options | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| Decision table | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RunModelSelectionService` | Pass | Pass | Pass | Pass | — |
| Switch rule | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Rule ↔ selection types | Pass | Pass | Pass | Pass | `RunContinuation` in `llm-management/domain/run-model-selection.ts` (pure types) |

Principle 16: `Pass`.

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Contexts + `handOver` | Pass | Pass | Pass | Low | Pass |
| Valid result + `continuation` | Pass | Pass | Pass | Low | Pass |
| `RuntimeSelection` + `continuation` | Pass | Pass | Pass | Low | Pass |
| `selectionContextFor(current, selection, handOver)`, `stoppedRunHandOver(metadata)` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `N/A` (nothing added).

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Fresh session + journal | Pass | Pass | N/A | Pass | Same steps as 599's session renewal |
| Capacity comparison | Pass | Pass | N/A | Pass | — |
| Standalone capability | Pass | Pass | Pass | Pass | Sibling of `canSwitchRuntime` |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `llm-management`, `run-history/domain`, `agent-execution`, Team/Org services, launch validators, web locales, glossary | Pass | Pass | Pass | Pass | Every kind and entry form is traced |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `handOver` per record kind | Pass | Pass | Pass | Pass | — |

## Shared Structure Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RunContinuation`, `RunHandOver` | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each: `Pass` (AR-002 resolved).

One vocabulary (Principle 15): `Pass — deviation recorded, reason holds` (design-spec Task Design Health Assessment → Deliberate deviations). The ruling from round 1 holds. The glossary placement beside "Lost runtime session" / "Session renewal" and the "Pending agent runtime switch" rewording are mapped (`GLOSSARY.md:435-468`).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All mapped files, incl. the three launch validators | Pass | Pass | N/A | Pass | The DEC-008 text goes only in `buildRuntimeSwitchBetween`; `buildSessionRenewal` is unchanged |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| No new files or folders | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime-only rule branches; native refusals for `available`/`no_session`; "fresh because null"; old-rule tests | Pass | Pass | Pass | Pass | AC-007 is reworded (N-2 resolved) |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Switch rule, validation | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `pendingRuntimeSwitch` | `Directly Usable — No Migration` | Pass. The scan found stored same-runtime pending switches, and the parser accepts them. All three DEC-005 consequences are listed (N-3 resolved) | Pass | N/A | Pass | See N-4 for the marker text of a stored same-model pending switch |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–7 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Rule shape, decision table, case checks incl. AC-006 (a)-(d), stored JSON example, result example | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### P-001 — The user picks a third model, equal to or bigger than the reference, while a model hand-over is pending

- Status in round 2: still `Reachable`. It is now covered by REQ-004, AC-006 (c), the case checks and the Data Contract walk, so AR-001 is resolved.

### P-002 — A stored same-runtime, same-model pending switch is activated

- Related approved requirement or established contract: REQ-006 and DEC-008 (a truthful marker); AC-007 (preserved switches).
- Relevant behavior ID(s): BEH-003.
- Initiating basis kind: `System`.
- Independent trigger: an already-stored pending switch is made real by the record's next input, after the node runs the new build.
- Support evidence:
  - Two Team member nodes in this node's Memory Sync imports from `docker-node-1` hold `pendingRuntimeSwitch` with `from` = binding (`claude_agent_sdk` sonnet → sonnet; opus → opus; session `null`).
  - Their originals are live run records on `docker-node-1` (my read-only scan, 2026-11-23, matching the design's).
- Forward path: the next input → member planner `beginSwitch` → `buildRuntimeSwitchBetween`. With the SR-006 text rule ("same runtime → Model changed from {a} to {b}") the marker reads "Model changed from sonnet to sonnet."
- Consequence: one misleading marker line per such run. No data or session harm; the hand-over itself is correct.
- Reachability: `Reachable` on the node that owns those runs. The new rule never creates such a state, because `unchanged` returns `same_session`.
- Review consequence: non-blocking note N-4 (a one-line guard in the marker builder).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None open. AR-001 and AR-002 are resolved (see `architecture-review-revision-record.md`, ARCH-REV-002).

## Classification

N/A (Pass).

## Recommended Recipient

`/implementation_engineer`; informational notice to `/solution_designer`.

## Residual Risks

- **N-4 (implementation note, non-blocking).** In `buildRuntimeSwitchBetween`, use "Model changed from {a} to {b}." only when the runtimes are equal **and the models differ**. A stored pending switch with the same runtime and model (P-002) keeps today's "Agent runtime changed from … to …" text, so no marker says "Model changed from sonnet to sonnet." Add a unit case.
- **Editorial.** `requirements-doc.md` Document Status line 13 still says "Exact approved requirements baseline: `SR-005`" while Status reads `Approved (SR-006)`.
- **Carried from round 1:**
  - The standalone Save message after a model hand-over undo is the generic "Model settings updated…", which REQ-007 does not ask to change.
  - The decision row `reference == null → hand_over` was kept with its reason recorded; that reason holds.
- **Execution risk.** Only E2E proves the full native→native path (AC-002). The design plans a built-server E2E with the fake LM Studio endpoint and a Team-member case (AC-008).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (P-001 covered; P-002 drives only the non-blocking N-4)
- Notes:
  - Both round-1 findings are resolved and checked against `1f761bc8db`.
  - N-1..N-3 are adopted.
  - The new Data Contract section is complete, with fields, writers, readers, examples, walks and a real-data scan.
  - Ready for implementation.
