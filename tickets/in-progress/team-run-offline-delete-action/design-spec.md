# Design Spec

## Current-State Read

This ticket now contains two distinct facts that must not be conflated:

1. **Released/base workflow (`origin/personal`)**: the parent TeamRun row renders Stop while `team.isActive`; after terminal completion it renders Archive and Delete. Stop and Delete are separate user decisions. Delete is inactive-only and confirmed.
2. **Committed ticket WIP (`f7d65ad75`)**: the backend now has the reviewed lifecycle/catalog safety correction, but the UI portion also changed Delete to render for every `READY` row and changed the mutation composable to perform active Stop then Delete after one combined confirmation. The user explicitly rejects that UI change.

The relevant architecture remains:

- `WorkspaceHistoryWorkspaceSection.vue` owns parent-row action visibility. Member rows remain navigation/focus surfaces.
- `useWorkspaceHistoryMutations.ts` owns Stop invocation, inactive Delete confirmation, pending state, and result toasts. It must not compose Stop and Delete.
- `TeamRunService` and `AgentTeamRunManager` own public root termination and exact nonterminal root identity.
- `RootTeamRun` owns shutdown admission, already-admitted materialization stabilization, stable termination scope, phase order, and terminal callback.
- `MixedTeamManager` and its registries/handles own materialized configured, delegated, prepared, and nested Agent/Team executions.
- `AgentRun.interrupt()` owns provider-specific active-turn cancellation, including pending tool approval; termination preparation owns canonical quiescence.
- `TeamRunHistoryCatalogService` owns physical inactive-history deletion. The committed exact-ID manager lane and compensated candidate-index/package transition remain necessary because supported restore can race inactive Delete and ordinary storage failure must retain a visible retry target.

The concrete production behavior, isolated reproduction, base/WIP source comparison, and API/E2E reroute are authoritative in `investigation-notes.md` and `runtime-reproduction-evidence.md`.

## Intended Change

1. Preserve the committed separation between nonterminal root ownership and command admission. A terminating or failed-but-retryable root remains manager-owned until accepted terminal completion.
2. Preserve the committed RootTeamRun admitted-materialization gate and one frozen recursive termination scope. Stop closes admission, joins entered materialization, freezes the exact object set, interrupts active leaves, waits for quiescence, settles work, and terminates descendants before root terminal publication.
3. Preserve same-object retry after nonterminal failure and terminal-only unregister/inactive publication.
4. Preserve the manager exact-ID transition lane and catalog compensated deletion for safe inactive Delete.
5. Restore the original mutually exclusive parent-row action policy: active/stop-pending root exposes Stop only; inactive `READY` history exposes Archive and Delete.
6. Remove the WIP active Delete, `wasActive` pending target, dynamic combined copy, stop-then-delete sequencing, and combined failure messages/tests.
7. Keep Stop purely non-destructive: it terminates runtime and retains all exact history/context/package data.
8. Keep Delete purely inactive and separately confirmed: it does not terminate or restore a root and removes only the exact inactive package after catalog guards admit it.

