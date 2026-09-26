# Investigation Notes

## Investigation Meta

- Package identifier: `PROJ-CONCEPT-20260926-001`
- Request / ticket: `projects-concept-introduction` — introduce a feature-flagged Projects concept (slice 1 of the Project/Task work model explored in `REQ-ATPTN-001`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction` on `codex/projects-concept-introduction`
- Resolved base remote / branch / revision: `origin` / `personal` / `1676bede9d910ca40dc0331390a35f203206fd41` (fetched 2026-09-26; shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` was at `0f54978ba` and was not used for authoring)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: `Succeeded` — worktree created with `git worktree add -b codex/projects-concept-introduction … origin/personal`; ticket folder `tickets/in-progress/projects-concept-introduction/` created
- Bootstrap blocker: None
- Current solution revision ID: `SR-003`
- Investigation status: Requirements-phase and architecture-phase investigation complete (2026-09-26)

## Initial Request And Clarifications

- Original request (2026-09-26, user): "i want to introduce projects concept in our project. basically if you look at the some of the product prototype from a prototype project in the parent folder, you will see that we are discussing concepts of projects, tasks, and task admission stuff like that. i think we could first introduce projects concept into this project. i could use feature flag, i remember we also have feature flag for applications which is currently also not visible for users. please analyse"
- Clarifications received:
  - User identified the prototype project as `/Users/normy/autobyteus_org/autobyteus-web-prototype` but was unsure whether it contained the Project/Task work. Investigation found the work only inside the `autobyteus-server-0` container (see Source Log).
  - User (2026-09-26): "in software engineering, one project could have description. and maybe workspaces linked to the project … workspaces are more like implementation level things. for example, for our project autobyteus, we have the current workspace, and the ui prototype workspace, maybe we also have marketing workspaces for the project … the project allows user to add relevant workspaces for the project, and give description about what this workspace is about."
- User-supplied facts and constraints:
  - Projects first; Tasks and any "task admission" concept later.
  - Feature-flagged and initially hidden from users, modelled on the existing Applications flag.
  - A Project has a description and 0..n linked workspaces; each workspace link carries its own description of what that workspace is for.
- Initial ambiguity:
  - "Task admission": the phrase does not appear in any prototype or requirements artifact (grep of ticket, brief, 75 KB design plan, review, and `RER-004` requirements doc). Closest concepts: Task assignment (RV-026), Task `Ready` state, and the open decision whether `Run` auto-creates a Task (`DEC-003` of `REQ-ATPTN-001`). Out of scope for slice 1; recorded as an unknown for the Tasks slice.

## Product And Domain Understanding

- Product area: AutoByteus Web desktop shell primary navigation + a new server-side Project record, scoped to the bound backend node.
- Affected actors or systems: Desktop user organising work across several filesystem workspaces; workspace registry; server settings/capability surface; primary navigation; Server Settings › Basics.
- Existing user or operational purpose: Today the top-level organisation of work is the registered filesystem Workspace. There is no durable "project" that can group several workspaces (e.g. the `autobyteus` product spans the main monorepo workspace, the UI-prototype workspace, and marketing workspaces).
- Relevant terminology:
  - **Project** (new): durable, user-named work container with a description and linked workspaces.
  - **Workspace** (existing): a registered filesystem root (`kind: filesystem`), identified by `agent_ws_<sha256(rootPath)>`, display name derived from the path basename. Also `skill` and `temp` kinds exist but are not user-organised resources.
  - **Task / execution / worker** (future slices): defined in the Draft `REQ-ATPTN-001` package; not introduced here.
  - **Capability / feature flag** (existing pattern): a per-node server setting exposed as a typed GraphQL capability (`ENABLE_APPLICATIONS`).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-26 | Command | `ls /Users/normy/autobyteus_org`, `find … -iname "*prototyp*"`, `grep -rli "task admission|admission|intake"` across parent folder (excluding worktrees/backups/node_modules), `mdfind` | Locate the prototype project | No local directory contains a Project/Task prototype; `autobyteus-skills-product-prototyping` is a skills repo; `lightyearpm`, `zoom-bot-splitter`, superrepo `ui-prototypes/*` are unrelated | Ask user → user pointed to `autobyteus-web-prototype` |
