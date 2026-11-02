# Design Spec — autobyteus-348 (runtime switch for Team members, Org members and delegated copies)

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` SR-001, `Approved` (the user's request of 2026-11-01; the Solution Designer within the direction). Behavior-defining supplement: `switch-member-record-contract.md` (approved with this design).
- User approval of the design, when the direction requires it: `Not required` (no Task text or user instruction asks for it; the Project Task Manager's rule of 2026-10-31: the Solution Designer asks once only when the direction requires it).
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/investigation-notes.md` (F-01…F-14)
- Authorities read (2026-11-01): `architecture-design.md`, `design-principles.md`, `requirements-engineering.md`, `ticket-scope.md`; `DESIGN.md`, `GLOSSARY.md`, `TESTING.md`; the autobyteus-316 package (`tickets/done/cross-runtime-resume/`), module docs of Team, Org, collaboration and run history.
- Design-principle conflicts or discrepancies: none new. This change removes the `…ModelConfig` naming drift that 316 left in the Team and Org chains (FU-003, Principle 15).

## Current-State Read

The standalone switch of 316 is complete and on `origin/personal`: a pending switch in the run's metadata; one activation case (`begin` watermark → prepare → validate → archive-and-marker → commit → publish; `discard` on failure); the derived hand-over note; the per-file journal runtime; the chat reader; one pure rule for the save (`buildRuntimeSwitchMetadata`). Members differ in where their record lives and how their root commits it (F-01). Their activation is one class, `ConfiguredAgentExecutionHandle`, built at **two sites** — `RootAgentExecutionRegistry` for the Org and Agent roots and `FlatTeamAgentExecutionHandle` for Team members, with its own cached config, context and commit adapter (F-02) — and their three roots implement one commit *interface* with different mechanics (F-03). A copy's chosen model travels on the stream contracts to the web, which also holds mirrors of the effective-launch rule (F-10, F-11). The extension is therefore: (1) member records gain the optional pending switch (and a copy's choice a runtime); (2) the save paths call one pure rule; (3) the shared handle runs the 316 sequence, and every holder of a member's state refreshes on commit (F-13); (4) the roots' commit seam gets a third change kind with a thrown conflict; (5) readers, the stream contracts and the web learn the runtime; (6) the web unlocks the control and the edit chains get honest names.

## Task Size And Architectural Risk (Mandatory)

- Task size: **Large** — server: run-history records and schemas (the saved structures of Team, Org and copies), three tree mutators and three roots' commit seams, the shared handle (two construction sites) and planner, the Team/Org/delegated save paths (mutators, services, managers, GraphQL), memory discovery and the location read models; **two stream-contract packages** (`autobyteus-collaboration-stream-contracts`, `autobyteus-team-stream-contracts`: sources, tests and built output); web: member rows, delegated rows, drafts, clients, DTO parsers and the effective-launch call sites, generated types; renames across the Team and Org chains; roughly 55 files plus tests.
- Architectural risk: **High** — it changes the persisted structure of every Team, Org and copy record (optional fields), the durable commit of a member's binding in three roots (concurrency, ownership of the persistence lock), and a path every member activation takes; a mistake would affect all restores of members.
- Escalation trigger: a root's persistence cannot carry the new commit kind inside its existing lock; the web DTO projections turn out to need more than the effective runtime; or the activity inspector or restore path of a switched member behaves differently from the standalone run in the built-server case.

## Architecture Investigation Evidence

Evidence is in `investigation-notes.md` F-01…F-14; each design decision cites its finding. F-09 (b), whether the web projections need more than the effective runtime, was settled by the architecture review: they do not (the pending switch is off the wire).

## Intended Change

A stopped Team or Org member, and a stopped delegated copy, can choose another agent runtime and model in its settings; its next input makes the switch real exactly as for a standalone run.

## Change Scope (Mandatory)

- In scope: UC-001…UC-004; REQ-001…009.
- Derived consumers of the changed structures (Principle 11):
  - Record types and their schemas (`run-execution-tree-shared-records.ts`, `run-execution-tree-shared-record-schemas.ts`, `task-agent-team-tree-schema.ts`, `task-agent-own-records.ts`, `task-agent-own-file-schema.ts`, `launch-configuration-source-schema.ts`): optional fields added to the parse and the exact write; absence means none.
  - Tree projections to the web and views (`collaboration-execution-tree-dto-projection.ts`, `team-execution-view-projector.ts`): project the copy choice's runtime; the pending switch is NOT on the wire (the web needs only the effective runtime; the "runtime change pending" hint stays the draft-versus-saved comparison of 316).
  - Restore nodes: `withCopyLaunch`, `restoreTaskAgentNode`, `restoreTaskTeamNode`, the configured-node builders of Team and Org: carry the runtime and the pending switch to the `TeamRunAgentNode`.
  - Memory discovery (`memory-run-discovery.ts`): the open-file rule.
  - The 316 standalone paths: unchanged except that the pure rule and the selection-context function become shared.
  - Token usage, history listings, remote views: read the effective runtime; no change (a runtime change is visible in the next record).
- Deliberately left alone: the Task's later items (FU-004, FU-001, FU-005, FU-008); peer-node copies; application-bound roots; the marker, archive, note, journal and chat reader of 316; the `RunModelConfig*` shared result types (still accurate: they describe the outcome of editing model configuration for every kind).
- Follow-ups: FU-C1 in `follow-ups.md` (converge the three launch-rule mirrors).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | Requirement / AC | Trigger | Existing | Change / preserved | Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, 007, 008; AC-001…003, 009 | Settings save of a stopped Team/Org | Model-only patches | Runtime + model; pending switch | DS-001 |
| BEH-002 | User | REQ-002, 007; AC-004 | Copy choice save | Model-only choice beside the started launch | Runtime in the choice; pending | DS-002 |
| BEH-003 | System | REQ-003…005; AC-005…007 | The member's next input | Restore on own runtime only | The 316 sequence in the shared handle | DS-003 |
| BEH-004 | User | REQ-006; AC-008 | Chat, journal, memory search of the member | Active file; one runtime | 316 readers, plus the open-file rule for members | DS-004 |

## Relevant Supplemental Task Artifacts

`switch-member-record-contract.md` (behavior-defining for the data; approved with this design); `task-follow-ups-316.md` (input).

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` (an extension of a delivered feature).
- Current design issue found: `Yes` — three save paths (standalone, Team/Org patches, copy choice) and their record kinds would each need their own copy of the switch rule; today each has its own "model only" replace. The shared `PendingRuntimeSwitch` and the pure rule avoid three copies.
- Structural triggers that fire: *Repeated coordination* (the "undo / model-only / switch" decision would repeat in three save paths: Principle 13, 11); *Several kinds or forms* (Team member, Org member, task Agent copy, task Team member: traced in F-02/F-05); *Vocabulary drift* (`…ModelConfig` names that now edit more than model configuration: Principle 15).
- Root cause classification: `Duplicated Policy Or Coordination` (the rule would be duplicated) and `Missing Invariant` (nothing yet states where a member's pending switch lives).
- Refactor needed now: `Yes`, bounded — extract the pure rule from `buildRuntimeSwitchMetadata`; generalize `selectionContextFor` and `openRawTraceRuntimeKind` to records; rename the Team/Org chains.
- Design response: D-1…D-10 below.
- Intentional deferrals and residual risk: a member that switches while its Team default is also changing is two patches in one save (planner precedent); the Team/Org stay stopped for the edit.

## Terminology

Per `GLOSSARY.md` and 316: agent runtime, switch, pending switch, hand-over notice, marker, previous agent. New: **member** (a configured Agent of a Team or Org run, or an Agent of a delegated copy) and **record** (the saved entry holding a member's binding): used in the contract; added to `GLOSSARY.md` only if the review finds the words reach users or agents (they are code-level).

## Legacy Removal Policy (Mandatory)

- Removed: the "cannot change runtime kind" rule of the Team and Org patches and its enforcement; `runtime-locked` on configured member rows and delegated rows; `buildRuntimeSwitchMetadata` as a metadata-only function (becomes the shared rule plus an adapter); the old `…ModelConfig` names of the Team/Org chains (list below).
- Compatibility wrappers, dual paths or fallbacks kept: `None` (clean-cut rename, DESIGN rule 9).

## Persisted Data / State Transition Decision

- Stored subjects: (a) Team execution trees (`agent_teams/<team>/…`), Org trees, standalone-root packages and coordinating trees' `taskExecutions`: member and copy records; (b) task agents' own `run_metadata.json` (`taskAgent` section); both gain optional fields (`pendingRuntimeSwitch` on three record kinds; `runtimeKind` on `UserLaunchSelection`). Volume: one optional object per switching member.
- Normal reader/writer behavior: every record is read tolerantly (known fields, unknown ignored) and written exactly (`task-agent-own-records.ts`; "no schema version"); absence means no pending switch and the started runtime.
- Decision: **`Directly Usable — No Migration`**: optional fields with truthful absence (Data Migration Guideline §3, "adding an optional field"). Old data reads exactly as before; no sealed migration; no startup gate.
- Rollback: an older build ignores the unknown optional fields; a member switched by this build reads as a normal member of its new runtime on an older build, with a null session ID (it would start a new conversation on that runtime without the marker). Documented in the release notes.
- Acceptance: AC-001…AC-004, AC-010.

## Design Decisions

| ID | Decision | Requirement |
| --- | --- | --- |
| D-1 | **The pure rule.** `applyRuntimeSelection(binding-record, selection, switchId)` extracted from `buildRuntimeSwitchMetadata` into `run-history/domain/runtime-selection-rule.ts` over a minimal shape `{runtimeKind, llmModelIdentifier, llmConfig, platformAgentRunId, pendingRuntimeSwitch}`; the standalone commit, the Team/Org patch and the copy choice call it through adapters. | REQ-001, 002 |
| D-2 | **Records.** `pendingRuntimeSwitch?` on `ConfiguredAgentExecutionNode`, `TaskAgentExecution`, `TaskTeamAgentExecution` and the matching own-file `taskAgent` section; `UserLaunchSelection.runtimeKind?`; parse and exact write. `TeamRunAgentNode` and `ConfiguredAgentExecutionSpec` gain `pendingRuntimeSwitch?`. | REQ-001, 002, 003 |
| D-3 | **Effective launch with runtime, three mirrors kept in step.** `effectiveCopyAgentLaunch` (server), `collaborationCopyAgentLaunch` and `teamCopyAgentLaunch` (the two contracts' mirrors, called by the web) are all extended to yield the runtime; a parity test runs the three over one fixture matrix and fails if they differ; `withCopyLaunch` applies the server rule to the node. Converging the mirrors into one is a follow-up (FU-001 of this ticket). | REQ-002 |
| D-4 | **Team and Org saves.** The patches carry `runtimeKind`; the mutators resolve the target, validate it as a fresh selection of that runtime when it differs from the saved one (the shared selection-context function, generalized from 316), and apply D-1 to a configured Agent member; the Team/Org default scopes change the default launch only (no binding). | REQ-001, 007 |
| D-5 | **Copy saves.** `DelegatedLaunchChange.selection` carries `runtimeKind`; the selection service validates a different runtime as a fresh selection; the domain function records the choice and, with D-1, a pending switch on **every affected copy member whose effective runtime changes** (a Team-level choice reaches exactly its followers; "started" is not a test: a Team-copy member has no `startedAt` and a native member never has a session ID). The save never reads a member's memory: the planner decides history at activation (DEC-5, M-6), so the same fact is decided in one place for configured members and copies. A running copy is rejected as today. **The save touches no handle** (it runs inside `whileTaskExecutionsStopped`, commits and publishes the selections event). A retained handle is refreshed at **restore**, where `replaceSelection(sourceNode)` replaces `replaceModelChoice` in BOTH implementations (the handle and the Team wrapper) with the same stopped guard — at `root-agent-execution-registry.ts:249` (`restoreTask`) and `task-agent-execution-registry.ts:101` (`restore`) — and refreshes runtime, model, session ID and pending switch (a second guard for M-7). | REQ-002, 005, 007 |
| D-6 | **Activation (one class, two construction sites).** In `ConfiguredAgentExecutionHandle.initializeReady`, when the spec has a pending switch: ask the planner; with conversation history (`present`) run the 316 sequence — `memory.begin(switch)` before the candidate, prepare and validate, `memory.record(ticket)`, `callbacks.commitPlatformBindingChange({kind:"runtime_switch", execution, switchId, platformAgentRunId})`, `commitPublication`. The handle commits whenever there is a binding change (the condition `binding && …` of today is replaced, so a native target with `platformAgentRunId: null` commits too). On any failure before `record` returns, in the failure branch of `initializeReady`: abort the candidate, and only after a confirmed release `memory.discard(ticket)`, keyed to this switch (316 ARCH-F-008). Without history (`none`): a plain `new` candidate and the same commit, no archive. `indeterminate` fails closed with the existing error. The staged path `prepareConfiguredActivation` (fresh task copies) refuses a spec with a pending switch. The Team wrapper's construction site passes the pending switch in its spec and implements the commit adapter for the new kind. | REQ-003, 004, 005 |
| D-7 | **Planner.** A third plan, `switch`, is chosen by the explicit pending field (never by a missing session ID); it never reaches `assertNoPriorConversationActivity` (a switched member has history by design) and never asks the provider to resume. | REQ-003 |
| D-8 | **Commit.** The change kind `runtime_switch` carries the member identity (`execution`), the `switchId` and the session ID or `null`. The record-level step (match the member, guard the `switchId`, set the session ID, clear the pending switch; a missing member or a stale `switchId` throws a conflict) is one function beside D-1; each tree family (Team, Org, standalone-root package; members and every `taskExecutions` list) only locates the member and keeps its own persistence mechanics (Team: `commitExecutionTreeMutation` with `requiresWrite` and the indeterminate-finalization path; Org and Agent roots: `commitTreeMutation`). One tree write under the root's persistence lock, before publication. **After the commit every holder drops the pending switch and takes the binding** (M-7): the handle's spec and session ID; for Team members the wrapper's `config` and `FlatAgentExecutionContext` (inside the adapter, with the existing cache-commit failure path); the root's tree and index by its own `commitAfterDurability`. Test: switch, run ends, next input restores (not switches). | REQ-003 |
| D-9 | **Readers.** `openRawTraceRuntimeKind` generalizes to ONE function over a record's effective runtime and pending switch (the previous runtime while pending, else the effective one). Memory discovery calls it for the Team, Org, task-Team and task-Agent lists; the location read models (`collaboration-execution-location-service.ts`, the Org and Team tree location services, the task-Team listing) carry the effective launch and `pendingRuntimeSwitch`; a task Agent's effective runtime is its user choice's runtime, else the STARTED `taskAgent.runtimeKind` (which never changes). The views mark a pending member. `buildRuntimeSwitch` (316) is generalized from `AgentRunMetadata` to a pair of bindings plus the run ID. | REQ-006 |
| D-10 | **Names (REQ-008).** Server and web, one clean cut: GraphQL `updateStoppedTeamRunModelConfigs` → `updateStoppedTeamRunSelections` with `UpdateStoppedTeamRunSelectionsInput/Result`; the input field `patches` of the Team mutation and `modelPatches` of the Org mutation both become `selectionPatches`; `team-run-delegated-launch-plan.ts` follows the same rename where it names model configs; `StudioRunModelConfigService.updateStoppedTeamRunModelConfigs` → `…Selections`; `AgentTeamRunManager.updateStoppedModelConfigs` and `TeamRunService.updateStoppedModelConfigs` → `updateStoppedSelections`; `team-run-model-config-mutator.ts` → `team-run-selection-mutator.ts` (types `TeamRunSelectionPatch`); `agent-org-run-config-mutator.ts` model parts → `…Selection…` (the workspace patches keep their name); web clients, drafts and generated types. The shared `RunModelConfig*` result types keep their names. | REQ-008 |

## Data-Flow Spine Inventory

| Spine | Scope | Behavior | Start | End | Governing owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Settings save of a stopped Team/Org | The member record holds the new selection and a pending switch | The root's manager (Team: `AgentTeamRunManager`; Org: `AgentOrgRunManager`) in its transition lane | The user's action |
| DS-002 | Primary End-to-End | BEH-002 | Save of a copy's choice | The copy record holds the choice and the pending switch; a live stopped handle holds it too | `DelegatedLaunchSelectionService` with the root manager | The copy variant |
| DS-003 | Primary End-to-End | BEH-003 | A message reaches the switched member | The new agent runs behind the marker with the note | `ConfiguredAgentExecutionHandle` | The ordered heart, shared by every member kind |
| DS-004 | Bounded Local | BEH-004 | Chat/journal/memory search read the member | Earlier conversation, marker, new records; per-file runtime | The 316 readers | Preserved from 316 |

## Primary Execution Spine(s)

DS-001: `Web member row -> existingRunConfigStore (Team/Org draft) -> mutation updateStoppedTeamRunSelections / updateStoppedAgentOrgRunConfig(selectionPatches) -> StudioRunModelConfigService -> TeamRunService / AgentOrgRunService -> AgentTeamRunManager / AgentOrgRunManager (transition lane; refuses a managed, archived or application-bound root) -> resolve targets (mutator) -> validate each changed runtime as a fresh selection (RunModelSelectionService, shared selection context) -> applyRuntimeSelection per configured Agent -> one tree write (existing atomic tree store)`.

DS-002: `Web delegated row -> delegatedLaunchDraftStore -> updateDelegatedLaunchSelections(change.selection.runtimeKind) -> DelegatedLaunchSelectionService -> root manager (stopped copy) -> plan targets (delegated-launch-selection.ts) -> validate -> applyRuntimeSelection on every affected copy record -> one tree write + the copy's own file (composed at load, split at save) -> the selections event`; later, at restore of a retained handle: `replaceSelection(sourceNode)`.

DS-003: `input to the member (user, teammate, delegator) -> [Team: FlatTeamAgentExecutionHandle.getHandle -> createHandle (spec from its config and context)] [Org/Agent roots/task agents: RootAgentExecutionRegistry.createHandle] -> ConfiguredAgentExecutionHandle.startForInput -> ensureReady -> initializeReady -> planner (pending present: history present | none) -> memory.begin -> beginActivation(new).prepare -> validate -> memory.record -> callbacks.commitPlatformBindingChange(runtime_switch) [Team: the wrapper's adapter, then the root] -> root.commitAgentPlatformBindingChange (persistence lock, tree write; every in-memory holder refreshed) -> commitPublication -> AgentRun dispatch -> preface (hand-over derived from the raw traces) -> provider`; on failure: `releaseRuntime(false) -> memory.discard(ticket)`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner | Off-spine |
| --- | --- | --- | --- |
| DS-001 | The Team/Org manager already serializes edits with restore and refuses a running root. The patch now names a runtime; each changed scope is validated as a fresh selection of that runtime; the one pure rule rewrites the member's record (new selection, no session ID, pending with the previous binding; undo and model-only cases as in 316) and the existing atomic tree write saves it. | Root manager | Selection context; fresh-selection validation |
| DS-002 | A stopped copy's choice is recorded beside the started launch; the effective-launch rule yields the new runtime; the pending switch is recorded on every affected copy member whose effective runtime changes; the retained handle is refreshed at restore through `replaceSelection`, so the next input uses it. | Delegated selection service | History check |
| DS-003 | The handle activates every member through one class (two construction sites). A pending switch makes the planner choose `switch`: take the watermark, start a fresh session, archive through the watermark behind the marker, commit the binding and clear the pending switch in the root's durable write, publish. A failed attempt removes only what it wrote. The note is derived from the raw traces when the first input is dispatched (316). | Handle | Planner; memory port; root commit seam |
| DS-004 | Unchanged readers; discovery and views read the open-file runtime through the generalized function. | 316 readers | |

## Spine Actors / Main-Line Nodes

`AgentTeamRunManager`, `AgentOrgRunManager`, `DelegatedLaunchSelectionService`, the mutators and the delegated-selection domain, `ConfiguredAgentExecutionHandle`, `ConfiguredAgentActivationPlanner`, the three roots (`RootTeamRun`, `AgentOrgRun`, `StandaloneAgentRunRoot`), the tree mutators, `RuntimeSwitchMemory` (316 port, implemented by `RuntimeSwitchRecorder`).

## Ownership Map

- The pure rule (`runtime-selection-rule.ts`) owns what a selection does to a binding record and what a committed switch does to it (match, guard, set, clear; conflict on mismatch). Each save path owns finding its records and writing them. The handle owns the activation order (the 316 sequence) for every member kind. Each root owns the durable commit of its tree. The planner owns the plan choice. The 316 memory port, recorder, notice service and readers keep their owners.

## Thin Entry Facades

GraphQL resolvers, `StudioRunModelConfigService`, `TeamRunService`, `AgentOrgRunService`: transport and routing only; none decides the rule.

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by | Notes |
| --- | --- | --- | --- |
| The statement "cannot change runtime kind" in `docs/modules/agent_team_execution.md:165` (the mutators enforce nothing about the runtime: F-14) | The runtime is part of the selection | The updated doc text | Documentation only |
| `runtime-locked` on configured member rows and delegated rows | Same | The runtime control of the single-agent card | Application/remote rows stay read-only |
| `buildRuntimeSwitchMetadata` body | Becomes the shared rule | D-1 | The standalone function stays as an adapter |
| `…ModelConfig` names of the Team/Org chains | Principle 15 | D-10 | List in D-10 |
| `replaceModelChoice` (two implementations, two callers) | Generalized | `replaceSelection`, same stopped guard in both classes | |

Dead code in the touched files (Principle 7): none known; confirm at implementation.

## Return Or Event Spine(s)

N/A (the live marker and note are 316's).

## Bounded Local / Internal Spines

The handle's `initializeReady` switch branch: `plan(switch|new) -> begin -> prepare -> validate -> record -> commit -> publish | abort -> release -> discard`. The failure rules are 316's (design-spec "Activation Sequence" and ARCH-F-007/008): discard only after a confirmed release, keyed guard, bounded reads.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Risk if on the main line |
| --- | --- | --- | --- | --- |
| Selection context (fresh selection when the runtime differs or a switch is pending) | DS-001, DS-002 | The save paths | One function for standalone, Team, Org, copies | Three divergent validations |
| History check | DS-003 | Planner | `AgentConversationActivityInspector` | A marker for a member that never spoke |
| Eligibility (stopped root; copy stopped; not application-bound) | DS-001, DS-002 | Managers | Existing rules, unchanged | |

## Ownership Boundaries / Boundary Encapsulation / Dependency Rules

`agent-collaboration` already depends on `agent-memory` (the planner imports the activity inspector); the handle takes the `RuntimeSwitchMemory` port (type owned by `agent-execution/domain`, 316) through its options with a process default from `agent-memory`, like the inspector, so no new package edge appears and tests inject a fake. The roots call tree mutators of their own family; no root reaches into another's. The web depends on the GraphQL contract only.

## Interface Boundary Mapping

| Interface | Subject | Responsibility |
| --- | --- | --- |
| `updateStoppedTeamRunSelections({teamRunId, selectionPatches[{scopeKind, scopeAddress, runtimeKind, llmModelIdentifier, llmConfig}]})` | A stopped Team's selections | Rename of the model-config mutation; adds the runtime |
| `updateStoppedAgentOrgRunConfig({orgRunId, selectionPatches[…], teamWorkspacePatches[…]})` | A stopped Org's selections and workspaces | `modelPatches` renamed, runtime added |
| `updateDelegatedLaunchSelections({…, changes[{…, selection{runtimeKind, llmModelIdentifier, llmConfig}}]})` | A copy's choice | Runtime added |
| `CollaborationAgentPlatformBindingChange` `{kind:"runtime_switch", execution, switchId, platformAgentRunId\|null}` | A member's durable binding commit | Third kind; a stale `switchId` or a missing member throws a conflict |
| `RetainedAgentExecutionControl.replaceSelection(sourceNode)` (both implementations: the handle and the Team wrapper) | Restore of a retained stopped copy | Generalizes `replaceModelChoice`; same stopped guard; refreshes runtime, model, session ID, pending |
| `applyRuntimeSelection(record, selection, switchId)` | The shared rule | Pure |

Interface boundary check: each singular; identity explicit (run or root ID plus address); ambiguity risk Low.

## Main Domain Subject Naming Check

Names follow 316 (`pendingRuntimeSwitch`, `switchId`, `runtime_switch`). `selection` replaces `modelConfig` where the runtime is now included. `member` and `record` are used only in the contract and design.

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Activation of any member | `ConfiguredAgentExecutionHandle` (one class; sites `RootAgentExecutionRegistry`, `FlatTeamAgentExecutionHandle`) | Reuse and extend (D-6) |
| Plan choice | `ConfiguredAgentActivationPlanner` | Extend (D-7) |
| Durable binding commit under the root's lock | Root `commitAgentPlatformBindingChange` and the tree mutators (three families, two mechanics) | Extend with a kind; the record-level step is shared (D-8) |
| Marker, archive, discard, note, chat reader, journal runtime | 316 | Reuse unchanged |
| Validation of a runtime/model pair | `RunModelSelectionService` | Reuse with the shared selection context |
| Copy choice recording | `delegated-launch-selection.ts`, the three launch-rule mirrors | Extend all; parity test (D-3, D-5) |

## Subsystem Allocation, Reusable Structures, Tightness, File Mapping

Reusable structure: `PendingRuntimeSwitch` (316) and `RunProviderBinding` — no new shape; the new rule file is the only new shared owner. Tightness: one meaning per field; the copy's runtime lives only in its choice (not duplicated into `source`); the pending's `from` is the previous effective binding.

## Target Subsystem / Folder / File Mapping

Server paths under `autobyteus-server-ts/src/`, web under `autobyteus-web/`. Exact files per decision (the implementation lists any additional reader found by the first tests):

| Path | Kind | Responsibility |
| --- | --- | --- |
| `run-history/domain/runtime-selection-rule.ts` | New | D-1 |
| `run-history/services/agent-run-runtime-switch-commit.ts` | Change | Standalone adapter over D-1 |
| `run-history/domain/run-execution-tree-shared-records.ts`, `run-history/store/run-execution-tree-shared-record-schemas.ts`, `task-agent-team-tree-schema.ts`, `task-agent-own-records.ts`, `task-agent-own-file-schema.ts`, `launch-configuration-source-schema.ts`, `agent-run-metadata-types.ts` | Change | D-2: optional fields, parse, exact write |
| `agent-team-execution/domain/team-run-config.ts`, `agent-team-execution/local/flat-team-agent-execution-handle.ts`, `flat-team-execution-context.ts` | Change | `TeamRunAgentNode.pendingRuntimeSwitch?`; the Team wrapper's spec, commit adapter, cache refresh, `replaceSelection` |
| `agent-collaboration/collaborators/collaborator-source-projector.ts`, `agent-collaboration/execution/task/task-team-node-restoration.ts` | Change | D-3 |
| `agent-collaboration/domain/delegated-launch-selection.ts`, `run-history/services/delegated-launch-selection-service.ts`, `standalone-agent-run-root/services/standalone-agent-run-root-manager.ts` (`updateStoppedDelegatedLaunchSelections`), `agent-org-execution/services/agent-org-run-execution-tree-mutator.ts` (`applyAgentOrgDelegatedLaunchSelections`), Team counterpart | Change | D-5 |
| `agent-team-execution/services/team-run-model-config-mutator.ts` → `team-run-selection-mutator.ts`, `agent-org-execution/services/agent-org-run-config-mutator.ts`, `agent-org-execution/domain/agent-org-run-config.ts` | Change/rename | D-4, D-10 |
| `agent-execution/services/stopped-run-selection-context.ts` | Change | Generalized to records (D-4) |
| `agent-team-execution/services/team-run-delegated-launch-plan.ts`, `agent-team-execution/services/agent-team-run-manager.ts`, `team-run-service.ts`, `agent-org-execution/services/agent-org-run-manager.ts`, `agent-org-run-service.ts`, `run-history/services/studio-run-model-config-service.ts`, `api/graphql/types/agent-team-run.ts`, `agent-org-run.ts`, `run-history.ts` | Change/rename | D-4, D-10 |
| `agent-collaboration/execution/domain/configured-agent-execution.ts`, `…/backends/configured-agent-execution-handle.ts`, `configured-agent-activation-planner.ts`, `root-agent-execution-registry.ts` | Change | D-6, D-7, spec and option |
| `agent-collaboration/execution/domain/collaboration-agent-platform-binding.ts`, `agent-team-execution/services/team-agent-platform-binding-committer.ts`, `team-run-execution-tree-mutator.ts`, `agent-org-execution/domain/agent-org-run.ts`, `agent-org-run-execution-tree-mutator.ts`, `standalone-agent-run-root/domain/standalone-agent-run-root.ts` and its mutator, `run-history/domain/runtime-selection-rule.ts` (record-level commit step) | Change | D-8 |
| `run-history/store/agent-run-pending-runtime-switch.ts`, `memory-search/runs/memory-run-discovery.ts`, the location read models and the task-Team listing, `agent-execution/domain/runtime-switch.ts` | Change | D-9 |
| `services/agent-streaming/collaboration-execution-tree-dto-projection.ts`, `team-execution-view-projector.ts`, `agent-collaboration-view-projector.ts`, `agent-org-execution-view-projector.ts` | Change | Project the copy choice's runtime (the pending switch is not on the wire) |
| `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts` (+ tests, built output), `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts` (+ tests, built output) | Change | `userLaunchSelectionDtoSchema` and the snake_case twin gain optional `runtimeKind`/`runtime_kind` (strict schemas); the three effective-launch mirrors yield the runtime; the live event `delegated_launch_selections_changed` carries it through `selection`; parity test |
| Web: `components/run-settings/ExistingRunSettings.vue`, `RunMemberRow.vue`, `RunMembersSection.vue`, `components/workspace/config/ExistingRunConfigEditor.vue`, `stores/delegatedLaunchDraftStore.ts`, `stores/existingRunConfigResultActions.ts:47`, `services/runConfigEditing/*` (Team, Org, hierarchical, delegated clients), `services/collaborators/agentSourceSelectors.ts:77,141`, `utils/runSettings/delegatedLaunchRows.ts:102,114`, `teamRunContextHydrationService.ts:268`, `teamExecutionTreeMutations.ts`, `graphql/mutations/*`, `generated/graphql.ts` | Change | Runtime control on member and delegated rows; patches/changes carry the runtime; the DTO parsers and effective-launch calls know the runtime; renamed operations |
| `GLOSSARY.md`; docs `agent_team_execution.md`, `agent_orgs.md`, `agent_communication.md`, `run_history.md`, `autobyteus-web/docs/settings.md` | Change | Same change |

## Concrete Examples / Shape Guidance

A Team member saved on another runtime: the tree record at `/reviewer` shows the new `launchConfiguration` and `pendingRuntimeSwitch.from` (contract §2). A Team copy's choice: `userLaunchSelection: {runtimeKind:"codex_app_server", llmModelIdentifier, llmConfig, selectedAt}` beside the unchanged `source`, and `pendingRuntimeSwitch` on the member. Avoided: a `if (kind === "team") … else if (kind === "org") …` of the rule in each service (D-1 is one function); an activation path per root.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why considered | Decision |
| --- | --- | --- |
| Keep the old Team/Org names and add runtime fields | Smaller diff | Rejected (Principle 15; FU-003 asked for the rename) |
| A separate switch path per root | Roots differ in storage | Rejected: the handle is shared (F-02) |
| Change a copy's `source` launch to the new runtime | One place | Rejected: DEC-005/AR-005 |
| Decide marker or no marker at the save | Simpler activation | Rejected (DEC-5): the history check belongs to the activation |
| Wait for the Team to be re-stopped per member | — | N/A |

## Change / Refactor Sequence

1. Contracts first: the two stream-contract packages (schemas, mirrors, parity test, built output). Shared core: the pure rule and the record-level commit step (D-1, D-8), the selection context, the optional record fields and schemas (D-2), `TeamRunAgentNode`/spec; tests of the rule and of read/write of old and new records.
2. Activation at both construction sites: planner `switch`, handle sequence and failure branch, commit kind, the three roots' mutators and the Team adapter and cache refresh (D-6…D-8); built-server cases for a Team member (Team site) and an Org member (Org site) first (external↔external, external↔native, failure injection, switch → run ends → next input restores).
3. Saves: Team and Org mutators, managers, services, GraphQL (D-4) with the renames (D-10); then copies (D-3, D-5) with `replaceSelection`.
4. Readers: discovery and views (D-9).
5. Web (in the same cut as the server and the contracts): member and delegated rows, drafts, clients, DTO parsers, effective-launch call sites, generated types.
6. Docs and `GLOSSARY.md`; real run on an isolated instance (Team member Claude → Codex; Org member; a delegated copy) and a browser probe.

## Key Tradeoffs

- One shared activation and one pure rule cost a refactor of three save paths now, and keep the switch identical for every member kind.
- Recording a copy's runtime in its choice keeps the started values immutable at the cost of a wider effective-launch rule.
- The decision "marker or not" at activation keeps the save a quick edit (as in 316).

## Risks

- A copy's facts have one home, its own file, composed with the coordinating tree's link at load and split at save (F-09a); the new optional fields must be added to the compose and split functions and to the own-file schema: covered by the record round-trip tests. The stream contracts are strict: the contracts, the server projections and the web parsers change in one cut (DESIGN rule 9: no old/new side by side).
- Team-level choices for copies reach followers: each following member whose effective runtime changes gets its own pending record (no history read at save); the planner decides at activation.
- The new activation path has two construction sites; a fix in one must be mirrored in the other (the wrapper's cached `config`/context): covered by one built-server case per site.
- Many members may switch at once (default propagation): each makes its own session at its own next input; the hand-over note is per member run.
- The Team/Org must be stopped for the edit (existing rule); a user who wants only one member to continue while the others run cannot: out of scope (product decision for later).
- A usage limit cannot be produced on demand: real runs stop the member by hand, as in 316.

## Guidance For Implementation

- Start from failing tests: (1) the pure rule on the three record shapes; (2) a Team tree with a member pending: save → reload → restore plan is `switch`; (3) the built-server case of 316 (RS-style) for a Team member; (4) the copy record round trip with and without `runtimeKind`.
- Tests (TESTING.md layers): unit — rule (save cases and the commit step: match, stale `switchId` throws, missing member throws, native `null` binding), the parity test of the three effective-launch rules (a server test: the server depends on both contract packages), contract schemas (old and new choices; strict parse of a tree with a runtime in a choice), the Team wrapper's adapter (refresh of `config` and context), "switch → run ends → next input restores" at both construction sites, `prepareConfiguredActivation` refusing a pending spec, schemas (old and new records), mutators (Team/Org target resolution, fresh-selection validation, undo, repeated save), delegated selection domain (agent copy; Team copy with followers; no-history member), planner (`switch` with history/none/indeterminate), handle (sequence and failure injection: prepare throws after the candidate wrote, record throws, commit fails; discard only after confirmed release), roots' commit (match by `switchId`; stale `switchId` throws a conflict), readers; integration — Team/Org/copy activation through the real roots with scripted runtimes; built-server cases for a Team member, an Org member and a copy (external↔native both directions); web — drafts, rows, clients; browser probe of the member settings and the reload; source check for the old names.
- Real run (TESTING.md; isolated instance of the worktree build, throwaway workspace; never the user's data): a Team of two members on Claude; stop; switch one member to Codex; message it; check the folder (archive holds only Claude records), the marker, the note, the other member untouched; the same for an Org member and a delegated copy stopped by hand; the live runs add sessions to the CLIs' history.
- Done means (Task): the user's request delivered for members and copies, shown by tests and a real run on isolated data, finalized on `origin/personal`; the Task's later items follow in the same Task. No release unless asked. Do not write "the user has verified" into any Done-when.

## Design Principles Check

| Principle | Verdict | Note |
| --- | --- | --- |
| DESIGN 1, 4, 5 | Pass | Reuses 316's sequence, port and readers; one new rule file |
| DESIGN 7 | Pass | Optional fields; a bad record affects only its run |
| DESIGN 8, 9, 10 | Pass | No versions in names; clean-cut rename; no stored name changes |
| P1 production reality | Pass, with U-1 | Every claim cites a file and the ones the review corrected (F-02, F-10…F-13) were re-read; F-09 (b) settled by the review |
| P2/P3 spines and ownership | Pass | Four spines; one owner per step |
| P6 supported scenarios | Pass | Stopped Team/Org/copy; no running switch; no peer-node copies |
| P7 dead code | Pass | The locked rows and the "cannot change runtime" rule go |
| P8 clean cut | Pass | No fallback |
| P9 dependency direction | Pass | No new package edge (planner precedent) |
| P11 one owner per fact | Pass | Rule in one file; effective launch in one rule; selection context in one function |
| P13 coordination policy | Pass | The three save paths call one rule; the roots share one commit seam |
| P15 vocabulary | Pass | `selection` replaces `modelConfig` where the runtime is included; shared result types stay accurate |
