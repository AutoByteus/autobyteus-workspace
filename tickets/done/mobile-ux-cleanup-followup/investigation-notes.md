# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Code/parity investigation complete; requirements approved by user; design production in progress.
- Investigation Goal: Identify the current mobile UI owners for focused team member switching, Activity filters/copy, Files/Runs headings, new-run helper text, and bottom navigation; verify desktop/web parity for Activity issue filters.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Multiple mobile panels/surfaces are affected, but the work is frontend presentation cleanup with no expected backend API changes.
- Scope Summary: Simplify phone/mobile workspace surfaces by removing redundant labels/copy and mobile-only issue filters, reducing focused-member/bottom-nav visual weight, and preserving behavior/accessibility.
- Primary Questions To Resolve:
  - Which files render the mobile run workspace shell and bottom tabs? Resolved: `MobileWorkShell.vue`.
  - Which file owns the focused team member control and member-change trigger? Resolved: `MobileTeamMemberFocusBar.vue` uses `MobileLaunchTargetPicker.vue`; focus state/action comes from `useMobileTeamMemberFocusCoordinator.ts`.
  - Does desktop/web currently expose issue filters in the analogous Activity surface? Resolved: No. Desktop `ProgressPanel.vue` / `ActivityFeed.vue` has no issue-filter controls.
  - Are Files/Runs/Activity headings shared with desktop or mobile-only? Resolved: The flagged labels/copy are in dedicated `components/mobile/*` files.
  - Where is the new-run form helper copy defined? Resolved: `MobileRunSetup.vue`, `MobileLaunchRuntimeModelCard.vue`, and helper props passed into `RuntimeModelConfigFields.vue`.
  - Is bottom nav placement a simple styling question or a deeper navigation-shell design question? Resolved: current low-risk scope should keep bottom nav and reduce visual weight; relocation would be a broader navigation redesign.

## Request Context

The user supplied phone screenshots and requested mobile simplification. Key observations from the request:

- The focused team member row currently displays a large text `Change` button next to a smaller member name; the button makes the container tall/heavy. The user suggested a chevron/dropdown symbol instead.
- The user questions why mobile Activity has `Issue filters` / issue-state filters (errors, approvals, etc.) and wants them removed if desktop/web does not have the same feature.
- The persistent five-control bottom navigation (`Chat`, `Runs`, `Files`, `Tools`, `Activity`) feels strange around the chat area; the user asked whether a better placement exists.
- Files shows redundant blue text labels (`FILES`, `CURRENT FOLDER`) and folder heading text that consume vertical space.
- Activity shows redundant `ACTIVITY`, `Task and team updates`, and explanatory copy about right panels becoming cards/sheets on phone.
- Runs shows redundant `Runs` and longer text like `Active and recent runs`; the user prefers concise labels such as `Active runs`.
- New-run setup contains too much explanatory copy, e.g. “Start a new work”, “Choose a team workspace and runtime model...”, “Pick the runtime and model the team will run”; the user wants field labels to carry meaning without patronizing helper copy.

