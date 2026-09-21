# Design Spec — Stopped AgentOrg History Archive/Delete

## Solution And Approval Basis

- Package identifier: `ORG-HISTORY-ARCHIVE-DELETE-20260921-001`
- Current solution revision ID: `SR-002`
- Approved requirements baseline / revision and user-approval reference: `SR-001`, approved by the user on 2026-09-21 with “basically, this functionality is similar to agent team, please now work on it”.
- Behavior-defining supplements and their approval references: The two supplied UI screenshots listed below are approved evidence/comparator inputs under `SR-001`; no separate Product prototype is required.
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions/tickets/in-progress/org-history-archive-delete-actions/investigation-notes.md`
- Workspace / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions` / `codex/org-history-archive-delete-actions`
- Resolved base / finalization target: `origin/personal` at `8db5101f413a88216b90d55ec563e3b5f80b1c9b` / `origin/personal`

## Current-State Read

The mixed workspace history already reads AgentOrg roots through `AgentOrgRunHistoryCatalogService` and hides inactive rows whose existing V1 execution tree/index projection has `archivedAt`. The AgentOrg row, however, exposes only the active Stop command. No supported AgentOrg archive command exists, and the catalog's unused `deleteStored` method is not reachable through the subject lifecycle service, GraphQL, Pinia, the shared mutation interaction, or the row.

The current Team flow is the accepted behavior comparator: stopped-only Archive/Delete icons, isolated action clicks, confirmation for Delete, pending-state exclusion, success/error feedback, history refresh, and exact local cleanup. The implementation must reuse that interaction policy without making AgentOrg a Team or bypassing its ownership. AgentOrg has its own root package, tree/index stores, manager transition lane, retained context, and route identity.

The important current structural defect is not missing icons alone. The internal AgentOrg delete method performs an active pre-check outside `AgentOrgRunManager.withTransition`, so a restore or other same-root lifecycle transition could race the destructive mutation. The target therefore completes the end-to-end capability and adds one narrow manager-owned inactive-history transition boundary. The read-only `CollaborationRootHistoryService` remains read-only.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: The change extends existing owners across several files in three established surfaces: AgentOrg lifecycle/history persistence and GraphQL; web GraphQL/store/mutation policy; and AgentOrg history-row rendering/routing. It adds no new subsystem, schema, migration, or route family, but it is not a narrow UI-only edit.
- Architectural risk: `High`
- Risk rationale and supporting evidence: Delete intentionally removes a persisted run package; Archive changes canonical tree/index state; both must be serialized against AgentOrg restore/configuration/termination and must preserve unrelated roots and definitions. This is material persistence, concurrency, API, and ownership-boundary behavior even though the implementation is bounded.
- Escalation trigger if implementation or validation discovers new impact: Return a Design Impact if correct behavior requires a schema/migration, mutation of definition/workspace records, generic cross-family lifecycle APIs, archive browsing/unarchive, changes to mounted Team lifecycle, or a different owner than the existing AgentOrg manager/catalog/service boundary. A changed destructive-data or archived-history product policy is a Requirement Gap.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| AgentOrg row source | `autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue` | Active Stop exists; stopped Archive/Delete do not. Primary row already isolates Stop with `@click.stop`. | Add stopped-only isolated controls in the same row action area. | None. |
| Team comparator | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Team uses stopped/ready eligibility, Archive/Delete icons, pending exclusion, hover/focus/narrow behavior and shared confirmation. | Reuse its user-facing action policy and CSS/accessibility pattern. | None. |
| Web mutation path | `useWorkspaceHistoryMutations.ts`, `runHistoryMutationActions.ts`, `runHistoryStore.ts` | Agent/Team-only pending, confirmation, Apollo and cleanup paths exist. | Extend these existing owners; replace mutually exclusive delete IDs with one discriminated target. | None. |
| AgentOrg persistence | `agent-org-run-history-catalog-service.ts`, AgentOrg tree/index stores and schemas | `archivedAt` is already canonical; inactive archived rows are already filtered; unused delete exists. | Extend the catalog; no new state file or migration. | None. |
| AgentOrg lifecycle | `agent-org-run-manager.ts` | Exact-root operations use private `withTransition`; catalog currently sees only `getActive`. | Add a narrow public `withInactiveHistoryMutation` boundary and route both mutations through it. | None. |
| Public API boundary | `agent-org-run-service.ts`, `api/graphql/types/agent-org-run.ts` | AgentOrg lifecycle/config is exposed through the subject service/resolver; archive/delete absent. | Add subject-explicit service methods and GraphQL mutations; do not expose catalog directly. | None. |
| Client context/route | `agentOrgContextsStore.ts`, `WorkspaceAgentRunsTreePanel.vue`, `useWorkspaceHistorySubjectActions.ts` | Exact `disconnect(orgRunId)` exists; panel composition is router-aware. | Store retires exact retained context; panel leaves the exact selected AgentOrg route only after success. | None. |
| Canonical docs | server `docs/modules/run_history.md`, server `docs/modules/agent_orgs.md`, web `docs/agent_orgs.md` | Archive/Delete meaning exists for Agent/Team; AgentOrg API/UI contract absent. | Update canonical docs with the new subject-explicit path and unchanged no-unarchive scope. | None. |
| User screenshots | paths in Supplemental Task Artifacts | Released AgentOrg gap and stopped Team comparator are visually demonstrated. | No new Product prototype; preserve the current visual language. | None. |

