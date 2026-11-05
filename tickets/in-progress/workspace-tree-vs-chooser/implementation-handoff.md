# Implementation Handoff: workspace-tree-vs-chooser (autobyteus-385)

Branch `codex/workspace-tree-vs-chooser`, worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser`, base `origin/personal` `3ef5e33eec` (unchanged since the ticket started).

Commits of this round:

| Commit | What |
| --- | --- |
| `e07896a22b` | `git revert 8fe7b2e57e`: the SR-003 hide code is gone |
| `51a4abc6ce` | The SR-004 package as received (ARCH-REV-004 Pass) |
| `a5fc23849e` | Server: read window `null`, `lastActivityAt` (`RunLastActivityReader`) |
| `0d3c31c4ae` | Web: the three views, the header menu, the rules, the chooser Remove, removals, docs, probes |
| the evidence commit after `0d3c31c4ae` (see `git log`) | This handoff, the revision record and `evidence/implementation/` |

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: the architecture review was selected and passed (ARCH-REV-004 Pass on SR-004, `task_size=Large`, `architectural_risk=High`), so code review follows implementation.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/requirements-doc.md`
- Investigation notes: `.../workspace-tree-vs-chooser/investigation-notes.md`
- Solution revision record: `.../workspace-tree-vs-chooser/solution-revision-record.md` (SR-004)
- Design spec: `.../workspace-tree-vs-chooser/design-spec.md`
- Supplemental task artifacts: `.../workspace-tree-vs-chooser/product-design-request.md` (UXJ-001/002, VIS-001…VIS-017 references)
- Design review report: `.../workspace-tree-vs-chooser/design-review-report.md`
- Architecture review revision record: `.../workspace-tree-vs-chooser/architecture-review-revision-record.md` (ARCH-REV-004)
- Triggering rework report: N/A. This is the first implementation of SR-004. The earlier SR-003 implementation (`8fe7b2e57e`) was reverted, as the work list asked.

## Current Implementation Summary

- Implementation cycle: `Initial` (of SR-004)
- Implementation revision record: `.../workspace-tree-vs-chooser/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-004`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

Summary:

