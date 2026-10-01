# Implementation Handoff

Package `PROJ-CONCEPT-20260926-001` — `projects-concept-introduction` (slice 1: Projects only, behind `ENABLE_PROJECTS`).
Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction`, branch `codex/projects-concept-introduction`, base `origin/personal@1676bede9` (finalization target `origin/personal`, which has since advanced 15 commits; not rebased — integration belongs to delivery).
Commits: `6563fd69f` (server), `816fd4db5` (web), `63e6fb0e4` (IR-002: `SearchableSelect` keyboard support for `CR-001`).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large/High); `ARCH-REV-002` Pass → `/implementation_engineer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/requirements-doc.md` (Approved, `SR-001`, `APPROVAL-PROJ-CONCEPT-20260926-001`)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/solution-revision-record.md` (`SR-001`–`SR-003`)
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/design-spec.md` (`SR-003`)
- Supplemental task artifacts: none that define behavior (external `REQ-ATPTN-001` prototype is non-normative context only).
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/design-review-report.md` (`ARCH-REV-002`, Pass)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/architecture-review-revision-record.md`
- Architecture-review handoff context: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/handoff-to-architecture-review-sr-003.md`
- Triggering rework report: `code-review-report.md` › Failure-Origin Analysis — API-F-001 (`CRR-002`, finding `CR-001`); `api-e2e-execution-coverage-report.md` (`API-REV-001`, `API-F-001` / E2E-007).

## Current Implementation Summary

Server: new `src/projects/` subsystem (domain types/errors/settings key, locked atomic JSON `ProjectStore` at `<appDataDir>/projects/projects.json`, `ProjectService` as sole invariant owner, default-disabled `ProjectsCapabilityService`); GraphQL `projects.ts` + `projects-capability.ts` registered in `schema.ts`; `ServerSettingsService.getBooleanSetting/setBooleanSetting` replace the four feature-specific accessors; `ENABLE_PROJECTS` registered as a predefined setting.
Web: `createBoundNodeCapabilityStore` factory with Applications/SI stores migrated (same store ids, API, error messages); `FeatureCapabilityToggleCard` (props `store`, `title`, `description`, `testIdPrefix`, `statusLabels`, `statusMessage`) with the two cards reduced to wrappers; table-driven route gate; `CAPABILITY_STORE_BY_SETTING_KEY` (ENABLE_APPLICATIONS, ENABLE_PROJECTS); `projectsCapabilityStore`, `projectStore`; `/projects` + `/projects/[id]`; Projects components; opt-in `WorkspaceSelector.candidateWorkspaceIds`; `utils/projects/linkableWorkspaces.ts`; desktop-only `projects` nav item after Nodes; en + zh-CN catalogues; Projects-only delta in `generated/graphql.ts`.

