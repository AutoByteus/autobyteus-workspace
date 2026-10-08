# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (SR-003 design revision for CRR-002 / CR-FO-003, corrected by SR-004 for implementation DI-001; requirements basis unchanged)
- Approved requirements baseline: `requirements-doc.md` SR-001 baseline (REQ-001..007, AC-001..007), with DEC-001 = **A** (not-started members use the existing gray "Offline" state). User approval 2026-10-08: "I think this is clear because in other places we almost start the worker lazily. We should do it here. There's no exception here. Go, I think it's approved." (reply to "Shall I take that as 'approved, A'…").
- Behavior-defining supplements: None.
- Design status: `Ready` (revised in SR-003 and SR-004; the "SR-003 Design Revision" and "SR-004 Correction" sections at the end are authoritative where they differ, SR-004 over SR-003)
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/investigation-notes.md`
- Authorities read (2026-10-08): `references/architecture-design.md`, `design-principles.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/DESIGN.md`. `design-examples.md` not needed.
- Project design-principle conflicts or discrepancies: None.
- Base: `origin/personal` `ace86bf1f` (worktree fast-forwarded 2026-10-08 before architecture investigation).

## Current-State Read

A delegated Team copy is materialized by one of two preparation owners:

- **Root-hosted** (delegator is a root-level Agent, Org member, or any delegation whose copy host is the root): `RootTeamExecutionDirectory.beginRootTaskTeam` — called by `StandaloneRootTaskExecutionAdapter.planActivation` and `AgentOrgTaskExecutionAdapter.planActivation`.
- **Team-hosted** (copy hosted by a Team, e.g. delegated from inside a Team root or a collaborator/task Team): `TaskTeamExecutionRegistry.beginPreparation` via `TaskTeamExecutionFactory.beginTaskTeam`.

Both call the shared flat-Team factory with `activationMode: "fresh", prepareConfiguredAgents: true`. That flag makes `beginFlatTeamPreparation.prepare()` call `FlatTeamExecutionManager.prepareConfiguredActivation()`, which creates **every** member handle and runs `ConfiguredAgentExecutionHandle.prepareConfiguredActivation()` for each (AgentRun candidate + provider session/thread). Their bindings are staged and committed with the task tree, then every member is published live. The coordinator then gets the work packet through `acceptSeed → teamRun.postMessage(workPacket, coordinatorAgentRunId)`.

Every other Team entrypoint (`team-root-materializer`, `RootTeamExecutionDirectory.prepareConfigured`, `CollaboratorTeamExecutionRegistry`, `restoreRootTaskTeam`, `TaskTeamExecutionRegistry` restore) already passes `prepareConfiguredAgents: false`. Members then activate on first input through `ConfiguredAgentExecutionHandle.ensureReady()` (from `postMessage` / `reserveInput`), which plans fresh/restore, commits the provider binding through the root's `commitPlatformBindingChange` callback, and publishes the run. Unactivated members report `offline` (`FlatTeamAgentExecutionHandle.getLeafAgentStatusSnapshots`).

The eager task-Team policy is a remnant: `flat-agent-organization-model-follow-up` moved configured roots to lazy and explicitly kept task preparation eager (its design-spec lines 220, 275) as a scope boundary, not as a product decision.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small` (re-confirmed in SR-003)
- Size rationale: SR-002: one policy change at two call sites plus removal of the eager Team-preparation plumbing. SR-003 adds a bounded refactor inside one owner (`ConfiguredAgentExecutionHandle`), one internal event variant removal, and one input-contract code. No new owner, no persistence change.
- Architectural risk: **`High`** (raised in SR-003; was `Low` in SR-002)
- SR-003 risk rationale: the refactor changes the shared member-activation failure path used by every Team, Org and collaborator member (not only delegated copies), changes the activation-failure code vocabulary that reaches clients through operation results (`AgentOperationResult.code`, `AgentRunInputRejectionCode`), and removes an internal event variant. Blast radius is every Team/Org member's first input. The SR-002 design also traced the wrong teammate-delivery path, so independent review of this revision is warranted (code reviewer recommendation, CRR-002).
- SR-002 risk rationale (for the lazy-activation part; still valid): The target path (lazy member activation inside a task Team, with late binding commit to the root tree) is already the production path for restored delegated copies in all three root kinds (BEH-004), and for every configured/collaborator Team. No change to `delegate_task` contract, persisted schema, security boundary, or ownership. Lifecycle timing of non-coordinator members moves from dispatch to first work, which is the same lifecycle those members already have after a restore. Coordinator activation moves into the seed delivery, which is the same `postMessage → ensureReady` path used for collaborator Teams.
- Escalation trigger: If implementation finds that seed delivery to a not-yet-activated coordinator inside a just-committed task Team fails (e.g. tree/binding commit ordering, event-gate ordering, operation-gate re-entry), or that any root's binding mutator cannot see task-Team members, stop and return `Design Impact`. SR-003: also return `Design Impact` if the shared start step cannot express a failure without changing callers above the handle (delivery services, engine, roots).