## Intended Change

Complete stopped AgentOrg history lifecycle parity with standalone Agent Team:

1. Render Archive and Delete controls for an inactive AgentOrg root and Stop only for an active root.
2. Archive the exact root non-destructively by committing the current tree's `archivedAt` and projecting the same fact into the AgentOrg history index.
3. Delete the exact root permanently only after confirmation by removing its index row and run package, without touching definitions, workspaces, siblings, providers, or other root families.
4. Serialize both mutations with the AgentOrg manager's exact-root lifecycle lane and reject active/conflicting roots authoritatively.
5. On authoritative success, prune only that row, retire its exact retained context, refresh history, and leave its route if selected. On rejection/failure, keep local row/context/route and show truthful feedback.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-009; AC-001, AC-005 | User sees an eligible stopped AgentOrg history row | AgentOrg row lacks actions; Team comparator has both | Add Team-aligned Archive/Delete controls while preserving row open/disclosure/member behavior | Row -> shared mutation composable -> `DS-001`/`DS-002` |
| BEH-002 | System | REQ-003, REQ-005–008; AC-002 | User invokes Archive on a stopped root | Tree/index already carry `archivedAt`; mixed reader already filters it | Commit one canonical archive fact, retain package, remove inactive row from default history | `DS-001`, `DS-003`, `DS-004` |
| BEH-003 | User/System | REQ-004–008; AC-003 | User confirms Delete for one stopped root | Internal delete is unwired and has only an out-of-lane active check | Confirm then permanently remove only exact package/index row | `DS-002`, `DS-003`, `DS-004` |
| BEH-004 | Contract | REQ-001–002, REQ-005; AC-001, AC-004 | Active or conflicting lifecycle state | UI Stop-only exists; manager owns exact-root transitions | Hide stopped actions for active UI state and reject stale/racing mutations inside manager lane | `DS-001`/`DS-002`, `DS-003` |
| BEH-005 | User/Operational | REQ-006–007, REQ-009; AC-002–005 | Mutation pending/settles | Agent/Team have pending/confirmation/toast cleanup; AgentOrg has none | Subject-specific pending state, truthful feedback, exact context/route cleanup only on success | `DS-001`/`DS-002`, `DS-004` |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/software_development_department_75403d5130584669869fdd59725f6b3e/software_engineering_team_3e746e3211f34fb39aad3979b4751e04/solution_designer_b1a3b7b01d35499d9fa06baf799a2046/context_files/ctx_eb5d81993043__image.png` | Current stopped AgentOrg UI gap | REQ-001; AC-001 | Establishes missing actions on the target surface | Read-only; included in approved `SR-001`. |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/software_development_department_75403d5130584669869fdd59725f6b3e/software_engineering_team_3e746e3211f34fb39aad3979b4751e04/solution_designer_b1a3b7b01d35499d9fa06baf799a2046/context_files/ctx_95c5df976e09__image.png` | Stopped Team comparator | REQ-001, REQ-009; AC-001 | Defines accepted action placement/visual language | Read-only; included in approved `SR-001`. |
| `tickets/done/flat-agent-organization-model/design-spec.md` (`DS-025`) | Historical typed lifecycle-port intent | REQ-001–008 | Confirms prior direction only; current source and this design are authoritative | Historical context, not approval or implementation proof. |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` (completion of an omitted AgentOrg lifecycle slice)
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor needed now: `Yes`
- Evidence: The UI/API capability is absent end-to-end, while the only internal AgentOrg delete operation checks activity outside the manager's exact-root transition lane. Directly wiring that method would bypass lifecycle authority and violate `REQ-002`/`AC-004`.
- Design response: Add one narrow inactive-history operation to `AgentOrgRunManager`; make the AgentOrg catalog execute archive/delete inside that boundary; expose them only through `AgentOrgRunService` and the AgentOrg resolver. Extend existing web history owners without introducing a parallel AgentOrg-only modal or mutation subsystem.
- Refactor rationale: The unused `deleteStored` body is retained conceptually but rewritten behind the manager boundary with safe identity and verified compensation. The shared delete confirmation state is tightened to a discriminated subject target so adding a third family cannot create mutually inconsistent IDs.
- Intentional deferrals and residual risk: Archived-list/unarchive remains out of scope. Catastrophic filesystem failure during compensation is reported as an indeterminate operational failure and must not be called success; validation must prove ordinary injected failures restore the prior durable projection. No provider/inference certification is implied.

## Terminology

- **AgentOrg root history subject:** One top-level `orgRunId`, its V1 execution tree, AgentOrg history-index row, and exact run package directory.
- **Inactive-history mutation:** A catalog operation admitted by `AgentOrgRunManager` only after entering the exact-root transition lane and confirming the root is not managed/active.
- **Archive:** Non-destructive timestamp projection that hides an inactive row from the default list.
- **Delete:** Confirmed permanent removal of the exact root package and its AgentOrg index row.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Replace the catalog's unused out-of-transition `deleteStored` implementation with the lifecycle-safe implementation. Do not keep an old overload or fallback.
- The two old nullable delete-selection fields in `useWorkspaceHistoryMutations` are replaced by one subject-discriminated pending target; do not retain dual selection paths.
- No schema/version compatibility layer, alternate archive file, generic cross-family mutation, or legacy UI branch is permitted.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: One selected AgentOrg package under `memory/agent_orgs/<orgRunId>/...` plus one row in `memory/agent_org_run_history_index.json`; existing user profiles can contain many independent roots.
- Relevant code-model, serialization, semantic, or physical-store change: None. Current AgentOrg V1 tree and history row already define nullable `archivedAt`; Delete removes the existing package/index record by exact identity.
- Normal reader/writer behavior and representative evidence: Tree/index validators already read these fields; the mixed history service already omits inactive archived AgentOrg rows; the package layout validates safe identities.
- Required semantics and invariants under direct use: Archive retains every target package file and changes only matching tree/index archive projections. Delete removes only the confirmed exact target. No reader may infer or mutate definitions/workspaces/siblings.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Archive must be recoverable at the data level even though no unarchive UI is added. Delete loss is authorized only after explicit confirmation. All paths derive from a validated `orgRunId` under the AgentOrg package root.
- Decision: `Directly Usable — No Migration`
- Decision rationale: Existing data and version-agnostic validators already represent and consume the required archive state. Rewriting retained packages would add I/O/corruption/recovery risk with no semantic benefit. Delete is an explicit per-user action, not a transition of existing data.
- Acceptance criteria or design constraints supported: REQ-003–008; AC-002–004; QR-001–002.

### Migration Plan

N/A — no schema, meaning, or physical-store transition is required.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002, BEH-004, BEH-005 | User clicks stopped AgentOrg Archive | Canonical tree/index archive plus reconciled UI | AgentOrg history catalog behind manager lifecycle | Non-destructive visibility mutation. |
| DS-002 | Primary End-to-End | BEH-001, BEH-003–005 | User clicks Delete and confirms | Exact package/index removed plus reconciled UI | AgentOrg history catalog behind manager lifecycle | Destructive exact-subject operation. |
| DS-003 | Bounded Local | BEH-002–004 | Catalog requests inactive mutation | Operation admitted/rejected after exact-root serialization | `AgentOrgRunManager` | Prevents race with restore/configuration/termination. |
| DS-004 | Return-Event | BEH-005 | GraphQL mutation settles | Target-only local cleanup/navigation or retained failure state | Web history mutation composition | Keeps route/context/list truthful. |

## Primary Execution Spine(s)

- `DS-001 Archive`: AgentOrg history row -> shared history mutation composable -> run-history Pinia action -> AgentOrg GraphQL mutation -> `AgentOrgRunService` -> `AgentOrgRunHistoryCatalogService` -> manager inactive-history lane -> tree/index commit -> Apollo result -> exact client reconciliation.
- `DS-002 Delete`: AgentOrg history row -> shared confirmation -> run-history Pinia action -> AgentOrg GraphQL mutation -> `AgentOrgRunService` -> `AgentOrgRunHistoryCatalogService` -> manager inactive-history lane -> index/package delete with compensation -> Apollo result -> exact client reconciliation.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The stopped row requests Archive. Web owners prevent duplicate/conflicting requests and send exact `orgRunId`. The service enters the root's manager transition, the catalog commits tree/index archive state, and the client removes the default-list row only after success. | Row, mutation policy, GraphQL boundary, service, manager, catalog, tree/index | AgentOrg catalog for persisted mutation; manager for lifecycle admission | localization, toast, selected-route cleanup, refresh |
| DS-002 | Delete first records a subject-typed confirmation target. Confirmation sends exact `orgRunId`; the manager rejects managed roots; the catalog removes the index candidate and exact package, compensating the index on package failure. Only confirmed success prunes local state. | Row, confirmation target, GraphQL boundary, service, manager, catalog, package/index | AgentOrg catalog for deletion; manager for lifecycle admission | modal copy, path validation, compensation, route cleanup |
| DS-003 | The catalog asks the manager to serialize the operation with all other transitions. Once inside, active/managed means rejection; inactive means the supplied catalog operation may run. | manager transition map, active registry, catalog operation | `AgentOrgRunManager` | no provider/restore side effects |
| DS-004 | A successful server result causes exact AgentOrg row pruning, context disconnect, quiet authoritative refresh, and route exit only when that `orgRunId` is selected. Rejection/failure leaves local state and shows error. | Pinia history state, AgentOrg contexts, router, toast | Web mutation composition; route-aware panel for navigation | selection preservation, sibling preservation |

## Spine Actors / Main-Line Nodes

1. `WorkspaceAgentOrgHistoryCollection` — renders eligibility and emits exact root actions.
2. `useWorkspaceHistoryMutations` — owns pending, confirmation and feedback policy across history subjects.
3. `runHistoryStore` / `runHistoryMutationActions` — own Apollo invocation and exact local history/context cleanup.
4. `AgentOrgRunResolver` / `AgentOrgRunService` — explicit public AgentOrg command boundary.
5. `AgentOrgRunManager` — exact-root lifecycle serialization and inactive admission.
6. `AgentOrgRunHistoryCatalogService` — tree/index/package mutation, compensation and catalog memory.
7. Existing AgentOrg stores/layout/package catalog — validated atomic persistence mechanisms.

## Ownership Map

| Node | Owned Responsibility |
| --- | --- |
| AgentOrg history row | Presentation eligibility, accessible actions, click isolation; no persistence decisions. |
| Shared web mutation composable | Per-subject pending exclusion, discriminated confirmation, user feedback, success callback sequencing. |
| Run-history Pinia/action file | Exact GraphQL request, target-only row/context cleanup, authoritative quiet refresh. |
| AgentOrg resolver/service | Subject-explicit transport and lifecycle command; normalized required identity and result mapping. |
| AgentOrg manager | Serialize same-root transitions and reject active/managed mutation. |
| AgentOrg history catalog | Validate package identity; archive/delete durable state; compensate/verify ordinary partial failure; update in-memory catalog only after durable success. |
| Router-aware history panel | Leave the route only when successful target equals current AgentOrg query subject. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| AgentOrg GraphQL mutations | `AgentOrgRunService` | Transport conversion and stable success/message result | path construction, lifecycle checks, index/package mutation |
| `AgentOrgRunService.archiveStoredRun/deleteStoredRun` | Manager/catalog | Public subject lifecycle boundary | direct filesystem or UI cleanup |
| Pinia `archiveAgentOrgRun/deleteAgentOrgRun` | Apollo action functions | UI-callable state boundary | route navigation or server eligibility inference |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Out-of-transition body of `AgentOrgRunHistoryCatalogService.deleteStored` | Active pre-check can race manager lifecycle | Lifecycle-safe catalog delete under `withInactiveHistoryMutation` | In This Change | Keep one canonical delete method; no legacy overload. |
| `pendingDeleteRunId` and `pendingDeleteTeamRunId` pair | A third mutually exclusive subject would permit ambiguous state | `PendingHistoryDeleteTarget` discriminated union | In This Change | Agent/Team behavior remains unchanged. |
| Hardcoded new AgentOrg mutation strings | Violates localization requirement | en/zh-CN catalog keys | In This Change | Existing unrelated literals are not widened into this ticket. |

## Return Or Event Spine(s) (If Applicable)

`DS-004`: Catalog result -> AgentOrg resolver result -> Apollo action -> local target prune/context disconnect -> quiet history refresh -> selected-route replacement -> subject-specific toast. Rejection/error stops before prune/disconnect/navigation.

If navigation fails after authoritative mutation success, report that the history operation completed but workspace navigation could not reset; do not relabel the durable mutation as failed or replay it automatically.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AgentOrgRunManager`
- Spine: requested `orgRunId` -> wait for prior exact-root transition -> recheck active registry -> reject as managed or run catalog callback -> release transition.
- Importance: It closes the stale-view race without exposing private transition mechanics or moving persistence into the manager.

