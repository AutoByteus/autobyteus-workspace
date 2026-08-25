# Dynamic AgentTeam Runtime — Requirements

## Status (`Draft`/`Design-ready`/`Refined`)

`Draft — prerequisite satisfied; approval requested` — refreshed on 2026-08-25 against `origin/personal` after Hierarchical TeamRun Launch Configuration was finalized, released, and merged. The recommended behavior bundle below remains subject to explicit user approval before solution design.

## Goal / Problem Statement

Allow an already-running AgentTeam to adopt an explicitly requested, valid revision of its AgentTeam definition without replacing the root TeamRun. A revision may add or remove configured Agents, add or remove nested AgentTeams, replace a placement whose referenced definition changed, or update natural-language handoffs.

This ticket makes AgentTeam runtime topology dynamic as the immediate prerequisite for a later native AgentOrg. It does not introduce AgentOrg definitions, runtime, or UI.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| `BEH-001` | A TeamRun compiles one immutable configured topology at launch. Definition update and catalog refresh do not alter an active run. | A caller can explicitly reconcile one active root TeamRun against the current valid definition catalog. | Definition update/catalog refresh remain separate explicit operations; file edits alone do nothing. | R-001–R-006; AC-001–AC-005 |
| `BEH-002` | The completed hierarchical launch feature persists a complete effective default on every configured TeamRun and a complete resolved launch snapshot on every configured Agent. | Reconciliation uses those persisted TeamRun defaults to configure additions without frontend launch state. | Existing Agent launch snapshots and TeamRun defaults retain their current meaning. | R-007–R-011; AC-006–AC-009 |
| `BEH-003` | Only launch-time configured Agent and nested-Team placements can materialize. | A valid new Agent or nested AgentTeam subtree is prepared, committed, and made addressable without restarting unaffected placements. | Canonical rooted addressing and the direct-Agent coordinator invariant remain authoritative. | R-012–R-016; AC-010–AC-013 |
| `BEH-004` | A configured placement cannot be reconciled out of a live TeamRun. | A removed placement closes admission, settles existing native input lifecycle, terminates recursively when applicable, and leaves active routing. | Existing AgentRun input-quiescence and TeamRun termination contracts govern work disposition; this ticket does not add a second input ledger. | R-017–R-022; AC-014–AC-018 |
| `BEH-005` | Handoffs and each Agent's outgoing handoff snapshot are fixed when the run is constructed. | A handoff-only or mixed revision changes the root-owned current handoffs without restarting unchanged Agents; `get_handoff_rules` reads current sender rules. | Rules remain natural-language, sender-perspective, and use canonical addresses. | R-023–R-026; AC-019–AC-022 |
| `BEH-006` | Existing Agent runtime/model settings are fixed for the AgentRun lifetime. | Unchanged placements retain their run identity, conversation, and launch snapshot. A changed definition reference at the same address is a replacement. | No silent live model/runtime reconfiguration is introduced. | R-010, R-011, R-015; AC-009, AC-013 |
| `BEH-007` | `RootTeamRun` owns the persisted tree, derived index, rooted routing, tasks, messages, events, and lifecycle, but has no topology reconciliation operation. | One root-owned transaction validates, prepares, durably commits, publishes, and reports each revision. | Child TeamRuns remain nested execution boundaries resolved through the root. | R-004, R-027–R-033; AC-023–AC-029 |
| `BEH-008` | Definition graph validation rejects invalid graphs before launch. | Invalid or unconfigurable reconciliation candidates are rejected without partially replacing the prior active topology. | Existing definition validation remains authoritative. | R-014, R-027–R-030; AC-024–AC-027 |
| `BEH-009` | No filesystem watcher changes active TeamRuns. | Reconciliation remains explicit and per-root. | Existing package reload, definition CRUD, and catalog refresh behavior remain supported. | R-002, R-034; AC-002, AC-030 |

## Investigation Findings