## Architecture Investigation Evidence

| Source | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `agent-collaboration/execution/backends/root-team-execution-directory.ts:137-187` | Root-hosted task Team: `prepareConfiguredAgents: true`; seeds via `prepared.teamRun.postMessage(message, coordinator.agentRunId)` | Change 1 | None |
| Code | `agent-team-execution/local/registries/task-team-execution-registry.ts:76-115` | Team-hosted task Team: same flag | Change 2 | None |
| Code | `agent-team-execution/local/flat-team-execution-factory.ts:47-160`; `flat-team-execution-manager.ts:91-96`; `prepare-flat-team-configured-activation.ts` | Only consumers of the flag/eager path; after the change no production caller passes `true` | Removal plan | None |
| Grep | `grep -rn "prepareConfiguredAgents\|stagedNoConversationBindingReplacements\|\.stagedPlatformBindings" src` | `PreparedFlatTeamExecution.stagedPlatformBindings`/`stagedNoConversationBindingReplacements` read only by the two task-Team preparations; single-Agent task preparations stage their own bindings via `handle.prepareConfiguredActivation()` | Remove fields from flat-Team result; task-Team preparations return empty staged bindings | None |
| Code | `agent-collaboration/execution/backends/configured-agent-execution-handle.ts:260-330` | Lazy `ensureReady` commits binding via callback before publication | Reuse, no new mechanism | None |
| Code | `standalone-root-tree-mutator.ts:75-116`; `team-run-execution-tree-mutator.ts:108+`; `agent-org-run-execution-tree-mutator.ts:94+` | Each root's binding adoption maps every agent in the tree including task executions' members; requires `platformAgentRunId` null-or-equal | Late binding works in all roots (resolves U-001) | Prove by test (AC-003) |
| Code | `root-task-dispatch.ts` | Tree commit + `replaceTree` happen before `acceptSeed`; seed failure → dispatch failure (as today) | Coordinator start failure still fails `delegate_task` (REQ-005) | None |
| Code | `RootOperationGate` | Counter gate, not exclusive; binding commit inside delegation re-enters safely | No ordering change needed | None |
| Code | `ConfiguredAgentActivationPlanner.resolvePlan` | `restore` mode + external + no conversation + prior binding → `replace_external_without_conversation` | Legacy eagerly bound copies restore lazily without migration | None |
| Data | User's `collaboration_tree.json` | Existing copies have bindings for all members | Directly usable | None |

## Intended Change