- Parent owner: `AgentOrgRunHistoryCatalogService`
- Archive spine: safe identity -> snapshot row/tree -> write/read back archived tree -> write/read back projected index -> update in-memory rows; on ordinary index failure restore/read back original tree and index before returning non-success.
- Delete spine: safe identity -> snapshot rows/tree existence -> write index without target -> remove exact package -> update memory/exclude package; on removal failure restore/read back original index and verify target tree still exists before returning non-success.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine IDs | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization/accessibility | DS-001, DS-002, DS-004 | Web row/mutation policy | en/zh-CN labels, modal and feedback; aria names | Clear destructive scope and keyboard usability | Transport/domain layers would own presentation. |
| Exact-path validation | DS-001, DS-002 | Catalog | Reject blank/absolute/separator/dot identities; derive under AgentOrg root | Prevent cross-package mutation | Resolver-only validation is bypassable internally. |
| Durable readback/compensation | DS-001, DS-002 | Catalog | Prevent ordinary partial failure from being reported as success | Data continuity | UI cannot repair durable divergence. |
| Route/context cleanup | DS-004 | Pinia/panel | Disconnect exact context; exit exact selected route after success | Avoid stale center state | Server must not know browser route. |
| Catalog refresh/toast | DS-004 | Web mutation policy | Reconcile authoritative list and give truthful feedback | Consistent user outcome | Row component would become orchestration owner. |
| Canonical documentation | All | AgentOrg/run-history capability owners | Record public behavior/API and no-unarchive/no-migration scope | Durable engineering truth | Ticket-only docs would drift. |

