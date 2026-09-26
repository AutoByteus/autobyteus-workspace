# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `PROJ-CONCEPT-20260926-001`
- Request / ticket: `projects-concept-introduction` — introduce a feature-flagged Projects concept (slice 1 of the Project/Task work model)
- Requirements owner: Solution Designer
- Date: 2026-09-26
- Approval state and reference: **Approved** by the user on 2026-09-26 in the Solution Designer conversation, after confirming (a) the toggle semantics are identical to Applications — on: `Projects` visible in navigation and usable; off: hidden, routes redirect, data retained; default off — and (b) this ticket is Projects only, Tasks later. The user accepted all recommendations for `DEC-001`–`DEC-008` ("I'll approve now"). Approval reference: `APPROVAL-PROJ-CONCEPT-20260926-001`.
- Exact approved requirements baseline / solution revision: `SR-001` — `REQ-001`–`REQ-014`, `AC-001`–`AC-012`, `SCN-001`–`SCN-006`, `BEH-001`–`BEH-006`, `UC-001`–`UC-006`, `QR-001`–`QR-004`, with `DEC-001`–`DEC-008` resolved as recommended and `ASM-001`–`ASM-002` accepted.
- Behavior-defining supplements and their approved versions: None. The `REQ-ATPTN-001` visualizer is exploratory evidence only (see UI section).

## Problem And Desired Outcome