Delegated Team copies are prepared like every other Team: scope only, no member activation. The coordinator starts when the delegated work is delivered to it; other members start when work reaches them. Remove the eager flat-Team preparation path, which has no remaining production caller.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing Behavior | Approved Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001,003,004,005; AC-001,003,004,007 | `delegate_task` to a Team (any root/host), Task helper bring-in | All members activated at dispatch | Only coordinator activates, inside seed delivery | DS-001 |
| BEH-005 | System | REQ-002,003,005; AC-002,004 | Teammate message / handoff / user input to a not-started member | (Members already live) | Member activates on that input via `ensureReady` | DS-002 |
| BEH-004 | System/Operational | REQ-006; AC-005 | Idle shutdown → restore, restart, Task DONE/reopen | Lazy on restore | Preserved; also for new copies with never-started members | DS-003 (unchanged) |
| BEH-002/003/006 | User/System | REQ-007; AC-006 | UI Team start; `send_message_to` Team; delegate single Agent | Lazy / lazy / immediate | Preserved unchanged | Unchanged paths |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` / `Behavior Change`
- Current design issue found: `Yes`
- Structural triggers: **Legacy-cleanup trigger** fires — the eager preparation branch (`prepareConfiguredAgents`, `FlatTeamExecutionManager.prepareConfiguredActivation`, `prepare-flat-team-configured-activation.ts`, staged-binding fields on `PreparedFlatTeamExecution`) exists only to keep task Teams on an old policy. **Duplicated policy** trigger: activation policy is chosen per call site by a boolean, giving two lifecycles for the same Team kind (fresh copy eager, restored copy lazy). Ruled out: ambiguous-boundary (no API change), authoritative-boundary (callers keep using directory/registry), persisted-data trigger (no schema change).
- Root cause classification: `Missing Invariant` — "Team scope admission is not member activation" was enforced for configured/collaborator/restored Teams but not for fresh task Teams.
- Refactor needed now: `Yes`, bounded — remove the flag and the eager path so the invariant holds structurally (flat Team preparation never activates members).
- Evidence: Investigation rows above; prior ticket design-spec `flat-agent-organization-model-follow-up` lines 14-16, 68, 220, 275.
- Design response: Remove the option; flat Team preparation is always scope-only. Task-Team preparations return `stagedPlatformBindings: []`.
- Refactor rationale: Keeping a boolean with no `true` caller would be dead legacy; keeping it with `true` is the bug.
- Deferrals / residual risk: Existing live copies keep eagerly started members until idle shutdown/restart (R-002, approved out of scope).

## Terminology

- *Scope-only preparation*: a TeamRun and its member handles' contexts exist and are registered, but no member AgentRun/provider session is created.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Removed in scope: see Removal / Decommission Plan. No flag, fallback, or setting to restore eager task-Team activation.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject: task Team member records `{address, agentRunId, platformAgentRunId: string|null}` in each root's `collaboration_tree.json` / team/org execution tree.
- Change: new copies save `null` for members that never started; bindings are adopted later when they start. Shape unchanged.
- Normal reader/writer: tree mutators adopt bindings for null entries; restore planner handles `null` (→ new) and "bound but no conversation" (→ `replace_external_without_conversation`).
- Required semantics: continuation of members that had conversations; consistent identity.
- Decision: `Directly Usable — No Migration`.
- Rationale: The nullable binding is already the current schema and already written for restored and configured members; old eagerly bound copies are read by the same version-agnostic planner.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Delegator's `delegate_task` to a Team | Coordinator running the work; others offline | `RootTaskExecutionLifecycle` / `dispatchTaskCopy` | Where eager activation is removed |
| DS-002 | Primary | Teammate `send_message_to` / handoff to a not-started member | Member running the message | Member's `ConfiguredAgentExecutionHandle` | First-work activation |
| DS-003 | Secondary | Idle grace / restart / DONE / reopen | Copy shut down or restored | `RootTaskExecutionLifecycle` + host adapters | Must tolerate never-started members (unchanged code) |
| DS-004 | Return/Event | Member status change | Sidebar/header dot | Root event publication → frontend | Shows offline until started |

## Primary Execution Spine(s)

- DS-001: `delegate_task tool → Root (operation gate) → RootTaskExecutionLifecycle.delegate → dispatchTaskCopy → adapter.planActivation → RootTeamExecutionDirectory.beginRootTaskTeam | TaskTeamExecutionRegistry.beginPreparation (scope-only) → tree commit (members bindings null) → acceptSeed → TeamRun.postMessage(coordinator) → coordinator handle ensureReady (activate + commit binding) → coordinator runs`
- DS-002 (corrected in SR-003; the SR-002 trace through `postMessage` was wrong, CR-FO-002): `sender send_message_to (MCP tool) → root delivery (task live lease, assertMessageScope) → RootCommunicationEngine.deliver (assertDeliveryAllowed) → adapter.reserveRecipientInput → <root>.delivery.reserveAgentInput → rootAgents.reserveInput | TeamRun.reserveDirectAgentInput → FlatTeamExecutionManager.reserveDirectAgentInput → FlatTeamAgentExecutionHandle.reserveInput → ConfiguredAgentExecutionHandle.reserveInput → startForInput (DS-005) → ensureReady → root commitPlatformBindingChange → AgentRun publish → AgentRun.reserveUserMessage → engine commitAppend → running`. `postMessage` serves operator/command input and the delegated seed (DS-001) only.

## Spine Narratives (Mandatory)

- **DS-001**: Delegation validates and plans the copy as today. Preparation now builds the TeamRun and member contexts without creating any AgentRun. The task execution is committed to the root tree with `platformAgentRunId: null` for every member and the copy is published (task-execution-started event). Seed acceptance posts the work packet to the coordinator; the coordinator's handle publishes `initializing`, activates, commits its binding to the root tree, publishes the AgentRun, and runs. If the coordinator cannot start, seed acceptance fails and dispatch handles it exactly as a seed failure today (mark failed, release, `target_agent_run_id: null` or indeterminate error).
- **DS-002** (corrected in SR-003): teammate delivery reserves input through `ConfiguredAgentExecutionHandle.reserveInput`. A member that cannot start returns `{ reserved: false, code: "AGENT_RUN_ACTIVATION_FAILED", message }` from the shared start step (DS-005); the engine maps it to a not-accepted delivery for the sender, and the member shows `error`.
- **DS-003**: Unchanged code. Idle-shutdown, quiescence and termination already treat members without handles as offline/terminated (`tryPrepareTerminationIfQuiescent` → completed termination when no handle).
- **DS-004**: Unchanged. Not-started members report `offline` → gray "Offline" (DEC-001 A).

## Spine Actors / Main-Line Nodes

`RootTaskExecutionLifecycle`, `dispatchTaskCopy`, host task adapters (Standalone / Team / Org), `RootTeamExecutionDirectory` / `TaskTeamExecutionRegistry`, `FlatTeamExecutionFactory`, `TeamRun`, `ConfiguredAgentExecutionHandle`.

## Ownership Map

| Owner | Owns | Change |
| --- | --- | --- |
| `FlatTeamExecutionFactory` / `beginFlatTeamPreparation` | Flat TeamRun construction and private release | Always scope-only; no member activation |
| `RootTeamExecutionDirectory.beginRootTaskTeam`, `TaskTeamExecutionRegistry.beginPreparation` | Task Team preparation, sealing, seed release | Stop requesting member activation; staged bindings empty |
| `ConfiguredAgentExecutionHandle` | Member activation + binding commit | Unchanged; sole activation owner for Team members |

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — no facade changes.

## Removal / Decommission Plan (Mandatory)

| Item | Path | Action |
| --- | --- | --- |
| `prepareConfiguredAgents` option and parameter | `flat-team-execution-factory.ts` (`beginMaterialization` input, `beginFlatTeamPreparation` input), `task-team-execution-factory.ts` (both input types and the pass-through), all call sites (`root-team-execution-directory.ts` ×3, `collaborator-team-execution-registry.ts`, `task-team-execution-registry.ts` ×2, `team-root-materializer.ts`) | Remove |
| Eager branch in `beginFlatTeamPreparation.prepare()` (`activation`, `activation?.commitAfterDurability()`) | `flat-team-execution-factory.ts` | Remove |
| `stagedPlatformBindings`, `stagedNoConversationBindingReplacements` on `PreparedFlatTeamExecution` | `flat-team-execution-factory.ts` | Remove; task-Team preparations return `stagedPlatformBindings: Object.freeze([])` |
| `FlatTeamExecutionManager.prepareConfiguredActivation()` | `flat-team-execution-manager.ts` | Remove |
| `prepareFlatTeamConfiguredActivation` | `agent-team-execution/local/prepare-flat-team-configured-activation.ts` | Delete file |
| Keep | `FlatTeamAgentExecutionHandle.prepareConfiguredActivation`, `ConfiguredAgentExecutionHandle.prepareConfiguredActivation` | Still used by single-Agent task preparation (`task-agent-execution-registry.ts:149`, `root-agent-execution-registry.ts:140`) |
| Keep | `cancelPrivateActivation` / `releasePrivateActivation` | Still release handles created by first work before publication/after cancel |

## Return Or Event Spine(s) (If Applicable)

DS-004 unchanged.

## Bounded Local / Internal Spines (If Applicable)

`ConfiguredAgentExecutionHandle.ensureReady`: `assertInputAllowed → prepareActivation (plan fresh/restore) → commitPlatformBindingChange → commitPublication → bindEvents`. Unchanged.

## Off-Spine Concerns Around The Spine

Root tree binding mutators (persist late bindings) — unchanged. `TaskAgentDurabilityEventGate` in `beginRootTaskTeam` — unchanged; events from later activation flow after `releaseToLive`.

## Ownership Boundaries

Activation of a Team member is owned only by its handle on first input. Preparation owners own scope, not member runtime.

## Boundary Encapsulation Map

Unchanged; no caller gains new access.

## Dependency Rules

- Flat Team preparation must not call member activation.
- Task adapters must not special-case Team staged bindings (they keep iterating `stagedPlatformBindings`, which is empty for Teams).

## Interface Boundary Mapping

| Interface | Change |
| --- | --- |
| `FlatTeamExecutionFactory.beginMaterialization(input)` | `prepareConfiguredAgents` removed |
| `beginFlatTeamPreparation({ teamRun, manager })` | `prepareConfiguredAgents` removed |
| `TaskTeamExecutionFactory.beginTaskTeam / restore input` | `prepareConfiguredAgents` removed |
| `PreparedFlatTeamExecution` | two staged-binding fields removed |
| `TaskExecutionPreparation` (`stagedPlatformBindings`) | Unchanged type; Team variants return `[]` |

## Interface Boundary Check

Each interface keeps one subject; removing a boolean mode reduces surface.

## Main Domain Subject Naming Check

No renames.

## Existing Capability / Subsystem Reuse Check

Reuses lazy handle activation and root binding mutators; no new helper.

## Subsystem / Capability-Area Allocation

`autobyteus-server-ts/src/agent-team-execution/local` and `agent-collaboration/execution/backends`. No frontend change.

## Draft File Responsibility Mapping

See Final mapping.

## Reusable Owned Structures Check

None needed.

## Shared Structure / Data Model Tightness Check

`PreparedFlatTeamExecution` is tightened (two always-empty fields removed).

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `src/agent-team-execution/local/flat-team-execution-factory.ts` | Modify: remove option, eager branch, staged fields |
| `src/agent-team-execution/local/task-team-execution-factory.ts` | Modify: remove option from inputs and pass-through |
| `src/agent-team-execution/local/flat-team-execution-manager.ts` | Modify: remove `prepareConfiguredActivation` + import |
| `src/agent-team-execution/local/prepare-flat-team-configured-activation.ts` | Remove |
| `src/agent-collaboration/execution/backends/root-team-execution-directory.ts` | Modify: drop option at 3 sites; task Team returns `stagedPlatformBindings: Object.freeze([])` |
| `src/agent-team-execution/local/registries/task-team-execution-registry.ts` | Modify: drop option at 2 sites; empty staged bindings |
| `src/agent-team-execution/local/registries/collaborator-team-execution-registry.ts` | Modify: drop option |
| `src/agent-team-execution/services/team-root-materializer.ts` | Modify: drop option |
| Tests (see Guidance) | Modify/Add |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` (and `standalone_agent_run_root.md` / `agent_orgs.md` where task Teams are described) | Docs sync by Delivery: delegated Team copies start only the coordinator; members activate on first work |