Reference screenshots are available at:
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_b6ba2d50/solution_designer_db1c6f45d942acd6/context_files/ctx_1eef978de1e3__c90ebf120b2d2759e9a085c2301b20b4.jpg`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_b6ba2d50/solution_designer_db1c6f45d942acd6/context_files/ctx_34cfe74f08ac__82712e21c7c87151c6a0e4bfd3b8a73b.jpg`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_b6ba2d50/solution_designer_db1c6f45d942acd6/context_files/ctx_8e3b748e41b0__57ff2b31a8e18e9913ccd2cd56e42fee.jpg`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_b6ba2d50/solution_designer_db1c6f45d942acd6/context_files/ctx_feaa2ddc3ab1__17f12060feb7cc25fe80b015bb565772.jpg`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-ux-cleanup-followup`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/mobile-ux-cleanup-followup`
- Current Branch: `codex/mobile-ux-cleanup-followup`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-ux-cleanup-followup`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-22 before branch creation.
- Task Branch: `codex/mobile-ux-cleanup-followup`, created from `origin/personal` at `a7a3b367`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: A stale previous branch/worktree named `codex/mobile-ux-simplification` / `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-ux-simplification` was found and appears already merged into `origin/personal`; this follow-up task uses a new branch from latest base.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-22 | Command | `pwd; git rev-parse --show-toplevel; git status --short --branch; git remote -v; git branch --show-current; git symbolic-ref refs/remotes/origin/HEAD` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap environment and base branch discovery | Repo root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; current shared checkout was `personal` tracking `origin/personal`; untracked file existed in shared checkout, so dedicated worktree was required. | No |
| 2026-05-22 | Command | `git fetch origin --prune` | Refresh tracked remote refs before worktree creation | Fetch completed successfully. | No |
| 2026-05-22 | Command | `git worktree list --porcelain`; `git ls-remote --heads origin codex/mobile-ux-simplification` | Check for existing matching task worktree/branch | Existing remote branch `codex/mobile-ux-simplification` existed but is stale/previous work and already merged into `origin/personal`; not reused for this follow-up task. | No |
| 2026-05-22 | Setup | `git worktree add -b codex/mobile-ux-cleanup-followup /Users/normy/autobyteus_org/autobyteus-worktrees/mobile-ux-cleanup-followup origin/personal` | Create dedicated ticket branch/worktree | Created branch/worktree from latest `origin/personal` at `a7a3b367`. | No |
| 2026-05-22 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required shared design read | Design must be spine/ownership-led; for this task the affected mobile presentation owners are already clear and likely require local changes rather than a broad refactor. | No |
| 2026-05-22 | Doc | `solution-designer` templates for requirements, investigation notes, design spec | Required artifact structure | Artifacts must include design-health assessment, stable requirement/acceptance IDs, source log, and concrete file ownership in design. | No |
| 2026-05-22 | Code | `autobyteus-web/components/mobile/MobileWorkShell.vue` | Inspect mobile shell and bottom nav owner | Owns top header, task-surface switching, focus bar inclusion, and persistent five-item bottom nav. Bottom nav is a flex child, not overlay. | Design should keep nav ownership local to this file; relocation would be bigger UX change. |
| 2026-05-22 | Code | `autobyteus-web/components/mobile/MobileTeamMemberFocusBar.vue`; `autobyteus-web/components/mobile/MobileLaunchTargetPicker.vue`; `autobyteus-web/composables/mobile/useMobileTeamMemberFocusCoordinator.ts` | Inspect focused member row and change action | Focus bar uses generic picker with `showLabel=false`; picker renders selected label and a text `Change`/`Choose` button. Coordinator already owns focus state/action. | Add focused/compact toggle variant without changing coordinator semantics. |
| 2026-05-22 | Code | `autobyteus-web/components/mobile/MobileActivity.vue`; `autobyteus-web/components/mobile/MobileActivityDigest.vue`; `autobyteus-web/components/mobile/MobileToolActivityList.vue` | Inspect Activity header and filters | `MobileActivity.vue` has redundant mobile-only header/explainer. Digest has primary filters and secondary `Issue filters` revealing Errors/Approvals. Tool rows preserve statuses/errors. | Remove header/explainer and issue-filter controls; keep row-level status. |
| 2026-05-22 | Code | `autobyteus-web/components/progress/ProgressPanel.vue`; `autobyteus-web/components/progress/ActivityFeed.vue`; `autobyteus-web/components/layout/RightSideTabs.vue` | Verify desktop/web parity for issue filters | Desktop right-panel Activity is `ProgressPanel`/`ActivityFeed`, with no `Issue filters`, Errors, or Approvals filter controls. `RightSideTabs` exposes Activity as a tab only. | Confirms mobile issue filters should be removed under user's parity rule. |
| 2026-05-22 | Code | `autobyteus-web/components/mobile/MobileFiles.vue` | Inspect Files redundant labels | Header has blue `Files`; sticky context has blue `Current folder` / `Workspace-wide search`. Search, workspace title/path, current folder text, and breadcrumb already provide context. | Remove blue section labels and preserve browse/search/filter behavior. |
| 2026-05-22 | Code | `autobyteus-web/components/mobile/MobileRuns.vue`; `autobyteus-web/components/mobile/MobileRunSetup.vue`; `autobyteus-web/components/mobile/MobileLaunchRuntimeModelCard.vue`; `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Inspect Runs/new-run helper text | Runs stacks blue `Runs` with `Active and recent runs`; setup has `Start new work` and helper sentence; runtime card and runtime/model fields receive helper text. | Remove redundant copy, keep field labels and validation/blocking messages. |
| 2026-05-22 | Code | `autobyteus-web/components/mobile/__tests__/MobileUxRefinement.spec.ts` | Identify tests affected by cleanup | Existing tests assert setup helper text and Activity secondary issue filters. | Update tests during implementation. |
| 2026-05-22 | Doc | `tickets/done/mobile-functionality-parity/{requirements.md,investigation-notes.md,design-spec.md,implementation-handoff.md,review-report.md,api-e2e-validation-report.md}` | Understand prior mobile UX intent | Prior pass moved Errors/Approvals behind secondary Issue filters as a compromise; this request supersedes it because desktop still has no equivalent and user wants cleaner mobile UI. | Note in design as cleanup/removal, not regression. |
| 2026-05-22 | Command | `rg -n "Issue filters|Approvals|Errors|Active and recent|Start new work|Pick the runtime|Current folder|Files|Activity" autobyteus-web/components ...` | Locate exact strings and owners | Found all flagged strings in dedicated mobile components except generic runtime field help support. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Dedicated paired-phone shell (`MobileRemoteAccessShell.vue`) renders `MobileWorkShell.vue` for work context.
- Current execution flow:
  - Mobile work screen: `MobileRemoteAccessShell.screen === 'work'` -> `MobileWorkShell` receives `currentContext` and `activeTab` from `mobileWorkStore` -> `MobileWorkShell` renders the active mobile tab and bottom nav.
  - Focused member change: `MobileWorkShell` conditionally renders `MobileTeamMemberFocusBar` for team-run contexts except Runs/Tools -> focus bar builds picker items from `useMobileTeamMemberFocusCoordinator` -> `MobileLaunchTargetPicker` opens a search/list sheet -> selecting item calls coordinator `focusMember()` and updates `mobileWorkStore`/team context.
  - Activity: `MobileWorkShell` -> `MobileActivity` header -> `MobileActivityDigest` primary filters and optional issue filters -> `MobileToolActivityList` for tool rows/statuses.
  - Files: `MobileWorkShell` -> `MobileFiles` header/search/filter panel -> sticky folder context -> file list/preview.
  - Runs: `MobileWorkShell` -> `MobileRuns` header/list or `MobileRunSetup` -> `MobileLaunchTargetPicker` for target/workspace -> `MobileLaunchRuntimeModelCard` -> `RuntimeModelConfigFields`.