| 2026-09-26 | Code | `/Users/normy/autobyteus_org/autobyteus-web-prototype` (`git branch -a`, `git ls-remote --heads origin`, `git log`) | Check local prototype clone | Only `personal` @ `ba67ac0` (2026-09-02) locally and on origin; completed tickets are AORG-*, REQPKG-NTHUI-001, REQPKG-TSUI-001, BASELINE-PROMOTION-001; no Project/Task ticket | Search container workspaces |
| 2026-09-26 | Command | `docker ps -a`; `docker exec autobyteus-server-0 ls /home/autobyteus/workspace` | Prototype README names canonical root `/home/autobyteus/workspace/autobyteus-web-prototype` | `autobyteus-server-0` holds `autobyteus-web-prototype` (personal @ ba67ac0) and `autobyteus-web-prototype-worktrees/REQ-ATPTN-001` | Inspect worktree |
| 2026-09-26 | Code | container `autobyteus-server-0:/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQ-ATPTN-001` — branch `prototype/req-atptn-001`, HEAD `e003e84` (2026-08-30), clean, **not on origin** | Locate the Project/Task visualizer | 60+ commits 2026-08-27→08-30 (RV-001…RV-033): "Add project task navigation requirements visualizer", "Move Projects into unified product navigation", "integrate projects into shared application shell", "add project task and team network journey", "converge project work on version A navigation", "add multimodal task context flow", "connect assigned tasks to team launch", virtual office, typed runtime events | Evidence for Projects UI concept; recommend user pushes the branch |
| 2026-09-26 | Doc | container `…/REQ-ATPTN-001/tickets/in-progress/REQ-ATPTN-001/prototype-ticket.md` | Ticket identity/status | Title "Product-baseline work-initiation and Task-tracking alternatives"; Status `Awaiting User Review`; requirements revision `RER-002` Draft; "User authorized exploratory visualization only; no navigation model or final behavior has been approved"; no `ui-ux-spec.md` exists (Requirements Visualization mode) | Treat all visuals as exploratory, non-normative |
| 2026-09-26 | Doc | container `…/REQ-ATPTN-001/requirements-visualization-brief.md` (RV-033) | Understand Versions A–G and Project model | Version A "Project/Task first"; Version G "Project work": Projects as a peer primary-nav destination, Project index with search, per-Project Task list, `New Task` composer, Team-first→entry-Agent assignment, `Active projects` panel, live office. Visible distinctions: "Workspace paths remain execution resources, not Project identity"; "Project-level Task remains distinct from execution-internal delegated tasks" | Slice 1 = Projects only |
| 2026-09-26 | Doc | container `…/REQ-ATPTN-001/requirements-visualization-design-plan.md` (RVDP-033; headings RV-008…RV-033, "Version A — Project and Task first", "Visible Model") | Project/Task semantics as prototyped | RV-024: "Hierarchy: Project → durable Task → current/prior execution. Workspace directory values appear only inside launch/execution detail." RV-026: assignment during Task creation. No "admission" wording | — |
| 2026-09-26 | Doc | container `…/REQ-ATPTN-001/requirements-visualization-review.md` (RV-033) | Latest review state | "Exploratory clarification only. No requirement, navigation model, event semantics, or UI/UX approval is claimed" | — |
| 2026-09-26 | Doc | container `…/REQ-ATPTN-001/visual-references/manifest.md`; copied `VIS-021`, `VIS-111`, `VIS-112`, `VIS-113`, `VIS-124`, `VIS-150` to `/tmp/req-atptn-vis/` and viewed | Project-related screens | `VIS-111`: Projects index (cards: name, description, task count, search) inside accepted shell with `Projects` as a peer nav item after `Nodes`; `VIS-021`: "New Project" dialog with `Project name`, `Purpose (optional)`, note "Folder paths come later … will be associated as Project resources; they will not become the Project's identity"; `VIS-112`: per-Project Task list; `VIS-124`: Active projects panel + virtual office | Project name + description + later workspace association matches user's slice-1 intent |
| 2026-09-26 | Doc | container `/home/autobyteus/workspace/.codex/worktrees/agent-team-project-task-navigation/tickets/in-progress/agent-team-project-task-navigation/{requirements-doc.md,requirements-revision-record.md,investigation-notes.md,requirements-visualization-brief.md}` — branch `codex/agent-team-project-task-navigation`, HEAD `30a7d6f02` (2026-08-27), 3 uncommitted files, **not on origin** | The Requirements Engineer's Draft package behind `REQ-ATPTN-001` | Status `Draft`, `RER-004`, not approved. `REQ-002`: "A Project shall provide durable identity, user-visible name, applicable lifecycle state, Task collection, and zero or more associated workspace resources." `REQ-006`: "Workspace shall remain a registered filesystem/runtime resource, not the authoritative identity of a Project or Task. A Project may reference multiple workspaces." `REQ-011`/`BEH-008`: removing a workspace must not remove Project records; show unavailable. Open `DEC-001`–`DEC-006` (model, multi-execution, mandatory Project, workspace defaults, delegated tasks, legacy placement) | Slice 1 requirements are consistent with, and narrower than, this Draft; link, do not copy |
| 2026-09-26 | Code | `autobyteus-server-ts/src/application-capability/domain/models.ts`, `services/application-capability-service.ts`; `src/api/graphql/types/application-capability.ts`; `src/services/server-settings-service.ts` (`getApplicationsEnabledSetting`/`setApplicationsEnabledSetting`, lines ~383–395); `src/compositions/build-studio-server.ts:275` | Existing feature-flag mechanism | Setting key `ENABLE_APPLICATIONS` stored via `appConfigProvider.config` (string "true"/"false"); typed capability `{enabled, scope: "BOUND_NODE", settingKey, source}`; GraphQL `applicationsCapability` query + `setApplicationsEnabled(enabled)` mutation; lazily initialised from `hasDiscoverableApplications()` when unset; also a sibling `SKILL_IMPROVEMENT_CAPABILITY_SETTING_KEY` uses the same get/set idiom | A `ENABLE_PROJECTS` capability can follow this shape; no discovery heuristic needed (default `false`) |
| 2026-09-26 | Code | `autobyteus-web/stores/applicationsCapabilityStore.ts`; `middleware/feature-flags.global.ts`; `composables/useShellPrimaryNavigation.ts`; `components/settings/ApplicationsFeatureToggleCard.vue`; `components/settings/ServerSettingsBasicsPanel.vue`; `utils/mobileFeatureGates.ts` | Frontend side of the flag | Store resolves per bound node and invalidates on `windowNodeContextStore.bindingRevision`; nav item filtered by `isEnabled && isFeatureAvailableInRuntime('applicationIframe')`; global route middleware redirects `/applications*` → `/` when disabled or on resolve error; Settings › Basics shows a toggle card; mobile runtime excludes `applicationIframe` | Same five touchpoints for Projects |
| 2026-09-26 | Code | `autobyteus-web/composables/useShellPrimaryNavigation.ts` | Primary nav catalogue | Keys: `agents`, `agentTeams`, `agentOrgs`, `applications`, `skills`, `memory`, `nodes`; consumers `components/layout/LeftSidebarStrip.vue`, `components/AppLeftPanel.vue`, `components/layout/WorkspaceAdaptiveLayout.vue` | `projects` key + route `/projects` to add |
| 2026-09-26 | Code | `autobyteus-web` grep `\bprojects?\b` in `pages,stores,components,composables,graphql,layouts` (non-test) | Does any Project concept exist? | Only Gemini/GCP `projectId` in provider config (`llmProviderConfig*.ts`, `GeminiSetupForm.vue`) and `MobileLaunchWorkspacePicker.vue` prose | Genuinely new concept |
| 2026-09-26 | Code | `autobyteus-server-ts/src/workspaces/workspace-metadata.ts`, `workspace-registry-store.ts`, `workspace-registry-file-persistence.ts`, `workspace-path-utils.ts`, `workspace-removal-guard.ts`, `workspace-manager.ts` (method index) | Workspace identity, persistence, removal semantics | `WorkspaceMetadata {workspaceId, name, rootPath, kind: filesystem|skill|temp, config, isTemp}`; registry file `<appDataDir>/workspaces.json` = `{ [workspaceId]: rootPath }` written atomically with shrink-validation; `workspaceId = "agent_ws_" + sha256(canonical rootPath)`; display name = `path.basename(rootPath)`; no user-editable name or description exists; removal is guarded only by active agent/team runs using that root; `getWorkspaceRootPathForHistory` keeps history-only roots resolvable after removal | Project↔workspace link should reference `workspaceId` (stable, path-derived) and tolerate unregistered ids |
| 2026-09-26 | Contract | `autobyteus-server-ts/src/api/graphql/types/workspace.ts`; `autobyteus-web/graphql/queries/workspace_queries.ts`, `graphql/mutations/workspace_mutations.ts`; `autobyteus-web/stores/workspace.ts` | Workspace GraphQL contract and client shape | `workspaces` (visible list; temp workspace ensured), `workspaceMetadata(rootPath)`, `createWorkspace(input:{rootPath})`, `removeWorkspace(input:{workspaceId})`; client `WorkspaceInfo {workspaceId, name, displayName, workspaceConfig, absolutePath, workspaceRootPath, kind, isTemp}`; UI consumers include `components/workspace/config/WorkspaceSelector.vue` (register/select a root path) | Project workspace picker can reuse the registered list and the existing registration flow |
| 2026-09-26 | Code | `autobyteus-server-ts/prisma/schema.prisma` (SQLite; models TokenUsage*, AgentArtifact, AppDataMigrationRecord, SecretEntry…); `src/persistence/file/store-utils.ts`; `src/app-data-migrations/*`; `src/agent-definition/{domain,providers,services}` | Persistence options for a new record type | Two established patterns: Prisma/SQLite tables and atomic JSON files under app data dir; app-data migration registry exists for versioned data changes | Choice deferred to architecture; no existing data changes required |
| 2026-09-26 | Code | `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts`, `applications.ts` | Localisation convention | New UI strings are added in both `en` and `zh-CN` message catalogues | Requirement for slice-1 strings |
| 2026-09-26 | Doc | `autobyteus-web/tickets/done/disable-applications-menu-by-default/requirements.md`; `autobyteus-web/tickets/done/server-settings-applications-toggle-card/requirements.md` | Prior approved decisions on flag exposure | Applications menu is disabled by default and user-toggleable from Server Settings › Basics; the toggle card was an explicit user decision | Precedent for `DEC-004` |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Primary navigation / Projects | `No current supported behavior` — no Project concept exists anywhere in web or server | N/A | Source Log (grep of web/server for "project") | High |
| BEH-002 | User/System | Workspace registration (`createWorkspace`, `WorkspaceSelector`, run-config workspace picker) | User supplies a root path → server canonicalises it → id `agent_ws_<sha256>` → entry persisted in `workspaces.json` → visible in `workspaces` list with basename display name | Identity is path-derived and stable; no user-editable name/description; same path re-registers to the same id | `workspace-registry-store.ts`, `workspace.ts` resolver | High |
| BEH-003 | User/System | Workspace removal (`removeWorkspace`) | User removes a registered workspace → blocked only if an active agent/team run uses that root → registry entry deleted → history under that root stays stored and resolvable via history root path | Non-destructive to files and stored history; re-registration restores visibility | `workspace-removal-guard.ts`, `workspace-manager.ts` (`getWorkspaceRootPathForHistory`) | High |
| BEH-004 | User/System | Applications feature capability (`ENABLE_APPLICATIONS`) | Server resolves capability per bound node (setting or lazy initialisation) → web store resolves after backend ready → nav item shown only when enabled and runtime supports it → `/applications*` redirected to `/` when disabled → Server Settings › Basics toggle persists the setting and refreshes the store | Capability scope is the bound node; disabled state hides UI but the GraphQL API remains callable | Source Log (capability rows) | High |
| BEH-005 | User | Primary navigation on mobile remote-access runtime | Nav items gated by `isFeatureAvailableInRuntime`; `applications` and `nodes` are desktop-only | Mobile shows only supported features | `mobileFeatureGates.ts`, `useShellPrimaryNavigation.ts` | High |
| BEH-006 | Operational | Server settings persistence | Settings written through `appConfigProvider.config.set` and read back on demand; predefined settings registered with descriptions in `ServerSettingsService` | Settings survive restart; per node | `server-settings-service.ts` | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-capability/**` + `api/graphql/types/application-capability.ts` | Typed per-node capability with query/mutation | `ENABLE_PROJECTS` shall behave the same way from the user's perspective (default off, per node, toggleable) | Mirror as `projects-capability` module vs generalise a shared feature-capability mechanism (design decision; `DEC-004` records exposure only) |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Predefined setting registry + typed getters/setters for capability keys | New predefined setting `ENABLE_PROJECTS` with description | Registration location and read/write idiom |
| `autobyteus-web/stores/applicationsCapabilityStore.ts`, `middleware/feature-flags.global.ts`, `composables/useShellPrimaryNavigation.ts`, `components/settings/ApplicationsFeatureToggleCard.vue`, `ServerSettingsBasicsPanel.vue` | Frontend flag touchpoints | Same five touchpoints for Projects | Whether to parameterise the store/middleware/card by capability |
| `autobyteus-server-ts/src/workspaces/**` and `api/graphql/types/workspace.ts` | Workspace registry, ids, listing, removal | Project links reference `workspaceId`; unavailable links must be representable | Link resolution (join against registry at read time) |
| `autobyteus-server-ts/prisma/schema.prisma`, `src/persistence/file/store-utils.ts`, `src/app-data-migrations/**` | Persistence patterns | Projects must persist per node and survive restart; no existing data touched | Storage choice (SQLite table vs JSON file); id scheme; future Task relation |
| `autobyteus-web/pages/*.vue` (`skills.vue`, `agents.vue` list pages) and `components/skills/**` | Existing catalogue/list page conventions | Projects index should feel like existing catalogues (search, cards/rows, create) | Reuse of list/detail composition |
| `autobyteus-web/localization/messages/{en,zh-CN}` | i18n catalogues | New strings in both locales | — |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: new Project records (id, name, description, timestamps, workspace links with per-link description); new predefined server setting `ENABLE_PROJECTS`; `autobyteus-web/generated/graphql.ts` (regenerated types).
- Existing readers, writers, or contracts that consume them: none today (new record type); workspace registry is read (not written) when resolving links.
- Evidence paths: Source Log rows for persistence and workspace registry.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries: new GraphQL queries/mutations (projects CRUD, workspace-link add/update/remove, `projectsCapability`/`setProjectsEnabled`); new server module; new persistence subject; new web route `/projects` (+ detail), nav key, Pinia store(s), settings card.
- Existing structural surfaces that can support the approved behavior: capability pattern; server-settings service; workspace registry/GraphQL; primary nav composable; route middleware; Settings › Basics panel; catalogue page conventions.
- Evidence paths: Source Log.

### Potential Structural Impacts To Investigate

- API or external-contract change: `Present` — additive GraphQL schema growth; no change to existing operations.
- Persistence schema or invariant change: `Present` — new persisted subject; no change to `workspaces.json` or run-history data.
- Security or privacy boundary change: `Absent` — Project records reference already-registered local paths; no new filesystem access.
- Concurrency or lifecycle change: `Absent` beyond ordinary serialised writes for a new record type.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: `Unknown` — depends on whether the capability mechanism is generalised (refactor of Applications touchpoints) or mirrored.
- Confirmed absent, present, or unknown: as listed.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| `docker exec autobyteus-server-0 … git log --oneline personal..HEAD` in the prototype worktree | Confirm prototype history | 60+ commits RV-001…RV-033, all local to the container | Prototype evidence exists but is at risk (unpushed) | Source Log |
| `docker cp` of six `VIS-*` screenshots; viewed | Confirm Project UI concept | Projects nav item, index cards with name/description/count, create dialog with name + optional purpose, workspace association deferred by design | Slice-1 UI basis (exploratory) | `/tmp/req-atptn-vis/*.png` (disposable copies; canonical files in container) |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (2026-09-26) | Introduce Projects first, behind a flag hidden by default like Applications | Direct statement | `REQ-001`, `REQ-006`–`REQ-008` | `DEC-004` exposure of toggle |
| User (2026-09-26) | Project = description + linked workspaces, each link with a description; workspaces are implementation-level resources | Direct statement with concrete example (autobyteus main / UI prototype / marketing workspaces) | `REQ-002`–`REQ-005` | `DEC-002`, `DEC-003`, `DEC-007` |
| Draft `REQ-ATPTN-001` (`RER-004`, Requirements Engineer, 2026-08-27) | Project/Task/worker/execution/workspace separation; 100-task scale; workspace must not be Project identity; removal must not lose work | Unapproved Draft; consistent with user's statements today | Slice 1 must not preclude Tasks; workspace link must be a reference, not identity | Later slices |
| Prototype `REQ-ATPTN-001` RV-001…RV-033 (Product Prototyper) | Projects as a peer primary destination; index with search; create dialog | Exploratory, non-normative, `Awaiting User Review` | Informs UI shape; not a normative spec | `DEC-006` |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Workspace registry + GraphQL `workspaces`/`createWorkspace`/`removeWorkspace` | current `personal` | Stable path-derived ids; non-destructive removal | Source Log | None |
| Applications capability contract | current `personal` | Shape of a per-node capability | Source Log | Whether generalisation changes its GraphQL type (must not) |
| Bound-node context (`windowNodeContextStore.bindingRevision`) | current `personal` | Per-node stores must invalidate on rebinding | `applicationsCapabilityStore.ts` | None |

## Persisted Data And State Facts

- Affected stored or external subject: new Project records and their workspace links; new server setting `ENABLE_PROJECTS`.
- Location and representative shape: to be decided in architecture (candidates: SQLite via Prisma; atomic JSON under `<appDataDir>`). Representative shape: `{ projectId, name, description, createdAt, updatedAt, workspaces: [{ workspaceId, description, addedAt }] }`.
- Approximate volume: tens of Projects, each with a handful of workspace links.
- Current readers and writers: none (new subject). Workspace registry is read-only from the Project feature's perspective.
- Current unknown/extra-field behavior: N/A (new).
- Required semantics or data that must be preserved: all existing data (`workspaces.json`, run history, settings) unchanged; Project identity stable so a later Tasks slice can attach to it.
- Acceptable loss, reset, rebuild, or regeneration: none for Project records once created; a link to an unregistered workspace is retained, not dropped.
- Privacy, retention, compliance, downtime, or operational constraints: local-only data; no new secrets.
- Remaining evidence gap: none for requirements; storage mechanism is an architecture decision.

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- User's requested outcome, in the user's own terms: N/A — user asked for analysis and a feature-flagged introduction of Projects.
- Requirement / behavior IDs involved: N/A
- Product decision, uncertainty, or experience to understand or evolve: N/A
- Critical journey and states: N/A
- Known constraints and non-goals: N/A
- Relevant existing-product or frontend context supplied or established: existing exploratory visualizer `REQ-ATPTN-001` (see Findings)
- Product Design request artifact / message reference: N/A
- Established separate prototype repository/root and ticket reference, when applicable: `autobyteus-web-prototype` (origin `https://github.com/AutoByteus/autobyteus-web-prototype.git`), ticket `REQ-ATPTN-001` in container-only worktree

## Product Design Findings

- Product Design package path (external Product Design & Prototyping repository): container `autobyteus-server-0:/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQ-ATPTN-001/tickets/in-progress/REQ-ATPTN-001/` (branch `prototype/req-atptn-001` @ `e003e84`, unpushed)
- Visualizer or prototype source path: `…/REQ-ATPTN-001/pages/visualizers/req-atptn-project-work.vue`, `req-atptn-project-first.vue`; components `components/visualizers/req-atptn/ProjectsIndexView.vue`, `ProjectCreateDialog.vue`, `ProjectTasksView.vue`, …; composables `composables/visualizers/useProjectNavigatorVisualizer.ts`, `useProjectOfficeVisualizer.ts`
- Approved UI/UX specification path, when applicable: `N/A — none exists (Requirements Visualization mode)`
- Review URL: `http://127.0.0.1:4180/visualizers/req-atptn-project-work` (container; not currently running)
- Explicit user-confirmation reference: `N/A — exploration only was authorised on 2026-08-27`
- Journeys and scenarios validated: exploratory only (RV-033 19/19 focused checks) — not requirements validation
- Final visual-reference paths: `N/A — none approved`; exploratory manifest `…/visual-references/manifest.md` (`VIS-001`–`VIS-151`)
- Product decisions supported by evidence: Projects as a peer primary-nav destination; Project = name + optional description; workspace association is a resource relationship, not identity (`VIS-021` note)
- Alternatives rejected or still open: Versions B (quick launch) and C (conversation-first) remain alternatives for *work initiation*, not for the existence of Projects; navigator placement was corrected to the accepted shell (`RER-004`)
- Mocked boundaries and production gaps: all records/persistence/API mocked; no workspace-link UI was prototyped (explicitly deferred)
- Requirements sections affected: UI evidence, `DEC-006`

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| container `…/REQ-ATPTN-001/tickets/in-progress/REQ-ATPTN-001/prototype-ticket.md`, `requirements-visualization-brief.md`, `requirements-visualization-design-plan.md`, `requirements-visualization-review.md`, `visual-references/manifest.md` | Product Prototyper (external) | Exploratory Project/Task visualizer evidence | Whole `REQ-ATPTN-001` exploration | `REQ-001`, `REQ-002`, `DEC-006` | Awaiting User Review (2026-08-30) | Evidence only; non-normative |
| container `/home/autobyteus/workspace/.codex/worktrees/agent-team-project-task-navigation/tickets/in-progress/agent-team-project-task-navigation/requirements-doc.md` (+ revision record, investigation notes, brief) | Requirements Engineer (historical package) | Draft parent model for Projects/Tasks | Full work model | `REQ-001`–`REQ-005`, `ASM-001` | Draft `RER-004`, unapproved | Linked as context; slice 1 is narrower and independently approved |
| `/tmp/req-atptn-vis/VIS-{021,111,112,113,124,150}*.png` | Solution Designer (disposable copies) | Viewing convenience | N/A | N/A | Disposable | Not promoted; canonical copies remain in the container |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| ASM-001 | Assumption | Slice 1 does not need Task records, execution links, run-history changes, or an `Active projects` panel | Keeps the change small and independently valuable | User confirmation via requirements approval | Open |
| ASM-002 | Assumption | Projects are per bound backend node (like workspaces and the Applications capability), not synced across nodes | Matches every other per-node record | User approval | Open |
| UNK-001 | Unknown | Meaning of "task admission" in the user's memory | Must not be silently dropped or invented | Ask user when planning the Tasks slice | Open |
| RISK-001 | Risk | Prototype branch `prototype/req-atptn-001` and requirements branch `codex/agent-team-project-task-navigation` exist only inside container `autobyteus-server-0` and are not pushed | Container rebuild loses ~4 days of evidence | Recommend user pushes both branches (Product-owned repo; not done by Solution Designer) | Open |
| RISK-002 | Risk | Two "Task" meanings (execution-internal delegated tasks vs future Project Tasks) | Naming in slice 1 must not collide | Slice 1 introduces no Task vocabulary | Mitigated by scope |

## Architecture Investigation Findings

Performed 2026-09-26 after approval `APPROVAL-PROJ-CONCEPT-20260926-001`, in worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction` (base `1676bede9`).

| Source / Command | Observation | Design implication |
| --- | --- | --- |
| `src/skill-improvement/services/skill-improvement-capability-service.ts` | Default-disabled capability: unset → persists `false`, source `INITIALIZED_DISABLED` | Projects capability uses identical semantics |
| `src/services/server-settings-service.ts` (registration ~L139–147; accessors ~L372–404) | Feature-specific boolean accessor pairs for Applications and SI; predefined-setting registration with description | Generic boolean accessor; register `ENABLE_PROJECTS` |
| `diff stores/applicationsCapabilityStore.ts stores/skillImprovementCapabilityStore.ts` | Only names/documents/types differ (~230 lines each) | Extract shared factory (duplicated coordination) |
| `diff components/settings/ApplicationsFeatureToggleCard.vue …/SkillImprovementFeatureToggleCard.vue` (149-line diff, all naming/labels) | SI card uses hard-coded English labels; Applications adds source message | Shared presentational card; wrappers keep test ids |
| `components/settings/ServerSettingsBasicsPanel.vue` | Cards rendered in a 2-column grid: Applications, SI, … | Add Projects card after SI |
| `middleware/feature-flags.global.ts` + spec; `useShellPrimaryNavigation.ts`; `utils/mobileFeatureGates.ts` | Applications-only route gate; nav filter by capability + runtime; `mobileFeatureForRouteLocation` prefix map | Table-driven gate; add `projects` nav key and mobile id |
| `src/persistence/file/store-utils.ts`; `src/remote-access/stores/paired-device-store.ts` | Locked atomic JSON array read/update, stores under `getAppDataDir()` | `ProjectStore` at `<appDataDir>/projects/projects.json` |
| `src/workspaces/workspace-manager.ts` L135–175, L327 | `getRegisteredWorkspaceRootPath(id)` only for `agent_ws_` ids; `getWorkspaceManager()` singleton | Link validation and read-time availability via public API |
| `src/api/graphql/studio-application-api-services.ts` | Service locator scoped to Studio application services | Not an appropriate home for Projects; use module singletons like `getWorkspaceManager()`/`SkillImprovementCapabilityService.getInstance()` |
| `src/api/graphql/types/agent-team-definition.ts:415` | `GraphQLError(message, { extensions: { code } })` convention | `ProjectError.code` → `extensions.code` |
| `autobyteus-web/stores/workspace.ts` L175–211; `components/workspace/config/WorkspaceSelector.vue`; `types/workspace/WorkspaceSelectionState.ts` | `createWorkspace({root_path})` returns id; selector supports existing/new + browse | Link dialog reuses both |
| `autobyteus-web/components/common/ConfirmationModal.vue`, `Modal.vue`; `pages/applications/index.vue`; `components/skills/SkillsList.vue` | Existing modal and catalogue conventions | Projects UI follows them |
| `autobyteus-web/localization/messages/en/index.ts`, `shell.ts`; `package.json` guard scripts (`guard:localization-boundary`, `audit:localization-literals`) | Catalogue merge per area; build guards on literals | New `projects.ts` catalogues in both locales |
| `autobyteus-web/codegen.ts` | Types generated from live backend schema into `generated/graphql.ts` | Regenerate after server schema change |
| `grep` for accessor usages | `getApplicationsEnabledSetting` etc. used only by the two capability services and `tests/unit/services/server-settings-service.test.ts`, `tests/unit/application-capability/application-capability-service.test.ts` | Bounded refactor blast radius |

Persisted-data decision: `Not Affected` for existing data; new file starts empty. No migration.

Additional evidence for `SR-003` (architecture review `ARCH-REV-001`, findings `AR-001`, `AR-002`), verified 2026-09-26:

| Source / Command | Observation | Design implication |
| --- | --- | --- |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` L142–153 (`autoSelectDefault` default `true`), L196–214 (temp prepended, all other `allWorkspaces` listed), L262–284 (temp auto-selected) | Picker is run-configuration-shaped | Add opt-in `candidateWorkspaceIds` (default `null` = unchanged); Projects supplies candidates |
| `grep "<WorkspaceSelector"` in `components/` (non-test): 7 callers; `components/workspace/config/__tests__/WorkspaceSelector.spec.ts` exists | Blast radius of the prop | Default preserves all callers and the existing spec |
| `autobyteus-web/components/common/SearchableSelect.vue` (only component-level `disabled`) | No per-option disabled state | Exclude already-linked workspaces instead of disabling |
| `autobyteus-web/stores/serverSettings.ts` L56, L413–416; `tests/stores/serverSettingsStore.test.ts` L387 | Advanced-table edit refreshes only the Applications capability | Setting-key → capability refresh table incl. `ENABLE_PROJECTS`; SI intentionally excluded |

## Requirement Implications

- The Applications capability pattern is a complete, proven template for a hidden-by-default, per-node, user-toggleable feature; Projects can reuse it without new concepts.
- Workspace identity is path-derived and stable; a Project→workspace link keyed by `workspaceId` survives removal/re-registration and needs no migration of existing data.
- The Draft `REQ-ATPTN-001` package and the RV-033 prototype already position Projects as durable containers with descriptions and workspace *resources*; slice 1 realises exactly that subset and leaves Tasks untouched, so it neither contradicts nor pre-empts the unapproved parent model.
- No existing data changes → data-continuity requirements are limited to "add only, preserve everything".

## Notes For Architecture Design

- Approved scenario IDs and product-level behavior paths to map: see `requirements-doc.md` `SCN-001`–`SCN-006` after approval.
- Verify: `ServerSettingsService` predefined-setting registration idiom; `build-studio-server.ts` composition for capability service wiring; `WorkspaceManager.listRegisteredFilesystemWorkspaces` vs `listVisibleWorkspaces` (temp workspace exclusion) for the link picker; existing catalogue page structure (`pages/skills.vue`) for `/projects`.
- Open technical questions: mirror vs generalise capability code; storage mechanism; whether to expose Project data through one query with resolved workspace availability.