## Applied Patterns (If Any)

None new.

## Target Subsystem / Folder / File Mapping

Unchanged folders; one file deleted.

## Folder Boundary Check

No change.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

```ts
// root-team-execution-directory.ts beginRootTaskTeam (target)
const factoryControl = this.factory.beginMaterialization({
  physicalScope: input.physicalScope, teamNode: input.task.teamNode, handoffs: input.task.handoffs,
  applicationBinding: null, activationMode: "fresh", callbacks,
});
// ...prepare result:
stagedPlatformBindings: Object.freeze([]),   // members bind on first work
```

`activationMode: "fresh"` stays: a member's first activation in a fresh copy must plan `new` (and assert no prior conversation).

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Reason |
| --- | --- | --- |
| Keep `prepareConfiguredAgents` defaulting to false | Rejected | Dead mode; one Team preparation lifecycle |
| Setting/flag to re-enable eager task Teams | Rejected | User: "There's no exception here" |
| Migrate existing trees to null unused bindings | Rejected | Directly usable; planner handles bound-without-conversation |
| Frontend-only gray override | Rejected | REQ-003 forbids display-only fix |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Remove the option from the two task-Team call sites; make task-Team preparations return empty staged bindings.
2. Remove the option from the factory, task-team factory and remaining call sites; delete the eager branch, the manager method, the helper file and the staged fields.
3. Update tests (below); run focused unit + integration suites and `tsc`.
4. API/E2E: real-app check per AC-001/002/007.

