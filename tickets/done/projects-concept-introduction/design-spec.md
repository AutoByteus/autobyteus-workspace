# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (revises `SR-002` for architecture-review findings `AR-001`, `AR-002` of `ARCH-REV-001`)
- Approved requirements baseline / revision and user-approval reference: `SR-001` — `REQ-001`–`REQ-014`, `AC-001`–`AC-012`, `SCN-001`–`SCN-006`, `DEC-001`–`DEC-008` resolved as recommended; `APPROVAL-PROJ-CONCEPT-20260926-001` (user, 2026-09-26). Unchanged by `SR-003`.
- Behavior-defining supplements and their approval references: None
- Design status: `Ready`
- Architecture review history: `ARCH-REV-001` round 1 `Fail — Design Impact` (`design-review-report.md`); `SR-003` resolves `AR-001` and `AR-002` and adopts the report's non-blocking residual-risk notes.
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/investigation-notes.md`
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction` on `codex/projects-concept-introduction`, base `origin/personal@1676bede9d910ca40dc0331390a35f203206fd41`; finalization target `origin/personal`

## Current-State Read

- No Project concept exists anywhere in `autobyteus-server-ts` or `autobyteus-web` (`BEH-001`).
- Workspaces are registered filesystem roots with path-derived ids `agent_ws_<sha256(canonical path)>`, persisted in `<appDataDir>/workspaces.json`, listed through `WorkspaceManager`, and removed non-destructively behind `WorkspaceRemovalGuard` (`BEH-002`, `BEH-003`). Re-registering the same path yields the same id.
- Two per-node feature capabilities already exist and follow the same end-to-end shape (`BEH-004`):
  - Server: a capability service (`ApplicationCapabilityService`, `SkillImprovementCapabilityService`) reads/writes a boolean string setting through a **feature-specific** accessor pair on `ServerSettingsService` (`get/setApplicationsEnabledSetting`, `get/setSkillImprovementEnabledSetting`) and exposes `xCapability` / `setXEnabled` GraphQL operations.
  - Web: a **near-identical copy** of a ~230-line bound-node capability Pinia store per feature (`applicationsCapabilityStore.ts` vs `skillImprovementCapabilityStore.ts` differ only in names, GraphQL documents, and types), and a **near-identical copy** of a ~180-line Settings › Basics toggle card per feature. Route gating (`middleware/feature-flags.global.ts`) and nav gating (`useShellPrimaryNavigation.ts`) are hard-wired to Applications only.
- A third Applications-hard-wired touchpoint exists: `stores/serverSettings.ts` (`APPLICATIONS_SETTING_KEY`, L56; L413–416) refreshes `useApplicationsCapabilityStore()` after `ENABLE_APPLICATIONS` is edited in the Advanced server-settings table (covered by `tests/stores/serverSettingsStore.test.ts` L387). Skill Improvement is intentionally not refreshed there today.
- `components/workspace/config/WorkspaceSelector.vue` (7 run-configuration callers) is shaped for run launch: it always prepends "Temp Workspace (Default)", lists every entry of `workspaceStore.allWorkspaces` (which mirrors server `listVisibleWorkspaces()`, including temp and transient active workspaces), and auto-selects the temp workspace unless `autoSelectDefault=false` (L142–153, L196–214, L262–284). `SearchableSelect` has no per-option disabled state.
- Adding Projects by copying a third store and third card would triple duplicated coordination (resolve/ready-wait/binding-revision invalidation/optimistic set). That is the one design-health pressure in scope.
- Existing JSON-file persistence utilities (`src/persistence/file/store-utils.ts`: locked, atomic `readJsonArrayFile`/`updateJsonArrayFile`) are used by ~19 small per-node stores (e.g. `remote-access/stores/paired-device-store.ts`) and fit a small record set with no joins.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence: A new server subsystem (`src/projects/**`: domain, store, two services), two new GraphQL resolvers registered in `schema.ts`, a bounded refactor of `ServerSettingsService` capability accessors and their two consumers, and on the web a new route family (`pages/projects/**`), ~6 new components, 2 new stores, GraphQL documents + regenerated types, localisation catalogues in two locales, plus a bounded refactor that migrates the two existing capability stores and toggle cards onto shared owned structures and generalises route/nav gating. ~40 files across server and web, spanning navigation, settings, workspace integration and a new domain.
- Architectural risk: `High`
- Risk rationale and supporting evidence: Introduces a new additive GraphQL contract (projects CRUD, link operations, projects capability) and a new persisted subject (`<appDataDir>/projects/projects.json`); refactors shared capability code used by the already-shipped Applications and Skill Improvement features (blast radius on their store/card/middleware behavior, protected by `AC-010`). No security, concurrency-model, deployment or migration change; existing persisted data is `Not Affected`.
- Escalation trigger if implementation or validation discovers new impact: any required change to the Applications or Skill Improvement **GraphQL** contracts, to `workspaces.json` or workspace removal behavior, or to run history; any need to migrate existing data; any need for Project data to be visible on mobile. Return `Design Impact` rather than widening scope.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code read | `autobyteus-server-ts/src/skill-improvement/services/skill-improvement-capability-service.ts` | Default-disabled capability: unset → persist `false`, source `INITIALIZED_DISABLED`; `setEnabled` → `SERVER_SETTING` | `ProjectsCapabilityService` uses this exact semantics (no discovery heuristic) | None |
| Code read | `autobyteus-server-ts/src/services/server-settings-service.ts` (lines ~139–147 registration; ~372–404 accessors) | Two copies of identical boolean get/set pairs keyed by feature | Replace with one generic `getBooleanSetting`/`setBooleanSetting`; register `ENABLE_PROJECTS` as predefined | None |
| `diff` | `autobyteus-web/stores/applicationsCapabilityStore.ts` vs `skillImprovementCapabilityStore.ts` | Identical logic; only names/documents/types differ | Extract `createBoundNodeCapabilityStore` factory; migrate both | None |
| `diff` (149 lines) | `components/settings/ApplicationsFeatureToggleCard.vue` vs `SkillImprovementFeatureToggleCard.vue` | Identical switch/status/error logic; Applications adds a source message; SI uses hard-coded English labels | Extract `FeatureCapabilityToggleCard.vue`; the two existing cards become thin wrappers | SI labels stay as-is (localising them is out of scope) |
| Code read | `autobyteus-web/middleware/feature-flags.global.ts`, `composables/useShellPrimaryNavigation.ts`, `utils/mobileFeatureGates.ts` | Gating hard-wired to Applications | Table-driven route gate; nav filter adds `projects`; new mobile feature id `projects` (unsupported) | None |
| Code read | `autobyteus-server-ts/src/persistence/file/store-utils.ts`; `src/remote-access/stores/paired-device-store.ts` | Locked atomic JSON array read/update; app-data-dir file location | `ProjectStore` uses `updateJsonArrayFile` at `<appDataDir>/projects/projects.json` (`QR-001`) | None |
| Code read | `autobyteus-server-ts/src/workspaces/workspace-manager.ts` (`getRegisteredWorkspaceRootPath`, `listRegisteredFilesystemWorkspaces`), `workspace-path-utils.ts` (`workspaceDisplayNameFromRootPath`) | Registered-id → root path lookup; basename display name; only `agent_ws_` ids are registered filesystem workspaces | Link validation + availability resolution through `WorkspaceManager` (read-only) | None |
| Code read | `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts:415` | Errors surfaced as `GraphQLError(message, { extensions: { code } })` | Project resolver maps `ProjectError.code` into `extensions.code` | None |
| Code read | `autobyteus-web/stores/workspace.ts` (`createWorkspace`), `components/workspace/config/WorkspaceSelector.vue`, `types/workspace/WorkspaceSelectionState.ts` | Existing/new selector with folder browse; `createWorkspace({root_path})` returns `workspaceId`. Run-config-shaped: prepends temp, lists visible/transient workspaces, auto-selects temp by default (L142–153, L196–214, L262–284) | Link dialog reuses `WorkspaceSelector` for its existing/new + browse UI, but supplies a Projects-owned candidate list through a new opt-in `candidateWorkspaceIds` prop (`AR-001`) | None |
| Code read (`ARCH-REV-001` `P-003`) | `autobyteus-web/stores/serverSettings.ts` L56, L413–416; `tests/stores/serverSettingsStore.test.ts` L387 | Advanced-table edit of `ENABLE_APPLICATIONS` refreshes the Applications capability store | Table-driven setting-key → capability refresh with `ENABLE_APPLICATIONS` and `ENABLE_PROJECTS` (`AR-002`) | None |
| Code read | `autobyteus-web/components/common/SearchableSelect.vue` | No per-option disabled state | Already-linked workspaces are excluded from candidates rather than disabled | None |
| Code read | `autobyteus-web/components/common/ConfirmationModal.vue`; `pages/applications/index.vue`; `components/skills/SkillsList.vue` | Existing confirmation modal and catalogue page conventions (header, search, grid, empty/loading/error) | Projects index/detail follow these conventions (`DEC-006`) | None |
| Code read | `autobyteus-web/localization/messages/en/index.ts`, `shell.ts` | Per-area catalogue files merged in `index.ts`, both locales | New `projects.ts` in `en` and `zh-CN`; `shell.navigation.projects`; settings card keys | Follow `docs/localization.md` audit/guard scripts |