The former `DS-002 — Active Delete` spine is decommissioned and intentionally has no target replacement. The target user journey is `DS-001 Stop` followed, only if the user later chooses, by independent `DS-003 Inactive Delete`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Intent / IDs | Approved Trigger | Existing Evidence | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User | `REQ-001`, `REQ-002`; `AC-001`–`AC-003` | Parent TeamRun row renders | Base uses active Stop vs inactive Archive/Delete; WIP added active Delete | Restore strict mutual exclusion; member Offline never authorizes Delete | row projection, `DS-001`, `DS-003`, `DS-006` |
| `BEH-002` | User/System | `REQ-003`, `REQ-013`–`REQ-016`; `AC-004`, `AC-015`–`AC-019` | User clicks active Stop | Exact reproduction: approval-pending Stop hangs before WIP fix | Stop fully terminates exact recursive runtime and retains history | `DS-001`, `DS-004`, `DS-005` |
| `BEH-003` | User/System | `REQ-004`, `REQ-006`; `AC-003`, `AC-005`, `AC-007`, `AC-018` | User later clicks inactive Delete | Base has inactive confirmation; WIP combined active copy is rejected | Separate inactive confirmation and exact deletion only | `DS-003`, `DS-006`, `DS-007` |
| `BEH-004` | Contract | `REQ-007`, `REQ-008`; `AC-008`, `AC-009` | Same-summary roots/member hierarchy | Exact IDs flow end to end | Preserve root identity; no member destructive action | `DS-001`, `DS-003` |
| `BEH-005` | System | `REQ-005`, `REQ-009`–`REQ-012`; `AC-006`, `AC-010`–`AC-014` | Stop/Delete completion or failure | Base cleanup owners; reviewed restore/delete and storage failure premises | Stop failure remains active/history-retained; inactive Delete failure remains inactive/history-retained | `DS-003`, `DS-005`–`DS-007` |
| `BEH-006` | System | `REQ-013`–`REQ-016`; `AC-015`–`AC-019` | Stop with active/admitted descendants | Runtime reproduction and committed backend correction | One stable scope interrupts/quiesces/finishes every admitted descendant before inactive event | `DS-001`, `DS-004`, `DS-005` |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/ui-ux-spec.md` | Strict active Stop / inactive Archive-Delete journey, confirmation, state/accessibility | `REQ-001`–`REQ-011`, `REQ-013`–`REQ-016`; `AC-001`–`AC-019` | Governs the user-visible workflow | Refined and user-approved 2026-08-19 |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/runtime-reproduction-evidence.md` | Pending-approval Stop failure and clean active/offline restore | `REQ-002`, `REQ-013`–`REQ-016` | Establishes reachability and interruption boundary | Complete; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/design-use-case-validation.md` | Per-case target-spine proof | all | Verifies strict two-step and lifecycle/catalog invariants | Refined; approval N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix / Requirement Correction / Bounded Refactor`
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant`, `Boundary Or Ownership Issue`; WIP active Delete is a `Local Implementation Defect` relative to the reset requirements.
- Refactor needed now: `Yes`, already bounded by SR-002/IR-001; UI rework is subtractive.
- Evidence: current/base Stop can hang at pending approval; pre-freeze materialization and read-pruning violate stable ownership; old catalog ordering/race violates delete retry safety; WIP UI contradicts the user's established destructive-action workflow.
- Design response: retain the lifecycle/catalog ownership correction, restore mutually exclusive action rendering, and make the UI composable return to singular Stop and inactive Delete responsibilities.
- Refactor rationale: reverting all of IR-001 would reintroduce the actual Stop defect. Retaining WIP active Delete would violate user safety intent. The coherent target keeps backend correctness and removes only the unapproved product workflow.
- Intentional deferrals: native conversation restoration remains separate. Compound power/media/tamper recovery remains outside the bounded catalog contract.

## Terminology

- **Active / admitting root**: manager-owned root accepting normal commands; its row exposes Stop only.
- **Stopping / nonterminal root**: manager-owned root rejecting new admission while shutdown is in flight or retryable; Delete remains absent.
- **Inactive / terminal history**: root runtime has completed terminal teardown and only retained persisted history remains; Archive/Delete may be offered when `READY`.
- **Stop**: non-destructive exact-root runtime termination that retains all history.
- **Delete**: destructive disposal of one exact inactive history package after separate confirmation.
- **Frozen termination scope**: exact recursive configured/delegated/prepared/nested object set captured after admitted materialization stabilizes and reused across retry.
- **Exact-ID transition lane**: manager-owned per-root ordering window shared by create/restore registration and inactive catalog deletion.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove superseded WIP paths.`
- Remove the committed WIP active Delete rendering (`v-if="team.deleteLifecycle === 'READY'"` without inactive guard).
- Remove `pendingDeleteTeam: { teamRunId, wasActive }`, active dynamic copy, termination inside Delete confirmation, and combined error messages.
- Remove/replace tests asserting independent active Stop+Delete or active stop-then-delete.
- Restore/retain a single clear inactive predicate for Archive/Delete; whether expressed directly as `!team.isActive` or through an existing exact predicate is an implementation detail, not a compatibility layer.
- Retain the new explicit active/managed root APIs; do not restore ambiguous read-pruning aliases.
- Retain the gate/frozen-scope and manager/catalog lane/compensation; do not add a second shutdown or deletion path.
- No combined `stopAndDeleteTeamRun` API, dual modal, compatibility wrapper, alternate approval cancellation, or generic transaction framework.

## Persisted Data / State Transition Decision