- Implementation cycle: `Rework` (Local Fix)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (baseline `IR-001`)
- Related solution revision IDs: `SR-001`, `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001` (round 1 Pass), `CRR-002` (round 2 failure-origin review, `CR-001` Local Fix), `CRR-003` (round 3 delta review of IR-002: Pass, `CR-001` resolved; informational, no action)
- Related API/E2E revision IDs: `API-REV-001` (`API-F-001`)
- Related delivery revision IDs: N/A
- Triggering finding IDs: `CR-001`

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec › Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: ~80 files across server and web (new subsystem, additive GraphQL contract, new persisted subject, refactor of shipped Applications/SI capability code). No escalation trigger hit: Applications/SI GraphQL contracts unchanged; `workspaces.json`, workspace removal and run history untouched; no migration; nothing exposed on mobile.
- Selected route: `Code Review` (Local Fix on a Large/High package)
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Projects CRUD, search, confirmed delete, no Task wording | `ProjectsList.vue` → `ProjectFormDialog.vue` / `ProjectDetail.vue` → `stores/projectStore.ts` → `api/graphql/types/projects.ts` → `projects/services/project-service.ts` → `projects/stores/project-store.ts` | Name trimmed, required, unique case-insensitively (checked inside the locked updater); description stored `""` when empty; `project_<uuid>` ids; list sorted by name; delete removes only the record. Catalog spec asserts no "task"/"任务" copy. |
| BEH-002 | Described links to registered workspaces; register-then-link | `ProjectWorkspaceLinkDialog.vue` → `selectLinkableWorkspaceIds` → `WorkspaceSelector(candidateWorkspaceIds, autoSelectDefault=false)` → [new: `workspaceStore.createWorkspace`] → `projectStore.addWorkspace` → `ProjectService.addWorkspaceLink` | Server re-validates inside the updater: duplicate → `WORKSPACE_ALREADY_LINKED`; not a registered `agent_ws_` id → `WORKSPACE_NOT_REGISTERED`; snapshots root path. Same workspace in several Projects is allowed. Edit mode: workspace read-only, description editable. |
| BEH-003 | Unregistered link kept and shown unavailable; re-register restores; removal never blocked | `ProjectService.toWorkspaceView` → `WorkspaceManager.getRegisteredWorkspaceRootPath` (read time) → `ProjectWorkspaceRow.vue` | Verified live: remove → `UNREGISTERED` + "Unavailable" badge with stored path/description; re-register same path → `AVAILABLE`, no duplicate. `workspaces/**` imports nothing from `projects/**` (architecture test). |
| BEH-004 | `ENABLE_PROJECTS` capability identical to Applications; Applications/SI preserved | `ProjectsFeatureToggleCard` → `FeatureCapabilityToggleCard` → `projectsCapabilityStore` (factory) → `setProjectsEnabled` → `ProjectsCapabilityService` → `setBooleanSetting`; DS-004b: `serverSettings.updateServerSetting` → `CAPABILITY_STORE_BY_SETTING_KEY` | Unset → persisted `false`, `INITIALIZED_DISABLED`. Nav shows/hides without reload via both the toggle and the Advanced-table path (verified live). SI intentionally not in the refresh table (tested). Existing Applications/SI store and card specs pass with no change. |
| BEH-001 / BEH-002 (AC-011) | Keyboard-only link of an existing workspace | `ProjectWorkspaceLinkDialog` → `WorkspaceSelector` → `components/common/SearchableSelect.vue` (combobox/listbox keyboard support, IR-002) inside `ProjectDialogFrame` | Arrow/Home/End navigation, Enter selects, Escape closes only the popover (no propagation), Tab/Shift+Tab and selection return focus to the trigger inside the dialog trap. Covered by `SearchableSelect.keyboard.spec.ts` and `ProjectWorkspaceLinkDialog.keyboard.spec.ts` (real components, attached to the document). |
| BEH-005 | Desktop-only | `mobileFeatureGates.ts` (`projects` id unsupported, `/projects` route mapping); nav filter `isFeatureAvailableInRuntime('projects')` | Spec-covered. |
| BEH-006 | Per-node persistence; invalidate on rebinding | `ProjectStore` under app data dir; `projectStore` and capability store reset on `bindingRevision` change; late responses dropped | Store spec covers rebinding + stale response. Verified `projects.json` and `ENABLE_PROJECTS=true` persisted in dev data dir. |

## Key Files Or Areas