## Intended Change

Add a node-scoped **Projects** subsystem (server + web) behind a default-off `ENABLE_PROJECTS` capability that behaves exactly like Applications for the user. A Project has a unique name, optional description, timestamps, and a list of workspace links; each link references a registered filesystem workspace by id, snapshots its root path, and carries its own description. Availability of a linked workspace is resolved at read time. To avoid a third copy of the capability machinery, first extract the shared web capability store factory and toggle card, and a generic boolean setting accessor on the server, and migrate Applications and Skill Improvement onto them with unchanged external behavior.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | `REQ-001`, `REQ-008`, `REQ-009`, `REQ-012`–`REQ-014`; `AC-003`, `AC-004`, `AC-008`, `AC-011`, `AC-012` | `Projects` nav item → index/detail pages | None exists | New CRUD for Projects | `DS-001`, `DS-002` |
| BEH-002 | User/System | `REQ-002`, `REQ-003`, `REQ-005`; `AC-005`, `AC-006` | Project detail → Add workspace | Workspace registration via `createWorkspace` | New described links; registration reused unchanged | `DS-003` |
| BEH-003 | User/System | `REQ-004`, `REQ-011`; `AC-007`, `AC-008` | Workspaces › Remove; re-register | Non-destructive removal, path-derived ids | Links retained as `UNREGISTERED`; restore on re-registration; removal never blocked | `DS-002` (read-time resolution); workspace removal path untouched |
| BEH-004 | User/Operational | `REQ-006`, `REQ-007`; `AC-001`, `AC-002`, `AC-010` | Settings › Basics toggle; app navigation | Applications/SI capability paths | New Projects capability; Applications/SI behavior preserved | `DS-004`, `DS-005` |
| BEH-005 | User | `REQ-008`; `DEC-005` | Mobile runtime navigation | Mobile feature gates | Projects hidden on mobile | `DS-005` |
| BEH-006 | Operational | `REQ-010`, `REQ-011`; `AC-009` | Restart / node rebinding | Settings persistence; bound-node stores | Projects persisted per node; stores invalidate on rebinding | `DS-001`, `DS-004` |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| container `autobyteus-server-0:/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQ-ATPTN-001/tickets/in-progress/REQ-ATPTN-001/visual-references/manifest.md` (`VIS-021`, `VIS-111`) | Exploratory Projects placement/content | `REQ-008` | Directional only: peer nav item after `Nodes`; name + description on cards | Non-normative |
| container `/home/autobyteus/workspace/.codex/worktrees/agent-team-project-task-navigation/tickets/in-progress/agent-team-project-task-navigation/requirements-doc.md` | Draft parent Project/Task model | `REQ-002`, `REQ-004`, `REQ-014` | Design keeps Project identity stable and Task-free so a later slice can attach Tasks | Draft, unapproved; context only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `Yes`
- Root cause classification: `Duplicated Policy Or Coordination`
- Refactor needed now: `Yes` (bounded)
- Evidence: web capability stores and toggle cards are line-for-line duplicates per feature; server has one boolean accessor pair per feature; route/nav gating is hard-wired to one feature (Architecture Investigation Evidence rows 2–5).
- Design response: extract one owned web capability-store factory and one presentational toggle card; replace the feature-specific server accessor pairs with one generic boolean accessor pair; make the route gate table-driven. Migrate Applications and Skill Improvement in the same change; then add Projects as the third consumer.
- Refactor rationale: adding a third copy would make capability coordination (backend-ready wait, binding-revision invalidation, stale-response guards, optimistic set/rollback) three-way duplicated policy with divergent bug risk; the extraction is mechanical and fully covered by existing store/card/middleware tests.
- Intentional deferrals and residual risk: server capability *services* stay per feature (their initialisation policies genuinely differ: Applications discovers bundles, SI/Projects default to disabled; SI adds `requireEnabled`). Localising the SI card's hard-coded English labels is out of scope. The per-feature GraphQL capability types stay unchanged (`AC-010`).

## Terminology