- The current tracked base is `origin/personal` at `fb1335867a4223b2499e4513f58c609b6ac33ab4`; it contains finalized release `v1.4.58` and merge `a43e8ceea` for Hierarchical TeamRun Launch Configuration.
- `TeamRunExecutionTreeFileV2` now stores `defaultLaunchConfiguration` on the root and every configured nested Team node, plus a complete `launchConfiguration` on every configured Agent node.
- `TeamDefinitionTopologyPlanner` still allocates every configured TeamRun/AgentRun identity at initial launch and has no identity-preserving reconciliation path.
- `RootTeamRun` is already the sole rooted operation owner and swaps its persisted tree/index only inside serialized `TeamRunPersistenceCoordinator` mutations.
- `AgentRun.prepareTermination()` already closes input admission, cancels accepted-but-not-forwarded entries through the native input lifecycle, waits for quiescence and active provider dispatch, and then terminates. Root TeamRun termination composes this recursively. Dynamic removal should reuse that contract rather than inventing accepted-input states.
- `TeamRunContext`, `TeamRunConfig`, `MemberTeamContext`, and `MemberCollaborationContext` currently capture immutable launch-time topology/handoffs. `get_handoff_rules` reads the frozen outgoing snapshot, so dynamic handoffs require a root-owned current-rule provider or equivalent stable binding.
- `MixedConfiguredMemberRegistry` has local lazy handles and a disposal-oriented `remove()`, but the registry and member contexts are launch-time structures; local removal is not an authoritative topology transaction.
- The GraphQL TeamRun surface currently supports create, restore, and terminate only. Definition catalog refresh is explicit and separate.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `dynamic-agent-team-use-cases.md` | Intended-behavior supplement with concrete addition, removal, replacement, handoff, failure, and restore cases | R-001–R-034 | AC-001–AC-030 | Draft / approval requested with this document | Expands the approved cases without replacing this requirements authority. |

## Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement`
- Initial design issue signal: `Yes`
- Root cause classification: `Boundary Or Ownership Issue` plus `Missing Invariant`
- Refactor posture: `Needed in this change`
- Evidence basis: launch-time immutability is encoded across the compiled config, per-Team contexts, configured registries, collaboration context, and runtime construction. Mutating only the execution-tree file or only one registry would create multiple authorities. `RootTeamRun` already spans the required durability, routing, task, communication, event, and lifecycle boundaries and should remain the governing owner.
- Requirement or scope impact: implementation must introduce a root-owned configured-topology reconciliation boundary and live projection rebinding. It must not introduce a peer coordinator, duplicate input lifecycle, or frontend-owned runtime policy.

## Recommendations

1. Add one explicit, per-root TeamRun reconciliation operation. Do not automatically fan out catalog changes to every active run.
2. Keep definition/catalog refresh separate: the caller refreshes or updates definitions first, then reconciles the selected active run.
3. Keep launch policy simple for this version: a new direct Agent inherits the current persisted default of its containing TeamRun; a newly added nested TeamRun inherits its parent's current persisted default, recursively. The reconcile request carries no new launch overrides.
4. Preserve unchanged run identities and complete launch snapshots. Treat a same-address definition-reference change as retirement plus addition.
5. Reuse native AgentRun/TeamRun quiescence and termination for removal; do not add a topology-specific accepted-input ledger.
6. Make handoff lookup dynamically read the current root-owned handoff snapshot. Send one lightweight system notification to retained Agents whose outgoing rules changed.
7. Keep the current V2 execution-tree schema as the active topology truth. Do not delete retired Agent memory or durable task/message records, but do not add retired-placement UI/history navigation in this backend-first ticket.

## Scope Classification (`Small`/`Medium`/`Large`)

`Large`

The feature crosses definition graph resolution, identity-preserving diffing, nested runtime materialization, admission/retirement, collaboration lookup, root persistence, restore, events, API contracts, and executable coverage.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001` Explicitly reconcile one active root TeamRun against the current definition catalog.
- `UC-002` Return an identity-preserving no-op when the effective configured topology and handoffs are unchanged.
- `UC-003` Add a direct Agent using the containing TeamRun's persisted default.
- `UC-004` Add a nested AgentTeam subtree using recursive parent-default inheritance.
- `UC-005` Remove a direct Agent using native input quiescence and termination.
- `UC-006` Remove a nested AgentTeam subtree recursively.
- `UC-007` Replace an Agent or nested Team placement whose referenced definition changes at the same address.
- `UC-008` Apply handoff-only or topology-plus-handoff changes and refresh sender-rule lookup.
- `UC-009` Reject invalid, stale, or unconfigurable candidates without partial publication.
- `UC-010` Preserve unaffected live identities, durable records, and current V2 restore behavior.

### Out of Scope

- Native AgentOrg definitions, AgentOrg runtime, cross-root routing, AgentOrg UI, or organizational visualization.
- Automatic filesystem watching, background catalog polling, or automatic reconciliation of every active run.
- A new agent-callable active-runtime topology mutation/reconciliation tool. Existing AgentTeam definition-management tools are preserved.
- A frontend topology editor or drag-and-drop experience; this ticket is backend-first except for the minimum client/API integration needed to exercise the supported operation.
- Live editing of a running TeamRun's persisted launch defaults or explicit per-addition launch overrides.
- Silent in-place model/runtime reconfiguration of an existing AgentRun.
- Treating task-created transient executions as configured definition members.
- A new retired-placement navigation/archive UI. Durable Agent memory, task records, and communication records must not be deleted by reconciliation.

### Preserved Behavior Boundary

- Preserve canonical rooted addressing, hierarchical AgentTeam structure, direct-Agent coordinator validation, sender-perspective natural-language handoffs, team-address coordinator ingress, task delegation, inter-agent messaging, AgentRun conversations, root termination, and V2 history restore.
- Preserve the current distinction between configured definition placements and task-created transient executions.
- Preserve existing definition CRUD/catalog refresh and existing agent-callable definition-management tools; they do not gain implicit active-run mutation semantics in this ticket.

### Review Authority

- Every blocking downstream `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID.
- New product policy, migration obligations, retired-history UI, automatic update behavior, or additional threat models are `Requirement Gap` findings and require renewed user approval.
- Downstream review does not silently amend this requirements basis.