- Server: `src/projects/{domain/{models,project-errors,settings}.ts,stores/project-store.ts,services/{project-service,projects-capability-service}.ts}`, `src/api/graphql/types/{projects,projects-capability}.ts`, `src/api/graphql/schema.ts`, `src/services/server-settings-service.ts`, `src/application-capability/services/application-capability-service.ts`, `src/skill-improvement/services/skill-improvement-capability-service.ts`.
- Web shared picker (IR-002): `components/common/SearchableSelect.vue` — additive keyboard/ARIA support used by all consumers (WorkspaceSelector run-config callers, `ApplicationWorkspaceRootSelector.vue`, Projects link dialog).
- Web shared mechanism: `stores/capabilities/createBoundNodeCapabilityStore.ts`, `stores/{applications,skillImprovement,projects}CapabilityStore.ts`, `components/settings/{FeatureCapabilityToggleCard,ApplicationsFeatureToggleCard,SkillImprovementFeatureToggleCard,ProjectsFeatureToggleCard,ServerSettingsBasicsPanel}.vue`, `middleware/feature-flags.global.ts`, `stores/serverSettings.ts`.
- Web Projects: `stores/projectStore.ts`, `types/project.ts`, `graphql/{queries,mutations}/project*.ts`, `components/projects/*.vue`, `pages/projects/{index,[id]}.vue`, `utils/projects/{linkableWorkspaces,projectErrorMessageKey,pathBreakSegments}.ts`, `components/workspace/config/WorkspaceSelector.vue`, `composables/useShellPrimaryNavigation.ts`, `utils/mobileFeatureGates.ts`, `localization/messages/{en,zh-CN}/{projects,settings,shell,index}.ts`, `localization/audit/migrationScopes.ts` (new strict scope `M-015`), `generated/graphql.ts`.

## Important Assumptions

- Implementation choices within the design's latitude (not behavior changes):
  - `ProjectDialogFrame.vue` is a Projects-local dialog shell with focus trap, Escape and focus return, used for the form, link and delete dialogs. The design named `Modal.vue`/`ConfirmationModal.vue`, but neither traps focus, which `AC-011`/`QR-003` require.
  - `FeatureCapabilityToggleCard` takes a `statusLabels` prop, so the SI card keeps its existing hard-coded English labels (the design keeps SI localisation out of scope).
- After create, the dialog closes and the new Project appears in the index; the app does not navigate to it.
- Unlink happens without a confirmation dialog. Only Project deletion requires confirmation (`REQ-009`).
- `generated/graphql.ts`: the committed file had already drifted from the live schema. I regenerated from a locally printed SDL and applied only the Projects delta (the base-schema regeneration diffed against the Projects regeneration): +494 lines, no deletions.

## Known Risks

- IR-002 changes a shared picker. It is additive: pointer behaviour, the teleport, positioning, filtering and emitted values are unchanged, and all consumer specs pass unchanged. The one change a pointer user can see is that focus returns to the trigger after a mouse selection instead of dropping to `body`, as `CR-001` requires.

- The Applications/SI extraction changes two shipped features. All existing store, card, middleware and settings specs pass. Two settings specs (`ServerSettingsBasicsPanel.spec.ts`, `ServerSettingsCompactionFailure.spec.ts`) needed a stub for the new sibling `ProjectsFeatureToggleCard`; no assertions about Applications/SI changed.
- The workspace store fetches its list once. A workspace registered outside the app (e.g. direct API) won't show as a link candidate until reload. A stale candidate is rejected by the server with `WORKSPACE_NOT_REGISTERED`: the dialog shows it as `role="alert"`, clears the selection and force-refreshes the list.
- The existing `createWorkspace` accepts nonexistent paths (observed live with `/definitely/not/a/real/path`), so "registration failed → nothing linked" couldn't be triggered through the real backend. The branch is covered by a component spec. The registration rules themselves are unchanged and out of scope (`REQ-005`).
- The branch is 15 commits behind `origin/personal`; delivery will integrate.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature`
- Reviewed root-cause classification: `Duplicated Policy Or Coordination`
- Reviewed refactor decision: `Refactor Needed Now` (bounded)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: The two ~230-line store bodies are now ~25-line factory calls. The two ~180-line cards are now ~40-line wrappers. Four server accessors were replaced by one pair. Per-feature capability services are kept, as designed.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed in scope: `Yes` (duplicated store/card bodies, 4 accessors, `APPLICATIONS_SETTING_KEY` branch, Applications-only middleware branch, unused `targetState` in the Applications card)
- Shared structures remain tight: `Yes` (`BoundNodeCapability` = `enabled/settingKey/source`; Applications `scope` stays feature-typed; stored link vs view kept separate)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes` (largest changed source: `server-settings-service.ts` 365, `WorkspaceSelector.vue` 362 effective lines; no new file > 250)
- Notes: `components/workspace/**` imports nothing from Projects; `WorkspaceSelector` only honours the supplied id list.