## Key Tradeoffs

Failure of an unused member surfaces at first work instead of at delegation (REQ-005, approved); in exchange, no resources for unused members and one Team lifecycle.

## Risks

- R-1: Coordinator seed delivery now includes activation; slower `delegate_task` return is not expected to change materially (activation already happened before seed). Verify seed-failure path still releases cleanly (AC-004 coordinator case).
- R-2: Tests that used eager task-Team preparation to cover private release of activated members (`flat-team-private-release-independence.test.ts`, `tests/fixtures/task-release-generation-fixtures.ts`) need re-basing on first-work activation; do not drop their release-safety intent.
- R-002 (requirements): already-live copies keep their members until shutdown.

## Guidance For Implementation

- Tests to update: `tests/unit/agent-team-execution/flat-team-private-release-independence.test.ts`, `tests/unit/agent-team-execution/flat-team-execution-factory.test.ts`, `tests/fixtures/task-release-generation-fixtures.ts`, `tests/unit/agent-collaboration/task-agent-resource-quiet-generation.test.ts`, `tests/integration/collaboration-definition-admission/org-owned-team-local-agent.test.ts:191` (assertion on the removed option), plus any test asserting all task-Team members are live/bound after delegation (`task-delegation-tool-lifecycle.integration.test.ts`, `root-task-team-terminal-publication.test.ts`, `task-terminal-publication-lifecycle.test.ts`, `agent-org-task-publication.test.ts`, `mixed-team-run-backend.integration.test.ts`). Where a test needs an activated member, activate it by delivering input to that member.
- Add executable coverage:
  - AC-001/QR-001: delegating an N-member Team from a standalone root activates exactly one AgentRun (coordinator); other members report `offline` and have `platformAgentRunId: null` in the saved tree.
  - AC-002: message to a non-coordinator member activates it, adopts its binding in the tree, and status goes initializing → running.
  - AC-003: same as AC-001 for Team-hosted (`TaskTeamExecutionRegistry`) and Org-root delegation.
  - AC-004: non-coordinator activation failure → sender gets not-accepted result, member error status, coordinator unaffected; coordinator activation failure → `delegate_task` returns failure as today.
  - AC-005: idle shutdown + restore with never-started members; and a legacy tree where unused members have bindings but no conversation restores and keeps them offline.