## Functional Requirements

- `R-001` The backend shall expose an explicit operation that reconciles one identified active root TeamRun against the current cached definition graph for that run's root definition.
- `R-002` Definition CRUD, package reload, catalog refresh, and file edits shall not by themselves mutate an active TeamRun.
- `R-003` The caller shall be able to refresh/update definitions and then invoke reconciliation for the selected root TeamRun.
- `R-004` `RootTeamRun`, or a service strictly behind its public boundary, shall govern validation, preparation, serialization, durable commit, live publication, failure handling, and result/event production.
- `R-005` Concurrent reconciliation attempts for the same root shall be serialized or rejected deterministically; different roots remain independent.
- `R-006` An unchanged candidate shall return `no_change` without allocating identities, terminating members, sending notifications, or rewriting the execution tree.
- `R-007` Reconciliation shall require the current V2 contract in which every configured TeamRun has a complete persisted `defaultLaunchConfiguration`.
- `R-008` A newly added direct Agent shall use a complete clone of its nearest containing TeamRun's current persisted default.
- `R-009` A newly added nested TeamRun shall use a complete clone of its parent TeamRun's current persisted default; this rule applies recursively to newly added nested TeamRuns and their Agent descendants.
- `R-010` Every new configured Agent node shall persist its complete resolved launch configuration.
- `R-011` Existing retained Agents and Teams shall keep their current defaults/launch snapshots; reconciliation shall not recompute them from current definition defaults or frontend intent.
- `R-012` Adding a direct Agent shall allocate one new AgentRun identity and make the Agent addressable only after the revision commits.
- `R-013` Adding a nested AgentTeam shall allocate a child TeamRun identity plus all required configured descendant identities and publish the subtree as one unit.
- `R-014` The complete candidate graph shall pass current definition-reference, cycle, sibling-name, canonical-address, direct-Agent coordinator, and handoff endpoint validation before commit.
- `R-015` If an address remains but its Agent or AgentTeam definition ID changes, reconciliation shall replace the old placement rather than mutate its existing run identity.
- `R-016` Prepared additions shall not accept normal user, task, or inter-agent routing before durable commit and live publication.
- `R-017` A placement selected for removal/replacement shall stop accepting new user messages, inter-agent deliveries, and delegated tasks before detachment.
- `R-018` Removal shall reuse native AgentRun input quiescence: accepted entries not yet forwarded receive the existing termination cancellation disposition; forwarded/active work reaches a native terminal outcome before termination completes.
- `R-019` This ticket shall not add a topology-specific input ledger, synthetic acceptance timestamp, or second runtime-queue lifecycle.
- `R-020` Nested-Team removal shall apply R-017–R-019 recursively to the configured subtree and its materialized runtime descendants.
- `R-021` Task-created execution placements shall not participate in the configured-definition diff. Existing task ownership and settlement remain governed by the task-delegation subsystem.
- `R-022` Reconciliation shall not delete Agent memory, task records, or communication records for retired run identities. Removed placements leave the active configured tree and routing view.
- `R-023` A revision may add, remove, or replace natural-language handoff edges atomically with topology changes.
- `R-024` `get_handoff_rules` shall resolve only the caller's sender-perspective outgoing rules from the currently committed root handoff snapshot at invocation time.
- `R-025` Retained Agents whose outgoing rules changed shall receive one lightweight system notification after the new revision is committed; the notification directs the Agent to use `get_handoff_rules` when handoff is needed and does not embed the full rule set.
- `R-026` `send_message_to` and task recipient resolution shall use the currently committed root index, so a retired address is rejected and a newly committed address is resolvable.
- `R-027` Reconciliation shall diff only configured topology/handoffs while preserving run IDs and persisted values for semantically unchanged placements.
- `R-028` Candidate validation and runtime preparation shall complete before durable tree replacement; failed preparation shall clean up staged additions and reopen any cancelable retirement gates.
- `R-029` The persisted V2 execution tree shall become authoritative before the new topology is exposed for normal routing. Live finalization shall be a prevalidated, bounded commit step.
- `R-030` A pre-durability failure shall retain the prior tree/index/routing topology. An indeterminate durable finalization or impossible post-durability live-finalization failure shall enter the existing root fail-stop policy rather than continue with split authority.
- `R-031` A successful result and root event shall report `applied` plus deterministic added, removed, replaced, and handoff-changed summaries; an unchanged result shall report `no_change`; rejection shall return a stable code and message.
- `R-032` Restore after a successful reconciliation shall reconstruct the committed active topology, retained identities, new identities, TeamRun defaults, Agent launch snapshots, and current handoffs from the V2 package.
- `R-033` Reconciliation shall preserve the root TeamRun ID and shall not restart unaffected AgentRuns or child TeamRuns.
- `R-034` No automatic filesystem watcher, polling loop, or new Agent-callable active-runtime topology mutation tool shall be introduced.