- **Project**: node-scoped durable work container (`projectId`, `name`, `description`, timestamps, `workspaces`).
- **Project workspace link**: `{ workspaceId, workspaceRootPath (snapshot at link time), description, addedAt }` stored inside a Project.
- **Link availability**: read-time projection — `AVAILABLE` when `workspaceId` is currently registered, else `UNREGISTERED`.
- **Bound-node capability**: a boolean per-node server setting surfaced as a typed capability and cached per `windowNodeContextStore.bindingRevision` on the web.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- In-scope removals: the duplicated bodies of the two web capability stores and the two toggle cards, and the four feature-specific server accessor methods (see Removal / Decommission Plan). No compatibility wrappers are kept.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: new file `<appDataDir>/projects/projects.json` — JSON array of `{ projectId, name, description, createdAt, updatedAt, workspaces: [{ workspaceId, workspaceRootPath, description, addedAt }] }`; tens of records. New setting key `ENABLE_PROJECTS` in the existing server config store.
- Relevant code-model, serialization, semantic, or physical-store change: new subject only; generic boolean accessor reads/writes the same `"true"`/`"false"` strings already stored for `ENABLE_APPLICATIONS` and `ENABLE_SKILL_IMPROVEMENT`.
- Normal reader/writer behavior and representative evidence: `store-utils` readers return `[]` for a missing file; config reader returns `null` for an unset key (Applications/SI initialise on first read).
- Required semantics and invariants under direct use: unchanged meaning of existing setting values; missing Projects file = no Projects.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: local-only; atomic locked writes.
- Decision: `Not Affected` for all existing data (the refactored accessor is value-compatible); new subject starts empty.
- Decision rationale: no existing file or value changes shape or meaning.
- Acceptance criteria or design constraints supported by this decision: `REQ-011`, `AC-008`, `AC-009`, `AC-010`, `QR-001`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `BEH-001`, `BEH-006` | Project form submit (create/edit/delete) | Persisted `projects.json` + refreshed web list | `ProjectService` (server), `projectStore` (web) | Core CRUD and invariants (unique name, confirmed delete) |
| DS-002 | Primary End-to-End | `BEH-001`, `BEH-003` | Projects index/detail load | Rendered Projects with resolved link availability | `ProjectService` | Read-time availability; no stale state stored |
| DS-003 | Primary End-to-End | `BEH-002` | Add-workspace dialog submit | Link persisted in Project | `ProjectService` (+ existing `WorkspaceManager` for new-root registration via existing mutation) | Reuse registration; validate registered id; no duplicate link |
| DS-004 | Primary End-to-End | `BEH-004`, `BEH-006` | Settings toggle click | `ENABLE_PROJECTS` persisted; capability store resolved; nav/route updated | `ProjectsCapabilityService` (server), capability store (web) | Visibility switch semantics identical to Applications |
| DS-005 | Bounded Local | `BEH-004`, `BEH-005` | Route navigation / nav render | Allow, redirect `/`, or hide item | route gate middleware / `useShellPrimaryNavigation` | Flag-off invariance; mobile exclusion |

## Primary Execution Spine(s)

- `DS-001`: `ProjectFormDialog / ProjectDetail -> projectStore -> GraphQL ProjectResolver -> ProjectService (validate, id, timestamps) -> ProjectStore (locked atomic JSON) -> projects.json`, returning the resolved Project to `projectStore`, which updates the index.
- `DS-002`: `pages/projects/index|[id] -> projectStore.fetch -> ProjectResolver.projects|project -> ProjectService.list|get -> ProjectStore.read + WorkspaceManager.getRegisteredWorkspaceRootPath (per link) -> ProjectView[] -> ProjectsList / ProjectDetail`.
- `DS-003`: `ProjectWorkspaceLinkDialog -> selectLinkableWorkspaceIds(workspaceStore.allWorkspaces, project.workspaces) -> WorkspaceSelector(candidateWorkspaceIds, autoSelectDefault=false: existing | new) -> [new: workspaceStore.createWorkspace -> existing createWorkspace mutation -> workspaceId] -> projectStore.addWorkspace(projectId, workspaceId, description) -> ProjectResolver.addProjectWorkspace -> ProjectService.addWorkspaceLink (inside the locked updater: require registered agent_ws_ id, no duplicate, snapshot root path) -> ProjectStore.update -> ProjectView`.
- `DS-004`: `ProjectsFeatureToggleCard -> FeatureCapabilityToggleCard -> projectsCapabilityStore.setEnabled -> ProjectsCapabilityResolver.setProjectsEnabled -> ProjectsCapabilityService.setEnabled -> ServerSettingsService.setBooleanSetting(ENABLE_PROJECTS) -> capability returned -> store resolved -> useShellPrimaryNavigation recomputes`.
- `DS-004b` (Advanced-table edit path): `ServerSettingsManager (Advanced table) -> serverSettingsStore.updateServerSetting('ENABLE_PROJECTS', v) -> updateServerSetting mutation -> reloadServerSettings -> CAPABILITY_STORE_BY_SETTING_KEY['ENABLE_PROJECTS']().refresh() -> projectsCapabilityStore resolved -> nav/route gate recompute`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The user submits a Project form; the web store calls one mutation; the server service trims/validates the name against existing Projects case-insensitively, assigns `project_<uuid>` and timestamps, and persists atomically; the returned view replaces the store entry. Delete is confirmed in the UI and removes only the record. | Project | `ProjectService` | `ProjectStore` persistence; `ProjectError` codes; localisation |
| DS-002 | Pages load Projects through the store; the service reads the file and, for each link, asks `WorkspaceManager` whether the id is registered, returning `AVAILABLE`/`UNREGISTERED` with display name from the snapshot path. Nothing about availability is persisted. | Project, link view | `ProjectService` | Workspace lookup; display-name derivation |
| DS-003 | The link dialog computes its candidates with the Projects-owned policy `selectLinkableWorkspaceIds`: registered filesystem workspaces only (`kind === 'filesystem'`, `isTemp !== true`, id prefix `agent_ws_`), excluding workspaces already linked to this Project. It passes them to `WorkspaceSelector` via the opt-in `candidateWorkspaceIds` prop with `autoSelectDefault=false`, so no temp entry is listed or pre-selected. "New" registers the root through the existing workspace store action and only on success adds the link by explicit `workspaceId`. The server remains authoritative: it re-validates registration and duplicates inside the locked update and snapshots the root path. | Project workspace link | `ProjectService` (authoritative); `selectLinkableWorkspaceIds` (client candidate policy) | Existing workspace registration (unchanged) |
| DS-004 | The toggle persists the boolean setting through the generic accessor; the shared capability store resolves the typed capability for the current binding; nav and route gating read `isEnabled`. The Advanced-table path (`DS-004b`) refreshes the same store after a successful `ENABLE_PROJECTS` edit, exactly like `ENABLE_APPLICATIONS`. | Projects capability | `ProjectsCapabilityService` / capability store | Settings reload for server-settings list; setting-key → capability refresh table |

## Spine Actors / Main-Line Nodes