- Follow `TESTING.md`; run `tsc -p tsconfig.build.json --noEmit` and the affected unit/integration suites.


---

## SR-003 Design Revision — one member start-failure step (CRR-002 / CR-FO-003)

Authoritative where it differs from the SR-002 sections above. Requirements are unchanged (REQ-005 / AC-004 already require this outcome); no renewed approval is needed. The user approved the refactor direction (relayed in CRR-002).

### Trigger and evidence

- API/E2E DTL-003 (AC-004, member branch) failed: a lead's `send_message_to` to a not-started writer that cannot start (`AGY_MODEL_UNAVAILABLE`) returned MCP `-32603`, and the writer stayed `offline`.
- Root cause (code review CRR-001/CRR-002; verified in AINV-009..012): teammate delivery enters the handle through `reserveInput`, which had no start-failure handling. The same failure handling existed only in `postMessage`. One failure was reported through four channels: a thrown error, an unconsumed `readiness_failure` event, the status overlay, and two result shapes with different codes.
- IR-002 (`d30c11204`, not reviewed) added a second copy of the `postMessage` handling to `reserveInput`. It is **superseded** by this revision; implementation replaces it, not extends it.

### Design health (this revision)

- Root cause classification: `Duplicated Policy Or Coordination` (activation-failure policy repeated per input entry point and drifted) plus `Shared Structure Looseness` (four failure channels, two code vocabularies).
- Refactor needed now: `Yes`, bounded to `ConfiguredAgentExecutionHandle`, `collaboration-agent-execution-event.ts` and `agent-run-input-contract.ts`.
- Deferred (separate cleanup ticket, user-agreed; residual risk accepted): `AgentRun.postUserMessage` reusing reserve-then-commit and the compaction-recovery difference; merging the three root delivery/communication adapters; auditing the handle's lifecycle states; duplicated checks in `AgentRunInputAdmissionState.admit()`; and the post-start input-rejection asymmetry (postMessage sets an `error` overlay when the started run rejects input; reserveInput does not). These do not affect REQ-005 because they concern started runs or layers above the handle.

### DS-005 — Bounded local spine: `ConfiguredAgentExecutionHandle.startForInput()`

One private step owns "start this member for an input, or report why it could not":

```
startForInput():
  publish command status "initializing"            (no-op once a run exists, as today)
  try   return { started: true, run: await ensureReady() }
  catch (error)
    if a run is active:                  rethrow                 (unexpected failure on a live run; unchanged rule)
    if input is closed for this member:  return { started: false,
           (input fence or root-shutdown fence rejects now)       code: "AGENT_RUN_NOT_ACCEPTING_INPUT",
                                                                   message: <fence message, e.g. Task DONE guidance> }
                                         and clear the initializing overlay (no error status: the member is closed, not broken)
    otherwise:                           publish "error" overlay with the cause
                                         return { started: false, code: "AGENT_RUN_ACTIVATION_FAILED",
                                                  message: <cause> }
```

