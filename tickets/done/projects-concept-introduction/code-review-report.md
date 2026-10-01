# Code Review Report

Package `PROJ-CONCEPT-20260926-001` — `projects-concept-introduction` (slice 1: Projects only, behind `ENABLE_PROJECTS`).

## Review Round Meta

Latest round: **round 3 (`CRR-003`), `Implementation Review`** of the `IR-002` delta that fixes `CR-001`.

- The round 1 evidence stays valid for everything the delta does not touch.
- The round 2 failure-origin analysis is kept as history of `CR-001`.
- The Latest Authoritative Result reflects round 3.

Round 3 (implementation review, delta) meta:

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-003`
- Current Review Round: `3`
- Trigger: `/implementation_engineer` handoff of `IR-002` (commit `63e6fb0e4` on top of `816fd4db5`), answering `CR-001`.
- Prior Review Round Reviewed: round 2 (`CRR-002`, failure-origin, Fail — `Local Fix`)
- Implementation Handoff / Revision Record Reviewed: `implementation-handoff.md` (updated for `IR-002`); `implementation-revision-record.md` (`IR-002`)
- Relevant Implementation Revision IDs: `IR-001`, `IR-002`
- Relevant API/E2E Revision IDs: `API-REV-001`
- Delta reviewed: `git diff 816fd4db5..63e6fb0e4`, 3 files:
  - `components/common/SearchableSelect.vue` (+113/−3);
  - new `components/common/__tests__/SearchableSelect.keyboard.spec.ts`;
  - new `components/projects/__tests__/ProjectWorkspaceLinkDialog.keyboard.spec.ts`.

Round 2 (failure-origin) meta:

- Review Entry Point: `API/E2E Failure-Origin Review`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: `2`
- Trigger: the `/api_e2e_engineer` report `api-e2e-execution-coverage-report.md` (`API-REV-001`, round 1, Fail), finding `API-F-001`.
- Prior Review Round Reviewed: round 1 (`CRR-001`, Implementation Review, Pass)
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md` (authoritative), plus `api-e2e-test-case-ledger.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: `API-REV-001`
- Failing Scenario IDs: `E2E-007` (AC-011, REQ-013, QR-003)
- Exact Failing Commands / Execution Mode:
  - `node tests/e2e/projects-feature-probe.mjs` (full run 5), and the same with `--only=E2E-003,E2E-004,E2E-007 --output-dir=/tmp/proj-e2e-logs/probe-kbd`;
  - live isolated node A, Nuxt dev frontend, headless Chromium, keyboard only;
  - deterministic in 5 of 5 runs.
- Failure Evidence Paths:
  - `/tmp/proj-e2e-logs/probe-run5/result.json` › `cases.E2E-007.observations.keyboardLinkExisting`;
  - `/tmp/proj-e2e-logs/probe-kbd/E2E-007-keyboard-link-existing.png`.

Round 1 (implementation review) meta:

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, `SR-001`, `APPROVAL-PROJ-CONCEPT-20260926-001`)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (`SR-001`–`SR-003`)
- Design Spec Reviewed As Context: `design-spec.md` (`SR-003`)
- Supplemental Task Artifacts Reviewed As Context: `handoff-to-architecture-review-sr-003.md`. The external `REQ-ATPTN-001` prototype is non-normative and was not needed.
- Relevant Solution Revision IDs: `SR-001`, `SR-003`
- Design Review Report Reviewed As Context: `design-review-report.md` (`ARCH-REV-002`, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-002`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Trigger: `/implementation_engineer` handoff of `IR-001` (commits `6563fd69f` server, `816fd4db5` web on base `1676bede9`)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review` (round 1); `API/E2E Failure-Origin Review` (round 2)
- Independent source review required by the classification: `Yes` (round 1); `Failure-origin exception` (round 2)
- Classification evidence or correction required: Confirmed. About 78 files changed across server and web. The change adds a new additive GraphQL contract and a new persisted subject, and it refactors the shipped Applications and Skill Improvement capability code. None of the design's escalation triggers were hit: the Applications and Skill Improvement GraphQL contracts, `workspaces.json`, workspace removal and run history are all unchanged.

## Round 3 — `IR-002` Delta Review (`CR-001` resolution)

### Scenario basis

- The scenario is unchanged from round 2: SCN-003 default path under AC-011, REQ-013 and QR-003. It is a `Supported Normal Scenario`.
- Forward path after the fix, for a keyboard-only user in the link dialog:
  1. Enter or ArrowDown on the trigger opens the popover.
  2. The search input has `role="combobox"` and `aria-activedescendant` pointing at the active `role="option"` in the `role="listbox"`.
  3. Arrows, Home and End move the active option.
  4. Enter calls `selectItem`, which emits `update:modelValue`, closes the popover and focuses the trigger. The trigger is inside `ProjectDialogFrame`'s panel.
  5. Tab from the trigger continues inside the dialog trap, where Save is now enabled.
- Escape and Tab inside the popover: both `preventDefault`, `stopPropagation` and `closeAndFocusTrigger`. Focus returns to the in-dialog trigger, and the dialog stays open.
- With the popover closed, Escape on the trigger bubbles to the panel handler, which closes the dialog. This is the correct two-step Escape.

### Constraint verification (from round 2 › Required correction)

| Constraint | Result | Evidence |
| --- | --- | --- |
| Owner is `SearchableSelect`; no cross-awareness | Pass | Only `SearchableSelect.vue` changed in source. `ProjectDialogFrame`, `WorkspaceSelector` and `ProjectWorkspaceLinkDialog` are untouched (diff stat). `SearchableSelect` has no Projects imports. |
| Additive; teleport, positioning, click-outside, filtering, props and emitted values unchanged | Pass | The diff only adds `ref`, ARIA attributes, keydown handlers, `activeIndex` state, an id sequence and an active-option highlight class. `updatePopoverPosition`, `handleClickOutside`, `filteredOptions`, the props and the emits are unchanged. |
| `WorkspaceSelector` semantics and the `candidateWorkspaceIds` contract unchanged | Pass | File not touched. `WorkspaceSelector.spec.ts` and `WorkspaceSelector.candidates.spec.ts` pass. |
| Design reuse kept; no escalation trigger | Pass | The teleport stays and the picker stays. |
| Required specs | Pass | `SearchableSelect.keyboard.spec.ts` has 8 tests, all passing: ARIA semantics, arrows plus Enter, filtered active option, Escape without propagation plus focus return, Tab and Shift+Tab plus focus return (`it.each`), ArrowDown opens, pointer still works. `ProjectWorkspaceLinkDialog.keyboard.spec.ts` has 3 tests and mounts the real frame, selector and `SearchableSelect` with `attachTo: document.body`: a keyboard-only link calls `addWorkspace('p1', …, 'Marketing workspace')` and emits `saved`; two-step Escape; Tab returns focus inside the trap. |

### Round 3 candidates

| Candidate ID | Observation | Scenario / Contract | Evidence | Disposition | Reason |
| --- | --- | --- | --- | --- | --- |
| C-13 | After a pointer selection, focus now moves to the trigger (before, it fell to `body`). Because the trigger uses `focus:ring-2` rather than `focus-visible`, pointer users of every consumer now see a focus ring after choosing an option. | Required correction (round 2) | `selectItem` → `focusTrigger()`; trigger classes | Reject | This is standard combobox behavior, and round 2 required it. It is cosmetic and changes no value or selection semantics. Residual note only. |
| C-14 | `aria-controls` on the trigger and the input names the listbox id even when the list is empty (the empty state renders no `ul`). | QR-003 | Template | Reject | No functional or keyboard consequence. It is a minor ARIA nit. |
| C-15 | The module-level id sequence could cause an SSR hydration mismatch. | Engineering contract | The ids are only rendered while the popover is open, and the popover opens only on the client. | Reject | Not reachable. |
| C-16 | The `filteredOptions` watcher resets the active option to the first match while the popover is open, including when the options prop refreshes. | Explicit handoff behavior | Code | Reject | Intended behavior with no adverse consequence. |

### Verification run by the reviewer

- `components/projects`, `components/common`, `components/workspace/config` and `components/applications`: 29 files, 221 tests, all pass.
- Broader run (`components/{projects,common,workspace,applications,settings}`, `stores/__tests__`, `middleware`, `composables/__tests__`): 201 of 203 files pass, 1423 of 1433 tests pass.
  - The 10 failures are in `stores/__tests__/agentTeamRunStore.spec.ts` (8) and `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` (2).
  - Both files are on the known base-failing list, and neither uses `SearchableSelect` or `WorkspaceSelector` (grep).
- `guard:localization-boundary` and `audit:localization-literals` both exit 0.
- Size: `SearchableSelect.vue` is now 307 effective lines (+113). That is under the 500 hard limit and under the 220 delta threshold. The file still has one concern: the searchable select, including its popover keyboard lifecycle.

## Failure-Origin Analysis — `API-F-001` (Round 2)

### Scenario basis

- Approved behavior:
  - AC-011 (Must): a keyboard-only user can create, search, open, edit, link/unlink and delete without a pointer, and dialogs trap focus.
  - REQ-013 and QR-003 require the "workspace-link management" UI to be keyboard operable and focus-managed.
- Actor and goal: a keyboard-only work owner links an already-registered workspace to a Project. This is SCN-003's default path.
- Entry surface: Project detail → "Add workspace" → Existing → "Select a workspace…".
- Scenario validity: `Supported Normal Scenario`. It combines an approved AC with the default path of an approved scenario. The failing test reproduces this path through the real product surface. It adds no premise of its own.
- The test is valid. It asserts the approved outcome (the workspace is selectable by keyboard and focus stays in the modal), not an incidental implementation detail.

### Forward production path and evidence

1. `ProjectWorkspaceLinkDialog.vue` renders `WorkspaceSelector` inside `ProjectDialogFrame`, as the design's `DS-003` requires.
2. `WorkspaceSelector.vue:53` renders `components/common/SearchableSelect.vue` for the Existing mode.
3. `SearchableSelect.vue` has three relevant properties (unchanged by this branch; last touched in `1730b47da`):
   - The popover is `<Teleport to="body">`. Its DOM is therefore outside `ProjectDialogFrame`'s `panelRef`.
   - Opening the list calls `searchInputRef.focus()` (the `watch(isOpen)` handler). Focus moves to an input that is outside the dialog. Observed: `inDialog=false`.
   - The options are `<li @click="selectItem">` elements with no role, `tabindex` or key handling. Only a pointer can select one. Observed: ArrowDown and Enter select nothing, and Submit stays disabled.
4. `ProjectDialogFrame` handles Tab and Escape with `@keydown` on `panelRef`. Native key events from the teleported popover never bubble through the panel. As a result:
   - Tab moves to `BODY` and the navigation behind the modal (observed);
   - Escape reaches neither the popover nor the dialog (observed: `dialogOpenAfterEscape: true`).
5. Consequence: AC-011 fails for linking an existing workspace. The only keyboard workaround is the "New" path, which needs the absolute path typed in and re-registers the workspace. That is not an acceptable substitute for the default path.

### Origin decision

- Classification: **Implementation defect**, together with an **earlier review gap**.
- The approved design is adequate. It mandated reusing `WorkspaceSelector` for its existing/new/browse UI. It did not require the shared control to stay keyboard-inaccessible, and it did not limit changes to `SearchableSelect`. AC-011 is an explicit approved requirement for this dialog. Meeting it inside the shared control's own owner is an additive, bounded correction, not a structural redesign. Solution Designer does not need to revise the design, provided the fix stays within the constraints below.
- Implementation gap: the implementation added `ProjectDialogFrame` specifically to meet AC-011. The handoff states "Tab-cycling was verified in specs, not with a live keyboard". The frame's specs have no teleported child, so the interaction between the trap and the reused selector's teleported, pointer-only popover was never exercised.
- Review gap, and my responsibility:
  - In CRR-001 I accepted C-01 (the `ProjectDialogFrame` focus trap) and scored Runtime Correctness at 9.0 without reading `SearchableSelect.vue`, the one interactive child that the link dialog embeds.
  - Both defects are visible in that 231-line file: the `<Teleport to="body">` and the pointer-only `<li @click>` options.
  - The invariant I should have checked is: every interactive element of a `ProjectDialogFrame` dialog must be reachable and operable by keyboard, and it must stay within the frame's keyboard ownership.
  - This was reasonably detectable in source review, so it is a genuine review gap.
- Not a test, fixture, environment or execution problem.
- Not a requirement gap: AC-011 is unambiguous.

### Required correction (bounded Local Fix → `/implementation_engineer`)

- Owner of the fix: `SearchableSelect.vue` owns its popover's lifecycle, so it should own the keyboard and focus behavior of that popover.
  - Make the options keyboard operable, using the combobox/listbox pattern:
    - ArrowDown and ArrowUp move an active option (`aria-activedescendant` on the search input, `role="listbox"` and `role="option"` with `aria-selected`);
    - Enter selects the active option;
    - `aria-expanded` and `aria-haspopup` go on the trigger.
  - When the popover is open:
    - Escape closes the popover only. It must stop propagation so the dialog stays open, and it returns focus to the trigger.
    - Tab and Shift+Tab close the popover and return focus to the trigger. The trigger is inside the dialog, so `ProjectDialogFrame`'s trap owns the next Tab.
    - Selecting an option returns focus to the trigger.
- Do not teach `ProjectDialogFrame` about `SearchableSelect`, and do not teach `SearchableSelect` about Projects.
- Constraints:
  - The change must be additive.
  - Pointer behavior, teleport placement, positioning, filtering and emitted values must stay unchanged for every consumer. Consumers include `WorkspaceSelector`'s run-configuration callers and `ApplicationWorkspaceRootSelector.vue`.
  - Do not change `WorkspaceSelector`'s selection semantics or the `candidateWorkspaceIds` contract.
  - Keep the design's reuse of `WorkspaceSelector`.
  - Escalation: if meeting AC-011 turns out to require removing the teleport, replacing `SearchableSelect`/`WorkspaceSelector` in the link dialog, or changing behavior that other consumers can see beyond gaining keyboard support, stop and route `Design Impact` to `/solution_designer`.
- Required evidence on return:
  - a new component spec for `SearchableSelect` keyboard behavior: arrow navigation, Enter selects, Escape closes without propagating, Tab returns focus to the trigger;
  - a `ProjectWorkspaceLinkDialog` spec that mounts the real `SearchableSelect` inside `ProjectDialogFrame`, attached to the document, and completes a keyboard-only link of an existing workspace;
  - the existing `WorkspaceSelector.spec.ts`, `WorkspaceSelector.candidates.spec.ts` and run-config/application-setup specs passing unchanged.
- After the fix: source review of the delta (`/code_reviewer`), then the API/E2E rerun. E2E-007 goes first, then the full probe and the API e2e.

## Review Scope

- Changed implementation and behavior reviewed: the full diff `1676bede9..816fd4db5`.
- Files and areas reviewed:
  - Server:
    - `src/projects/**`
    - `src/api/graphql/types/projects*.ts` and `schema.ts`
    - `src/services/server-settings-service.ts`
    - the two capability services that were switched to the generic accessor
  - Web:
    - `stores/capabilities/createBoundNodeCapabilityStore.ts` and the three capability store wrappers
    - `stores/projectStore.ts` and `stores/serverSettings.ts`
    - the four settings cards
    - `middleware/feature-flags.global.ts`, `composables/useShellPrimaryNavigation.ts` and `utils/mobileFeatureGates.ts`
    - `components/projects/**`, `pages/projects/**` and `utils/projects/**`
    - `WorkspaceSelector.vue`
    - the GraphQL documents, `types/project.ts`, the localisation catalogues and `migrationScopes.ts`
  - Tests: the changed and added specs, reviewed proportionately.
- Explicit exclusions:
  - The body of `generated/graphql.ts`. I checked only that it is additive.
  - Browser E2E, which is owned by API/E2E.
  - Docs sync, which is owned by delivery.
- Independent verification run by the reviewer:
  - Server: 7 files / 83 tests pass in the changed areas.
  - Web: 46 files / 254 tests pass in the changed and adjacent areas. This includes the Applications and Skill Improvement store and card specs, the middleware, `serverSettingsStore`, both `WorkspaceSelector` specs, navigation, mobile gates and the catalogues.
  - `guard:localization-boundary` and `audit:localization-literals` both exit 0.
  - Base-failure check: in `tests/skill-improvement/`, 4 tests fail both on this branch and in a clean worktree at `1676bede9`, so they are not regressions. They are 1 graphql-resolver test and 3 target-notification-service tests. The handoff lists only the resolver test (see Residual Risks).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes`. Slice 1 is Projects CRUD, described workspace links, unavailable links for unregistered workspaces, and a default-off per-node capability that behaves like Applications. It is desktop-only, in en and zh-CN, and has no Task wording.
- Design-spec behavior map verified against the implementation: `Yes`. `DS-001` through `DS-005` and `DS-004b` all match the code; see the table below.
- Design review report and round confirmed: `ARCH-REV-002`, round 2, Pass. Residual risks R1–R4 were checked in the code (see the Candidate Gate).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `ProjectsList` / `ProjectFormDialog` / `ProjectDetail` → `projectStore.mutateProject` → `ProjectResolver` (`withProjectErrors` maps `ProjectError.code` to `extensions.code`) → `ProjectService`. The service trims names, checks case-insensitive uniqueness inside `store.updateRecords`, and assigns `project_<uuid>` ids → `ProjectStore.updateRecords` → `updateJsonArrayFile` (locked tmp+rename). Delete requires confirmation in `ProjectDialogFrame` and removes only the record. The catalogue spec checks for Task words. | — |
| BEH-002 | Confirmed | `ProjectWorkspaceLinkDialog` → `selectLinkableWorkspaceIds` (filesystem, not temp, `agent_ws_`, not already linked) → `WorkspaceSelector(:candidate-workspace-ids, :auto-select-default=false)`. For a new root: `workspaceStore.createWorkspace`, then `projectStore.addWorkspace`. `ProjectService.addWorkspaceLink` rejects a duplicate and calls `getRegisteredWorkspaceRootPath` inside the updater. That method is prefix-guarded in `workspace-manager.ts:150`. The service then snapshots the root path. | — |
| BEH-003 | Confirmed | `ProjectService.toWorkspaceView` resolves availability at read time. No `workspaces/**` file imports Projects code, and `tests/architecture/projects-boundaries.test.ts` enforces this. Unlink works for `UNREGISTERED` links. | — |
| BEH-004 | Confirmed | `ProjectsFeatureToggleCard` → `FeatureCapabilityToggleCard` → factory store `setEnabled` → `setProjectsEnabled` → `ProjectsCapabilityService` → `setBooleanSetting`. On the Advanced-table path (`DS-004b`), `CAPABILITY_STORE_BY_SETTING_KEY` refreshes the store. The route gate is table-driven, and the navigation filter uses `isEnabled`. The factory body is identical in logic to the base `applicationsCapabilityStore.ts` (compared line by line), and the base Applications and SI stores differed only in names and types. | — |
| BEH-005 | Confirmed | `mobileFeatureGates.ts` adds `projects`, which is not in `supportedMobileFeatures`, and maps `/projects`. The navigation filter also checks `isFeatureAvailableInRuntime('projects')`. | — |
| BEH-006 | Confirmed | Projects are stored in `<appDataDir>/projects/projects.json`. `projectStore` and the capability store invalidate synchronously on `bindingRevision` and drop late responses. `ProjectsList` and `ProjectDetail` reload on rebinding. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Shape | Forward Production Path / Lifecycle | Expected Outcome | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, REQ-001/008, AC-003 | User | Work owner | Create a Project | Projects nav → New project | Normal | `DS-001` as traced above | Listed; empty or duplicate name rejected at field level | Approved requirements | Supported Normal Scenario | Use |
| SCN-002 | BEH-001, REQ-008/009, AC-004/008 | User | Work owner | Find, edit, delete | Projects index / detail | Normal | Client-side filter → detail → form / delete dialog | Index updated; delete scoped to the Project | Approved requirements | Supported Normal Scenario | Use |
| SCN-003 | BEH-002, REQ-002/003/005, AC-005/006 | User | Work owner | Link described workspaces | Detail → Add workspace | Normal | `DS-003` as traced above | Link shown; no duplicate; failed registration links nothing | Approved requirements; `ARCH-REV-001` `P-001` | Supported Normal Scenario | Use |
| SCN-004 | BEH-003, REQ-004, AC-007 | User/System | Workspace owner | Unregister a linked workspace | Workspaces › Remove | Explicit Edge | Removal untouched → read-time `UNREGISTERED` → re-registration restores `AVAILABLE` | Link kept as unavailable | Explicit approved contract | Supported Explicit Edge Scenario | Use |
| SCN-005 | BEH-004/005, REQ-006/007, AC-001/002/010 | User/Operational | Node operator | Toggle the preview feature | Settings › Basics toggle; Advanced table | Normal | `DS-004` / `DS-004b` / `DS-005` | Hidden by default; toggles without reload; Applications/SI unchanged | Approved requirements | Supported Normal Scenario | Use |
| SCN-006 | BEH-006, REQ-010/011, AC-009 | Operational | Bound node | Persist per node | Restart / rebinding | Normal | File store; binding invalidation | Node-scoped data survives restart | Approved requirements | Supported Normal Scenario | Use |
| R-STALE | REQ-013, `ARCH-REV-002` residual risk | User | Work owner | Link a workspace that was removed after the list was loaded | Add-workspace dialog with a stale candidate | Explicit Edge | Server re-validates → `WORKSPACE_NOT_REGISTERED` → `role="alert"` message, selection cleared, forced list reload | Accessible error; nothing linked | Named by the architecture review as a required accessible outcome | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `ProjectDialogFrame.vue` is new and replaces the `Modal.vue` / `ConfirmationModal.vue` named in the design mapping | AC-011, QR-003 | Keyboard-only user opens any Projects dialog | Focus trap, Escape, initial focus and focus return are covered by specs | `Modal.vue` and `ConfirmationModal.vue` have no focus handling (grep); AC-011 requires trapped focus | Reject (as a defect) | This is a justified deviation within design latitude, because the named components cannot meet an approved AC. It is placed under its only consumer, and moving it to `common/` would widen scope. Recorded as a residual note only. |
| C-02 | `FOCUSABLE_SELECTOR` is duplicated between `ProjectDialogFrame` and `useAccessibleDrawer` | Engineering contract (reuse) | — | A 6-line constant; the drawer composable is drawer-stack specific and not a fit for dialogs | Code read | Reject | Not material. A shared focus-trap utility could be a later cleanup if a second dialog consumer appears. |
| C-03 | The `statusLabels` prop on the shared card | Design: SI localisation out of scope; AC-010 | — | The SI card keeps its exact hard-coded labels; Applications and Projects pass localised labels | Code read; unchanged SI card spec passes | Reject | Correct: it preserves SI output without widening scope. |
| C-04 | `ProjectStore` drops malformed rows, and the next write persists without them | Design ("drop malformed rows") | Only manual tampering with `projects.json` produces malformed rows | — | The product exposes no editing path | Reject | Technically possible but unsupported, and the behavior is approved by the design. |
| C-05 | Link candidates can be stale (workspace list fetched once) | R-STALE | Workspace removed after the dialog's list loaded | The server rejects inside the lock; the dialog shows `role="alert"`, clears the selection and calls `fetchAllWorkspaces(true)` | `ProjectWorkspaceLinkDialog.vue`; the spec at line 127 | Reject (as a defect) | This is the required handling, and it is implemented and tested. |
| C-06 | `WorkspaceSelector` inside the link dialog shows some existing English literals ("Existing", "New", "Search workspaces...") in zh-CN | REQ-012 (new strings only) | zh-CN user opens Add workspace | These strings are pre-existing and reused unchanged | Base `WorkspaceSelector.vue` | Reject | REQ-012 covers new strings. The selector's legacy literals predate this change and are out of scope. Residual note. |
| C-07 | `ensurePrimaryNavigationReady` now resolves through `Promise.allSettled` and never rejects | Engineering contract | — | Both callers already `.catch(() => undefined)` | grep of `LeftSidebarStrip.vue:155` and `AppLeftPanel.vue:176` | Reject | No consequence. |
| C-08 | `fetchProjects` does not dedupe concurrent calls; list and detail share the store's `loading` and `error` | SCN-002 | — | `ProjectsList` fetches once on mount and once on rebinding; `ProjectDetail` uses its own `state` | Code read | Reject | No supported path issues overlapping list fetches with a visible consequence. |
| C-09 | UI-only `maxlength="200"` on the Project name | REQ-001 | A user entering a name longer than 200 characters | — | No approved requirement or scenario concerns such names | Reject | Not material. |
| C-10 | Server name comparison uses `toLocaleLowerCase` | REQ-001, design guidance | — | This is the comparison the design prescribed | Design › Guidance | Reject | Follows the design. Locale-specific casing edge cases are not a supported scenario. |
| C-12 (round 2) | The reused `SearchableSelect` popover is teleported outside `ProjectDialogFrame` and its options are pointer-only, so keyboard users cannot select an existing workspace and focus escapes the modal | SCN-003, AC-011, REQ-013, QR-003 | Keyboard-only user presses "Add workspace", then opens "Select a workspace…" | See Failure-Origin Analysis: focus leaves the dialog, no selection is possible, Tab reaches the page behind, Escape is ignored | `result.json` E2E-007 (5/5 runs); `SearchableSelect.vue` Teleport and `<li @click>`; `ProjectDialogFrame` panel-scoped keydown | Promote → `CR-001` | Additive keyboard/focus handling in `SearchableSelect`. Local Fix → `/implementation_engineer`. |
| C-11 | Changed files over the delta threshold (`>220` added lines): `ProjectDetail.vue`, `projectStore.ts`, `project-service.ts`, `createBoundNodeCapabilityStore.ts` | Engineering contract (size) | — | All are new single-concern files at 208–246 effective lines, with none over 500. The factory relocates about 230 lines that existed twice. | Line counts below | Reject | Each file has one clear responsibility. No split is warranted. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | `Duplicated Policy Or Coordination` was resolved as designed. The 2 stores are now about 25-line factory calls, the 2 cards are about 40-line wrappers, and 4 server accessors became 1 pair. The per-feature capability services are kept. | — |
| Matches behavior-defining supplemental artifacts | Pass | No supplements define behavior. The design mapping is followed, and the one deviation (C-01) is justified by AC-011. | — |
| Data-flow spine inventory clarity and preservation | Pass | `DS-001`–`DS-005` and `DS-004b` map one-to-one onto the code. | — |
| Ownership boundary preservation | Pass | `ProjectService` is the only owner of Project invariants. The resolvers are thin, the store holds no rules, and `WorkspaceManager` is read-only. | — |
| Off-spine concern clarity | Pass | Error codes, display name, availability lookup and `projectErrorMessageKey` each serve one owner. | — |
| Existing capability/subsystem reuse | Pass | Reuses `store-utils`, `WorkspaceManager`, `WorkspaceSelector` (opt-in prop) and `workspaceStore.createWorkspace`. C-01 is justified. | — |
| Reusable owned structures | Pass | Factory, shared card and generic boolean accessor. | — |
| Shared-structure / data-model tightness | Pass | `BoundNodeCapability` has `enabled/settingKey/source`, and the Applications `scope` stays feature-typed. The stored link and the view are separate. `description` is always a string. | — |
| Repeated coordination ownership | Pass | Capability resolution, invalidation and rollback have one owner. The route gate and the refresh table are table-driven. | — |
| Empty indirection | Pass | The wrappers carry feature labels, test ids and source messages only, as the design sanctioned. | — |
| Separation of concerns and file responsibility | Pass | See the size audit. | — |
| Ownership-driven dependency | Pass | `workspaces/**` does not import `projects/**`; `projects/**` does not import the registry store; `api/**` does not import the project store. All three are test-enforced. No file under `components/workspace/**` imports Projects code (grep). | — |
| Authoritative Boundary Rule | Pass | The resolver uses the service only, and the service uses `WorkspaceManager` rather than `WorkspaceRegistryStore`. Components use `projectStore` rather than Apollo. | — |
| File placement | Pass | Follows the design's folder mapping. | — |
| Flat-vs-over-split layout | Pass | `domain/stores/services` mirrors the existing subsystems. | — |
| Interface/API boundary clarity | Pass | Every operation uses an explicit `projectId`, or `projectId` + `workspaceId`. Links are made by id, never by path. | — |
| Naming quality | Pass | Names match the design vocabulary (`ProjectWorkspaceLink` / `ProjectWorkspaceView`, `selectLinkableWorkspaceIds`, `CAPABILITY_STORE_BY_SETTING_KEY`). | — |
| No unjustified duplication | Pass | Only the trivial C-02 remains. | — |
| Patch-on-patch complexity control | Pass | The `WorkspaceSelector` change is a contained branch in `inventoryWorkspaceOptions` plus one guard in auto-select. | — |
| Dead/obsolete code cleanup | Pass | Four accessors, two store bodies, two card bodies, the Applications-only middleware and refresh branches, and the unused `targetState` are all removed. No stale references remain (grep). | — |
| Test scenarios and assertions clear and requirement-aligned | Pass | The service tests map to REQ/AC IDs, including QR-001 with an injected `rename` failure. Component specs cover validation, focus, stale candidates and the flag-gated routes. | — |
| Test fixtures and structure coherent | Pass | Harnesses and mocks are reused within each spec. | — |
| No stale or compatibility-only tests | Pass | Existing Applications and SI specs are unchanged. The middleware, `serverSettingsStore` and settings panel specs only gained additions. | — |
| API/E2E readiness | Pass | Test ids are stable, and the handoff lists downstream scenarios for every AC. | — |

## Source File Size And Structure Audit

These are changed implementation-source files that are over 220 effective lines or had more than 220 lines added. All other changed source files are smaller.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/serverSettings.ts` | 417 | Pass | Pass (+12/−3) | Pass | Pass | Pre-existing size | — |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | 365 | Pass | Pass (+10/−23) | Pass | Pass | Net reduction | — |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | 362 | Pass | Pass (+27/−7) | Pass | Pass | Pre-existing size | — |
| `autobyteus-web/components/projects/ProjectDetail.vue` | 246 | Pass | Reviewed (+268, new) | Pass: one detail surface | Pass | Acceptable | — |
| `autobyteus-web/stores/projectStore.ts` | 215 | Pass | Reviewed (+246, new) | Pass | Pass | Acceptable | — |
| `autobyteus-server-ts/src/projects/services/project-service.ts` | 213 | Pass | Reviewed (+245, new) | Pass | Pass | Acceptable | — |
| `autobyteus-web/stores/capabilities/createBoundNodeCapabilityStore.ts` | 208 | Pass | Reviewed (+252, new; relocates two copies of about 230 lines) | Pass | Pass | Acceptable | — |

The localisation catalogues (`settings.ts`, about 404 lines each) are data files. The additions to them are small.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No aliases or wrappers keep the old accessors or store bodies. |
| No legacy old-behavior retention | Pass | The Applications-only branches were replaced by tables. |
| Dead/obsolete code cleanup completeness | Pass | Verified by grep. |
| Approved persisted-data transition followed | Pass | `Not Affected`. The generic accessor reads and writes the same `"true"`/`"false"` strings, and a missing `projects.json` reads as `[]`. |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match the reviewed design | Pass | No migration is required, and none was added. |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: a new feature and a new shared capability mechanism.
- Files or areas likely affected (design step 8, owned by delivery):
  - new `autobyteus-web/docs/projects.md` and `autobyteus-server-ts/docs/modules/projects.md`;
  - updates to `autobyteus-web/docs/settings.md` and `docs/applications.md`;
  - `autobyteus-web/AGENTS.md`.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001 | Confirmed (resolved in code) | The candidate list excludes temp, and nothing is auto-selected: `autoSelectDefault=false`, with the `candidateWorkspaceIds !== null` guard as well. |
| P-002 | Confirmed (covered) | The `agent_ws_` prefix filter applies regardless. |
| P-003 | Confirmed (resolved in code) | The `ENABLE_PROJECTS` refresh through `CAPABILITY_STORE_BY_SETTING_KEY` is tested, and SI is excluded (also tested). |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.3
- Overall score (`/100`): 93

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Every designed spine, including `DS-004b`, is traceable end to end in the code. | Nothing material. | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One invariant owner. Validation runs inside the locked updater, and the boundaries are enforced by a test. | Nothing material. | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Explicit identity shapes, typed error codes, and the GraphQL shape exactly as designed. | Nothing material. | — |
| 4 | Separation of Concerns and File Placement | 9.0 | The files are cohesive and the layout mirrors existing subsystems. | `ProjectDialogFrame` is a generic concern placed under its only consumer (justified). | Promote it to a shared location if another dialog needs a focus trap. |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | The capability base type is tight, and the stored and view shapes are separated. | Nothing material. | — |
| 6 | Naming Quality and Local Readability | 9.0 | Natural names and small functions. | `FOCUSABLE_SELECTOR` is duplicated in two places (trivial). | — |
| 7 | API/E2E Readiness | 9.0 | Stable test ids and scenario hints for every AC. | The handoff under-reports one base-failing server file (3 SI notification tests). | Keep the pre-existing failure list complete for API/E2E triage. |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.0 (round 3; it was invalidated in round 2) | `CR-001` is fixed in the shared control's owner. The keyboard-only link, two-step Escape and Tab-into-trap behavior are proven with the real components mounted in the document. Every other traced behavior still matches round 1. | OS-level keyboard confirmation is still pending (E2E-007 rerun). Pointer users now see a focus ring on the trigger after selecting (C-13, cosmetic). | Covered downstream by the API/E2E rerun. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | A clean-cut replacement with no wrappers. | — | — |
| 10 | Cleanup Completeness | 9.5 | All decommission items are removed and no stale references remain. | — | — |

## Findings

Round 1 promoted no candidate. Round 2 adds one finding.

### `CR-001` — The link dialog's existing-workspace picker is not keyboard operable and escapes the dialog focus trap (**Resolved in round 3**, `IR-002` / `63e6fb0e4`)

Round 3 verification: see "Round 3 — `IR-002` Delta Review". All the required correction's constraints are met, and the required specs are present and passing. The original record follows.

- Severity: High. It blocks a Must acceptance criterion.
- Protects: AC-011, REQ-013, QR-003. Scenario: SCN-003, default path. Candidate: C-12.
- Evidence:
  - `components/common/SearchableSelect.vue`: the `<Teleport to="body">` popover, the `searchInputRef.focus()` on open, and the `<li @click>` options with no key handling;
  - `components/projects/ProjectDialogFrame.vue`: `@keydown` is bound to `panelRef` only;
  - the live E2E-007 evidence in `result.json`.
- Consequence: a keyboard-only user cannot link a registered workspace. Focus leaves the modal, and Escape and Tab do not behave as the dialog contract requires.
- Required action: the bounded, additive keyboard and focus handling in `SearchableSelect`, as specified under Failure-Origin Analysis › Required correction, with the listed specs. Keep pointer and visual behavior unchanged for all consumers. Escalate as `Design Impact` if the fix cannot stay additive.
- Origin: implementation defect plus an earlier review gap (CRR-001 did not read the embedded `SearchableSelect`).

## Classification

Round 3: N/A — the review passes.

History: round 2 classified `CR-001` as a `Local Fix` (implementation-owned), and it is now resolved.

## Recommended Recipient

`/api_e2e_engineer`. Rerun E2E-007 first, then the full probe and the API e2e.

## Residual Risks

- Round 3: `SearchableSelect` is shared. After a mouse selection, pointer users of the run-config and application-setup pickers now see the trigger's focus ring (C-13). This is intended combobox behavior, and switching the trigger to `focus-visible` styling would be an optional later polish.
- Round 3: the fix was verified with component specs attached to the document and with dispatched events in the dev app. OS-level keyboard confirmation belongs to the E2E-007 rerun.

- Base-failing tests are under-reported in the handoff. Server `tests/skill-improvement/skill-improvement-target-notification-service.test.ts` has 3 tests failing both on this branch and on the base `1676bede9` (reviewer-verified). The handoff lists only the resolver test in that folder, so API/E2E should treat all 4 as pre-existing.
- `WorkspaceSelector` has pre-existing English literals, which will appear in the zh-CN link dialog. This is not a regression and localising them is out of this ticket's scope, but a zh-CN E2E pass may notice them.
- `ProjectDialogFrame` is Projects-local. If another feature needs a focus-trapped dialog, promote it to `components/common/` rather than copying it.
- The branch is 15 commits behind `origin/personal`. Delivery owns integration, and the capability-store and settings-card extraction should be re-checked for conflicts at that point.
- Browser-level AC-011 keyboard behavior (focus return, Tab cycling) and AC-001, AC-002 and AC-009 (restart and rebinding) still need executable coverage by API/E2E.

## Latest Authoritative Result

- Review Decision: `Pass` (round 3, `CRR-003`). `CR-001` is resolved.
- Review Entry Point: `Implementation Review` (delta review of `IR-002`)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`. No new premises; C-13 to C-16 were rejected with reasons.
- Score Summary: 9.3/10 (93/100). Every category is ≥ 9.0, and row 8 is restored to 9.0.
- Failure Origin: N/A for this round. See the round 2 history for `API-F-001`.
- Recommended Recipient: `/api_e2e_engineer`
- Notes:
  - Task size (`Large`) and architectural risk (`High`) are preserved.
  - The API/E2E rerun should go E2E-007 first, then the full `pnpm test:e2e:projects` probe and the server `tests/e2e/projects` API e2e.
  - The uncommitted durable API/E2E tests are untouched by `IR-002`. They receive the proportional test-code review after a passing rerun.