## Acceptance Criteria

- `AC-001` Given an active TeamRun and a refreshed valid definition, invoking reconciliation targets only the requested root TeamRun.
- `AC-002` Editing a package file or refreshing the definition catalog without invoking reconciliation leaves the active TeamRun unchanged.
- `AC-003` Repeating reconciliation with no effective topology/handoff change returns `no_change` and preserves every run ID.
- `AC-004` Two same-root reconcile requests cannot interleave partial application; two different roots can reconcile independently.
- `AC-005` A successful reconcile preserves the root TeamRun ID.
- `AC-006` A current V2 package exposes a complete default for root and every configured nested TeamRun.
- `AC-007` A newly added direct Agent receives the exact current default of its containing TeamRun and persists that complete snapshot.
- `AC-008` A newly added nested Team and deeper nested Teams inherit their parent defaults recursively, and every new Agent inherits from its nearest containing Team.
- `AC-009` An unchanged Agent keeps its run ID, conversation, and complete launch snapshot even if the current definition's optional default changes.
- `AC-010` A direct Agent addition yields one new addressable AgentRun after commit and is unreachable before commit.
- `AC-011` A nested Team addition yields one child TeamRun plus its complete valid configured subtree as one published change.
- `AC-012` A candidate with no direct Agent coordinator, missing reference, cycle, invalid address, or invalid handoff endpoint is rejected before publication.
- `AC-013` A same-address definition-reference change yields a replacement with new run identity while unaffected placements retain theirs.
- `AC-014` Once removal admission closes, a new user message, inter-agent delivery, or delegated task to the retiring placement is rejected through the normal operation contract.
- `AC-015` An accepted input not yet forwarded is reported through the existing `AGENT_RUN_TERMINATED_BEFORE_INPUT_FORWARD` cancellation lifecycle rather than disappearing.
- `AC-016` Forwarded/active work reaches completion, interruption, or failure before the retired AgentRun is disposed.
- `AC-017` Nested-Team removal applies AC-014–AC-016 throughout the subtree and does not restart unaffected siblings.
- `AC-018` Reconciliation does not delete retired Agent memory, task records, or communication records, and removed addresses are absent from active routing after success.
- `AC-019` Handoff-only reconciliation restarts no AgentRun.
- `AC-020` After handoff success, `get_handoff_rules` on an affected retained Agent returns the new sender rules and not the prior snapshot.
- `AC-021` Each affected retained sender receives one lightweight rules-changed system notification; unaffected Agents receive none.
- `AC-022` After a mixed topology/handoff change, current canonical recipient resolution accepts added addresses and rejects removed addresses.
- `AC-023` Success publishes one applied result/event containing deterministic added, removed, replaced, and handoff-changed summaries.
- `AC-024` Preparation failure leaves the prior persisted and live topology current and leaves no staged runtime registered.
- `AC-025` A tree write that is proven not committed leaves the prior routing view active.
- `AC-026` An indeterminate durable result or unexpected post-durability finalization failure activates root fail-stop; the process does not continue serving divergent persisted/live topology.
- `AC-027` Rejection returns a stable code and human-readable reason.
- `AC-028` Restoring a successfully reconciled run reconstructs the same active configured topology and run identities recorded by the V2 tree.
- `AC-029` Task-created executions are neither added nor removed solely because configured topology changed.
- `AC-030` No file watcher, background poller, automatic all-run fan-out, or new Agent-callable active-runtime reconciliation tool is present.