## Ownership Boundaries

- GraphQL calls `AgentOrgRunService`; it must not call the catalog and manager independently.
- `AgentOrgRunService` normalizes the subject identity and delegates; it does not construct filesystem paths.
- `AgentOrgRunHistoryCatalogService` owns all tree/index/package mutation but must request lifecycle admission from `AgentOrgRunManager` for the entire durable operation.
- `AgentOrgRunManager` owns admission/serialization only; it must not absorb archive/delete persistence.
- `CollaborationRootHistoryService` remains a read-only mixed projection facade and must not acquire mutation methods.
- Pinia owns transport and client state; the router-aware panel owns route replacement. The row owns rendering only.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentOrgRunService` | manager admission + catalog command | GraphQL resolver | resolver calling catalog and manager separately | Add subject method to service. |
| `AgentOrgRunManager.withInactiveHistoryMutation` | private `withTransition`, active registry | AgentOrg catalog | catalog `getActive` pre-check followed by unguarded mutation | Keep one callback boundary. |
| `AgentOrgRunHistoryCatalogService` | safe layout, tree/index stores, package catalog, compensation | service | service/resolver deleting files or writing `archivedAt` | Extend catalog command. |
| `runHistoryStore` | Apollo action + local history state | mutation composable | row issuing GraphQL or editing Pinia arrays | Add exact store methods. |
| `useWorkspaceHistoryMutations` | pending/confirmation/toast policy | panel/row actions | AgentOrg-only modal or duplicate pending policy | Extend discriminated subject union. |

## Dependency Rules

- Row -> section contracts -> mutation composable/store only.
- Web action -> subject-explicit GraphQL document with exact `orgRunId`.
- Resolver -> `AgentOrgRunService` only.
- Service -> AgentOrg catalog public command only; catalog -> manager inactive-history boundary plus owned stores/layout.
- Catalog must not activate/restore, call providers, mutate definitions, or access Team/Agent packages.
- Manager callback must not be retained or invoked outside its exact transition.
- On the web, persistent success must precede row/context removal and route replacement.
- No generic `deleteHistory(kind, id)` server endpoint, mixed-root path guessing, dual archive representation, or fallback mutation path.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentOrgRunManager.withInactiveHistoryMutation<T>` | AgentOrg root lifecycle | Serialize exact-root mutation and reject managed/active state | nonblank safe `orgRunId` | Returns discriminated `managed` or `completed`. |
| `AgentOrgRunHistoryCatalogService.archiveStored` | AgentOrg history | Commit archive tree/index atomically with bounded compensation | exact `orgRunId` | No unarchive endpoint in this ticket. |
| `AgentOrgRunHistoryCatalogService.deleteStored` | AgentOrg history | Permanently remove exact index row/package with compensation | exact `orgRunId` | Replaces existing unsafe implementation. |
| `AgentOrgRunService.archiveStoredRun/deleteStoredRun` | AgentOrg lifecycle API | Normalize and delegate subject commands | exact `orgRunId` | Public domain boundary. |
| GraphQL `archiveStoredAgentOrgRun(orgRunId)` / `deleteStoredAgentOrgRun(orgRunId)` | AgentOrg history | Transport success/message/exact id | `String! orgRunId` | Dedicated result shape `{success,message,orgRunId?}`. |
| Pinia `archiveAgentOrgRun/deleteAgentOrgRun` | AgentOrg history client state | Apollo request, exact prune/disconnect, refresh | exact `orgRunId` | Returns boolean; logs transport detail. |
| UI `onArchiveAgentOrg/onDeleteAgentOrg` | AgentOrg row action | Eligibility, pending, confirmation and feedback | `AgentOrgRunHistoryItem` | No member-address selector. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Manager inactive-history boundary | Yes | Yes | Low | Reject unsafe/active root before callback. |
| Catalog archive/delete | Yes, one operation each | Yes | Low | Retain separate methods. |
| GraphQL mutations | Yes | Yes | Low | Use AgentOrg-specific names and `orgRunId`. |
| Web confirmation target | Yes | Yes via subject discriminator | Low | Replace parallel nullable IDs. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Root identity | `orgRunId` | Yes | Low | Do not call it Team ID or generic run path. |
| Manager boundary | `withInactiveHistoryMutation` | Yes | Low | Result discriminator documents rejection. |
| API commands | `archiveStoredAgentOrgRun`, `deleteStoredAgentOrgRun` | Yes | Low | Avoid generic/mixed history mutation. |
| UI actions | `onArchiveAgentOrg`, `onDeleteAgentOrg` | Yes | Low | Keep root-level subject explicit. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Lifecycle serialization | AgentOrg manager transition map | Extend | Already governs create/restore/config/terminate by root | N/A |
| Archive/delete persistence | AgentOrg history catalog + stores/layout | Extend | Already owns AgentOrg derived history/package mutation | N/A |
| Public lifecycle API | AgentOrg run service/resolver | Extend | Existing subject boundary | N/A |
| Pending/confirmation/toasts | Shared workspace history mutations composable | Extend | Existing Team/Agent policy | N/A |
| Retained context retirement | AgentOrg contexts store | Reuse | Exact `disconnect(orgRunId)` already exists | N/A |
| Mixed list visibility | Collaboration-root history reader | Reuse unchanged | Already filters inactive archived rows | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine IDs | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| AgentOrg execution lifecycle | exact-root transition admission | DS-001–003 | AgentOrg manager | Extend | One narrow public callback method. |
| Run history persistence | tree/index/package commands and compensation | DS-001–003 | AgentOrg catalog | Extend | No new file format. |
| GraphQL AgentOrg API | two explicit commands/results | DS-001, DS-002 | AgentOrg service/resolver | Extend | Keep mixed history query read-only. |
| Web run-history state | Apollo/local prune/refresh | DS-001, DS-002, DS-004 | runHistory store/actions | Extend | Exact target only. |
| Web history interaction | row, confirmation, pending, toast, route | DS-001, DS-002, DS-004 | composable/panel/row | Extend | Team visual behavior; AgentOrg identity. |
| Localization/docs | copy and canonical contracts | All | respective source owners | Extend | en/zh-CN and canonical docs. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-org-run-manager.ts` | AgentOrg lifecycle | manager | inactive-history transition | Already owns transitions/active registry | private transition lane |
| `agent-org-run-history-catalog-service.ts` | run history | catalog | archive/delete persistence and compensation | Already owns AgentOrg history mutation | tree/index/layout/package stores |
| `agent-org-run-service.ts` | AgentOrg API | service | public commands | Existing lifecycle facade | catalog methods |
| `api/graphql/types/agent-org-run.ts` | GraphQL | resolver | mutations/result mapping | Existing AgentOrg run API | service |
| `graphql/mutations/agentOrgRunMutations.ts` | web GraphQL | AgentOrg client transport | documents | Existing AgentOrg mutation catalog | GraphQL |
| `runHistoryMutationActions.ts` / `runHistoryStore.ts` / `runHistoryTypes.ts` | web state | Pinia | exact operations/state/result types | Existing mutation state boundary | context store and history refresh |
| `useWorkspaceHistoryMutations.ts` | web interaction | composable | pending/confirmation/toasts | Shared history policy owner | discriminated target |
| history contracts/panel/AgentOrg collection | web presentation | composition/row | bindings, route cleanup, controls | Existing rendered surface | Team CSS/action pattern |
| locale and docs files | support | localization/canonical docs | wording/contracts | Existing owners | established catalogs/docs |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Mutually exclusive pending delete subject | local exported/internal `PendingHistoryDeleteTarget` in `useWorkspaceHistoryMutations.ts` | web history interaction | Agent, Team and AgentOrg use one confirmation | Yes | Yes | generic server identity or persisted union |
| `{success,message,orgRunId}` transport result | local GraphQL object in `agent-org-run.ts` plus matching web type | AgentOrg API | Both new commands return same subject result | Yes | Yes | cross-family mutation envelope |
| Safe AgentOrg identity/path resolution | private catalog method using `AgentMemoryLayout` | AgentOrg catalog | Both archive/delete need identical validation | Yes | Yes | broadly shared path helper |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `PendingHistoryDeleteTarget` | Yes | Yes | Low | One discriminator + exact identity; no parallel nullable IDs. |
| AgentOrg history mutation result | Yes | Yes | Low | Subject-specific exact ID and message. |
| Existing tree/index `archivedAt` | Yes | Yes | Low | Tree is canonical; index is derived projection, updated in same catalog operation. |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-manager.ts` | AgentOrg execution | lifecycle manager | exact-root inactive-history admission | Transition state already lives here | existing `withTransition` |
| `autobyteus-server-ts/src/run-history/services/agent-org-run-history-catalog-service.ts` | run history | AgentOrg catalog | safe archive/delete, readback, compensation, memory/package catalog updates | One persistence authority | existing stores/layout |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-service.ts` | AgentOrg execution API | public service | subject command methods and dependency typing | Existing public lifecycle boundary | catalog result |
| `autobyteus-server-ts/src/api/graphql/types/agent-org-run.ts` | GraphQL | resolver | result type and two mutations | Existing AgentOrg API | service |
| `autobyteus-web/graphql/mutations/agentOrgRunMutations.ts` | web transport | AgentOrg GraphQL documents | archive/delete documents | Subject-specific existing catalog | mutation result contract |
| `autobyteus-web/stores/runHistoryTypes.ts` | web state contracts | run-history types | AgentOrg mutation result types | Existing state contracts | result shape |
| `autobyteus-web/stores/runHistoryMutationActions.ts` | web state | mutation actions | AgentOrg Apollo calls, exact prune/context disconnect/refresh | Existing history mutation owner | contexts store |
| `autobyteus-web/stores/runHistoryStore.ts` | web state | Pinia facade | public methods/topology refresh | Existing facade | mutation actions |
| `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | web interaction | shared policy | AgentOrg pending/archive/delete/confirmation/toast and discriminated target | Existing policy owner | locale catalog |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | web UI contracts | history composition | AgentOrg state/action bindings | Existing section contract | exact item type |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | web composition | router-aware panel | wire store/actions/pending and selected-route success cleanup | Existing composition root | contexts/route |
| `autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue` | web presentation | AgentOrg row | stopped-only accessible icons and click isolation | Existing row surface | Team visual classes |
| `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts` | localization | locale catalogs | labels/modal/toasts | Editable established catalogs | localization runtime |
| Server/web tests named in Guidance | validation | existing owners | deterministic and component regression coverage | Adjacent to owned behavior | existing fixtures |
| `autobyteus-server-ts/docs/modules/{run_history,agent_orgs}.md`, `autobyteus-web/docs/agent_orgs.md` | canonical docs | capability owners | lifecycle/API/UI contract | Existing canonical documents | approved terminology |