- Stored subject: one TeamRun catalog row in `memory/team_run_history_index.json` and one exact root package under `memory/agent_teams/<teamRunId>/`.
- Relevant representation change: none.
- Reader/writer evidence: retained current-format packages are already read by normal history/restore paths. Stop writes terminal lifecycle metadata without changing schema. Inactive Delete discards the exact current package.
- Required invariants: Stop retains row/package/context; manager-owned roots cannot be deleted; only a separately confirmed exact inactive package may be discarded; reported ordinary Delete failure preserves a valid retry target.
- Decision: `Directly Usable — No Migration`.
- Rationale: no schema/serialization change exists. Rewriting retained data would add risk without benefit.
- Supported IDs: `REQ-003`–`REQ-012`; `AC-004`–`AC-014`, `AC-017`, `AC-018`.

### Migration Plan

N/A — no transformation is required.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behaviors | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | `BEH-001`, `BEH-002`, `BEH-004`, `BEH-006` | Active row Stop | Same exact inactive retained history row | `RootTeamRun` lifecycle; `TeamRunService` API/stamp | Stop must fully terminate without deleting data |
| `DS-003` | Primary End-to-End | `BEH-001`, `BEH-003`–`BEH-005` | Inactive row Delete | Exact package/client history removed | `TeamRunHistoryCatalogService` for disposal; UI confirmation owner for intent | Delete is a later independent dangerous decision |
| `DS-004` | Return-Event | `BEH-001`, `BEH-002`, `BEH-005`, `BEH-006` | Descendant/root result | Lifecycle/history projection and row action transition | Runtime lifecycle publishers and client stores | Delete appears only after authoritative terminal success |
| `DS-005` | Bounded Local | `BEH-002`, `BEH-006` | Root termination begins | Root terminal callback or retryable failure | `RootTeamRun` | Stable full-tree interrupt/quiesce/finish ordering |
| `DS-006` | Bounded Local | `BEH-001`, `BEH-003`, `BEH-005` | Row action decision | Stop invocation or inactive confirmation/delete | `useWorkspaceHistoryMutations` plus row component | Enforces non-composition and mutually exclusive actions |
| `DS-007` | Bounded Local | `BEH-003`, `BEH-005` | Inactive catalog Delete at queue head | Complete removal or validated retry state | `TeamRunHistoryCatalogService` inside manager lane | Protects restore exclusion and failure truthfulness |

`DS-002 — Active Delete` from SR-002 is removed; there is no target primary spine for deleting an active root.

## Primary Execution Spine(s)

### `DS-001` — Stop And Retain

`Active TeamRun row Stop -> useWorkspaceHistoryMutations.onTerminateTeam(exact teamRunId) -> agentTeamRunStore.terminateTeamRun -> terminateAgentTeamRun GraphQL -> TeamRunService -> AgentTeamRunManager managed root -> RootTeamRun admitted-materialization gate -> frozen recursive scope -> AgentRun/backends interrupt + quiescence + finish -> root terminal callback/unregister -> catalog terminatedAt -> GraphQL success -> exact stream/member cleanup + history refresh -> same exact inactive retained row with Archive/Delete`

### `DS-003` — Separate Inactive Delete

`Inactive READY TeamRun row Delete -> inactive permanent-deletion confirmation -> useWorkspaceHistoryMutations.confirmDeleteRun(exact teamRunId) -> runHistoryStore.deleteTeamRun -> deleteStoredTeamRun GraphQL -> TeamRunHistoryService -> TeamRunHistoryCatalogService -> manager-held unmanaged exact-ID exclusion -> compensated index/package removal -> exact client history/context/selection cleanup`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Domain Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | User chooses only Stop. The root stabilizes and terminates one exact recursive runtime set. Success retains the package and changes only lifecycle/client-live state; the refreshed row then reveals later history actions. | row, root, frozen scope, AgentRun, retained history row | `RootTeamRun` | GraphQL facade, terminal stamp, stream cleanup |
| `DS-003` | A later independent user decision on an inactive row obtains destructive consent and deletes exact retained storage without termination or restore. | inactive row, confirmation, catalog row/package | catalog for disposal; UI mutation owner for consent | safe ID, client cleanup |
| `DS-004` | Descendant terminal results feed root terminal completion; only then do lifecycle/history stores project inactive and swap Stop for Archive/Delete. | descendant result, root lifecycle, client row | runtime/store publishers | refresh, toast, selection |
| `DS-005` | Root closes/joins admitted materialization, captures one immutable scope, interrupts all leaves, waits quiescence, settles tasks, finishes deepest-first, then terminalizes or retains same scope for retry. | gate, root, frozen scope, AgentRun/TeamRun | `RootTeamRun` | logging, task persistence |
| `DS-006` | The UI branches on root lifecycle before entering either operation. Stop calls termination directly with no modal. Delete is admitted only from inactive READY and opens one inactive confirmation. | row/composable/pending target | UI mutation composable | localized labels/toasts |
| `DS-007` | Catalog enters its queue, acquires exact-ID manager exclusion, rechecks unmanaged, writes candidate index, removes package, publishes only complete success, or restores/validates original retry state before ordinary failure. | catalog state, index, package | catalog | manager lane, package admission |