Web: `ProjectsList`, `ProjectDetail`, `ProjectFormDialog`, `ProjectWorkspaceLinkDialog`, `projectStore`, `projectsCapabilityStore`, `FeatureCapabilityToggleCard`. Server: `ProjectResolver`, `ProjectsCapabilityResolver`, `ProjectService`, `ProjectsCapabilityService`, `ProjectStore`.

## Ownership Map

- `ProjectService` (server) — **governing owner** of Project invariants: name normalisation and case-insensitive uniqueness, id/timestamp assignment, link validation (registered filesystem id, no duplicate), root-path snapshot, read-time availability resolution, and error codes. Only entrypoint for Project reads/writes. Uniqueness and duplicate-link checks run **inside** the `updateJsonArrayFile` updater so validation and write share one lock; a throwing updater aborts the write and leaves prior state intact (`QR-001`).
- `selectLinkableWorkspaceIds` (web, `utils/projects/linkableWorkspaces.ts`) — owns the client-side link-candidate policy (registered filesystem, not temp, not transient, not already linked). Presentation aid only; the server check stays authoritative.
- `WorkspaceSelector` (web, existing) — keeps owning the existing/new/browse UI. With the new opt-in `candidateWorkspaceIds` prop it lists exactly the supplied ids in store order, prepends no temp entry, and never auto-selects temp. With the prop absent (default `null`) behavior is unchanged for all 7 run-configuration callers.
- `stores/serverSettings.ts` — owns the setting-key → capability-store refresh table (`ENABLE_APPLICATIONS`, `ENABLE_PROJECTS`).
- `ProjectStore` (server) — persistence only: read/update the JSON array atomically; filters malformed rows; no business rules.
- `ProjectsCapabilityService` (server) — capability semantics (unset → persist `false`, source `INITIALIZED_DISABLED`).
- `ServerSettingsService` — owns setting storage and the generic boolean accessor.
- `ProjectResolver` / `ProjectsCapabilityResolver` — thin transport facades: map inputs/outputs and `ProjectError.code` → `extensions.code`.
- `projectStore` (web) — owns client Project cache for the current binding, request sequencing, and invalidation on `bindingRevision`.
- `createBoundNodeCapabilityStore` (web) — owns capability resolution/caching/invalidation/set-with-rollback for any bound-node capability.
- `FeatureCapabilityToggleCard` (web) — presentational switch/status/error for any capability store.
- Route gate middleware — owns route→capability redirect table.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ProjectResolver` | `ProjectService` | GraphQL transport | Validation, uniqueness, availability logic |
| `ProjectsCapabilityResolver` | `ProjectsCapabilityService` | GraphQL transport | Setting defaults |
| `ApplicationsFeatureToggleCard.vue`, `SkillImprovementFeatureToggleCard.vue`, `ProjectsFeatureToggleCard.vue` | `FeatureCapabilityToggleCard` + respective store | Feature labels/test ids/source messages | Switch/status/error logic |
| `applicationsCapabilityStore.ts`, `skillImprovementCapabilityStore.ts`, `projectsCapabilityStore.ts` | `createBoundNodeCapabilityStore` | Stable store ids/API per feature | Resolution/invalidation logic |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Body of `autobyteus-web/stores/applicationsCapabilityStore.ts` (resolve/invalidate/set logic) | Duplicated coordination | `stores/capabilities/createBoundNodeCapabilityStore.ts` | In This Change | File remains as a ~20-line typed factory call; store id `applicationsCapability` and returned API unchanged |
| Body of `autobyteus-web/stores/skillImprovementCapabilityStore.ts` | Same | Same | In This Change | Store id `skillImprovementCapability` unchanged |
| Switch/status/error template+logic in `ApplicationsFeatureToggleCard.vue` and `SkillImprovementFeatureToggleCard.vue` | Duplicated presentation | `components/settings/FeatureCapabilityToggleCard.vue` | In This Change | Wrappers keep existing `data-testid`s and label sources |
| `ServerSettingsService.getApplicationsEnabledSetting/setApplicationsEnabledSetting/getSkillImprovementEnabledSetting/setSkillImprovementEnabledSetting` | Four copies of one boolean accessor | `getBooleanSetting(key)` / `setBooleanSetting(key, enabled)` | In This Change | Update `ApplicationCapabilityService`, `SkillImprovementCapabilityService` and their tests |
| Applications-only branch in `middleware/feature-flags.global.ts` | Hard-wired gate | Route-prefix → capability-store table | In This Change | Behavior for `/applications*` unchanged; table entries hold `use…Store` functions evaluated inside the middleware, not module-scope store instances |
| Applications-only `APPLICATIONS_SETTING_KEY` refresh branch in `stores/serverSettings.ts` (L56, L413–416) | Hard-wired refresh | `CAPABILITY_STORE_BY_SETTING_KEY: Readonly<Record<string, () => { refresh(): Promise<unknown> }>>` with `ENABLE_APPLICATIONS → useApplicationsCapabilityStore`, `ENABLE_PROJECTS → useProjectsCapabilityStore` | In This Change | `ENABLE_SKILL_IMPROVEMENT` intentionally **not** added (would change SI behavior; out of scope). Key match stays `trim().toUpperCase()` |

## Return Or Event Spine(s) (If Applicable)

N/A — request/response only; no events or streaming.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `createBoundNodeCapabilityStore` — `bindingRevision change -> invalidate -> refresh -> waitForBoundBackendReady -> query -> guard stale binding -> resolved|error`. Matters because nav/route gating depend on it; preserved exactly from the existing stores.
- Parent owner: route gate middleware — `to.path -> match prefix in table -> ensureResolved -> isEnabled ? continue : navigateTo('/')` (error → redirect).

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Workspace registration lookup | DS-002, DS-003 | `ProjectService` | `WorkspaceManager.getRegisteredWorkspaceRootPath` (read-only) | Availability + link validation | Project code writing to the workspace registry |
| Display-name derivation | DS-002 | `ProjectService` | `workspaceDisplayNameFromRootPath(snapshot)` | Consistent naming with Workspaces | Divergent naming rules |
| `ProjectError` codes | DS-001, DS-003 | `ProjectService`, resolver | Typed failure reasons | Field-level UI messages (`AC-003`) | String matching in UI |
| Localisation catalogues | all web | pages/components | `en` + `zh-CN` strings | `REQ-012` | Hard-coded literals (blocked by localisation guards) |
| Server settings list reload | DS-004 | toggle card | Best-effort `serverSettingsStore.reloadServerSettings()` after toggle | Keeps Advanced settings table in sync (existing behavior) | — |

## Ownership Boundaries

- Projects code reads workspace registration only through `WorkspaceManager` public methods; it never reads `workspaces.json` or `WorkspaceRegistryStore` directly and never writes workspace state. New-root registration happens on the web through the existing `workspaceStore.createWorkspace` → `createWorkspace` mutation, then a separate explicit `addProjectWorkspace`.
- Resolvers depend only on services; services depend on stores; no resolver touches a store.
- Web components depend on `projectStore` / capability stores, never on Apollo directly.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ProjectService` | `ProjectStore`, validation, availability resolution | `ProjectResolver` | Resolver → `ProjectStore` | Add a service method |
| `WorkspaceManager` | `WorkspaceRegistryStore` | `ProjectService` | `ProjectService` → `WorkspaceRegistryStore` | Add a `WorkspaceManager` read method |
| `ServerSettingsService` | config storage | capability services | services → `appConfigProvider.config` | Extend the generic accessor |
| `projectStore` (web) | Apollo client, GraphQL documents | Projects pages/components | component → `getApolloClient()` | Add a store action |
| `createBoundNodeCapabilityStore` | resolution/invalidation | feature capability stores | feature store re-implementing resolution | Extend factory options |