## Applied Patterns

- **Manager callback under per-root transition:** mirrors the established Team unmanaged-history deletion concept while using AgentOrg's own manager and identity.
- **Catalog projection:** tree remains canonical, index remains a derived searchable row.
- **Subject-explicit transport:** AgentOrg mutation names and `orgRunId` prevent cross-family guessing.
- **Discriminated UI confirmation target:** one confirmation owner, explicit subject branch, no mutually inconsistent pending IDs.
- **Commit then reconcile:** no local disappearance or success toast before authoritative server success.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-org-execution/services/` | Folder | AgentOrg lifecycle | manager admission and public service delegation | Existing domain-control boundary | UI or raw GraphQL documents |
| `autobyteus-server-ts/src/run-history/services/agent-org-run-history-catalog-service.ts` | File | AgentOrg history persistence | durable mutation and compensation | Existing catalog owner | provider calls/definition deletion |
| `autobyteus-server-ts/src/api/graphql/types/agent-org-run.ts` | File | transport facade | typed mutations/results | Existing AgentOrg resolver | filesystem logic |
| `autobyteus-web/graphql/mutations/agentOrgRunMutations.ts` | File | client transport | AgentOrg mutation documents | Existing subject catalog | Pinia cleanup |
| `autobyteus-web/stores/` | Folder | web state | request/local state reconciliation | Existing Pinia ownership | route navigation |
| `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | File | interaction policy | pending/confirmation/toasts | Existing shared policy | GraphQL details |
| `autobyteus-web/components/workspace/history/` | Folder | UI composition/presentation | bindings, selected-route cleanup, controls | Existing history surface | server eligibility authority |
| `autobyteus-web/localization/messages/` | Folder | localization | user-visible strings | Existing catalogs | behavior logic |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| server `agent-org-execution/services` | Main-Line Domain-Control | Yes | Low | Manager/service keep lifecycle and public command separate from persistence. |
| server `run-history/services` | Persistence-Provider | Yes | Low | Catalog already owns AgentOrg history/index/package. |
| server `api/graphql/types` | Transport | Yes | Low | Thin resolver only. |
| web `stores` | Main-Line client state | Yes | Medium | Mutation action file isolates Apollo/cleanup from large store facade. |
| web history components/composable | UI/off-spine interaction | Yes | Low | Row emits; composable owns policy; panel owns route composition. |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Lifecycle guard | `catalog queue -> manager.withInactiveHistoryMutation(orgRunId, durableOperation)` | `if (!manager.getActive(id)) fs.rm(...)` | The latter races restore/configuration/termination. |
| API | `deleteStoredAgentOrgRun(orgRunId: String!)` | `deleteHistory(kind: String!, id: String!)` | Subject and identity remain explicit. |
| Confirmation | `{ kind: 'agent_org', orgRunId }` | three nullable pending IDs | Prevents ambiguous modal target. |
| Success cleanup | server success -> prune exact row -> disconnect exact context -> selected-route exit | optimistic row removal before server result | Prevents false success/data-state drift. |
| Archive state | write existing tree `archivedAt`, project index | create `agent_org_archive.json` | Avoids overlapping representations. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old catalog delete and add a new safe variant | Minimize edits | Rejected | Replace the sole method body/signature behavior behind the manager lane. |
| Add an alternate AgentOrg archive marker file | Could avoid tree write | Rejected | Use existing canonical V1 tree/index fields directly. |
| Generic Agent/Team/Org GraphQL mutation | Superficial deduplication | Rejected | Add two subject-explicit AgentOrg mutations. |
| Client-only hiding/deletion | Fast UI parity | Rejected | Persist through authoritative catalog and refresh. |
| Migration for existing roots | New capability touches persisted data | Rejected | Existing schemas/readers already support `archivedAt`; direct use. |