## Spine Actors / Main-Line Nodes

- **TeamRun parent row** owns rendering the action appropriate to root lifecycle.
- **UI mutation composable** owns invoking exactly one chosen user operation and its local pending/confirmation state.
- **Team lifecycle boundary** owns exact-root Stop and terminal metadata.
- **RootTeamRun** owns shutdown ordering and stable object scope.
- **Mixed Team runtime / AgentRun** own descendant traversal and provider interruption/termination.
- **History service/catalog** own exact inactive package disposal.
- **Client stores** own exact live/history/context/selection projection after authoritative results.

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| Row component | action visibility and click binding | stop-delete orchestration, lifecycle inference from member status |
| `useWorkspaceHistoryMutations` | one-operation pending/error/confirmation state | backend safety, active stop-then-delete composition |
| `TeamRunService` | public Stop orchestration and terminal stamp | physical Delete |
| `AgentTeamRunManager` | exact root identity, active/managed access, transition lane | descendant traversal or storage mutation |
| `RootTeamRun` | gate, scope, phase order, retry, terminal callback | UI policy or package deletion |
| `MixedTeamManager` / handles | local materialized set and recursive scope mechanics | root registration or user confirmation |
| `AgentRun` | active-turn interruption and provider termination | Team traversal |
| `TeamRunHistoryCatalogService` | exact inactive row/package deletion and compensation | runtime termination |

## Thin Entry Facades / Public Wrappers

| Facade | Governing Owner | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `terminateAgentTeamRun` | TeamRunService/RootTeamRun | transport boundary | Delete |
| GraphQL `deleteStoredTeamRun` | TeamRunHistoryService/catalog | transport boundary | termination/restore |
| Pinia Team/history store actions | runtime/history owners | transport + exact client cleanup | combined business command |

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| WIP active-row Delete rendering | violates approved safety workflow | active Stop / inactive Archive-Delete branch | In this change | restore exact mutual exclusion |
| `wasActive` pending Delete target | only supports combined behavior | inactive exact `pendingDeleteTeamRunId` | In this change | one identity field |
| active combined confirmation/copy | Delete is inactive-only | existing inactive permanent-delete copy | In this change | no alternate modal |
| termination inside Delete confirm | Stop and Delete are separate decisions | `onTerminateTeam` and inactive `confirmDeleteRun` | In this change | no combined API |
| combined/partial error messages | impossible in target flow | singular Stop or Delete failures | In this change | remove stale localization/tests if any |
| active-delete component tests | assert rejected behavior | strict action-transition tests | In this change | retain lifecycle/catalog tests |
| ambiguous manager read-pruning/one-time delete guard | violated approved lifecycle safety | committed explicit lookups/lane/compensation | Already replaced; retain | do not reintroduce |

## Return Or Event Spine(s)

`DS-004`: `AgentRun/TeamRun accepted termination -> frozen scope completion -> RootTeamRun terminal callback -> manager unregister/lifecycle false -> catalog terminatedAt -> GraphQL result + stream close/history refresh -> exact row inactive -> UI renders Archive/Delete`.

Failure returns are distinct:

- Stop failure returns from `DS-005` without root terminal publication; the same row remains active/non-delete-ready and history is untouched.
- Inactive Delete failure returns from `DS-007` only after the original visible retry state is valid; the same row remains inactive/delete-ready.

## Bounded Local / Internal Spines

### `DS-005` — Root Shutdown State Machine

Parent owner: `RootTeamRun`.

`join/share current attempt -> close root admission -> close/join admitted-materialization gate -> drain authoritative queues/persistence -> close nested registration/local additions -> capture or reuse one FrozenTeamRunTerminationScope -> interrupt every active leaf -> prepare/wait every captured AgentRun quiescent -> settle captured task records deepest-first -> finish captured nested TeamRuns/AgentRuns -> finish root local TeamRun -> terminal callback/stamp/unregister`

