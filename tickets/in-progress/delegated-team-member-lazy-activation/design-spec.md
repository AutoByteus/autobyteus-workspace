# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline: `requirements-doc.md` SR-001 baseline (REQ-001..007, AC-001..007), with DEC-001 = **A** (not-started members use the existing gray "Offline" state). User approval 2026-10-08: "I think this is clear because in other places we almost start the worker lazily. We should do it here. There's no exception here. Go, I think it's approved." (reply to "Shall I take that as 'approved, A'…").
- Behavior-defining supplements: None.
- Design status: `Ready`
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

- Task size: `Small`
- Size rationale: One policy change at two call sites plus removal of the now-unused eager Team-preparation plumbing (one file deleted, three files simplified), and test updates. No new owner, API, contract, or persistence shape. Content inventory: none.
- Architectural risk: `Low`
- Risk rationale: The target path (lazy member activation inside a task Team, with late binding commit to the root tree) is already the production path for restored delegated copies in all three root kinds (BEH-004), and for every configured/collaborator Team. No change to `delegate_task` contract, persisted schema, security boundary, or ownership. Lifecycle timing of non-coordinator members moves from dispatch to first work, which is the same lifecycle those members already have after a restore. Coordinator activation moves into the seed delivery, which is the same `postMessage → ensureReady` path used for collaborator Teams.
- Escalation trigger: If implementation finds that seed delivery to a not-yet-activated coordinator inside a just-committed task Team fails (e.g. tree/binding commit ordering, event-gate ordering, operation-gate re-entry), or that any root's binding mutator cannot see task-Team members, stop and return `Design Impact`.

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
- DS-002: `sender send_message_to → Root delivery → task live lease → TeamRun.postMessage(member) → FlatTeamAgentExecutionHandle → ConfiguredAgentExecutionHandle.postMessage → ensureReady → root commitPlatformBindingChange → AgentRun publish → running`

## Spine Narratives (Mandatory)

- **DS-001**: Delegation validates and plans the copy as today. Preparation now builds the TeamRun and member contexts without creating any AgentRun. The task execution is committed to the root tree with `platformAgentRunId: null` for every member and the copy is published (task-execution-started event). Seed acceptance posts the work packet to the coordinator; the coordinator's handle publishes `initializing`, activates, commits its binding to the root tree, publishes the AgentRun, and runs. If the coordinator cannot start, seed acceptance fails and dispatch handles it exactly as a seed failure today (mark failed, release, `target_agent_run_id: null` or indeterminate error).
- **DS-002**: Unchanged code; now also exercised for fresh copies. A member that cannot start returns a not-accepted delivery result to the sender and publishes an error status (existing `postMessage` catch path).
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