## Derived Layering

`History row presentation -> shared history interaction policy -> run-history client state/Apollo -> AgentOrg GraphQL facade -> AgentOrg public service -> AgentOrg manager lifecycle admission + AgentOrg history catalog persistence -> existing tree/index/package stores`.

The manager and catalog are peers in responsibility but not bypassable alternatives: the service exposes the command; the catalog owns data; the manager gates its execution.

## Change / Refactor Sequence

1. Add deterministic manager unit coverage for inactive-history admission, active/conflicting rejection and exact-root serialization; then add `withInactiveHistoryMutation` using existing `withTransition`.
2. Rewrite catalog delete behind that boundary; add safe identity resolution, injectable package removal for tests, verified index compensation, and target preservation checks.
3. Add archive behind the same boundary using existing `archivedAt`; implement durable readback and bounded tree/index compensation before publishing catalog memory success.
4. Extend `AgentOrgRunService` dependency contract and public methods; add subject-explicit GraphQL result/mutations and unit/E2E coverage.
5. Add web GraphQL documents/types and Pinia actions/methods for exact row prune, context disconnect, quiet refresh and navigation topology refresh.
6. Tighten `useWorkspaceHistoryMutations` to a discriminated delete target; add AgentOrg pending/action/copy branches while preserving Agent/Team behavior.
7. Extend history contracts/panel/AgentOrg row; render stopped-only Team-aligned icons, isolate action clicks, and route away only after successful mutation of the selected exact root.
8. Add en/zh-CN strings and run localization guard/audit.
9. Update canonical AgentOrg/run-history docs.
10. Run focused backend/web tests, adjacent Agent/Team regression tests, builds, and API/E2E actual-browser validation with isolated disposable data; do not mutate the user's retained histories.