A nonterminal rejection clears only the in-flight promise, retains the same root/scope/objects, does not publish inactive, and allows retry.

### `DS-006` — UI Action State

Parent owner: `WorkspaceHistoryWorkspaceSection` + `useWorkspaceHistoryMutations`.

`project root lifecycle -> if active: Stop only -> direct termination pending/result; if inactive READY: Archive + Delete -> Delete sets exact pending ID -> inactive confirmation -> delete pending/result`.

There is no path from the Stop branch into Delete.

### `DS-007` — Exact Catalog Deletion

Parent owner: `TeamRunHistoryCatalogService`.

`catalog queue head -> acquire manager exact-ID lane -> recheck unmanaged -> retain original rows/state -> flush candidate index without target -> remove exact package -> publish in-memory/package-catalog exclusion on success; or reflush/validate original index/package on ordinary package failure -> release lane -> return`.

## Off-Spine Concerns Around The Spine

| Concern | Related Spines | Serves Owner | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| confirmation/accessibility copy | `DS-003`, `DS-006` | UI row/composable | informed inactive Delete consent | dangerous action | runtime layer gains presentation policy |
| stream/context cleanup | `DS-001`, `DS-003`, `DS-004` | client stores | exact UI state after result | avoid stale selection/stream | composable duplicates store invariants |
| terminal metadata | `DS-001`, `DS-004` | TeamRunService/catalog | persist `terminatedAt` | history continuity | Root owns storage details |
| task persistence/settlement | `DS-005` | RootTeamRun/task owner | stabilize/settle captured tasks | complete recursive Stop | UI/API owns task mechanics |
| safe path validation | `DS-007` | catalog | reject unsafe IDs | storage safety | caller becomes filesystem owner |
| logging/toasts | all | respective boundary | observability/user result | diagnosis | changes lifecycle decisions |

## Ownership Boundaries

- UI depends on lifecycle/history store boundaries; it never calls GraphQL/catalog directly.
- `TeamRunService` is the authoritative Stop boundary; callers do not mix it with manager internals.
- `RootTeamRun` encapsulates its materialization gate and frozen scope. Callers request termination, not phases.
- `AgentRun` remains the sole approval/provider interruption owner.
- `TeamRunHistoryService`/catalog is the authoritative Delete boundary and remains independent of Stop.
- The manager transition lane encapsulates root registration/deletion exclusion; catalog cannot manipulate manager maps.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulates | Required Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| TeamRunService Stop | manager lookup, root termination, terminal stamp | GraphQL/store | UI -> manager/root | extend TeamRunService |
| RootTeamRun termination | gate, scope, phase order, retry | manager/service | callers invoke phases/registries | add root method |
| AgentRun interruption | provider/tool turn cancellation | frozen scope/member handle | Team code Approve/Deny/provider adapter | extend AgentRun result |
| History service/catalog Delete | safe ID, manager exclusion, index/package compensation | GraphQL/history store | UI/service `fs.rm` | extend history boundary |
| UI history composable | exact pending/confirm state | panel/section | component performs transport sequence | extend composable, but never combine Stop/Delete |

## Dependency Rules

Allowed:

- row -> UI mutation composable -> Team or history store -> respective GraphQL boundary;
- TeamRunService -> manager -> RootTeamRun -> frozen scope -> TeamRun/backend/AgentRun;
- catalog queue -> manager exact-ID lane -> catalog index/package owner;
- authoritative results -> existing client cleanup/refresh owners.

Forbidden:

- active row -> Delete;
- Stop -> confirmation modal or history Delete;
- Delete -> termination or restore;
- member `offline` -> root inactive inference;
- UI -> manager/catalog filesystem;
- RootTeamRun -> tool Approve/Deny;
- catalog -> runtime termination;
- read path -> unregister managed nonterminal root;
- phase re-enumeration after scope freeze;
- summary/member identity as destructive selector.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `onTerminateTeam(teamRunId)` | active root | direct Stop invocation | exact root ID | no modal/delete continuation |
| `onDeleteTeam(team)` | inactive history | open inactive confirmation | `team.teamRunId`, `isActive=false`, `READY` | reject active defensively |
| `confirmDeleteRun()` | pending inactive history | call Delete only | captured exact root ID | no `wasActive` |
| `getActiveTeamRun` | root | command-admitting lookup | exact root ID | no pruning side effect |
| `getManagedTeamRun` / `hasManagedTeamRun` | root | lifecycle/ownership lookup | exact root ID | includes stopping/retryable |
| `withUnmanagedHistoryDeletion` | inactive stored root | held exclusion callback | exact root ID | catalog-only use |
| `RootTeamRun.terminate` | root tree | share/retry full Stop | exact object identity | returns accepted/failure |
| `freezeForRootTermination` | Team subtree | immutable recursive scope | object refs | internal |
| `deleteStoredTeamRun` | inactive history | exact disposal | safe exact root ID | catalog rechecks unmanaged |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Stop UI/API | Yes | Yes | Low | retain |
| inactive Delete UI/API | Yes | Yes | Low | remove `wasActive`/composition |
| active/managed manager reads | Yes | Yes | Low | retain explicit split |
| frozen scope | Yes | Yes | Low | keep internal |
| catalog lane callback | Yes | Yes | Low | retain narrow visibility |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| root runtime | `RootTeamRun` | Yes | Low | retain |
| recursive shutdown set | `FrozenTeamRunTerminationScope` | Yes | Low | retain |
| materialization barrier | `RootTeamRunMaterializationGate` | Yes | Low | retain |
| history disposal | `deleteStoredTeamRun` | Yes | Low | retain inactive-only contract |
| WIP pending target | `wasActive` | No in target | High | remove |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why | New Justification |
| --- | --- | --- | --- | --- |
| Stop invocation | Team store/GraphQL/service | Reuse | established exact-root lifecycle | N/A |
| approval cancellation | AgentRun interrupt | Reuse | canonical provider/tool semantics | N/A |
| recursive traversal | Mixed Team registries + frozen scope | Extend/retain | owns all materialized descendants | tight scope already implemented |
| UI confirmation | history mutation composable/modal | Reuse | existing inactive Delete owner | N/A |
| delete/restore exclusion | manager lane | Retain | exact root ownership owner | already bounded |
| storage failure safety | catalog compensation | Retain | physical mutation owner | no generic journal |

## Subsystem / Capability-Area Allocation

| Subsystem | Concerns | Spines | Owner | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace history UI | mutually exclusive actions, pending/confirmation | `DS-001`, `DS-003`, `DS-006` | row/composable | Modify | remove WIP active composition |
| Team root lifecycle | managed identity, Stop ordering/retry | `DS-001`, `DS-004`, `DS-005` | manager/RootTeamRun | Retain extension | actual bug fix |
| Mixed execution | stable recursive descendant mechanics | `DS-005` | MixedTeamManager/handles | Retain extension | no alternate registry |
| Agent execution | interruption/quiescence/provider termination | `DS-005` | AgentRun | Retain extension | no Team approval logic |
| Run history | inactive exact deletion/compensation | `DS-003`, `DS-007` | history service/catalog | Retain extension | Delete stays inactive-only |
| Client stores | stream/history/context cleanup | `DS-001`, `DS-003`, `DS-004` | existing stores | Reuse | exact IDs |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner | Concern | Why One File | Shared Structure |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceHistoryWorkspaceSection.vue` | UI | row | action mutual exclusion | presentation only | existing TeamTreeNode |
| `useWorkspaceHistoryMutations.ts` | UI | mutation owner | direct Stop and inactive Delete confirmation | one UI use-case owner | exact ID only |
| `RootTeamRun` + gate/scope files | lifecycle | root | stable full-tree Stop | already reviewed split | frozen scope |
| `agent-team-run-manager.ts` | lifecycle | manager | managed identity/lane | process root owner | lifecycle snapshot |
| `team-run-history-catalog-service.ts` | history | catalog | inactive exact deletion | physical owner | original/candidate local state |

## Reusable Owned Structures Check

| Structure / Logic | Shared File | Owner | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| recursive phase capabilities | `frozen-team-run-termination-scope.ts` | Team domain | Root and backend share exact contract | Yes | Yes | live registry |
| materialization accounting | `root-team-run-materialization-gate.ts` | Root domain | isolates entered-operation barrier | Yes | Yes | generic command queue |
| pending Delete target | none/new file not needed | UI composable | one exact ID only | Yes, remove `wasActive` | Yes | combined action DTO |

## Shared Structure / Data Model Tightness Check

| Structure | Clear Fields? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `FrozenTeamRunTerminationScope` | Yes | Yes | Low | retain |
| lifecycle snapshot | Yes | Yes | Low | active vs managed semantics remain explicit |
| pending inactive Delete ID | Yes | Yes | Low | scalar exact ID; no active flag |

## Final File Responsibility Mapping

| File | Subsystem | Owner | Concrete Concern | Why One File | Shared Structure |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | UI | row | active Stop vs inactive Archive/Delete | declarative row presentation | Team node |
| `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | UI | mutation owner | direct Stop; inactive confirmation/Delete | one operation per user choice | exact ID |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | UI coverage | component contract | strict action transition/no active Delete | existing focused suite | fixtures |
| `.../domain/root-team-run.ts` | Team lifecycle | root | DS-005 state/order/retry | governing owner | gate/scope |
| `.../domain/root-team-run-materialization-gate.ts` | Team lifecycle | root support | admitted-operation barrier | tight owned mechanism | none |
| `.../domain/frozen-team-run-termination-scope.ts` | Team lifecycle | domain contract | stable recursive phases | tight cross-backend contract | none |
| `.../backends/mixed/mixed-team-manager.ts` and member registries/handles | Mixed execution | local runtime | capture/interrupt/quiesce/finish | existing ownership | frozen scope |
| `.../services/agent-team-run-manager.ts` | Team lifecycle | manager | exact managed identity/lane | process owner | snapshot |
| `.../run-history/services/team-run-history-catalog-service.ts` | history | catalog | DS-007 exact inactive deletion | physical owner | local original/candidate |

