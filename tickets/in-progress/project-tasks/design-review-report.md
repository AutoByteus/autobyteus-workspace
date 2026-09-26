# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/requirements-doc.md` (`Approved`, `SR-003`, `APPROVAL-PROJ-TASKS-20260926-001`)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-spec.md` (`SR-004`, `Ready`)
- Supplemental Task Artifacts Reviewed: None define behavior. The released predecessor `tickets/done/projects-concept-introduction/` served as context. The exploratory `VIS-*` references are non-normative.
- Relevant Solution Revision IDs: `SR-003` (requirements), `SR-004` (design)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: `1`
- Trigger: `Architecture Design Complete` handoff (`handoff-to-architecture-review-sr-004.md`)
- Prior Review Round Reviewed: N/A (first review of this package)
- Latest Authoritative Round: `1`
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks` @ `e06080b00` (clean except the ticket folder). Files read:
  - Server: `src/projects/stores/project-store.ts`, `src/projects/services/project-service.ts`, `src/api/graphql/types/projects.ts`, and a `TaskDelegation*` naming grep of `src/api/graphql/types/`.
  - Web: `app.vue` (plain `<NuxtPage />` inside `<NuxtLayout>`), `pages/projects/{index,[id]}.vue`, `pages/settings.vue`, `components/projects/*` (incl. `ProjectDetail.vue`, `ProjectsList.vue`), `components/projects/__tests__/ProjectDetail.spec.ts` L81, `stores/projectStore.ts`, `middleware/feature-flags.global.ts`, `utils/mobileFeatureGates.ts`, `composables/useShellPrimaryNavigation.ts`, `package.json` guard scripts, `tests/e2e/projects-feature-probe.mjs`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: The work stays inside the Projects subsystem (about 25 files). It changes a released persisted shape and a released GraphQL contract, replaces released UI, and adds the repo's first nested route. The code confirms this.
- Independent Architecture Review required by the classification: `Yes` (High risk)
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood:
  - Tasks have a description only; status is agent-owned and stays `TODO` in this ticket, with no human status change.
  - Users can create, view, edit, delete, search and filter Tasks.
  - Deleting a Project cascades to its Tasks, and the confirmation shows the count.
  - Each Project entry shows a not-done count.
  - The Projects page becomes two panes (`DEC-012` B), with a Task list (`DEC-013`).
  - Visibility follows `ENABLE_PROJECTS`; delegated tasks are untouched.
- Relevant existing behavior confirmed:
  - Every `ProjectService` write goes through the one locked `ProjectStore.updateRecords`. Every updater spreads the record (`{ ...project, … }`), so an embedded `tasks` field survives Project and link edits.
  - `deleteProject` filters the whole record under the lock.
  - `normalizeRecords` already projects rows (it filters links).
  - The route gate, mobile gate and nav active-state all match on the `/projects` prefix.
  - `app.vue` has a single plain `<NuxtPage />`, so a `pages/projects.vue` parent keeps a stable key across child changes.
  - The only `*Task*` GraphQL types are `TaskDelegation*`.
- Scope guardrail confirmed: in-scope `UC-001`–`UC-007`. Out of scope: human status changes, admission, titles and extra fields, mobile. Preserved: `BEH-003`, `BEH-005`, released records and links; released `REQ-008`/`REQ-009`/`REQ-014` are explicitly revised or superseded. Review authority is as stated in the requirements.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (none raised).
- Remaining material ambiguity: None blocking (see Residual Risks, note 1).

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass (`DS-001`, `DS-002`, `DS-005`) | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass (`DS-003`; cascade inherent to embedding) | Confirmed | — |
| BEH-003 | User/Operational | Pass | Pass | Pass (existing `/projects` prefix gate) | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass (`DS-004`, URL-driven parent route) | Confirmed | — |
| BEH-005 | Contract | Pass | Pass | Pass (forbidden imports both ways; distinct names) | Confirmed | — |
| BEH-006 | User | Pass | Pass | Pass (`DS-001`) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None. No behavior-defining supplements exist. The context and non-normative references are linked consistently.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | `Feature` plus a released-UI `Behavior Change` | — |
| Root cause explicit and evidence-backed | Pass | `No Design Issue Found`. The locked aggregate write path already exists (verified). | — |
| Refactor decision explicit | Pass | No server refactor; the web page structure is replaced as approved behavior | — |
| Decision reflected in the design | Pass | A separate `ProjectTaskService` prevents a mixed-subject `ProjectService`; the Workspaces panel is extracted so `ProjectDetail` stays header plus tabs | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade Vs Owner | Naming | Ownership | Off-Spine Off | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Task writes | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Task list/search/filter | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Project delete cascade | Pass | Pass | N/A | Pass | Pass | Pass | Pass (see Residual note 1 on the count source) |
| DS-004 | Two-pane navigation | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Client filtering (bounded) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary | Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ProjectTaskService` | Pass | Pass | Pass | Pass | Uses its own locked updater; never touches non-Task Project fields or `updatedAt` |
| `ProjectStore` | Pass | Pass | Pass | Pass | Shared persistence for two sibling services over one aggregate |
| `projectTaskStore` | Pass | Pass | Pass | Pass | — |
| `projectStore.setOpenTaskCount` | Pass | Pass | Pass | Pass | Explicit action; no direct cache writes from `projectTaskStore` |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner | Allowed Clear | Forbidden Explicit | Direction Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server `projects/**` ↔ delegated-task code | Pass | Pass | Pass | Pass | Protects `REQ-012` |
| web Projects ↔ delegated-task UI | Pass | Pass | Pass | Pass | — |
| `projectTaskStore` → `projectStore` | Pass | Pass | Pass | Pass | Only the count action |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `projectTasks(projectId)` | Pass | Pass | Pass | Low | Pass |
| `createProjectTask` / `updateProjectTask` / `deleteProjectTask` | Pass | Pass | Pass (`projectId` + `taskId`) | Low | Pass |
| `Project.openTaskCount` | Pass | Pass | N/A | Low | Pass |
| No status mutation | Pass | — | — | — | Pass (`REQ-003`) |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Sound | New Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Persistence / lock | Pass | Pass | N/A | Pass | — |
| Error mapping (`withProjectErrors`, L139) | Pass | Pass | N/A | Pass | Exported for reuse |
| Dialogs / confirmation | Pass | Pass | N/A | Pass | — |
| Two-pane shell (Settings pattern) | Pass | Pass | N/A | Pass | Mirroring without a shared component is justified |
| Task service | Pass | Pass | Pass | Pass | Distinct subject |

## Subsystem / Capability-Area Allocation Verdict

| Area | Clear | Sound | Supports Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server `src/projects/` | Pass | Pass | Pass | Pass | — |
| web `pages/projects*`, `components/projects/`, `stores/`, `utils/projects/` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Logic | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| First-line summary | Pass | Pass | Pass | Pass | `utils/projects/taskSummary.ts` |
| Binding-revision sequencing in two stores | Pass | N/A | N/A | Pass | Two copies accepted as not yet repeated policy; recorded as residual |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Stored `ProjectTask` | Pass | Pass | Pass | N/A | Pass | No stored summary, title or `projectId` |
| `ProjectView` | Pass | Pass | Pass | N/A | Pass | `toView` currently spreads the whole record, so it must now omit `tasks` explicitly (the design says so) |
| GraphQL `ProjectTask.projectId` | Pass | Pass | Pass | N/A | Pass | View-only, documented |

## File Responsibility Mapping Verdict

| File group | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server domain/store/services/GraphQL | Pass | Pass | Pass | Pass | — |
| web route shell and children | Pass | Pass | N/A | Pass | — |
| `ProjectListPane` / `ProjectListItem` / `ProjectDetail` / `ProjectWorkspacesPanel` / Task panel, row and dialog | Pass | Pass | Pass | Pass | — |
| `projectTaskStore`, `projectStore` | Pass | Pass | N/A | Pass | See Residual note 2 on shared `loading`/`error` |

## Subsystem / Folder / File Placement Verdict

| Path | Clear | Matches Boundary | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Existing Projects folders + `pages/projects.vue` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement | Scope | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ProjectsList.vue`, `ProjectCard.vue`, `ProjectsList.spec.ts` | Pass | Pass | Pass | Pass | The blast radius was verified: only `pages/projects/index.vue`, `docs/projects.md` and the locale catalogues reference them. See note 3 on catalogue keys. |
| Back link and page wrapper in `ProjectDetail` | Pass | Pass | Pass | Pass | — |
| `ProjectDetail.spec.ts` L81 "no task text" assertion | Pass | Pass | Pass | Pass | Verified at L81 |
| e2e probe grid/detail journeys | Pass | Pass | Pass | Pass | Adapted, not deleted |

## Legacy / Backward-Compatibility Verdict

| Area | Retention Exists | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Missing `tasks` → `[]` in `normalizeRecords` | No | Pass | Pass | This is a version-agnostic projection, the same kind as the existing link filtering, not an old-version branch |
| UI grid | No | Pass | Pass | Removed; URLs keep their meaning |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence Sufficient | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `projects.json` released rows | Directly Usable — No Migration | Pass | Pass | N/A | Pass | See the rationale below |

The rationale for this decision:
- The released reader already validates and projects rows.
- A missing collection has exactly the meaning "no Tasks".
- Every write persists normalised records under the lock.
- Neither `isValidProject` nor any other invariant changes.

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Server steps 1–4 → web steps 5–9 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Stored record, released row, row layout, delete wording, switching | Yes | Pass | Pass | Pass | — |

## Material Premise Validation

### `P-001` — The delete confirmation's Task count may be unavailable when the Tasks tab has not loaded for the selected Project

- Related approved requirement: `REQ-008`, `AC-006`.
- Relevant behavior ID(s): `BEH-002`.
- Initiating basis kind: `User`.
- Trigger: The user lands directly on `/projects/<id>?tab=workspaces`, which is URL-driven per `DS-004`, and presses Delete.
- Forward path: `ProjectDetail` mounts with the Workspaces tab, so `ProjectTasksPanel` never mounts and `projectTaskStore` holds no list for this Project. The design's `DS-003` says the confirmation "reads `openTaskCount` and total Task count from the loaded data".
- Consequence: If the implementation reads the count from the Task list, the dialog could show 0 or nothing. In this ticket `openTaskCount` (always available from `projectStore`) equals the total, because every Task is `TODO` and no status mutation exists. A `DONE` Task is only producible by manual file editing, which is not a supported path.
- Reachability: The landing path is `Reachable` (reload or history navigation to a Workspaces-tab URL in a fresh session). A wrong count follows only if the implementation picks the loaded-list source.
- Review consequence: Non-blocking. The design must name one source, and there is an evidence-backed choice available now. Recorded as Residual note 1 for implementation.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`.

## Findings

None.

## Classification

N/A (Pass).

## Recommended Recipient

`/implementation_engineer`; `/solution_designer` receives an informational notification.

## Residual Risks

These are non-blocking implementation notes.
1. **Delete-count source (`P-001`, `REQ-008`).** Pin one source for the confirmation count. Two acceptable choices:
   - make sure `projectTaskStore.fetchTasks(projectId)` has resolved before rendering the count; or
   - use `openTaskCount`, with a code comment that it equals the total only while no status mutation exists. The admission ticket must then revisit it.

   Do not render an unloaded or empty list count.
2. **Shared `loading`/`error` in `projectStore`.** Both `fetchProjects` and `fetchProject` use the store-global `loading`/`error` refs. The list pane and the detail pane are now mounted together, so:
   - the list pane must keep the released rule (loading/error only while `projects.length === 0`); or
   - `fetchProject` should stop driving the list's state.

   Otherwise selecting a Project, or a detail-load error, could blank or flag the left pane, which `REQ-016` and `AC-011` forbid.
3. **Orphaned catalogue keys.** Remove the `ProjectsList`/`ProjectCard` catalogue keys (`en`, `zh-CN`) and the `docs/projects.md` references together with the components. Run `guard:localization-boundary` and `audit:localization-literals`.
4. **First nested route.** Verify the following:
   - nav active-state and the mobile gate still work;
   - the parent's key stays stable across child changes, so the left pane does not remount;
   - `?tab=` changes do not re-run `ProjectDetail.load`.
5. **Duplicated binding-revision sequencing.** It now exists in two stores (`projectStore`, `projectTaskStore`). Extract it if a third copy appears.
6. **Carried from the design.** Single-file lock contention once agents write status often is deferred to admission with a recorded trigger. There is no description length limit, as approved.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (`P-001` is Reachable in its landing path only; it drives a non-blocking note and no new machinery)
- Notes: The design is ready for implementation.