## Key Tradeoffs

- A manager callback is slightly more code than a repeated active check, but it is the smallest boundary that satisfies the stale/racing lifecycle requirement without moving persistence into the manager.
- Keeping separate AgentOrg API methods duplicates a small amount of Team transport shape, but preserves subject identity and ownership better than a generic mixed mutation.
- Archive compensation adds bounded complexity, but it is justified because tree and index are separate durable files and the approved failure contract forbids ordinary partial success presentation.
- The shared confirmation composable remains multi-subject. A discriminated target controls that coupling without creating an AgentOrg-specific modal.

## Risks

| Risk | Mitigation / Required Proof |
| --- | --- |
| Archive/delete races restore or stopped-config update | Manager transition tests with controlled barriers; active/conflicting result remains non-success. |
| Partial tree/index/package mutation | Injected write/remove failures; compensation/readback assertions; in-memory rows update only after durable success. |
| Unsafe/path-like `orgRunId` | Catalog identity tests for blank, slash, backslash, absolute, dot and unknown IDs. |
| Successful removal leaves stale selected center | Panel/store tests for exact context disconnect and route replacement; sibling contexts remain. |
| Action click opens/collapses row | Component tests for propagation isolation and row state. |
| Agent/Team regressions from confirmation refactor | Existing plus focused Agent/Team cancel/confirm/pending tests. |
| Misleading definition deletion copy | en/zh-CN catalog assertions and actual browser confirmation text. |
| User data loss during validation | Use isolated temporary memory/workspace fixtures; actual browser validation deletes only a disposable test AgentOrg. |