- The run section has a header: the view's name (`h2#run-section-title`) and a `⋯` "View" menu with three views: Runs, Workspaces (the default) and Projects.
- The Runs view is 378's run list, ported as files.
- `runHistoryStore` owns one read window. It is `null` while Runs is shown and 6 otherwise. The phone sets 5.
- The server accepts `limitPerAgent: null` on both history reads. Every Agent, Team and Org history item carries `lastActivityAt`.
- The Workspaces view lists a folder only while it has a listed run. The Projects view lists a Project only while it has a run. Each view has text-only empty states.
- The folder X, the inline add form, "New Project" and `RunSectionSwitch` are gone.
- The chat chooser has "Remove" on each user folder.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - The GraphQL argument `limitPerAgent` now accepts `null` on both reads.
  - Every history item gains `lastActivityAt: String!`, read from memory files on each read.
  - One shared read window serves every `runHistoryStore` caller.
  - The change touches 119 files under `autobyteus-web` and `autobyteus-server-ts` (+3735 / −835).
  - No escalation trigger fired:
    - every history caller uses the window;
    - every folder or Project with a listed run is shown (`runHistoryListedFolders.spec.ts`, IMP-20 VIS-017);
    - the read budget was not measured here (it is API/E2E's, below).
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| DS-001 (REQ-006, AC-009, UXJ-001, VIS-002/004/006/011/013) | Header with the view's name and a "View" menu: three `menuitemradio`; keyboard; the choice stored per node; strip label | New `components/workspace/history/RunSectionHeader.vue`. `stores/runSectionModeStore.ts`: `RunSectionMode` gains `runs`, and an unknown value reads as `workspaces`. `components/layout/LeftSidebarStrip.vue` (`RUN_SECTION_LABELS`). Host `WorkspaceAgentRunsTreePanel.vue` renders the header and one view | Done. The menu holds only the three views. Choosing the current view only closes it. ArrowDown opens on the current view; Escape returns focus; Tab and an outside click close it |
| DS-002 (REQ-008) | One read window owned by `runHistoryStore`: `null` for Runs, 6 otherwise, one read per view change; the phone 5; reconcile uses it; server accepts `null` | `stores/runHistoryStore.ts` (`historyWindow`, `setHistoryWindow`), `runHistoryLoadActions.ts`, `runHistoryWorkspaceHistoryActions.ts`, `runHistoryRetiredRuns.ts` (`reconcileHistoryRead(groups, limit \| null)`). Host: `historyWindowOf(mode)` set on mount before the first read and on a view change with one `fetchTree`. `composables/useMobileWorkCatalog.ts` sets 5 before its read. Server: `api/graphql/types/run-history.ts` (`nullable: true, defaultValue: 6`), `agent-run-history-service.ts` `listRunHistory(limitPerAgent: number \| null = 6)`, `workspace-run-history-service.ts` | Done. `fetchTree`, `refreshTreeQuietly` and `fetchWorkspaceHistory` take no limit, so every caller follows the window. Shrinking `null` → 6 retires no run (`runHistoryReadWindow.spec.ts`) |
| DS-003 (REQ-008, AC-011, VIS-003/012) | Runs view ported from 378; ordered by the server's `lastActivityAt`; a local run not yet in the history uses `conversation.createdAt` | New `components/runList/{RunListPanel,RunListRow,RunListRowActions,RunListFold}.vue`, `runListSectionContracts.ts`, `components/workspace/history/AgentOrgRunMemberTree.vue`, `stores/runListStore.ts`, `utils/runListProjection.ts`, `composables/useRunList{Disclosure,ArchiveOlder}.ts`. `runTreeLiveStatusMerge.ts` exports `mergeHistoryRowWithContext`. `runHistoryReadModel.ts` exports `localRunSummary` and `runStatusOf` | Done. The trees' sort is untouched: 378's change, which stopped live contexts setting `lastActivityAt`, was not ported into the shared merge, and the tree specs pass unchanged. A Team row uses its history item's `lastActivityAt`. A Team not yet in the history falls back to the node's own time (deviation note 2) |
| DS-004 (REQ-009, REQ-011, AC-012, AC-014, VIS-001/005/014/015/016/017) | Workspaces: `hasListedRun`; filter before indexes; a patch into a dropped folder rebuilds. Projects: `projectHasListedRun`, `projectCount`. Text-only empty states | `stores/runHistoryNavigationProjection.ts` (`hasListedRun`, filter after the Org groups and team rows, before `runIndexById` and the ancestries). `runHistoryNavigationPatches.ts` returns `{rebuild: true}` for a non-ACTIVITY effect on a standalone run that is not indexed. `runHistoryNavigationStoreActions.ts` then calls `refreshRunNavigationTopologyForStore(store, 'run-outside-listed-folders')`. `stores/projectRunsProjection.ts` (`projectHasListedRun`, `projectCount`). `ProjectsRunsTree.vue` (`projects-tree-empty`, `projects-tree-no-runs`). Host: `workspaces-tree-empty`. `composables/useWorkspaceHistoryTreeState.ts` prunes the expansion of folders that leave its list (watcher) | Done. `buildRunHistoryTreeNodes` and `runTreeProjection` are untouched, and the Projects projection builds from `buildRunHistoryTreeNodes` directly, so the Workspaces rule cannot reach the Projects view. Its existing specs pass with only `projectHasListedRun` changes |
| DS-005 (REQ-008) | Server `lastActivityAt` per Agent, Team and Org item: the newest memory mtime over the root and its located agents, else `createdAt`; an unreadable tree keeps the root's time | New `src/run-history/services/run-last-activity-reader.ts` (`forAgentRun`, `forTeamRun`, Org). Used by `agent-run-history-service.ts` `toHistoryItem`, `team-run-history-service.ts` and `collaboration-root-history-service.ts` (`last_activity_at`). Exposed by the GraphQL types. Web queries and `runHistoryStoreSupport.ts` parse it; `generated/graphql.ts` regenerated | Done. Location services are created lazily, because their constructors call `AgentTeamRunManager.getInstance()`. A per-folder read that throws is skipped with the warning `RUN_LAST_ACTIVITY_MEMORY_UNREADABLE`. Nothing is cached or written |
| DS-006 (REQ-002, REQ-004, AC-002, AC-005, VIS-007…010) | Chooser Remove on user folders, never on Temp; 28px; hover or focus at `md` and up, always shown below `md`; danger confirmation; refusal toast; the chip falls back to Temp | `components/chat/ChatWorkspaceMenu.vue` (row `group/folder-row`; button `h-7 w-7 self-center mr-2`, `md:opacity-0`; `ConfirmationModal` danger). `composables/useWorkspaceHistoryWorkspaceRemoval.ts` became the chooser's: `RemovableWorkspace`, `pruneWorkspaceHistory` only, `onRemoved`, `workspaceFolders.*` copy with escaping. Server guard message: `src/workspaces/workspace-removal-guard.ts` | Done. The guard text is now REQ-004's "Stop active runs before removing this workspace." (deviation note 1) |
| DS-007 | `runHistoryStore.archiveRuns({agentRunIds, teamRunIds, orgRunIds})` on record-level cores | `stores/runHistoryMutationActions.ts` (`archiveRunRecord` split, `RunArchiveTargets`, `archiveRunsInHistoryStore`), `runHistoryStore.archiveRuns` | Done. "Archive all older" is all-or-nothing (`useRunListArchiveOlder` spec) |
| Removal Plan (REQ-007, REQ-010, AC-010, AC-013) | No folder X, no add form, no "New Project", no `RunSectionSwitch`; SR-003 code gone | Deleted `RunSectionSwitch.vue`, `useWorkspaceHistoryWorkspaceCreation.ts`. Removed `canRemoveFromWorkspaces` (read model, `runTreeProjection`), the X and the unreachable no-runs rows (`WorkspaceHistoryWorkspaceSection.vue`, `ProjectHistorySection.vue`), `isWorkspaceRemoving` and `onRemoveWorkspace` (section contracts), dead store actions `createWorkspace` and `refreshWorkspaceHistoryQuietly`, `setWorkspaceExpandedByRootPath`, obsolete strings. SR-003 reverted by `e07896a22b` | Done. Host 491 → 390 effective lines |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. 378's `app.vue` load move and its removals were not ported. The phone keeps 5. The trees' rows and actions are unchanged apart from the X.

Deviations and notes:

1. **The guard message.** `workspace-removal-guard.ts` used to word the refusal differently. REQ-004 fixes the copy, so the server now says "Stop active runs before removing this workspace.", and the toast shows that message. The guard test and `docs/modules/workspaces.md` were updated.
2. **Team rows in the Runs view.** A Team row's time is its history item's `lastActivityAt`. A Team context that is not yet in the history (just launched) uses its node's own time, the counterpart of the agent `local` rule.
3. **The run list keeps its own contract.** `RunListSectionState` and `RunListSectionActions` stay separate from the tree's `WorkspaceHistorySectionState`, as in 378. The views share no props.
4. **Probe adjustments.** `projects-left-navigation-probe.mjs` PLN-02 now starts a Project's first run from the chat chip, because the run section no longer has "New Project" or add actions. Its view switching goes through the menu. PLN-01 checks the no-runs state, and PLN-10 the menu keyboard. In `agy-process-restart-focus-continuation-probe.mjs`, the add-form fallback was removed.

## Key Files Or Areas

- Server: `autobyteus-server-ts/src/run-history/services/run-last-activity-reader.ts`, `agent-run-history-service.ts`, `team-run-history-service.ts`, `collaboration-root-history-service.ts`, `workspace-run-history-service.ts`, `api/graphql/types/run-history.ts`, `api/graphql/types/collaboration-root-history.ts`, `workspaces/workspace-removal-guard.ts`.
- Web host and header: `components/workspace/history/WorkspaceAgentRunsTreePanel.vue`, `RunSectionHeader.vue`, `stores/runSectionModeStore.ts`, `components/layout/LeftSidebarStrip.vue`.
- Runs view: `components/runList/*`, `stores/runListStore.ts`, `utils/runListProjection.ts`, `composables/useRunList*.ts`.
- Window: `stores/runHistoryStore.ts`, `runHistoryLoadActions.ts`, `runHistoryWorkspaceHistoryActions.ts`, `runHistoryRetiredRuns.ts`, `composables/useMobileWorkCatalog.ts`.
- Rules: `stores/runHistoryNavigationProjection.ts`, `runHistoryNavigationPatches.ts`, `runHistoryNavigationStoreActions.ts`, `projectRunsProjection.ts`, `composables/useWorkspaceHistoryTreeState.ts`.
- Chooser: `components/chat/ChatWorkspaceMenu.vue`, `composables/useWorkspaceHistoryWorkspaceRemoval.ts`.
- Localization: `localization/messages/{en,zh-CN}/workspaceFolders.ts`, `shell.ts`, `projects.ts`.
- Docs: `autobyteus-web/docs/{workspace_layout,projects,chat,file_explorer}.md`, `GLOSSARY.md`, server `docs/modules/{run_history,workspaces}.md`.

## Important Assumptions

- The phone and the desktop are separate pages (`pages/mobile.vue` vs `AppLeftPanel`, per ARCH-REV-003). Each sets the window before its own read. The spec covers the phone setting 5 whatever the desktop set.
- The read model's tree rows carry `source` (`'history'`, `'local'` or `'draft'`), and an unsent New chat draft is `'draft'`. `hasListedRun` relies on that (`runHistoryNavigationProjection.ts:166`).
## Known Risks

- **Read cost.** The uncapped read with `lastActivityAt` stats memory files for every non-archived run on each 5 s poll while the Runs view is shown. The 250 ms budget on shaped data was not measured here (the design assigns it to API/E2E). If the read is over budget, that is an escalation trigger, not a silent cap.
- **Icons load online.** The app's `@iconify/vue` icons are fetched from the Iconify API the first time a browser context uses them, and drawn empty until then. This is today's app-wide behavior, not changed here. It showed up once in the rendered check as a menu without the `queue-list` and check icons (see the rendered check).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: a behavior change approved by the user, with removal and reuse.
- Reviewed root-cause classification: the section host owned three concerns and was near the limit. 378's reviewed Runs code exists against the same base.
- Reviewed refactor decision: `Refactor Needed Now` (bounded).
- Implementation matched the reviewed assessment: `Yes`.
  - The header is its own component.
  - The Runs view is its own tree.
  - The host lost the switch, the add form and the X modal: 491 → 390 effective lines.
  - The rename is FU-003.
- If challenged, routed as `Design Impact`: `N/A`.
- Evidence / notes: the effective non-empty line counts above, measured at base `3ef5e33eec` and at `0d3c31c4ae`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. `limitPerAgent` keeps its default of 6. `null` is a new value; nothing maps old shapes.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`:
  - store actions: `createWorkspace`, `refreshWorkspaceHistoryQuietly`;
  - the tree state's `setWorkspaceExpandedByRootPath`;
  - `canRemoveFromWorkspaces`;
  - the unreachable no-runs rows;
  - obsolete localization keys;
  - the dead host-spec mocks.
- Dead code found elsewhere, added to `follow-ups.md`: None. FU-001 (`createAgentRun`) was already recorded by the Solution Designer.
- Shared structures remain tight: `Yes`. The run list keeps its own section contract. `RemovableWorkspace` is a three-field type for the chooser.
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`.
  - No changed non-test source file is over 500 effective non-empty lines.
  - The largest are `runHistoryStore.ts` (498 → 491), `useWorkspaceHistoryTreeState.ts` (453 → 454) and `ChatWorkspaceMenu.vue` (356 → 406).
  - Deltas over 220 lines: `RunListPanel.vue` (+296) and `RunListRow.vue` (+255). Both are new files ported as reviewed in 378. Each owns one concern (the list with its fold and disclosure; one row), so no split.
- Notes: an earlier draft of this round recorded FU-004 for `runHistoryStore.ts` and `useWorkspaceHistoryTreeState.ts` as over 500. That used raw `wc -l`, not effective lines. By the rule's measure neither is over, so FU-004 was dropped before commit.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: design-spec.md "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
  - `lastActivityAt` is derived at read time; nothing is written.
  - The mode key gains the value `runs`, and an unknown value reads as `workspaces`.
  - The SR-003 code never shipped.
- Direct-use evidence: `runSectionModeStore` spec (unknown value → `workspaces`). The server reader tests cover runs without memory files (`createdAt`).
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- All suites ran under TESTING.md isolation: `env -i PATH="$PATH" HOME="<fresh mktemp dir>" TMPDIR="$TMPDIR"`, one heavy run at a time.
- The rendered check uses an owned temp data root, free ports and the repository's scripted AGY CLI (no inference, no provider keys). It never uses `~/.autobyteus`.
- Untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are build outputs from the server build and are not part of the ticket.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/evidence/implementation/`. Each `.log` starts with a header: check, command, commit, environment, date.

Environment for all: macOS 26.5.2, Node v22.23.1, pnpm 10.28 (corepack), TESTING.md isolation.

| Check ID | Command Or Steps | Commit Tested | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `cd autobyteus-server-ts && pnpm test:unit` | `0d3c31c4ae` | Whole server unit suite, incl. `run-history-window-schema`, `run-last-activity-reader`, `agent-run-history-service`, `team-run-history-service`, `collaboration-root-history-public-projection`, `project-run-history-service`, `workspace-removal-guard` | DS-002, DS-005, DS-006 (REQ-004) | Pass | `IMP-01-server-unit.log`, `IMP-01-server-unit.full.log.gz` | `Test Files  928 passed \| 5 skipped (933)` and `Tests  7900 passed \| 9 skipped (7909)` |
| IMP-02 | `cd autobyteus-server-ts && node ./scripts/typecheck.mjs` | `0d3c31c4ae` | Server src and tests | DS-002, DS-005 | Pass | `IMP-02-server-typecheck.log` | `production errors: 0; test-file errors: 1184 in 366 files (baseline 1184 in 366 files)` and `[typecheck] PASS` |
| IMP-03 | `cd autobyteus-web && node ./scripts/codegen-local.mjs --check` | `0d3c31c4ae` | Server schema → `autobyteus-web/generated/graphql.ts` | DS-002, DS-005 | Pass | `IMP-03-codegen-check.log` | `autobyteus-web/generated/graphql.ts is current.` |
| IMP-04 | `cd autobyteus-web && pnpm typecheck` | `0d3c31c4ae` | Nuxt app, Electron main, build scripts, cross-package tests | all web | Pass | `IMP-04-web-typecheck.log` | `production errors: 0; test-file errors: 99 in 43 files (baseline 99 in 43 files)` and `[typecheck] PASS` |
| IMP-05 | `cd autobyteus-web && pnpm -s guard:web-boundary; pnpm -s guard:localization-boundary; pnpm -s audit:localization-literals` | The worktree committed as `0d3c31c4ae`. After the run, only docs, probes and two specs changed | Web import boundaries, localization keys and literals | DS-001, DS-006, REQ-011 copy | Pass | `IMP-05-web-guards.log` | `[guard:web-boundary] Passed.`, `[guard:localization-boundary] Passed.`, `Passed with zero unresolved findings.` |
| IMP-06 | `cd autobyteus-web && NUXT_TEST=true pnpm exec vitest run` | The worktree committed as `0d3c31c4ae`, before that commit's two spec fixes (IMP-07). After the run, only docs, probes and those two specs changed | Whole web unit suite, incl. `RunSectionHeader`, `runHistoryReadWindow`, `runHistoryListedFolders`, `ChatWorkspaceMenu.remove`, `runListStore`, `runListProjection`, `useRunList*`, `RunListPanel`, `RunListRow.org`, `projectRunsProjection`, `useWorkspaceHistoryTreeState`, both host specs | DS-001…DS-007, Removal Plan | Pass after IMP-07: 2 failed, 5148 passed. Both failures were fixtures not yet updated for `lastActivityAt` | `IMP-06-web-suite.log`, `IMP-06-web-suite.full.log.gz` | `Tests  2 failed \| 5148 passed \| 2 skipped (5152)`. The two `FAIL` lines: `runHistoryQueries.spec.ts` (`not to contain 'lastActivityAt'`) and `agentOrgClosure.spec.ts` (`AgentOrg last_activity_at must be a string.`) |
| IMP-07 | `cd autobyteus-web && NUXT_TEST=true pnpm exec vitest run graphql/queries/__tests__/runHistoryQueries.spec.ts services/agentOrgExecution/__tests__/agentOrgClosure.spec.ts` | `0d3c31c4ae` | The two specs from IMP-06, with fixtures fixed | DS-005 | Pass | `IMP-07-web-suite-fixed-specs.log` | `Tests  11 passed (11)` |
| IMP-20 | `node tickets/in-progress/workspace-tree-vs-chooser/evidence/implementation/IMP-20-render-probe.mjs --output-dir .../evidence/implementation/IMP-20`. Real headless Chrome → Nuxt dev from this worktree → the server `dist` built from `0d3c31c4ae`, in an owned temp data root | `0d3c31c4ae` (probe as committed with the evidence) | The rendered run section, menu, views, empty states and chat chooser Remove | VIS-001…VIS-017, AC-002, AC-005, AC-009…AC-014 | Pass (12/12 cases) | `IMP-20-run.log`, `IMP-20-render-probe.mjs`, `IMP-20/IMP-20-evidence.json`, `IMP-20/IMP-20-VIS-0*.png` (17), `IMP-20/backend.log`, `IMP-20/frontend.log` | Every line in `IMP-20-run.log` reads `Pass`, plus `exit=0`. In `IMP-20-VIS-002-menu-open-workspaces.png`: queue-list, folder and briefcase icons, plus the check on Workspaces. In `IMP-20-evidence.json`: `cleanup` shows both owned processes stopped (`SIGTERM`) and the data root removed |

Not run, and why:

- The 250 ms poll-read budget for the uncapped read with `lastActivityAt` on a shaped data set (about 40 agent runs and 200 team runs), and the capped Workspaces read against today's: the design assigns these to API/E2E.
- The full browser probes `autobyteus-web/tests/e2e/projects-left-navigation-probe.mjs` and `agy-process-restart-focus-continuation-probe.mjs`: they were updated for the removed switch and add form, but not run here. They need the full stack and are API/E2E's.
- "A folder leaves after its last run is archived" and "Remove from the chooser" against a live stack, as API/E2E scenarios. The leaving case is covered at unit level. The Remove happy path and refusal were exercised in IMP-20, but only as a rendered self-check.

## Frontend Rendered-Result Check (When Applicable)

- **Affected surfaces / journeys:**
  - the left panel's run section: header, menu, the three views and their empty states;
  - the left strip's label;
  - the narrow drawer;
  - the chat chooser's Remove: hover, confirmation, success and refusal.
- **Approved references:**
  - `product-design-request.md`, UXJ-001 and UXJ-002;
  - VIS-001…VIS-017;
  - the 378 spec's run-list rows for the Runs view.
- **Existing design system reviewed:**
  - `ConfirmationModal` (danger);
  - the chooser's row style;
  - the tree rows;
  - `@iconify/vue` heroicons, as in the rest of the left panel;
  - the existing menu patterns, for `menuitemradio` and focus.
- **Testing guideline and rendered surface:** TESTING.md. Nuxt dev from this worktree against the built server, in headless Chrome, driven by the ticket-owned probe `IMP-20-render-probe.mjs`.
- **States, layouts, viewports and interactions inspected:**
  - At 1440×900:
    - Workspaces default, with and without runs (VIS-001, VIS-014);
    - the menu open on each view (VIS-002, 004, 006);
    - the Runs view (VIS-003);
    - Projects with a run, with none and with no Projects (VIS-005, 015, 016);
    - keyboard focus ring, arrows and Escape (VIS-011);
    - zh-CN (VIS-012);
    - chooser Remove on hover, the confirmation, removed, and refused (VIS-007…010);
    - a draft-only folder appearing with its first sent message (VIS-017).
  - At 600×800: the drawer with the menu (VIS-013).
- **Issues found and corrected:**
  - The first and second runs showed the VIS-002 menu without the `queue-list` icon and the check mark.
    - Cause: `@iconify/vue` 5 renders an empty `<svg>` until an icon's data arrives from the Iconify API. `queue-list` and `check-20-solid` are first used in that browser context when the menu opens, while `folder` and `briefcase` were already loaded by the tree and the nav. VIS-004 and VIS-006, opened after a view change, showed every icon.
    - Not a product defect, because icons load this way across the app. The probe now waits until every menu svg has content. The third run shows all icons.
  - VIS-010's first run flagged the store's expected `console.error("Error removing workspace: …Stop active runs…")` as a browser error. The product behavior was correct. The probe now accepts that one line in VIS-010 only.
- **Remaining limitations:**
  - Screenshots and inspection are from headless Chrome on macOS, not the Electron shell.
  - The phone page was not rendered; its window is unit-tested.

## Downstream Coverage Hints / Suggested Scenarios

- Switch Runs → Workspaces → Runs on a data set with more than 6 runs per agent. The Runs view shows "Show older (N)" with the full count. Workspaces reads 6. No run disappears from Runs after a round trip (shrink reconcile).
- A draft-only folder appears in the Workspaces view when its first message is sent, and leaves when its last run is archived ("Archive all older" in Runs, or a per-row archive).
- A team-only folder and an Org-only folder are listed in Workspaces.
- Remove from the chooser while that folder is the chip's choice: the chip shows Temp workspace. Remove with a running run: the toast reads "Stop active runs before removing this workspace." and the registry is unchanged.
- The `limitPerAgent: null` GraphQL read on both `listWorkspaceRunHistory` and `workspaceRunHistory`, with `lastActivityAt` on Agent, Team and Org items, plus Org `last_activity_at`.
- The read budget (below).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The 250 ms poll-read budget, design-spec "Tests → API/E2E" and "Risks": the uncapped read with `lastActivityAt` on a shaped isolated data set (about 40 agent runs and 200 team runs, 378 E-013) with the Runs view shown, and the capped Workspaces read compared with today's. Over budget is an escalation trigger.
- Running the updated probes `projects-left-navigation-probe.mjs` (PLN-01, PLN-02 via the chat chip, PLN-10, zh-CN and narrow) and `agy-process-restart-focus-continuation-probe.mjs`.
- The design's API/E2E scenarios: a folder appears with its first sent message and leaves after its last run is archived; Remove from the chooser.
