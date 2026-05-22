# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Simplify the phone/mobile run workspace experience by removing redundant mobile-only labels, explanatory copy, and controls that consume vertical space or make the UI feel more complex than desktop/web. The cleanup should keep the existing mobile work-shell capabilities, but make the visible phone UI denser, calmer, and less patronizing.

The user's key product intent is: if desktop/web does not need a control or explanatory label, mobile should not invent that extra complexity unless there is a clear phone-specific reason.

## Investigation Findings

- `MobileWorkShell.vue` owns the paired-phone work shell header, task surface, and persistent five-tab bottom navigation (`Chat`, `Runs`, `Files`, `Tools`, `Activity`). The bottom nav is not an overlay; it is a fixed flex child below the active tab content. It still visually competes with the chat composer because both sit at the bottom of the screen.
- `MobileTeamMemberFocusBar.vue` uses the generic `MobileLaunchTargetPicker.vue` with `showLabel=false`. The picker renders the selected member name plus a large text button (`Change` / `Choose`), which matches the screenshot and makes the focused-member card taller/heavier.
- `MobileLaunchTargetPicker.vue` is also used by the new-run setup for Agent/Team/Workspace selection. A focused-member chevron treatment should therefore be added as an explicit picker variant/prop rather than globally replacing all picker buttons.
- `MobileActivity.vue` renders a mobile-only header: blue `Activity`, `Task and team updates`, and explanatory copy “Right-panel information becomes cards and sheets on phone.” This copy is redundant once the Activity tab is selected.
- `MobileActivityDigest.vue` renders primary digest filters (`Tasks`, `Messages`, `Tools`) plus secondary `Issue filters` that reveal `Errors` and `Approvals`. Desktop/web does not expose an equivalent Issue filters control in the analogous right-panel Activity/Progress surface: `ProgressPanel.vue` renders `TodoListPanel` and `ActivityFeed`, while `ActivityFeed.vue` renders activity rows without Errors/Approvals filter chips/buttons.
- `MobileFiles.vue` renders blue `Files` in the header and blue `Current folder` / `Workspace-wide search` in the sticky folder context. These are redundant with the selected bottom tab, workspace title/path, search placeholder, and folder list.
- `MobileRuns.vue` renders blue `Runs` plus `Active and recent runs`; this stacks page/category text and a long heading where a concise heading is enough.
- `MobileRunSetup.vue` renders a redundant top text block (`Start new work` plus a sentence explaining the obvious selectors). `MobileLaunchRuntimeModelCard.vue` adds more helper text (“Pick the runtime and model...”), and `RuntimeModelConfigFields.vue` can also render help text passed from the mobile card.
- Existing focused tests in `MobileUxRefinement.spec.ts` currently assert the old “issue filters behind secondary control” behavior and verbose run setup helper copy. Those tests must be updated to assert the cleaner target behavior.
- Prior ticket `tickets/done/mobile-functionality-parity` intentionally moved Errors/Approvals behind `Issue filters` as an earlier simplification. This request supersedes that earlier compromise because desktop still has no equivalent issue-filter UI and the user is explicitly prioritizing cleanliness.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Cleanup
- Initial design issue signal (`Yes`/`No`/`Unclear`): No broad design issue found; this is localized mobile presentation cleanup.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found, with small legacy/cleanup pressure from previously retained mobile-only Issue filters and explanatory copy.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: Each affected concern already has a clear mobile owner (`MobileWorkShell`, `MobileTeamMemberFocusBar`, `MobileLaunchTargetPicker`, `MobileActivity`, `MobileActivityDigest`, `MobileFiles`, `MobileRuns`, `MobileRunSetup`, `MobileLaunchRuntimeModelCard`). Desktop parity check confirms Issue filters are mobile-only.
- Requirement or scope impact: Implement in existing mobile presentation files with targeted test updates; do not change backend APIs or desktop layout.

## Recommendations