- `<cause>` names the underlying failure: its code when it carries one (e.g. `AGY_MODEL_UNAVAILABLE`, `COLLABORATION_AGENT_CONTINUATION_BINDING_MISSING`) followed by its message, without duplicating the code if the message already starts with it.
- Why the closed-input branch (refinement of CR-FO-003 item 1): `ensureReady()` first runs the input fence. Without this branch, a Task-DONE or root-shutdown rejection would be reported as an activation failure and turn the member red. Upstream checks (`assertMessageScope`, `assertDeliveryAllowed`, live lease) normally reject closed members before the handle, so this branch covers only the race, but it must not mislabel it.
- Retry semantics are unchanged: `initializeReady` keeps deciding retry-safety; no new retry behavior.

Callers:

- `reserveInput(message, options)`: `startForInput()`; on `started: false` return `{ reserved: false, code, message }`; otherwise `assertInputAllowed()` then `run.reserveUserMessage(...)` as today.
- `postMessage(message)`: `startForInput()`; on `started: false` return `{ accepted: false, code, message, agentRunId, displayName }`; otherwise post as today (including the existing `error` overlay when the started run rejects the input, and `member_input` on acceptance). Neither method keeps its own readiness try/catch.

### Contract decisions

| Item | Decision |
| --- | --- |
| `AgentRunInputRejectionCode` | Keep `AGENT_RUN_ACTIVATION_FAILED` (added in IR-002) as the single activation-failure code; `AGENT_RUN_NOT_ACCEPTING_INPUT` (existing) for the closed-input branch |
| `AgentOperationResult.code` from `postMessage` readiness failure | Changes from the underlying code (e.g. `COLLABORATION_AGENT_CONTINUATION_BINDING_MISSING`) to `AGENT_RUN_ACTIVATION_FAILED`; the underlying code moves into `message`. Evidence: no production code branches on these codes (AINV-011); `agent-collaboration-stream-handler.ts:157-164` only forwards code+message for display |
| `readiness_failure` event | Remove the variant from `CollaborationAgentExecutionEvent` and its emission in `initializeReady` (no consumer, AINV-010). The status overlay is the only member-facing failure channel |
| `readinessFailureCode()` | Remove (replaced by the cause formatting in `startForInput`) |

### Files (SR-003 delta)