## Constraints / Dependencies

- The completed Hierarchical TeamRun Launch Configuration release and execution-tree V2 migration are required and now present on `origin/personal`.
- Every AgentTeam in a resolved graph must have exactly one direct Agent coordinator.
- Canonical rooted addressing and current message/task recipient semantics are authoritative.
- `RootTeamRun` remains the public rooted operation boundary; nested TeamRuns remain local execution boundaries.
- Backend runtimes may be lazy-materialized. Reconciliation must work whether a configured placement is offline/unmaterialized or live.
- This ticket is backend-first. Minimum GraphQL/client integration may expose and exercise the operation, but no topology-authoring UI is required.

## Persisted Data Outcome (When Applicable)

- Decision: `Directly Usable — No Migration`.
- Evidence: current `TeamRunExecutionTreeFileV2` already stores the full active configured tree, handoffs, every TeamRun default, and every Agent launch snapshot. A successful reconciliation can write another valid V2 snapshot without changing the schema.
- Data to preserve: root TeamRun identity; retained AgentRun/TeamRun identities; retained launch/default snapshots; task and communication records; Agent memory for retired run IDs.
- Unacceptable loss: deleting retained or retired Agent memory, task records, or communication records as a side effect of topology change.
- Explicit limitation: removed placements are removed from the active V2 configured tree. A future retired-placement navigation/archive view would be a separate product/schema ticket rather than a hidden requirement here.

## Assumptions

- The selected definition/catalog revision is already current when reconciliation begins; the operation does not watch or rescan the filesystem.
- Parent-default inheritance is sufficient for new placements in this first dynamic version; callers do not need per-addition launch overrides.
- Existing AgentRun quiescence/termination semantics are the product-approved work-disposition contract for removal.
- Existing definition-management tools remain definition operations only and do not implicitly select or mutate active root runs.

## Risks / Open Questions

- A graceful removal can wait while already-forwarded provider work remains active; this version deliberately introduces no arbitrary timeout policy.
- Retired run memory remains durable but is not guaranteed to remain navigable through the active Team tree. A dedicated retired-execution experience may be desirable later.
- Unexpected failure after durable tree replacement must be constrained to a small no-fail live swap; otherwise the existing fail-stop policy will terminate the root.
- A future AgentOrg may require organization-level fan-out and definition versioning, but this ticket must not pre-encode those policies into AgentTeam reconciliation.

## Requirement-To-Use-Case Coverage

| Requirement IDs | Covered Use Cases |
| --- | --- |
| R-001–R-006 | UC-001, UC-002, UC-009 |
| R-007–R-011 | UC-003, UC-004, UC-010 |
| R-012–R-016 | UC-003, UC-004, UC-007 |
| R-017–R-022 | UC-005, UC-006, UC-007, UC-010 |
| R-023–R-026 | UC-008 |
| R-027–R-033 | UC-001–UC-010 |
| R-034 | UC-001, UC-009 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance-Criteria IDs | Scenario Intent |
| --- | --- |
| AC-001–AC-005 | Explicit targeting, no implicit mutation, no-op, concurrency, root identity |
| AC-006–AC-009 | V2 defaults and identity-preserving inheritance |
| AC-010–AC-013 | Direct/nested additions, validation, replacement |
| AC-014–AC-018 | Direct/nested retirement, native input disposition, durable-record preservation |
| AC-019–AC-022 | Dynamic handoff lookup, notification, and current routing |
| AC-023–AC-027 | Results/events, failure atomicity, fail-stop, structured rejection |
| AC-028–AC-030 | Restore, task separation, and explicit-only operation |

## Approval Status

- Requirements status: `Pending explicit user approval`.
- Intended-behavior supplement status: `Pending explicit user approval`.
- Recommended approval bundle:
  1. explicit per-root reconciliation after definition/catalog update;
  2. parent-TeamRun default inheritance for all additions, with no per-add override in this version;
  3. native graceful AgentRun/TeamRun quiescence for removals;
  4. same-address definition changes are replacements;
  5. dynamic `get_handoff_rules` plus one lightweight affected-sender notification;
  6. execution-tree V2 remains the active topology schema with no migration and no retired-placement UI;
  7. no filesystem watching, automatic all-run fan-out, or new Agent-callable active-runtime mutation tool.
- Design authorization: `Not yet granted`.