## Guidance For Implementation

### Required implementation behavior

- Normalize and validate `orgRunId` before deriving a path; reject unsafe or unknown targets.
- Hold the exact manager transition for the complete durable archive/delete operation and recheck activity inside it.
- Never restore/activate or call model/provider capabilities for archive/delete.
- Do not mutate catalog memory or publish success until durable writes/removal and required readback succeed.
- Archive must preserve every target file except the canonical tree/index timestamp projection.
- Delete must preserve definitions, workspace records, other root packages and external state.
- Web cleanup must be exact and post-success. A failed mutation must not disconnect, navigate, prune or issue a success toast.
- Keep action buttons independently focusable/named and use `@click.stop`; active roots retain Stop only.

### Focused durable tests

Backend:
- Extend `tests/unit/agent-org-execution/agent-org-run-manager-lifecycle.test.ts` for inactive/active/conflicting serialization.
- Extend `tests/unit/run-history/services/agent-org-run-history-catalog-service.test.ts` for archive success/idempotent timestamp, delete success, unsafe/unknown/active rejection, package and index preservation, injected write/removal failure and compensation/readback.
- Extend `tests/unit/agent-org-execution/agent-org-run-service-history-order.test.ts` for delegation/no activation.
- Extend or add GraphQL coverage near `tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` for exact AgentOrg archive/delete results and mixed-family preservation.

Frontend:
- Extend `components/workspace/history/__tests__/WorkspaceAgentOrgDisclosure.spec.ts` for stopped icons, active absence, pending disable, accessible labels and click isolation.
- Add focused composable tests for discriminated Agent/Team/AgentOrg confirmation, cancel, duplicate exclusion and truthful feedback.
- Extend `stores/__tests__/runHistoryStore.spec.ts` for exact Apollo variables, prune/disconnect/refresh on success and no cleanup on failure.
- Extend `WorkspaceAgentRunsTreePanel.spec.ts` for selected-target route exit and unselected sibling preservation.
- Preserve existing Agent/Team mutation and disclosure suites.

API/E2E validation intent:
- Start from an isolated temporary profile with at least two AgentOrg roots plus Agent/Team history.
- Prove stopped/active UI eligibility, Delete cancel, Archive retention/visibility, exact confirmed Delete, stale-active rejection, selected-route cleanup, sibling and definition/workspace preservation, and localized/accessibility behavior in an actual browser.
- Capture filesystem/index inventories or hashes before/after. No inference/Send is required.
- Run current server production build and web build/localization guards; broader failures must be attributed, not relabeled.

### Documentation

Update canonical server run-history and AgentOrg API docs plus web AgentOrg history docs. Record that Archive is non-destructive default-list hiding, Delete is confirmed exact-package removal, actions are stopped-only, active roots are rejected authoritatively, no unarchive UI/migration is introduced, and definition/workspace data is not deleted.