## Persisted Data Transition Check

- Approved decision: `Not Affected` (new subject only)
- Design-spec decision reference: design-spec › Persisted Data / State Transition Decision
- Implementation follows it without migration or version-specific fallback: `Yes`
- Direct-use evidence: the generic accessor reads and writes the same trimmed, case-insensitive `"true"`/`"false"` values. A missing `projects.json` reads as `[]`. Malformed rows are filtered by the store (the design's "drop malformed rows").
- Deviation: `None`

## Environment Or Dependency Notes

- The worktree needed `pnpm install`, `npx prisma generate` (server) and `npx nuxt prepare` (web) before tests ran.
- The server `pnpm typecheck` script is broken on base (tests outside `rootDir`). I used `npx tsc -p tsconfig.build.json --noEmit` instead, which is clean.
- Web `vue-tsc` has ~397 errors on base. None are new in changed files, except two long-standing patterns: the codegen header imports, and the middleware spec's one-argument call style, which my added tests avoid.

## Local Implementation Checks Run

- IR-002: web `components/projects`, `components/common`, `components/workspace/config` and `components/applications` pass: 29 files / 221 tests, including the new `SearchableSelect.keyboard.spec.ts` (8) and `ProjectWorkspaceLinkDialog.keyboard.spec.ts` (3). `WorkspaceSelector.spec.ts`, `WorkspaceSelector.candidates.spec.ts`, the run-config specs and the application setup specs are unchanged and pass. Both localization guards pass.
- IR-001 checks (below) remain valid for code not touched by IR-002.

- Server: 7 files / 83 tests pass (`tests/unit/projects/**`, `tests/unit/api/graphql/types/projects.test.ts`, `tests/unit/api/graphql/projects-schema.test.ts`, `tests/architecture/projects-boundaries.test.ts`, `tests/unit/services/server-settings-service.test.ts`, `tests/unit/application-capability/**`). This includes the `QR-001` injected rename-failure test and the updater-abort tests.
- Web: 35 files / 169 tests pass for changed and adjacent specs (Projects components/store/utils, capability factory, Applications/SI stores and cards, middleware, serverSettings store, WorkspaceSelector existing + candidates, nav composable, mobile gates, catalog specs, sidebar/left-panel specs).
- Full web suite: 3136 passed; 13 failed in 6 files. The same 6 files and 13 tests fail on base with my changes stashed (agentTeamRunStore, WorkspaceAgentRunsTreePanel regressions, org-definition-navigation, workspace-history-draft-send, font-size audit, StartupDelayLifecycle).
- Failing on the unchanged base as well: server `tests/skill-improvement/skill-improvement-graphql-resolver.test.ts` (1 test), `tests/unit/workspaces/workspace-manager*.test.ts` (2 tests), and `tests/skill-improvement/skill-improvement-target-notification-service.test.ts` (3 tests; identified by `CRR-001`).
- `pnpm guard:localization-boundary` and `pnpm audit:localization-literals` pass. The new strict scope `M-015` was confirmed to flag an injected literal.

## Frontend Rendered-Result Check

- IR-002 live check in the dev app, using dispatched key events in the Add-workspace dialog:
  - ArrowDown on the trigger opens the listbox, with focus on the combobox and the active option visibly highlighted.
  - ArrowDown moves the active option.
  - Enter selects it; focus returns to the trigger, which shows the selection, and Save is enabled.
  - Escape closes only the listbox; the dialog stays open.
  - Tab returns focus to the trigger inside the dialog panel.
  - Escape on the trigger then closes the dialog.
  - Real OS-keyboard confirmation is left to the API/E2E probe `E2E-007`.

- Affected surfaces / journeys: shell nav; `/projects` index (empty, populated, search, no-match); create/edit dialog (validation, duplicate); detail (links available/unavailable, add existing, add new root, edit description, unlink, delete confirmation); Settings › Server Settings › Basics toggle; Advanced-setting refresh path; zh-CN.
- References: requirements UI section, design-spec `DS-001`–`DS-005`, Concrete Examples.
- Existing patterns reviewed: `pages/applications/index.vue`, `SkillsList.vue`, `ConfirmationModal.vue`, `Modal.vue`, `useAccessibleDrawer.ts`, Settings toggle cards, `WorkspaceSelector`.
- Surface used: `pnpm dev` in the worktree (isolated `.autobyteus/development` data, ports 8000/3000), driven in the browser tool. Stopped afterwards.
- States inspected:
  - flag off: nav has no Projects, and `/projects` redirects to `/`;
  - toggle on, and the nav item appears after Nodes with no reload;
  - empty index; create validation (field error, `aria-invalid`, focus); duplicate-name rejection; populated grid; search by description; no-match state and clear;
  - add dialog lists only registered workspaces (no Temp), nothing pre-selected, Submit disabled until a choice;
  - link existing; register-then-link a new root;
  - remove a workspace → Unavailable row; re-register → Available, no duplicate;
  - edit link description; unlink; delete with confirmation (focus on Cancel);
  - zh-CN detail page;
  - Advanced-table `ENABLE_PROJECTS` false/true hides and shows the nav item live.
- Issues found and fixed:
  - The detail-section "Add workspace" button wrapped onto two lines. Fixed with `whitespace-nowrap` + `flex-shrink-0`, also applied to "New project".
  - Root paths broke mid-folder name. Fixed with `pathBreakSegments` + `<wbr>` after separators, plus a `break-words` fallback.
- Remaining limitations:
  - Interactions were driven by script, so real pointer focus-return after closing a dialog wasn't observable live; component specs cover it.
  - Tab-cycling was verified in specs, not with a live keyboard.
  - Only one desktop width was inspected.

## Downstream Coverage Hints / Suggested Scenarios

- `AC-001`: fresh node → no nav item; `/projects` and `/projects/<id>` redirect to `/`; capability resolve error → redirect.
- `AC-002`: toggle on/off in Basics and in the Advanced table; restart persistence.
- `AC-003`/`AC-004`: create, empty/duplicate (case-insensitive) rejection, rename collision, search by name and description, no-match.
- `AC-005`: default Add-workspace path links a registered workspace (no Temp offered or pre-selected); New-root register-then-link; duplicate link rejected; stale candidate → accessible `WORKSPACE_NOT_REGISTERED`.
- `AC-006`: same workspace in two Projects with separate descriptions.
- `AC-007`: remove linked workspace (not blocked) → Unavailable with path/description → re-register restores, no duplicate.
- `AC-008`: delete confirm/cancel; `workspaces.json` and run history unchanged.
- `AC-009`: node rebinding shows the other node's Projects.
- `AC-010`: Applications and SI toggles and gating unchanged.
- `AC-011`: keyboard-only journey through dialogs.
- `AC-012`: no Task wording.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- After code review of IR-002, API/E2E reruns `E2E-007` first, then `pnpm test:e2e:projects` and the API e2e. The durable API/E2E files are uncommitted in the worktree and untouched by this fix.

- Browser E2E for `AC-001`–`AC-009`, `AC-011`, `AC-012` (design Change Sequence step 7), including restart and node-rebinding checks, is owned by `api_e2e_engineer`.
- Docs sync (design step 8) is owned by delivery.