## Dependency Rules

- Allowed: `api/graphql/types/projects.ts` → `projects/services/*`; `projects/services/project-service.ts` → `projects/stores/project-store.ts`, `workspaces/workspace-manager.ts` (public API), `workspaces/workspace-path-utils.ts`; `projects/services/projects-capability-service.ts` → `services/server-settings-service.ts`.
- Forbidden: `workspaces/**` importing from `projects/**` (workspace removal must not know about Projects — `REQ-004`); `projects/**` importing `workspace-registry-store.ts`; web components importing `~/utils/apolloClient`.
- Web: `pages/projects/**` → `components/projects/**` → `stores/projectStore.ts`, `stores/workspace.ts` (read list + `createWorkspace` only), `utils/projects/linkableWorkspaces.ts`, `components/workspace/config/WorkspaceSelector.vue`. `stores/*CapabilityStore.ts` → `stores/capabilities/createBoundNodeCapabilityStore.ts`. `stores/serverSettings.ts` → capability store `use…` functions (lazy, inside the action).
- Forbidden (web): `components/workspace/**` importing from `components/projects/**` or `utils/projects/**` (the run-config picker stays Projects-agnostic).

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `query projects: [Project!]!` | Project collection | List with resolved links, sorted by name (case-insensitive) | none | Client-side search (`QR-004`) |
| `query project(projectId: String!): Project` | Project | One Project or `null` | `projectId` | Detail page; `null` → not-found state |
| `mutation createProject(input: CreateProjectInput!): Project!` | Project | Create | `{ name, description? }` | Errors: `PROJECT_NAME_REQUIRED`, `PROJECT_NAME_TAKEN` |
| `mutation updateProject(input: UpdateProjectInput!): Project!` | Project | Rename/describe | `{ projectId, name, description }` | Same errors + `PROJECT_NOT_FOUND` |
| `mutation deleteProject(projectId: String!): Boolean!` | Project | Delete record + links only | `projectId` | Idempotent false if missing |
| `mutation addProjectWorkspace(input: AddProjectWorkspaceInput!): Project!` | Project workspace link | Link | `{ projectId, workspaceId, description? }` | Errors: `PROJECT_NOT_FOUND`, `WORKSPACE_NOT_REGISTERED`, `WORKSPACE_ALREADY_LINKED` |
| `mutation updateProjectWorkspace(input: UpdateProjectWorkspaceInput!): Project!` | link | Edit description | `{ projectId, workspaceId, description }` | `WORKSPACE_LINK_NOT_FOUND` |
| `mutation removeProjectWorkspace(input: RemoveProjectWorkspaceInput!): Project!` | link | Unlink | `{ projectId, workspaceId }` | Works for `UNREGISTERED` links |
| `query projectsCapability: ProjectsCapability!` / `mutation setProjectsEnabled(enabled: Boolean!): ProjectsCapability!` | Projects capability | Visibility flag | none | `{ enabled, settingKey: "ENABLE_PROJECTS", source: SERVER_SETTING \| INITIALIZED_DISABLED }` |
| `ServerSettingsService.getBooleanSetting(key) / setBooleanSetting(key, enabled)` | boolean setting | Read (`null` when unset) / write `"true"`/`"false"` | setting key | Replaces 4 feature-specific methods |

GraphQL object shapes:

```graphql
type Project { projectId: String!, name: String!, description: String!, createdAt: String!, updatedAt: String!, workspaces: [ProjectWorkspace!]! }
type ProjectWorkspace { workspaceId: String!, workspaceRootPath: String!, displayName: String!, description: String!, addedAt: String!, availability: ProjectWorkspaceAvailability! }
enum ProjectWorkspaceAvailability { AVAILABLE UNREGISTERED }
```

`description` is stored and returned as `""` when empty (one representation; no `null`/`""` ambiguity).

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Project CRUD operations | Yes | Yes (`projectId`) | Low | — |
| Link operations | Yes | Yes (`projectId` + `workspaceId`) | Low | Link by `workspaceId` only, never by path; new-root registration stays in the workspace API |
| Capability operations | Yes | N/A | Low | — |
| Generic boolean accessor | Yes | Yes (key) | Low | Keys are exported constants per feature |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Project | `Project`, `projectId` | Yes | Low | — |
| Link | `ProjectWorkspace` (GraphQL), `ProjectWorkspaceLink` (stored) | Yes | Low — stored vs view differ only by resolved fields | Keep both names; view = link + `displayName` + `availability` |
| Capability | `ProjectsCapability`, `ENABLE_PROJECTS` | Yes | Low | Mirrors `ApplicationsCapability` |
| Shared store factory | `createBoundNodeCapabilityStore` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| JSON persistence | `persistence/file/store-utils.ts` | Reuse | Locked atomic array read/update | — |
| Workspace lookup/registration | `workspaces/WorkspaceManager`, web `workspaceStore` | Reuse | Same rules/ids | — |
| Workspace picker UI (existing/new/browse) | `components/workspace/config/WorkspaceSelector.vue` | Extend (opt-in `candidateWorkspaceIds` prop) | Avoids a second existing/new/browse picker; defaults leave the 7 run-config callers unchanged | — |
| Link-candidate policy | none | Create New (`utils/projects/linkableWorkspaces.ts`) | Projects-specific rule; must not live in the run-config selector | Selector must stay policy-free |
| Setting edit → capability refresh | `stores/serverSettings.ts` Applications branch | Extend (table) | Parity with Applications for `ENABLE_PROJECTS` | — |
| Capability semantics | SI capability service pattern | Reuse (pattern) | Default-disabled | — |
| Capability store / card | two existing copies | Extend (extract) | Remove duplication | — |
| Confirmation | `components/common/ConfirmationModal.vue` | Reuse | Existing convention | — |
| Project domain | none | Create New `src/projects/` | New subject with its own invariants | No existing owner for Projects |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| server `src/projects/` | Project domain, persistence, capability | DS-001–DS-004 | `ProjectService`, `ProjectsCapabilityService` | Create New | — |
| server `src/services/server-settings-service.ts` | Generic boolean accessor, `ENABLE_PROJECTS` registration | DS-004 | capability services | Extend | — |
| server `src/api/graphql/types/` | Transport | DS-001–DS-004 | services | Extend | Register resolvers in `schema.ts` |
| web `stores/capabilities/` | Shared capability store factory | DS-004, DS-005 | feature stores | Create New | — |
| web `components/projects/`, `pages/projects/` | Projects UI | DS-001–DS-003 | `projectStore` | Create New | — |
| web shell (`composables/useShellPrimaryNavigation.ts`, `middleware/feature-flags.global.ts`, `utils/mobileFeatureGates.ts`) | Visibility gating | DS-005 | capability stores | Extend | — |
| web settings (`components/settings/`) | Toggle card | DS-004 | capability stores | Extend | — |