## Applied Patterns

- State machine: Root active -> stopping/retryable -> terminal, with terminal-only inactive publication.
- Quiescence barrier: private admitted-materialization gate before one frozen scope.
- Exact registry: one managed map with explicit active/managed access.
- Keyed serialization: exact-ID manager transition lane for restore/create vs inactive Delete.
- Compensating local transition: catalog original/candidate state for ordinary failure.
- Mutually exclusive command affordances: Stop and Delete occupy different lifecycle states and never compose.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/history/` | Folder | history presentation | restore strict row actions/modal binding/tests | existing UI surface | backend lifecycle |
| `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | File | UI use case | singular Stop and inactive Delete flows | existing owner | active Stop+Delete |
| `autobyteus-server-ts/src/agent-team-execution/domain/` | Folder | Team domain | gate/root/frozen scope | current lifecycle owner | UI/delete policy |
| `.../backends/mixed/` | Folder | mixed runtime | local stable descendant mechanics | current backend | root catalog policy |
| `.../services/agent-team-run-manager.ts` | File | process root identity | explicit ownership/lane | current manager | storage mutation |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | File | leaf runtime | interruption/termination retry | current leaf owner | Team traversal |
| `autobyteus-server-ts/src/run-history/services/` | Folder | history | inactive exact Delete/compensation | persistence boundary | Stop orchestration |

The committed manager consumer and root materialization-entry audits from SR-002 remain mandatory. Rework must not reintroduce ambiguous manager lookup or bypass the RootTeamRun gate.

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| web history component/composable | Presentation/application | Yes | Low | action rendering and UI sequencing stay separate |
| Team domain/services | Main-line domain-control | Yes | Low | root state/identity are explicit |
| mixed backend | Runtime adapter | Yes | Low | local traversal follows current ownership |
| run history services | Persistence | Yes | Low | physical Delete remains isolated |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| active row | `isActive -> Stop only` | `isActive -> Stop + Delete` | preserves destructive safety |
| post-stop row | terminal refresh -> same row inactive -> Archive + Delete | local optimistic inactive at Stop start | Delete cannot precede full shutdown |
| Stop | direct termination -> retained history | Stop opens delete modal or calls Delete | separate user intent |
| Delete | inactive confirm -> exact history Delete | active confirm -> terminate then Delete | dangerous action remains deliberate |
| approval | root scope -> `AgentRun.interrupt()` -> quiesce | Team calls Approve/Deny or waits forever | reuse canonical cancellation |
| retry | same managed root/scope after failure | read unregisters and restore creates replacement | exact lifecycle truth |
| catalog failure | validated original retry state before failure return | row removed before package failure | truthful retry |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Keep WIP active Delete as optional second control | implementation already exists | Rejected | remove it; strict state-specific action |
| Keep combined copy but hide control | low code churn | Rejected | remove unreachable state/copy/tests |
| Add combined server mutation | apparent atomicity | Rejected | no combined workflow exists |
| Restore ambiguous `getTeamRun` alias | reduce backend delta | Rejected | retain explicit active/managed methods |
| Add Team-specific approval denial | unblock Stop | Rejected | retain AgentRun interrupt |
| Revert all IR-001 changes | simplest code rollback | Rejected | would restore actual Stop/catalog defects |
| Add generic journal/framework | broad recovery | Rejected | retain bounded catalog compensation |