- Problem: The product has no durable way to group related work. The top-level organising unit is the registered filesystem Workspace, which is an implementation-level resource. Real projects span several workspaces (e.g. the `autobyteus` product has the main monorepo workspace, the UI-prototype workspace, and marketing workspaces), and nothing records what each workspace is for or that they belong together. The broader Project/Task model was explored in `REQ-ATPTN-001` but remains an unapproved Draft; the user wants to land the Project concept first, hidden behind a feature flag, without committing to the Task model yet.
- Affected actors or systems: Desktop users organising work; workspace registry; server settings/capability surface; primary navigation; Server Settings › Basics.
- Desired outcome: A user can enable a hidden-by-default Projects feature on a node, create Projects with a name and description, link registered workspaces to a Project with a per-link description of what that workspace is about, and browse/search Projects — without any change to existing workspace, run, or history behavior.
- Observable definition of success: With the flag off, the product is indistinguishable from today. With the flag on, a `Projects` destination appears; a user can create "autobyteus", describe it, link three workspaces with descriptions, reopen the app and find them intact; removing one linked workspace from the registry shows it as unavailable in the Project rather than deleting the link.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | `SCN-001`, `SCN-002` | `No current supported behavior` — no Project concept exists in web or server. | Proposed target trigger: `Projects` primary-navigation destination (when enabled) offering create/open/edit/delete of Projects with name and description. | N/A | `investigation-notes.md` Source Log (grep of web/server) |
| BEH-002 | User/System | `SCN-003` | Workspaces are registered by root path; id `agent_ws_<sha256(path)>`; display name = basename; no user description. | A Project can link registered workspaces by `workspaceId`; each link has a user-written description; the link is a reference, never the Project's identity. | Workspace registration, ids, display names, listing, and use in run configuration are unchanged. | `workspace-registry-store.ts`, `workspace.ts` resolver |
| BEH-003 | User/System | `SCN-004` | Removing a registered workspace is non-destructive: blocked only by active runs; history-only roots stay resolvable. | A Project link to a workspace that is no longer registered is retained and shown as unavailable; re-registering the same path restores it. | Removal guard, non-destructive semantics, and history resolution are unchanged. | `workspace-removal-guard.ts`, `workspace-manager.ts` |
| BEH-004 | User/System | `SCN-005` | Applications capability: per-node `ENABLE_APPLICATIONS` setting → typed capability → nav filter → route redirect → Settings › Basics toggle. | Projects capability `ENABLE_PROJECTS` with the same user-visible behavior, default disabled, no auto-initialisation heuristic. | Applications capability behavior and its GraphQL contract are unchanged. | `application-capability/**`, `applicationsCapabilityStore.ts`, `feature-flags.global.ts` |
| BEH-005 | User | `SCN-005` | Mobile remote-access runtime shows only supported nav items; `applications`/`nodes` are desktop-only. | Projects is desktop-only in slice 1 (not listed as a supported mobile feature). | Mobile navigation is unchanged. | `mobileFeatureGates.ts` |
| BEH-006 | Operational | `SCN-006` | Server settings persist per node via `appConfigProvider.config`; predefined settings carry descriptions. | `ENABLE_PROJECTS` is a predefined, editable server setting. | Existing settings are unchanged. | `server-settings-service.ts` |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Desktop user / work owner | Group related workspaces under a named, described Project | Can create, describe, find, and edit Projects and their workspace links | Must not change how workspaces or runs work today |
| Node operator (same user) | Decide whether the preview feature is visible on this node | Can turn Projects on/off per node from Server Settings | Default is off |
| Future Tasks slice (`REQ-ATPTN-001`) | Attach Tasks to Projects later | Project identity is durable and stable | Slice 1 must not introduce Task vocabulary or semantics |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001`: Enable/disable the Projects feature on the bound node (default disabled) and have navigation, routes, and Settings reflect it.
- `UC-002`: Create a Project with a required name and optional description; list and search Projects; open a Project; edit its name/description; delete it.
- `UC-003`: Link an already-registered filesystem workspace to a Project with a per-link description; edit that description; unlink it.
- `UC-004`: From a Project, register a new workspace root (using the existing registration behavior) and link it in one flow.
- `UC-005`: View a Project whose linked workspace is no longer registered and see it marked unavailable; regain availability when the path is re-registered.
- `UC-006`: Persist Projects per node across restarts.

### Out Of Scope

- Tasks, task lifecycle/assignment/"admission", executions under Tasks, `Active projects` navigation, virtual office, run-history reorganisation, and legacy-history placement (`REQ-ATPTN-001` `REQ-003`–`REQ-005`, `REQ-008`–`REQ-015`).
- Changing Workspace identity, naming, registration, removal guard, or run/launch configuration.
- Cross-node synchronisation, sharing, permissions, or import/export of Projects.
- Mobile remote-access support for Projects (may be a later requirement).
- Generalising or refactoring the Applications feature flag beyond what the design needs to add Projects (a design-phase choice, not a product requirement).

### Non-Goals

- Making Workspace synonymous with Project, or inferring Projects from workspace paths.
- Launching agents/teams "from a Project" in slice 1.
- Enforcing that every workspace belongs to a Project.

### Preserved Behavior Boundary

- `BEH-002`, `BEH-003`, `BEH-004` (Applications), `BEH-005`, `BEH-006` outcomes remain unchanged; see `AC-009`, `AC-010`.
- Cross-cutting invariant: with `ENABLE_PROJECTS` unset or `false`, no user-visible surface, route, or navigation differs from the base revision.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A Project shall have a durable identity, a required user-visible name (trimmed, non-empty, unique per node case-insensitively), an optional free-text description, and creation/last-updated timestamps. | `BEH-001` | Must | Stable identity is needed for later Tasks; unique names avoid ambiguity in navigation. | User statement; `DEC-008` |
| REQ-002 | A Project shall reference zero or more registered filesystem workspaces by workspace identity. Each link shall carry an optional user-written description of what that workspace is for within the Project. A given workspace shall appear at most once per Project. | `BEH-002` | Must | Workspaces are implementation-level resources; the Project records their role. | User statement; `REQ-ATPTN-001` `REQ-002`/`REQ-006` (Draft) |
| REQ-003 | The same registered workspace may be linked to more than one Project. | `BEH-002` | Should | A shared resource (e.g. a marketing workspace) can serve several projects; avoids an artificial exclusivity rule. | `DEC-002` |
| REQ-004 | A link to a workspace that is no longer registered shall be retained and presented as unavailable (with its stored root path and description). Re-registering the same root path shall restore availability without duplicating the link. Workspace removal shall not be blocked by Project links. | `BEH-003` | Must | Mirrors the non-destructive workspace-removal semantics; work organisation must not vanish because a path was unregistered. | `DEC-003`; `REQ-ATPTN-001` `REQ-011` (Draft) |
| REQ-005 | From a Project, the user shall be able to link an existing registered workspace or register a new workspace root and link it, reusing the product's existing workspace-registration behavior (same validation, id derivation, and side effects). | `BEH-002` | Must | Avoids a second registration path with divergent rules. | `DEC-007` |
| REQ-006 | The Projects feature shall be governed by a per-node capability setting `ENABLE_PROJECTS`, default disabled, with no automatic enabling heuristic. When disabled: the `Projects` navigation item is absent, Project routes redirect to the home route, and no other user-visible behavior changes. | `BEH-004` | Must | User asked for a hidden-by-default flag like Applications. | User statement; Applications precedent |
| REQ-007 | The node operator shall be able to enable or disable Projects from Server Settings › Basics through a toggle equivalent to the Applications toggle, and the change shall take effect in navigation without restarting the app. | `BEH-004`, `BEH-006` | Must | Same operator experience as Applications. | `DEC-004` |
| REQ-008 | When enabled, `Projects` shall be a peer primary-navigation destination in the desktop shell (ordered after `Nodes`), leading to a Projects index that supports create, search by name/description, open, edit, and delete. | `BEH-001`, `BEH-005` | Must | Matches the exploratory prototype's placement and existing catalogue conventions. | `VIS-111`, `VIS-020`–`VIS-022` (exploratory) |
| REQ-009 | Deleting a Project shall require explicit confirmation, shall remove only the Project record and its links, and shall not remove, unregister, or modify any workspace or stored history. | `BEH-001`, `BEH-003` | Must | Project deletion must be safe and clearly scoped. | `DEC-001` |
| REQ-010 | Projects and their links shall persist on the bound node across server and app restarts and shall be scoped to that node (rebinding to another node shows that node's Projects). | `BEH-006` | Must | Consistent with workspaces and the Applications capability scope. | `ASM-002` |
| REQ-011 | Introducing Projects shall not modify, migrate, or reinterpret any existing persisted data (workspace registry, run history, settings other than the new key). | `BEH-002`, `BEH-003`, `BEH-006` | Must | Zero-risk introduction. | Investigation |
| REQ-012 | All new user-visible strings shall be provided in `en` and `zh-CN`. | `BEH-001` | Must | Existing localisation convention. | `localization/messages/{en,zh-CN}` |
| REQ-013 | Projects UI (index, create/edit, workspace-link management, delete confirmation) shall be keyboard operable with accessible names, states, and error feedback. | `BEH-001` | Must | Existing product accessibility expectations. | Prior approved catalogues |
| REQ-014 | Slice 1 shall not introduce any user-visible Task vocabulary, task counts, or task placeholders on Project surfaces. | `BEH-001` | Must | Avoids implying an unapproved model and avoids collision with execution-internal delegated tasks. | `REQ-ATPTN-001` `REQ-013` (Draft); `RISK-002` |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | `REQ-006`, `REQ-011` | `BEH-004`, `SCN-005` | Fresh node; `ENABLE_PROJECTS` unset | No `Projects` nav item; navigating to `/projects` redirects to `/`; Settings › Basics shows the Projects toggle as disabled; all other screens unchanged | If capability resolution fails, the route still redirects to `/` and the nav item stays hidden | Unit (store, middleware, nav) + browser E2E |
| AC-002 | `REQ-006`, `REQ-007` | `BEH-004`, `BEH-006`, `SCN-005` | User toggles Projects on in Settings › Basics | Setting persists as `true`; `Projects` appears in primary navigation without restart; after restart it is still enabled | Toggling off hides the item again and redirects open Project routes to `/` | Unit + browser E2E; restart check |
| AC-003 | `REQ-001`, `REQ-008`, `REQ-012` | `BEH-001`, `SCN-001` | Projects enabled; user creates "autobyteus" with a description | Project appears in the index with name and description; reopening shows the same values; strings render in `en` and `zh-CN` | Empty/whitespace name is rejected with a field-level message; duplicate name (case-insensitive) is rejected without creating a record | Unit + browser E2E |
| AC-004 | `REQ-001`, `REQ-008` | `BEH-001`, `SCN-002` | Several Projects exist | Search filters by name or description; no-match shows a recoverable empty state; editing name/description updates the index | Renaming to an existing name is rejected | Browser E2E |
| AC-005 | `REQ-002`, `REQ-005` | `BEH-002`, `SCN-003` | Open Project; three registered workspaces exist | User links a workspace, writes "UI prototype workspace" as its description; the link shows workspace display name, root path, and description; the same workspace cannot be linked twice to this Project | Registering a new root from the Project uses the existing registration rules and links it on success; a failed registration links nothing | Unit (server) + browser E2E |
| AC-006 | `REQ-003` | `BEH-002`, `SCN-003` | Workspace already linked to Project A | User links the same workspace to Project B | Both Projects show the link with their own descriptions | Unit (server) |
| AC-007 | `REQ-004` | `BEH-003`, `SCN-004` | Project links workspace W; user removes W from Workspaces | Removal is not blocked by the link; Project still lists W as unavailable with its stored path and description; no other link is affected | Re-registering W's path restores the link to available without creating a duplicate | Integration (server) + browser E2E |
| AC-008 | `REQ-009` | `BEH-001`, `BEH-003`, `SCN-002` | User deletes a Project that has links | Confirmation is required; after confirming, the Project and its links are gone; `workspaces.json`, registered workspaces, and run history are unchanged | Cancelling leaves everything intact | Unit + browser E2E |
| AC-009 | `REQ-010`, `REQ-011` | `BEH-006`, `SCN-006` | Projects created on node A; app rebinds to node B and back | Node B shows its own (possibly empty) Projects; returning to A shows A's Projects; no existing data files other than the new Project store and the `ENABLE_PROJECTS` setting change | Backend not ready → Projects UI shows the existing not-ready handling and retries on ready | Integration + store unit |
| AC-010 | `REQ-006`, `REQ-011` (preserved `BEH-004`) | `BEH-004` | Applications capability in any state | `applicationsCapability`/`setApplicationsEnabled` behavior and the Applications toggle are unchanged | — | Existing tests remain green |
| AC-011 | `REQ-013` | `BEH-001` | Keyboard-only user | Can create, search, open, edit, link/unlink, and delete without a pointer; dialogs trap focus and announce errors | — | Accessibility assertions + keyboard review |
| AC-012 | `REQ-014` | `BEH-001` | Any Project surface | No "Task"/"Tasks" labels, counts, or placeholders are rendered | — | UI review + string catalogue check |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Work owner | Create a Project | `Projects` nav → `New Project` | Projects enabled; no Projects | Open Projects → New Project → enter name + description → create | Project listed and openable | Empty/duplicate name rejected inline | Supported Normal Scenario (proposed; pending approval) | User statement; `VIS-021` (exploratory) | `REQ-001`, `REQ-008`, `AC-003` |
| SCN-002 | User | Work owner | Find, edit, delete a Project | Projects index | Several Projects exist | Search → open → edit name/description → delete with confirmation | Index reflects edits; deletion removes only the Project | No-match empty state; cancel delete | Supported Normal Scenario (proposed) | `VIS-111` (exploratory) | `REQ-008`, `REQ-009`, `AC-004`, `AC-008` |
| SCN-003 | User | Work owner | Describe which workspaces belong to a Project | Project detail → Add workspace | Project exists; some workspaces registered | Choose a registered workspace (or register a new root) → write description → save; repeat; edit/unlink | Project shows linked workspaces with descriptions | Duplicate link in same Project rejected; registration failure links nothing | Supported Normal Scenario (proposed) | User statement (autobyteus example); `REQ-ATPTN-001` `REQ-006` (Draft) | `REQ-002`, `REQ-003`, `REQ-005`, `AC-005`, `AC-006` |
| SCN-004 | User/System | Workspace owner | Unregister a workspace that a Project references | Workspaces → Remove | Linked workspace registered | Remove workspace → open Project → optionally re-register path | Link shown unavailable, then restored | Removal still blocked by active runs (existing) | Supported Explicit Edge Scenario (explicit non-destructive contract in current product) | `workspace-removal-guard.ts`; `REQ-ATPTN-001` `REQ-011` (Draft) | `REQ-004`, `AC-007` |
| SCN-005 | User/Operational | Node operator | Turn the preview feature on/off | Settings › Basics → Projects toggle | Default disabled | Toggle on → `Projects` appears → toggle off → item disappears, routes redirect | Feature hidden by default; reversible | Capability resolve error → hidden + redirect | Supported Normal Scenario (proposed; mirrors Applications) | Applications precedent (`disable-applications-menu-by-default`, `server-settings-applications-toggle-card`) | `REQ-006`, `REQ-007`, `AC-001`, `AC-002` |
| SCN-006 | Operational | Bound-node persistence | Projects survive restart and are node-scoped | App restart / node rebinding | Projects exist on node A | Restart server/app; rebind to B; rebind to A | Data intact and node-scoped | Backend not ready handling | Supported Normal Scenario (proposed; mirrors workspaces/capability) | `applicationsCapabilityStore.ts` binding-revision handling | `REQ-010`, `REQ-011`, `AC-009` |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX or interaction supplement: None owned by this package.
- Linked runnable prototype, separate prototype repository/root, UI/UX specification, and applicable support artifacts: Exploratory visualizer `REQ-ATPTN-001` in the Product-owned repository `autobyteus-web-prototype`, currently only inside container `autobyteus-server-0` at `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQ-ATPTN-001` (branch `prototype/req-atptn-001` @ `e003e84`). No UI/UX specification exists.
- Product prototype ticket record and folder (externally owned): container `…/REQ-ATPTN-001/tickets/in-progress/REQ-ATPTN-001/prototype-ticket.md`
- Prototype revision or commit: `RV-033` @ `dce2fa4`/`e003e84` (exploratory)
- UI/UX user-confirmation reference: `N/A — exploration only was authorised (2026-08-27)`
- Approved visual-reference baseline: `N/A — none approved`
- Normative visual and interaction details, including the approved final references: None. Slice 1 shall follow the product's existing catalogue/list page conventions (search field, item cards/rows, primary create action, detail view) and the existing Settings toggle-card pattern. The exploratory `VIS-021`/`VIS-111` screens are directional evidence for placement (peer nav item after `Nodes`) and content (name, description) only.
- Explicitly illustrative fixture content or permitted implementation variation: All prototype content (project names, counts, task lists) is fixture; task counts are explicitly excluded (`REQ-014`).
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: Projects index (empty, populated, searching, no-match, loading, error); create/edit Project form with validation; Project detail with linked-workspace list (available/unavailable states) and add/edit/unlink actions; delete confirmation; Settings toggle card (loading/enabled/disabled/error/saving); desktop responsive behavior consistent with existing catalogue pages; keyboard operability per `REQ-013`.
- Explicitly unresolved product decisions: `DEC-006` (whether the user wants a Product Design prototype for slice 1 before implementation).

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | `REQ-010`, `AC-009` | Reliability | Project writes are atomic; a failed write leaves the previous state intact and surfaces an error to the user. | Server persistence | Unit test with injected write failure |
| QR-002 | `REQ-006`, `AC-001` | Compatibility | Base revision behavior is byte-for-byte unaffected in navigation and routes when the flag is off. | Flag disabled | Existing E2E/unit suites green; targeted disabled-state E2E |
| QR-003 | `REQ-013`, `AC-011` | Accessibility | All new controls have accessible names; dialogs are focus-managed; validation errors are associated with fields. | Desktop | Automated a11y assertions + keyboard review |
| QR-004 | `REQ-008` | Performance | Index renders and searches ≤ 200 Projects without noticeable lag (< 100 ms filter on a typical desktop). | Client-side filtering | Manual/perf check |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` — new Project records (+ links) and a new setting key only.
- Data or state that must be preserved: everything that exists today (`workspaces.json`, run history, all settings); Project records once created; links to unregistered workspaces.
- Loss, reset, rebuild, or regeneration that is acceptable: none for user-created Projects.
- Retention, privacy, compliance, volume, downtime, or operational constraints: local-only; tens of records; no downtime.
- Unknowns requiring downstream investigation: storage mechanism and id scheme (architecture); none affecting intended behavior.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Workspace registry / GraphQL `workspaces`, `createWorkspace`, `removeWorkspace` | Reused unchanged for linking, registering, and availability resolution | `investigation-notes.md` | None |
| Applications capability contract | Unchanged; serves as the behavioral template | `application-capability.ts` | Design must not alter its schema |
| Bound-node context | Project store and capability invalidate on rebinding | `windowNodeContextStore.bindingRevision` | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/investigation-notes.md` | Evidence and sources | All | Current | Evidence only |
| container `autobyteus-server-0:/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQ-ATPTN-001/tickets/in-progress/REQ-ATPTN-001/` (ticket, brief, design plan, review, visual manifest) | Exploratory Product evidence | `REQ-001`, `REQ-002`, `REQ-008`, `DEC-006` | Awaiting User Review (external) | Non-normative; not part of approval basis |
| container `autobyteus-server-0:/home/autobyteus/workspace/.codex/worktrees/agent-team-project-task-navigation/tickets/in-progress/agent-team-project-task-navigation/requirements-doc.md` | Draft parent model (`RER-004`) | `REQ-002`, `REQ-004`, `REQ-014` | Draft, unapproved (external/historical) | Context only; slice 1 is approved independently |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Slice 1 excludes Tasks, executions, run-history changes, and the `Active projects` panel. | Keeps the change small and independently valuable. | User approval | Accepted 2026-09-26 (user: "this ticket is only Projects; Tasks later") |
| ASM-002 | Projects are per bound node, like workspaces and the Applications capability. | Consistent scoping; avoids sync design. | User approval | Accepted 2026-09-26 |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Project lifecycle in slice 1: edit + delete only, or also archive? | Archive implies a list filter and state model that mainly matters once Tasks exist. | Decided: edit + confirmed delete now (`REQ-009`); archive deferred to the Tasks slice. | User | Resolved 2026-09-26 (`APPROVAL-PROJ-CONCEPT-20260926-001`) |
| DEC-002 | May one workspace be linked to several Projects? | Shared resources (marketing workspace) vs strict ownership. | Decided: yes (`REQ-003`). | User | Resolved 2026-09-26 |
| DEC-003 | When a linked workspace is unregistered: keep the link as unavailable (not blocking removal), or block removal while linked? | Consistency with non-destructive removal vs referential strictness. | Decided: keep as unavailable, never block (`REQ-004`). | User | Resolved 2026-09-26 |
| DEC-004 | Is the flag user-visible as a Settings › Basics toggle (like Applications) or hidden (setting/env only)? | "Not visible to users" could mean either. | Decided: visible toggle, default off (`REQ-007`) — user explicitly confirmed "just like application". | User | Resolved 2026-09-26 |
| DEC-005 | Desktop-only in slice 1? | Mobile runtime gating. | Decided: desktop-only (`BEH-005`). | User | Resolved 2026-09-26 |
| DEC-006 | Should Product Design produce a prototype/UI-UX spec for slice 1 before implementation, or implement directly on existing catalogue conventions? | Slice 1 is simple CRUD; the exploratory visualizer already shows the placement. | Decided: implement on existing conventions; no Product Design request. | User | Resolved 2026-09-26 |
| DEC-007 | Can a new workspace root be registered from within a Project, or only pre-registered workspaces linked? | Flow convenience vs surface area. | Decided: both, reusing the existing registration behavior (`REQ-005`). | User | Resolved 2026-09-26 |
| DEC-008 | Project name uniqueness per node (case-insensitive)? | Ambiguity in navigation and future Task placement. | Decided: unique (`REQ-001`). | User | Resolved 2026-09-26 |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | `UC-002` | `BEH-001` | `AC-003`, `AC-004` | `SCN-001`, `SCN-002` | `VIS-021` (exploratory) |
| REQ-002 | `UC-003` | `BEH-002` | `AC-005` | `SCN-003` | User statement; Draft `REQ-ATPTN-001` `REQ-002` |
| REQ-003 | `UC-003` | `BEH-002` | `AC-006` | `SCN-003` | `DEC-002` |
| REQ-004 | `UC-005` | `BEH-003` | `AC-007` | `SCN-004` | Removal guard; Draft `REQ-011` |
| REQ-005 | `UC-003`, `UC-004` | `BEH-002` | `AC-005` | `SCN-003` | `WorkspaceSelector.vue`; `createWorkspace` |
| REQ-006 | `UC-001` | `BEH-004` | `AC-001`, `AC-010` | `SCN-005` | Applications capability |
| REQ-007 | `UC-001` | `BEH-004`, `BEH-006` | `AC-002` | `SCN-005` | Applications toggle card |
| REQ-008 | `UC-002` | `BEH-001`, `BEH-005` | `AC-003`, `AC-004` | `SCN-001`, `SCN-002` | `VIS-111` (exploratory) |
| REQ-009 | `UC-002` | `BEH-001`, `BEH-003` | `AC-008` | `SCN-002` | `DEC-001` |
| REQ-010 | `UC-006` | `BEH-006` | `AC-009` | `SCN-006` | Capability store binding handling |
| REQ-011 | `UC-006` | `BEH-002`, `BEH-003`, `BEH-006` | `AC-008`, `AC-009`, `AC-010` | `SCN-004`, `SCN-006` | Investigation |
| REQ-012 | `UC-002`, `UC-003` | `BEH-001` | `AC-003` | `SCN-001` | Localisation catalogues |
| REQ-013 | `UC-002`, `UC-003` | `BEH-001` | `AC-011` | `SCN-001`–`SCN-003` | Existing catalogues |
| REQ-014 | `UC-002` | `BEH-001` | `AC-012` | `SCN-001`, `SCN-002` | Draft `REQ-013`; `RISK-002` |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: `SCN-001`–`SCN-006` (after approval).
- Product and system constraints architecture must preserve: Applications capability contract unchanged; workspace registry contract unchanged; per-node scoping; flag-off invariance; no migration of existing data; Project identity stable for future Tasks.
- Decisions intentionally deferred to architecture design: mirror vs generalise the capability mechanism; storage mechanism (Prisma/SQLite vs atomic JSON) and id scheme; GraphQL shape for Projects and links (including resolved workspace availability); page/component composition and reuse of catalogue patterns.
- Technical facts architecture should verify: `ServerSettingsService` predefined-setting registration; `build-studio-server.ts` service composition; `WorkspaceManager` visible vs registered listing (temp exclusion); route middleware ordering; existing catalogue page structure.
- Known feasibility or integration risks: none material; generalising the capability code touches Applications tests.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `Yes` (exploratory evidence linked, marked non-normative)
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A` (no Product Design request; `DEC-006`)
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None.

### Approved Basis Ready For Design

- User approval received: `Yes` — `APPROVAL-PROJ-CONCEPT-20260926-001` (2026-09-26)
- Exact requirements and supplement approval basis recorded: `Yes` — `SR-001`, no behavior-defining supplements
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None.