## Draft File Responsibility Mapping

Drafted, then tightened below (the reusable-structure check moved capability logic out of per-feature files and kept the stored link and GraphQL view as separate, tight shapes).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Bound-node capability store logic | `autobyteus-web/stores/capabilities/createBoundNodeCapabilityStore.ts` | web stores | 3 consumers | Yes (feature-specific `scope` is carried only by Applications' type) | Yes | A registry of all capabilities or a place for feature policy |
| Toggle card presentation | `autobyteus-web/components/settings/FeatureCapabilityToggleCard.vue` | web settings | 3 consumers | Yes | Yes | A card that knows feature-specific source semantics (passed in as `statusMessage`) |
| Boolean setting accessor | `ServerSettingsService.getBooleanSetting/setBooleanSetting` | server settings | 3 consumers | Yes | Yes (removes 4 methods) | A capability service |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `Project` (stored) | Yes | Yes | Low | `description` always string |
| `ProjectWorkspaceLink` (stored) | Yes | Yes — no stored availability or display name | Low | Availability/display name computed at read time only |
| `ProjectView` / `ProjectWorkspaceView` (service output → GraphQL) | Yes | Yes | Low | View = stored + resolved fields, built in one function |
| `BoundNodeCapability` (web factory generic) | Yes (`enabled`, `settingKey`, `source`) | Yes | Low | Feature types extend with extra fields (`scope`) via generic parameter |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/projects/domain/models.ts` | projects | domain | `Project`, `ProjectWorkspaceLink`, `ProjectView`, `ProjectWorkspaceView`, availability type | One subject's types | — |
| `autobyteus-server-ts/src/projects/domain/project-errors.ts` | projects | domain | `ProjectError` + code union | One error vocabulary | — |
| `autobyteus-server-ts/src/projects/domain/settings.ts` | projects | domain | `PROJECTS_CAPABILITY_SETTING_KEY = "ENABLE_PROJECTS"` | Key constant | — |
| `autobyteus-server-ts/src/projects/stores/project-store.ts` | projects | persistence | read/update `<appDataDir>/projects/projects.json`; drop malformed rows; singleton accessor + test reset | Persistence only | `store-utils` |
| `autobyteus-server-ts/src/projects/services/project-service.ts` | projects | governing owner | CRUD, invariants, link validation, availability resolution, view building; singleton accessor + test reset | One subject's rules | `WorkspaceManager`, `workspace-path-utils` |
| `autobyteus-server-ts/src/projects/services/projects-capability-service.ts` | projects | capability owner | get/set capability (default disabled) | One capability | generic boolean accessor |
| `autobyteus-server-ts/src/api/graphql/types/projects.ts` | graphql | transport | Project object/input types + `ProjectResolver` + error mapping | One transport surface | — |
| `autobyteus-server-ts/src/api/graphql/types/projects-capability.ts` | graphql | transport | `ProjectsCapability` type + resolver | Mirrors `application-capability.ts` | — |
| `autobyteus-server-ts/src/api/graphql/schema.ts` | graphql | registration | add two resolvers | — | — |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | settings | settings owner | register `ENABLE_PROJECTS`; generic boolean accessor; remove 4 methods | — | — |
| `autobyteus-server-ts/src/application-capability/services/application-capability-service.ts` | application-capability | capability owner | switch to generic accessor | — | yes |
| `autobyteus-server-ts/src/skill-improvement/services/skill-improvement-capability-service.ts` | skill-improvement | capability owner | switch to generic accessor | — | yes |
| `autobyteus-web/stores/capabilities/createBoundNodeCapabilityStore.ts` | web stores | shared owner | Generic capability store (options: store id, query/mutation docs, result field names, error label) | One mechanism | — |
| `autobyteus-web/stores/applicationsCapabilityStore.ts`, `skillImprovementCapabilityStore.ts` | web stores | thin wrappers | typed factory calls, same ids/API | — | factory |
| `autobyteus-web/stores/projectsCapabilityStore.ts` | web stores | thin wrapper | typed factory call | — | factory |
| `autobyteus-web/stores/projectStore.ts` | web stores | Projects client owner | list/get/create/update/delete/link/update-link/unlink; binding invalidation; last-error | One subject | — |
| `autobyteus-web/graphql/queries/projectQueries.ts`, `graphql/mutations/projectMutations.ts` | web graphql | documents | Project fragment + operations | — | — |
| `autobyteus-web/graphql/queries/projectsCapabilityQueries.ts`, `graphql/mutations/projectsCapabilityMutations.ts` | web graphql | documents | capability fragment + ops | — | — |
| `autobyteus-web/generated/graphql.ts` | web graphql | generated | regenerate via `pnpm codegen` | — | — |
| `autobyteus-web/types/project.ts` | web types | client types | `Project`, `ProjectWorkspace`, availability | — | — |
| `autobyteus-web/pages/projects/index.vue` | web pages | route | renders `ProjectsList` | — | — |
| `autobyteus-web/pages/projects/[id].vue` | web pages | route | renders `ProjectDetail` | — | — |
| `autobyteus-web/components/projects/ProjectsList.vue` | web projects | index | header, search, grid, empty/no-match/loading/error, New Project | — | — |
| `autobyteus-web/components/projects/ProjectCard.vue` | web projects | card | name, description, linked-workspace count | — | — |
| `autobyteus-web/components/projects/ProjectFormDialog.vue` | web projects | form | create/edit with field errors from `ProjectError` codes | — | `Modal.vue` |
| `autobyteus-web/components/projects/ProjectDetail.vue` | web projects | detail | header (back, edit, delete), description, workspace list | — | `ConfirmationModal.vue` |
| `autobyteus-web/components/projects/ProjectWorkspaceRow.vue` | web projects | row | display name, root path, description, availability badge, edit/unlink | — | — |
| `autobyteus-web/components/projects/ProjectWorkspaceLinkDialog.vue` | web projects | link form | Add mode: `WorkspaceSelector` with `:candidate-workspace-ids="selectLinkableWorkspaceIds(workspaceStore.allWorkspaces, project.workspaces)"` and `:auto-select-default="false"`, then description; "new" registers via `workspaceStore.createWorkspace` then links. Empty candidate list → selector's existing "switch to New" helper. Edit mode: workspace shown read-only (display name + path), description editable only | — | `WorkspaceSelector`, `workspaceStore.createWorkspace`, `selectLinkableWorkspaceIds` |
| `autobyteus-web/utils/projects/linkableWorkspaces.ts` | web projects | candidate policy | `selectLinkableWorkspaceIds(workspaces: WorkspaceInfo[], linked: {workspaceId}[]): string[]` — keep `kind === 'filesystem'`, `isTemp !== true`, `workspaceId.startsWith('agent_ws_')`, not already linked | Pure, one rule | — |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | web workspace | existing picker | Add opt-in prop `candidateWorkspaceIds?: readonly string[] \| null` (default `null`). When non-null: options = those ids resolved from `workspaceStore.workspaces` in the given order, no temp entry prepended, `maybeAutoSelectDefaultWorkspace` returns `false`. When `null`: unchanged | — | — |
| `autobyteus-web/stores/serverSettings.ts` | web settings store | refresh table | Replace `APPLICATIONS_SETTING_KEY` branch with `CAPABILITY_STORE_BY_SETTING_KEY` (`ENABLE_APPLICATIONS`, `ENABLE_PROJECTS`) | — | — |
| `autobyteus-web/components/settings/FeatureCapabilityToggleCard.vue` | web settings | shared presentation | switch/status/error for a capability store; props `store`, `title`, `description`, `testIdPrefix` (renders `${prefix}-feature-toggle-card`, `${prefix}-feature-status`, `${prefix}-feature-toggle`), optional `statusMessage` | — | — |
| `autobyteus-web/components/settings/ApplicationsFeatureToggleCard.vue`, `SkillImprovementFeatureToggleCard.vue` | web settings | wrappers | labels, test ids, source message | — | shared card |
| `autobyteus-web/components/settings/ProjectsFeatureToggleCard.vue` | web settings | wrapper | Projects labels/test ids | — | shared card |
| `autobyteus-web/components/settings/ServerSettingsBasicsPanel.vue` | web settings | panel | add `ProjectsFeatureToggleCard` after SI card | — | — |
| `autobyteus-web/composables/useShellPrimaryNavigation.ts` | web shell | nav | add `projects` key (icon `heroicons:folder`, after `nodes`), route `/projects`, filter `projectsCapabilityStore.isEnabled && isFeatureAvailableInRuntime('projects')`; `ensurePrimaryNavigationReady` resolves both capabilities (`Promise.allSettled`) | — | — |
| `autobyteus-web/middleware/feature-flags.global.ts` | web shell | route gate | table `[{prefix:'/applications', store}, {prefix:'/projects', store}]` | — | — |
| `autobyteus-web/utils/mobileFeatureGates.ts` | web shell | mobile gates | add `projects` id (unsupported) + `/projects` route mapping | — | — |
| `autobyteus-web/localization/messages/{en,zh-CN}/projects.ts` + `index.ts`; `shell.ts`; `settings.ts` | web i18n | catalogues | all new strings | — | — |

## Applied Patterns (If Any)

- Repository-style store (`ProjectStore`) behind a governing service; Factory (`createBoundNodeCapabilityStore`) for capability stores; lookup table for route gating. Each lives under its owner.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/projects/` | Folder | Projects subsystem | domain/, stores/, services/ | Mirrors `skill-improvement/`, `remote-access/` layout | GraphQL types; workspace registry writes |
| `autobyteus-server-ts/src/api/graphql/types/projects*.ts` | File | transport | resolvers/types | Existing resolver location | Business rules |
| `autobyteus-web/stores/capabilities/` | Folder | shared capability mechanism | factory | Groups the cross-feature mechanism apart from feature stores | Feature-specific policy |
| `autobyteus-web/components/projects/` | Folder | Projects UI | components | Feature folder convention (`skills/`, `applications/`) | Apollo calls |
| `autobyteus-web/pages/projects/` | Folder | routes | index + detail | Mirrors `pages/applications/` | Logic beyond composition |
| `autobyteus-server-ts/tests/unit/projects/`, `autobyteus-web/stores/__tests__/`, `components/projects/__tests__/`, `stores/capabilities/__tests__/` | Folder | tests | colocated/unit tests | Repo testing convention | — |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/projects/domain` | Main-Line Domain-Control (types) | Yes | Low | — |
| `src/projects/stores` | Persistence-Provider | Yes | Low | — |
| `src/projects/services` | Main-Line Domain-Control | Yes | Low | — |
| `web/stores/capabilities` | Off-Spine Concern (shared mechanism) | Yes | Low | — |
| `web/components/projects` | Mixed Justified (feature UI) | Yes | Low | Follows existing feature folders |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Stored record | `{"projectId":"project_3f…","name":"autobyteus","description":"AutoByteus product","createdAt":"2026-09-26T…Z","updatedAt":"…","workspaces":[{"workspaceId":"agent_ws_9a…","workspaceRootPath":"/Users/normy/autobyteus_org/autobyteus-web-prototype","description":"UI prototype workspace","addedAt":"…"}]}` | storing `availability`/`displayName`, or linking by path only | Availability must reflect registry state at read time (`REQ-004`) |
| Register-then-link | web: `const id = await workspaceStore.createWorkspace({root_path}); await projectStore.addWorkspace(projectId, id, description)` | server `addProjectWorkspace({projectId, rootPath})` that registers internally | Keeps one registration path and explicit identity (`REQ-005`) |
| Thin capability store | `export const useProjectsCapabilityStore = createBoundNodeCapabilityStore<ProjectsCapability>({ id: 'projectsCapability', query: GetProjectsCapability, mutation: SetProjectsEnabled, queryField: 'projectsCapability', mutationField: 'setProjectsEnabled', label: 'Projects' })` | copying the 230-line store a third time | Removes duplicated coordination |
| Link-dialog candidates | Registered: `autobyteus-workspace-superrepo` (`agent_ws_a1…`, already linked), `autobyteus-web-prototype` (`agent_ws_b2…`), `autobyteus-marketing-workspace` (`agent_ws_c3…`); plus `temp_ws_default` and a transient `skill_ws_foo`. Dialog lists only `autobyteus-web-prototype` and `autobyteus-marketing-workspace`, nothing pre-selected; Save disabled until one is chosen (or New path entered) | Showing "Temp Workspace (Default)" pre-selected so Save fails with `WORKSPACE_NOT_REGISTERED` (`ARCH-REV-001` `P-001`) | Default path of `SCN-003` must succeed (`AC-005`) |
| Advanced-table edit | `CAPABILITY_STORE_BY_SETTING_KEY = { ENABLE_APPLICATIONS: useApplicationsCapabilityStore, ENABLE_PROJECTS: useProjectsCapabilityStore }; … const refreshStore = CAPABILITY_STORE_BY_SETTING_KEY[key.trim().toUpperCase()]; if (refreshStore) await refreshStore().refresh()` | a second hard-coded `if (key === 'ENABLE_PROJECTS')` branch; or silently adding SI | Parity with Applications without widening SI behavior (`ARCH-REV-001` `P-003`) |
| Unregistered link | Project detail row: `autobyteus-web-prototype · /Users/…/autobyteus-web-prototype · "UI prototype workspace" · [Unavailable]` with Unlink enabled | hiding the row or deleting the link | `AC-007` |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep feature-specific settings accessors alongside the generic pair | Smaller diff | Rejected | Remove the four methods; update both services and tests |
| Keep old store bodies and add factory only for Projects | Lower blast radius | Rejected | Migrate both existing stores; public API/ids unchanged, existing specs must pass |
| Aliased old card components delegating to the new one while also keeping old internals | — | Rejected | Wrappers contain only labels/test ids/source message |

## Derived Layering (If Useful)

Server: GraphQL types → services → stores/`WorkspaceManager`/settings. Web: pages → components → stores → GraphQL documents.

## Change / Refactor Sequence

1. Server settings: add `getBooleanSetting`/`setBooleanSetting`; switch `ApplicationCapabilityService` and `SkillImprovementCapabilityService`; remove the four specific methods; update their unit tests. Register `ENABLE_PROJECTS` predefined setting ("Controls whether the Projects module is available for this node at runtime. Defaults to disabled.").
2. Server Projects subsystem: domain types/errors/settings → `ProjectStore` → `ProjectService` → `ProjectsCapabilityService`; unit tests (`tests/unit/projects/**`) covering uniqueness, validation, link duplicate/unregistered rejection, availability resolution (unregister → `UNREGISTERED`, re-register → `AVAILABLE`), delete scope, atomic-write failure leaves prior state (`QR-001`).
3. GraphQL: `projects.ts`, `projects-capability.ts`, register in `schema.ts`; resolver tests.
4. Web shared mechanism: `createBoundNodeCapabilityStore` + tests; migrate `applicationsCapabilityStore`/`skillImprovementCapabilityStore` (existing specs must pass unchanged except import mocks); `FeatureCapabilityToggleCard` with `testIdPrefix` + migrate the two cards (existing specs pass; inner test ids `applications-feature-status/-toggle`, `skill-improvement-feature-status/-toggle` unchanged); table-driven middleware built from `use…Store` functions (existing spec passes; add `/projects` cases); `stores/serverSettings.ts` refresh table (existing L387 test passes; add an `ENABLE_PROJECTS` refresh test and a test that `ENABLE_SKILL_IMPROVEMENT` edits still do not refresh a capability store).
5. Web workspace picker: add `candidateWorkspaceIds` prop to `WorkspaceSelector`; add spec cases (non-null list → only those options, no temp entry, no auto-select; `null` → existing behavior). Existing `WorkspaceSelector.spec.ts` and the 7 callers are untouched.
6. Web Projects: GraphQL documents → `pnpm codegen` (or hand-maintained types consistent with repo practice) → `types/project.ts` → `projectsCapabilityStore`, `projectStore` → `utils/projects/linkableWorkspaces.ts` (+ unit tests: temp, skill/transient, already-linked excluded) → components/pages → nav/mobile gates → settings card → localisation (`en`, `zh-CN`) passing `guard:localization-boundary` and `audit:localization-literals`.
7. Tests: store/component/middleware/nav unit tests; browser E2E for `AC-001`–`AC-008`, `AC-011`, `AC-012`, including "Add workspace default path links a registered workspace" (`AC-005`) and "Advanced-table edit of `ENABLE_PROJECTS` shows/hides `Projects` without reload" (`AC-002`).
8. Docs (delivery docs-sync): new `autobyteus-web/docs/projects.md`, `autobyteus-server-ts/docs/modules/projects.md`; update `autobyteus-web/docs/settings.md` and `docs/applications.md` references to the shared capability store; add Projects to `autobyteus-web/AGENTS.md` catalog.

## Key Tradeoffs

- JSON file vs Prisma/SQLite: JSON chosen — tiny record set, no queries/joins, matches similar per-node stores; a later Tasks slice with 100+ records and filtering may move to SQLite, which would then be an explicit migration decision.
- Read-time availability vs stored flag: read-time avoids coupling workspace removal to Projects and keeps a single source of truth, at the cost of one registry lookup per link (negligible).
- Refactor now vs copy: refactor adds blast radius to two shipped features but removes three-way duplication; guarded by their existing tests and `AC-010`.

## Risks

- Regression in Applications/SI toggle or gating from the extraction → mitigated by keeping store ids, public API, test ids, and running existing specs unchanged.
- Regression in run-configuration workspace selection from the new `WorkspaceSelector` prop → mitigated by `null` default and unchanged existing spec; only `ProjectWorkspaceLinkDialog` passes the prop.
- Transient `skill_ws_*` visibility in `listVisibleWorkspaces()` was not traced end to end (`ARCH-REV-001` `P-002`, `Unclear`); the candidate policy excludes non-`agent_ws_` ids regardless, so no dependency on that answer.
- Codegen requires a running backend schema; if unavailable, implementation must still keep `generated/graphql.ts` consistent (follow repo practice).
- Localisation guard scripts may reject literals → all strings through catalogues.

## Guidance For Implementation

- Do not import `projects/**` from `workspaces/**`; workspace removal must stay untouched.
- Name normalisation: `trim()`; uniqueness via `toLocaleLowerCase()` comparison excluding the Project being updated; description `trim()`, stored `""` when empty. Run uniqueness and duplicate-link checks inside the `updateJsonArrayFile` updater, throwing `ProjectError` to abort the write.
- `WorkspaceSelector` must remain policy-free: it only honors the supplied `candidateWorkspaceIds`; do not teach it about Projects or "linkable".
- `addProjectWorkspace` accepts only ids starting with `agent_ws_` that `WorkspaceManager.getRegisteredWorkspaceRootPath` resolves; snapshot that root path.
- Sort `projects` by name (case-insensitive) server-side; sort links by `addedAt`.
- Project detail for an unknown id shows a not-found state with a link back to `/projects`.
- No "Task" wording anywhere on Projects surfaces (`REQ-014`).
- Keep the flag a visibility switch only; do not gate the Projects GraphQL operations server-side (same as Applications, per approved behavior).