1. Replace the focused team member `Change` button with a compact chevron/dropdown affordance in the focus bar only. Preserve an accessible label such as `Change message target`.
2. Remove mobile Activity `Issue filters`, `Errors`, and `Approvals` filter controls because desktop/web does not expose equivalent controls. Keep status/error visibility inside normal tool/activity rows.
3. Remove redundant page/category headers from mobile Files, Activity, and Runs. Keep concrete identity text that helps orientation, such as workspace name/path or current folder path, but do not prefix it with blue section labels.
4. Remove redundant new-run helper copy. Keep field labels, concise validation/blocking messages, and concise empty states; remove instructional filler that repeats labels.
5. Keep the bottom navigation in this change, but make it visually quieter and shorter rather than relocating it. The user explicitly approved the requirements with the clarification that the navigation control should be made a bit shorter. Moving the five primary controls into a top header or drawer would be a larger navigation redesign and risks hurting one-handed navigation/discoverability. The cleaner low-risk response is to reduce its vertical footprint and ensure it does not obscure content.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-MUX-001: Mobile user views a team run and changes the focused/message-target team member through a compact affordance.
- UC-MUX-002: Mobile user opens Activity and sees tasks/messages/tools without redundant page headers, explanatory copy, or mobile-only issue filters.
- UC-MUX-003: Mobile user opens Files and browses/filters the current workspace folder without redundant blue section labels.
- UC-MUX-004: Mobile user opens Runs and sees active/recent run state with concise copy.
- UC-MUX-005: Mobile user starts a new run and configures agent/team, workspace, runtime, and model without redundant helper paragraphs.
- UC-MUX-006: Mobile user switches between Chat, Runs, Files, Tools, and Activity using a bottom control surface that is less visually heavy and does not obscure the active content.

## Out of Scope

- Backend run, file, tool, activity, or team-member APIs.
- Desktop/web layout redesign.
- Adding desktop issue filters.
- Introducing new issue-filter/search functionality.
- Replacing the mobile bottom navigation with a new top-level navigation model; only low-risk visual/spacing refinement is in scope.
- Removing concise empty-state, error, validation, or accessibility text that is required for user action or screen readers.

## Functional Requirements

- REQ-MUX-001: On phone/mobile layouts, the focused team member control must replace the large visible `Change` / `Choose` text button with a compact symbolic dropdown affordance, preferably a chevron, while retaining member-change behavior.
- REQ-MUX-002: On phone/mobile layouts, Activity must remove mobile-only `Issue filters`, `Errors`, and `Approvals` filter controls because desktop/web does not expose equivalent issue filters.
- REQ-MUX-003: On phone/mobile layouts, Activity must remove redundant header copy including the blue `Activity` label, `Task and team updates`, and explanatory text about right-panel information becoming cards/sheets.
- REQ-MUX-004: On phone/mobile layouts, Files must remove redundant blue section labels such as `Files`, `Current folder`, and `Workspace-wide search` while preserving useful workspace/folder identity and file browsing/search.
- REQ-MUX-005: On phone/mobile layouts, Runs must remove redundant blue `Runs` labeling and use concise headings such as `Active runs` or `New run` instead of stacked/long labels such as `Active and recent runs`.
- REQ-MUX-006: On phone/mobile layouts, new-run setup must remove redundant helper/explanatory copy where field labels already communicate the action, including `Start new work`, the `Choose a team/agent, workspace, and runtime/model...` sentences, and runtime/model helper copy from the mobile card.
- REQ-MUX-007: Mobile bottom navigation must remain available for the five primary task surfaces in this change, but its visual treatment must be quieter and a bit shorter so it feels less competitive with the chat composer and content.
- REQ-MUX-008: All visible-label removals must preserve accessibility through explicit aria labels, button titles, or screen-reader-only text where the visual affordance becomes symbolic.
- REQ-MUX-009: Desktop/web behavior must remain unchanged unless an implementation detail is shared and the shared copy/control is proven redundant for both mobile and desktop.

## Acceptance Criteria