- Ownership or boundary observations:
  - Mobile presentation files own the redundant visual copy and controls.
  - Domain/session ownership remains in existing stores/composables (`mobileWorkStore`, team context stores, activity store, workspace/file explorer stores, run config stores).
  - Desktop Activity parity check does not require any backend/domain change; the filter controls are purely mobile presentation state.
- Current behavior summary: Screenshots accurately reflect latest-base code: mobile shell has a heavy focused-member text button, redundant section labels/copy on Files/Activity/Runs, mobile-only issue filters, verbose run setup helper text, and a persistent five-item bottom nav.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Cleanup
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found, with small legacy cleanup pressure.
- Refactor posture evidence summary: No broad refactor needed. The current mobile owners are coherent and can absorb the cleanup locally. The only small API shape change likely needed is an explicit `MobileLaunchTargetPicker` compact/symbolic toggle variant for the focus bar.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `MobileWorkShell.vue` | One clear owner for mobile tab layout and bottom nav. | Bottom nav cleanup is local to shell presentation. | Design visual treatment; implementation update tests. |
| `MobileLaunchTargetPicker.vue` | Shared picker currently hardcodes visible text toggle. | Add explicit compact variant rather than duplicating picker or globally changing all usages. | Design prop/slot shape. |
| `MobileActivityDigest.vue` vs `ProgressPanel.vue`/`ActivityFeed.vue` | Issue filters are mobile-only; desktop has none. | Remove mobile-only issue filter controls under user's parity rule. | Update affected tests. |
| `MobileFiles.vue`, `MobileActivity.vue`, `MobileRuns.vue`, `MobileRunSetup.vue` | Redundant strings live in mobile-only files. | Local cleanup; no backend/API refactor. | Update copy/tests. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/mobile/MobileRemoteAccessShell.vue` | Paired phone screen orchestration and context switching | Not directly responsible for redundant tab copy; passes active tab/context to work shell | Should remain unchanged except if tests/stubs need updates |
| `autobyteus-web/components/mobile/MobileWorkShell.vue` | Mobile work task shell and bottom nav | Owns persistent `Chat/Runs/Files/Tools/Activity` bottom controls and focus bar placement | Keep task-nav changes here; avoid cross-file nav policy duplication |
| `autobyteus-web/components/mobile/MobileTeamMemberFocusBar.vue` | Team-run focused member presentation | Uses generic picker with `showLabel=false`; no custom compact affordance yet | Use picker compact variant here |
| `autobyteus-web/components/mobile/MobileLaunchTargetPicker.vue` | Searchable picker/card for focus, target, and workspace choices | Hardcodes text `Change`/`Choose` button | Add explicit symbolic/compact toggle mode to avoid changing run setup pickers unintentionally |
| `autobyteus-web/composables/mobile/useMobileTeamMemberFocusCoordinator.ts` | Focusable member rows and focus action | Existing state/action ownership is correct | No behavior change expected |
| `autobyteus-web/components/mobile/MobileActivity.vue` | Mobile Activity page shell | Renders redundant Activity title/explainer | Remove or collapse header; digest owns meaningful controls/content |
| `autobyteus-web/components/mobile/MobileActivityDigest.vue` | Activity digest presentation/filter state | Renders primary filters and secondary Issue filters | Remove issue filter state/UI; retain primary sections and row-level status |
| `autobyteus-web/components/mobile/MobileToolActivityList.vue` | Mobile tool/activity rows | Supports `all/errors/approvals` filter prop | Filter prop may become unnecessary; design can remove or narrow to all-only if no other usage |
| `autobyteus-web/components/progress/ProgressPanel.vue` | Desktop right-panel Progress/Activity container | No issue filter controls | Confirms mobile filters are not desktop parity |
| `autobyteus-web/components/progress/ActivityFeed.vue` | Desktop Activity feed rows | No issue filter controls | Confirms removal path |
| `autobyteus-web/components/mobile/MobileFiles.vue` | Mobile file browse/search/filter/preview | Renders redundant blue labels | Remove labels, keep search/filter/folder identity |
| `autobyteus-web/components/mobile/MobileRuns.vue` | Mobile runs list/setup visibility | Renders redundant blue `Runs` + long heading | Use concise heading only |
| `autobyteus-web/components/mobile/MobileRunSetup.vue` | Mobile new-run form | Renders helper text block and long placeholders | Remove redundant helper block/copy; keep selectors and validation |
| `autobyteus-web/components/mobile/MobileLaunchRuntimeModelCard.vue` | Mobile runtime/model card wrapper | Renders helper copy and passes help text to `RuntimeModelConfigFields` | Remove helper text / pass null help text |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Shared runtime/model fields | Only renders help text when props are provided | No shared change needed if mobile passes null/omits helpers |
| `autobyteus-web/components/mobile/__tests__/MobileUxRefinement.spec.ts` | Mobile UX regression tests | Asserts old Issue filters and helper text | Must update for target cleanup |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-22 | Static code probe | `rg -n "Issue filters|Approvals|Errors" autobyteus-web/components autobyteus-web/pages autobyteus-web/composables autobyteus-web/stores -S` | Issue-filter labels only found in mobile Activity and tests, not desktop Activity/Progress UI. | Remove mobile issue filters. |
| 2026-05-22 | Static code probe | `rg -n "Active and recent|Start new work|Pick the runtime|Current folder|Right-panel" autobyteus-web/components/mobile autobyteus-web/components/launch-config -S` | All flagged redundant text is in mobile presentation components. | Local mobile cleanup. |

## External / Public Source Findings

No external sources used. This task is local product/UI cleanup.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for investigation. Implementation validation should use focused mobile component tests and, if practical, browser/mobile-width verification.
- Required config, feature flags, env vars, or accounts: None for code inspection.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- Desktop parity answer for the user's question: desktop/web does **not** have Activity `Issue filters` / `Errors` / `Approvals` filter controls in the right-panel Activity/Progress surface. The mobile controls should be removed.
- Bottom nav answer: the current bottom nav is structurally safe because it does not overlay content, but the visual footprint is high. User approved the requirements with the clarification to make the navigation/button control a bit shorter. Recommended in-scope action is shorter/quieter visual treatment, not relocation. Relocation should be treated as separate UX redesign because it affects one-handed access and top-header density.
- Focused member answer: a chevron/dropdown is appropriate because the control already opens a picker sheet; the selected member label remains the content, and the button text can become an accessible symbolic affordance.

## Constraints / Dependencies / Compatibility Facts

- Desktop/web Activity and right-panel behavior must be preserved.
- Removing visual labels requires preserving accessible labels for symbolic controls.
- Removing issue filters must not remove status/error/approval details from activity rows.
- New-run validation/blocking messages must remain, because they explain missing required fields rather than repeating visible labels.
- `MobileLaunchTargetPicker` is shared; compact chevron behavior should be opt-in.

## Open Unknowns / Risks

- Exact bottom-nav visual treatment should be chosen by design/implementation (e.g., shorter cells, active pill instead of full-cell fill, labels only where useful). A complete placement change is intentionally out of scope.
- If the user still dislikes any persistent bottom nav after visual reduction, a follow-up navigation model may be needed.
- Removing the `MobileToolActivityList` filter prop may affect tests/types; implementation can either remove it or leave it unused if keeping it is simpler, but no visible issue-filter UI should remain.

## Notes For Architect Reviewer

Requirements were approved by user on 2026-05-22. The design should emphasize local mobile presentation ownership and no broad refactor. The main boundary caution is `MobileLaunchTargetPicker`: add a compact/symbolic mode explicitly for the focus bar rather than making all picker usages icon-only.