| File | Change |
| --- | --- |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts` | Add private `startForInput()`; `reserveInput` and `postMessage` use it; remove IR-002's duplicated catch, `readinessFailureCode`, and the `readiness_failure` emission in `initializeReady` |
| `autobyteus-server-ts/src/agent-collaboration/execution/domain/collaboration-agent-execution-event.ts` | Remove `readiness_failure` variant; fix any exhaustive switches |
| `autobyteus-server-ts/src/agent-execution/input/agent-run-input-contract.ts` | Keep `AGENT_RUN_ACTIVATION_FAILED`; doc comment covers both result shapes |
| Tests | See below |

No change to delivery services, roots, engine, frontend or persisted data.

### Tests (SR-003)

- Handle-level unit cases, both entry points (`postMessage`, `reserveInput`): activation failure → typed failure with `AGENT_RUN_ACTIVATION_FAILED`, message containing the underlying code, member `error` overlay; closed input during activation → `AGENT_RUN_NOT_ACCEPTING_INPUT`, no `error` overlay; failure while a run is active → rethrow.
- Keep IR-002's reservation-path cases per root kind (standalone, Team, Org).
- Update tests that asserted specific activation codes on `code` (`configured-root-first-work.test.ts:118-119,143-144`) to assert `AGENT_RUN_ACTIVATION_FAILED` and the underlying code in `message`; update tests that expected `readiness_failure` events (`flat-team-member-release-independence.test.ts:71`, `task-agent-execution-registry-memory.test.ts:35`) to assert the status overlay instead, keeping their release-safety intent.
- DTL-003 (durable E2E) needs no change. Existing AC-006 suites must pass.

### Residual risks

- CAND-005 (accepted): UI-started Team/Org members that cannot start on a teammate message now return the approved not-accepted result and `error` status instead of JSON-RPC `-32603`. This is the REQ-005 intent ("same as UI-started Teams").
- Operator-facing code for a member start failure becomes `AGENT_RUN_ACTIVATION_FAILED` (cause kept in the message).

### Change sequence

1. Revert IR-002's `reserveInput` catch while introducing `startForInput()` (one commit; no intermediate duplicate).
2. Remove `readiness_failure` and `readinessFailureCode`.
3. Update/add tests; run focused unit/integration suites, `tsc`, then the gated DTL suite.
4. Independent source review, then API/E2E rerun.


---

## SR-004 Correction — keep `readiness_failure` as the member's conversation error card (implementation DI-001)

Authoritative over the SR-003 section where they differ. Requirements unchanged; this correction **restores** approved behavior (BEH-002 / REQ-007) that SR-003 would have removed by mistake.

### Evidence (AINV-013, corrects AINV-010)

- `collaboration-agent-presentation-event-adapter.ts:86-97`: after the `agent_run`, `member_input` and `status_overlay` branches, the final un-named fall-through turns `readiness_failure` into an `ERROR` presentation event (`errorScope: runtime`, `errorEffect: terminal`).
- All three roots publish member events through this adapter: `standalone-agent-run-root.ts`, `agent-org-run.ts`, `team-flat-execution-callbacks.ts:41-70`.
- Frontend: `agentStreamMessageProjector.ts:198` → `agentStatusHandler.ts:122-161` `handleError` adds an error card with code and cause to the member's conversation and marks the conversation complete.
- So today every member start failure shows an error card in that member's conversation, for UI-started Teams/Orgs too. AINV-010 (and CRR CAND-002) searched for the string and missed the implicit branch. SR-003 item "remove `readiness_failure`" would silently drop the card and change REQ-007 behavior without approval.

### Decision (implementation option A)

Each member start failure has exactly one owner per audience. None of them duplicates another:

| Audience | Channel | Owner |
| --- | --- | --- |
| Sender of the input | typed result (`AGENT_RUN_ACTIVATION_FAILED` / `AGENT_RUN_NOT_ACCEPTING_INPUT`) | `startForInput()` |
| Member status dot/header | `error` status overlay | `startForInput()` |
| Member conversation | `readiness_failure` → `ERROR` card | `initializeReady()`, emitted once per failed start attempt (as today) |

The only removals are the duplicated per-entry-point readiness handling, plus IR-002's copy of it.

Changes to the SR-003 section:

1. **Keep** the `readiness_failure` variant in `CollaborationAgentExecutionEvent` and its single emission in `initializeReady`. Strike SR-003's "remove `readiness_failure`" item and its test updates for `flat-team-member-release-independence.test.ts:71` / `task-agent-execution-registry-memory.test.ts:35`; those assertions stay.
2. **Make the adapter branch explicit**: in `CollaborationAgentPresentationEventAdapter.adapt`, handle `rawEvent.kind === "readiness_failure"` by name, and end with an exhaustive `never` check. A future variant then cannot fall through into an error card unnoticed. The output is unchanged.
3. **Closed input is not a failure card either.** `initializeReady` must not emit `readiness_failure` when the failure is the input fence, i.e. the member is closed for input at failure time. Use the same private "input closed now" predicate as `startForInput` (AR-NB-002). This matches the approved closed-input branch, which is reported as not accepting input with no `error` status, and it can occur only in the PREM-001 Task DONE race. Every other start failure keeps emitting the card exactly as today.
4. Everything else in SR-003 stands:
   - `startForInput()` is shared by `reserveInput` and `postMessage`;
   - one activation-failure code on both result shapes, with the cause in the message;
   - AR-NB-001: one cause helper, also used by the indeterminate wrapper;
   - AR-NB-002: re-check closed input, and clear only our own `initializing`;
   - AR-NB-003: `postMessage` after a successful start is unchanged;
   - DS-002 corrected.

### Tests (SR-004 additions)

- Both entry points (`postMessage`, `reserveInput`): a start failure produces exactly one `readiness_failure` event → one `ERROR` presentation event for the member, plus the `error` overlay and the typed result.
- Closed-input race: no `readiness_failure`, no `error` overlay, and `AGENT_RUN_NOT_ACCEPTING_INPUT`.
- Adapter: `readiness_failure` maps to the same `ERROR` event as before (an explicit-branch regression test).
- Existing `readiness_failure` assertions remain. DTL-003 is unchanged.

### Classification

Unchanged: `task_size=Small`, `architectural_risk=High` (same shared path; the correction narrows the change surface). The design changed after ARCH-REV-001, so it goes back to independent architecture review before implementation resumes.