## Derived Layering

Explanatory only:

`Vue row -> UI mutation composable -> Team store OR history store -> matching GraphQL facade -> lifecycle owner OR history owner -> runtime backend OR storage`

The `OR` is intentional: Stop and Delete are different spines and never become a single chain.

## Change / Refactor Sequence

1. Preserve committed backend lifecycle/catalog source as the reviewed baseline; first run focused source checks to ensure UI rework does not disturb it.
2. In `WorkspaceHistoryWorkspaceSection.vue`, make Delete inactive-only and retain Archive inactive-only; keep active Stop only and combined per-row pending disables as appropriate.
3. In `useWorkspaceHistoryMutations.ts`, replace the WIP compound target with exact inactive `teamRunId`, reject active Team input, remove dynamic active confirmation and termination-from-confirm logic, and retain direct `onTerminateTeam`.
4. Remove active combined messages/wiring from the panel/composable; keep one inactive Delete message.
5. Replace WIP active-delete tests with strict UI assertions: active Stop/no Delete, Stop invokes only termination, no modal; terminal/inactive rerender reveals Archive/Delete; later Delete separately confirms and invokes only history deletion.
6. Preserve/add pending-approval Stop, stable recursive scope, same-object retry, lifecycle publication, exact restore/delete lane, and catalog failure tests.
7. Update API/E2E coverage investigation after source re-review. The paused browser plan must use the strict two-step journey and prove history remains after Stop before independently choosing Delete.
8. Route any repository-resident API/E2E test edits back through code review per team rules.
9. Remove all obsolete active-delete assertions/copy; do not leave dead compatibility state.

## Key Tradeoffs

- The user performs two actions when they truly want deletion, but this is intentional friction: Stop preserves data; Delete is dangerous and separately consented.
- Delete remains absent for an active root even when all members are offline. That may require the user to understand root vs member status, but it prevents conflating offline leaves with terminal root safety.
- Backend deletion safeguards remain even though the UI hides active Delete. UI policy is not the authoritative storage safety boundary, and restore/delete concurrency is supported.
- One frozen shutdown scope is preferred over repeated enumeration; it supports truthful completion and retry without a generic framework.

## Risks

- Reverting UI files wholesale from `origin/personal` could inadvertently discard useful pending-disable/accessibility changes from IR-001. Rework should remove only active-delete composition and preserve compatible refinements.
- If lifecycle projects inactive before every descendant finishes, Delete can appear too early. `AC-016` must gate implementation and API/E2E.
- If a materializing path bypasses the root gate, Stop can still miss a descendant; retain existing call-site audits/tests.
- If a failure promise is cached permanently or manager reads unregister early, retry/identity breaks; retain backend tests.
- If API/E2E continues using the old active-delete coverage basis, it will validate rejected behavior. Coverage investigation must be revised before execution resumes.
- Native conversation restore may still fail when retained history is later restored; separate ticket.

## Guidance For Implementation

- Treat the workflow as an invariant: `active = Stop only`; `inactive READY = Archive + Delete`.
- Stop must never call Delete and must never open permanent-deletion confirmation.
- Do not use member `offline` to decide root action visibility.
- Do not reveal Delete at termination start. Wait for authoritative terminal lifecycle/history projection.
- Keep exact `teamRunId` end to end.
- Preserve RootTeamRun order: close/join materialization -> freeze once -> interrupt -> quiesce -> settle/finish descendants -> root terminal callback.
- Keep the same managed root and frozen objects for retry after nonterminal failure.
- Preserve catalog manager exclusion and compensation even for inactive-only Delete.
- Delete tests that assert the rejected combined workflow rather than retaining dead branches.
- Automated destructive validation must use isolated exact fixtures and must not mutate the user's production roots/data.