- AC-MUX-001: In a phone-width team-run Chat/Files/Activity view, the focused team member row no longer shows a large visible `Change` text button; it shows a compact chevron/dropdown affordance with a usable touch target and accessible name.
- AC-MUX-002: In a phone-width Activity tab, there is no `Issue filters` button and no `Errors` / `Approvals` filter controls.
- AC-MUX-003: In a phone-width Activity tab, the blue `Activity` label, `Task and team updates`, and the “Right-panel information...” explanatory sentence are absent.
- AC-MUX-004: In a phone-width Files tab, blue `Files`, `Current folder`, and `Workspace-wide search` section labels are absent; users can still identify the workspace/current folder and use search/filter/navigation.
- AC-MUX-005: In a phone-width Runs tab, redundant `Runs` + `Active and recent runs` stacking is absent; the visible heading is concise (`Active runs` or `New run`, as appropriate).
- AC-MUX-006: In the phone-width new-run flow, redundant helper paragraphs are absent while Agent/Team, Workspace, Runtime, and Model fields remain visible and usable.
- AC-MUX-007: The bottom task navigation remains present, but its active/inactive styling is quieter and its vertical footprint is shorter than the screenshot baseline; it does not obscure the chat composer, file list, terminal/VNC panel, activity cards, or run setup.
- AC-MUX-008: Screen-reader-accessible names remain for symbolic controls and for the bottom task navigation.
- AC-MUX-009: Existing desktop Activity/Progress, right-panel tabs, file explorer, and run config behavior are unchanged.
- AC-MUX-010: Updated mobile component tests assert the removal of Issue filters and redundant helper/header copy; obsolete tests that expected Issue filters/helper copy are updated or removed.

## Constraints / Dependencies

- Must preserve existing route/state semantics for mobile context selection, team-member focus, activity digest tabs, run creation, file browsing, tools, and chat.
- Must not remove row-level status/error/approval information from tool/activity rows; only the mobile-only filter controls are removed.
- Must not remove actionable validation/blocking messages from run setup.
- Must preserve assistive-technology labels when visual text is removed.
- Must avoid importing desktop right-panel layout shells into the dedicated phone shell.

## Assumptions

- The screenshots represent current behavior on the latest `origin/personal` base branch.
- The product direction favors clean, dense mobile UI over explanatory onboarding copy for these repeated task surfaces.
- The five bottom task surfaces are still primary mobile navigation; a complete relocation requires separate UX approval/design.

## Risks / Open Questions

- The compact chevron picker variant must not accidentally affect Agent/Team/Workspace pickers in the new-run form unless explicitly intended.
- Removing Issue filters may reduce a quick path to error/approval rows, but desktop parity and user feedback favor removal; rows themselves remain visible under Tools/activity history.
- Bottom navigation may still feel strange to the user even after visual quieting; a later dedicated navigation redesign may be needed if compact styling is insufficient.

## Requirement-To-Use-Case Coverage

- REQ-MUX-001 and REQ-MUX-008 cover UC-MUX-001.
- REQ-MUX-002, REQ-MUX-003, and REQ-MUX-008 cover UC-MUX-002.
- REQ-MUX-004 and REQ-MUX-008 cover UC-MUX-003.
- REQ-MUX-005 covers UC-MUX-004.
- REQ-MUX-006 covers UC-MUX-005.
- REQ-MUX-007 and REQ-MUX-008 cover UC-MUX-006.
- REQ-MUX-009 covers desktop non-regression across all use cases.

## Acceptance-Criteria-To-Scenario Intent

- AC-MUX-001 validates focused team member switching.
- AC-MUX-002 and AC-MUX-003 validate Activity cleanup.
- AC-MUX-004 validates Files cleanup.
- AC-MUX-005 validates Runs cleanup.
- AC-MUX-006 validates new-run cleanup.
- AC-MUX-007 validates bottom navigation refinement.
- AC-MUX-008 validates accessibility preservation.
- AC-MUX-009 validates desktop non-regression.
- AC-MUX-010 validates durable test coverage changes.

## Approval Status

Approved by user on 2026-05-22. User clarification: make the bottom navigation/button control a bit shorter.
