# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Mobile AutoByteus remote access screens contain redundant instructional/section text, duplicate navigation affordances, and a chat layout scroll defect that pushes bottom controls into the middle of the viewport with blank space below. The goal is to simplify the mobile experience so each screen presents only task-relevant information, keeps chat controls anchored predictably, and preserves clear work switching and accessibility without redundant labels.

## Investigation Findings

Code investigation confirms the user-reported symptoms are implemented in the current mobile/web and Android icon code paths:

- `/mobile` mounts `MobileRemoteAccessShell`, which owns the paired/unpaired mobile state and routes to `MobileHome`, `MobileWorkShell`, or troubleshooting without involving the desktop workspace shell.
- `MobileHome.vue` visibly renders `Mobile Home`, `Current node`, `Current work context`, and the large blue `Primary next action` button. The same component already renders recent/current work rows and `Switch work`, so the primary action is duplicate presentation rather than a backend requirement.
- `MobileWorkShell.vue` derives compact header metadata from `mobileWorkContextSubtitle()` in `types/mobileWork.ts`; that helper currently appends `Agent run` / `Team run` to run status labels.
- `MobileActivityDigest.vue` owns Activity filters locally. The aggregate `all` state and `All` filter are frontend-only presentation choices; tasks, messages, tools, errors, and approvals are derived from existing stores and do not require a backend aggregate tab.
- `MobileTools.vue` owns the mobile Terminal/VNC wrapper copy. It renders the `Tools` eyebrow, `Workspace Terminal`, generic workspace/VNC explanatory text, and a default VNC reachability paragraph even when no actionable error/setup condition exists.
- `MobileTeamMemberFocusBar.vue` owns the visible chat target selector for team-run Chat/Files/Activity tabs. It passes `Message target` into `MobileLaunchTargetPicker`, separately renders `Current: ...`, and adds explanatory alignment copy after the target is selected.
- Chat scroll containment depends on the mobile work shell plus shared monitor components: `MobileWorkShell.vue` creates the `h-screen h-[100dvh]` task frame, `MobileChat.vue` mounts `AgentEventMonitor` / `AgentTeamEventMonitor`, and `AgentEventMonitor.vue` lays out `AgentConversationFeed` plus composer. The current frame lacks a strong end-to-end `overflow-hidden` / `min-h-0` invariant at every flex boundary, allowing whole-page scroll behavior on mobile.
- Android launcher resources are local to `autobyteus-android/app/src/main/res`. `ic_launcher_foreground.xml` draws the full logo nearly edge-to-edge in a 108dp adaptive-icon foreground, which can be masked/cropped by launchers. The manifest uses `@mipmap/ic_launcher`; no native runtime logic change is needed.
- Existing mobile unit tests cover the affected components and will need expectation updates. Baseline test execution in the ticket worktree is blocked because `autobyteus-web/node_modules` is absent (`cross-env: command not found`).

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Cleanup / Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, but bounded to mobile presentation and one shared chat monitor layout invariant.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination for repeated labels/duplicate action surfaces; Missing Invariant / Local Implementation Defect for chat scroll containment; Local Implementation Defect for Android adaptive icon safe-area sizing.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Targeted local refactor needed now. No broad backend or desktop architecture refactor is needed.
- Evidence basis: Current code paths in `autobyteus-web/components/mobile/*`, `autobyteus-web/types/mobileWork.ts`, shared monitor components under `autobyteus-web/components/workspace/*`, and Android launcher XML under `autobyteus-android/app/src/main/res`.
- Requirement or scope impact: Implementation should change the existing mobile owners directly, update tests/docs for the new mobile copy contract, and avoid creating duplicate old/new mobile modes or backend protocol changes.

## Recommendations

1. Make the existing mobile shell the compact mobile presentation owner; remove visible redundant labels in place instead of adding a second shell or compatibility mode.
2. Remove the home `Primary next action` card and its now-unused continuation path; rely on current/recent work cards and `Switch work` / `Choose work` actions.
3. Tighten `mobileWorkContextSubtitle()` so run contexts show compact status only, without visible `Agent run` / `Team run` suffixes in mobile headers/current-context cards.
4. Remove Activity's aggregate `All` state and default to one concrete category (`Tasks`), while preserving secondary issue filters for errors/approvals.
5. Keep Tools default copy to selected workspace and tool controls; reserve explanatory text for actionable empty/setup/error states.
6. Simplify team target selection by separating visible compact target display from accessible label semantics; keep `Change` and the searchable member sheet.
7. Enforce chat scroll containment across `MobileWorkShell`, `MobileChat`, `AgentTeamEventMonitor`, `AgentEventMonitor`, and `AgentConversationFeed` so only the transcript scrolls.
8. Rescale Android adaptive icon foreground content into the launcher safe zone instead of changing native shell behavior.
9. Update affected unit tests and add at least one mobile viewport validation path for copy removal and chat scroll behavior.
10. Update remote-access / Android docs to describe the simplified mobile copy contract and Android icon freshness/validation when relevant.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A mobile user opens the AutoByteus remote access home screen and understands connection state/current work without redundant labels.
- UC-002: A mobile user switches to or resumes a recent running/offline agent or team by tapping the relevant work card or switch action.
- UC-003: A mobile user reads and sends chat messages while the input and tab navigation stay anchored and only the conversation scrolls.
- UC-004: A mobile user changes chat message target without reading redundant explanatory target text.
- UC-005: A mobile user inspects tasks, messages, or tool history from Activity without an aggregate `All` view duplicating those categories.
- UC-006: A mobile user opens Terminal/VNC tools without redundant page labels or routine explanatory text taking vertical space.
- UC-007: An Android user sees the complete AutoByteus launcher icon, not a cropped foreground.

## Out of Scope

- Desktop web UX changes except where a shared monitor layout fix is needed and must preserve desktop behavior.
- New mobile navigation categories beyond the existing Chat/Runs/Files/Tools/Activity model.
- Backend run, team, tool, VNC, chat, pairing, credential, or WebSocket protocol changes.
- Full visual redesign, brand/theme overhaul, or typography system replacement.
- Adding new run management capabilities.
- Secure native credential storage or offline/mobile service-worker behavior.

## Functional Requirements

- REQ-001: Mobile home must remove redundant static labels (`Mobile Home`, `Current node`, `Current work context`) while still showing app identity, refresh, connection state, node name/address, and selected/current work when present.
- REQ-002: Mobile home must remove the `Primary next action` card and must not replace it with another duplicate resume card; current/recent work cards remain the mechanism for opening/switching work.
- REQ-003: Mobile work headers/current context metadata must show selected work name and compact status/path/profile information; `Agent run` / `Team run` type labels must not appear in default compact mobile metadata.
- REQ-004: Mobile Activity must remove the aggregate `All` filter/view and expose only distinct category views for tasks, messages, and tools/history. Counts may remain on those category affordances. Secondary issue filters may remain behind the existing issue-filter affordance.
- REQ-005: Mobile Tools/Terminal/VNC must remove redundant section eyebrow labels and routine explanatory copy; contextual help may appear only for actionable empty/error/setup states.
- REQ-006: Mobile Chat must remove redundant target copy (`Message target`, `Current: ...`, and explanatory alignment text) after a target is selected, leaving a compact target display and a clear change action.
- REQ-007: Mobile Chat must constrain scrolling so the transcript/messages area scrolls independently and the composer plus bottom navigation stay anchored to the viewport without producing blank scrollable space beneath them.
- REQ-008: Android launcher icon assets/configuration must be adjusted so the AutoByteus logo is fully visible inside Android adaptive icon safe area on common launchers.
- REQ-009: All removals must preserve accessibility semantics via aria labels, button labels, titles, or visually-hidden text where visible copy is removed from the mobile UI.
- REQ-010: The implementation must preserve existing desktop/web behavior and core store/API behavior. Core stores and backend contracts (`runHistoryStore`, `agentContextsStore`, `agentTeamContextsStore`, `activeContextStore`, GraphQL/REST/WebSocket APIs, and runtime services) must remain functionally unchanged for this ticket; mobile UI may read existing state but must not change core semantics. Any shared UI component touched for mobile layout must be opt-in from mobile or demonstrably behavior-neutral for desktop.
- REQ-011: Implementation must update existing mobile tests/docs that encode the old redundant-copy contract.

## Acceptance Criteria

- AC-001: On mobile home, visual inspection or component tests confirm `Mobile Home`, `CURRENT NODE`, `CURRENT WORK CONTEXT`, and `PRIMARY NEXT ACTION` are absent, while node connection state and current/recent work are still visible.
- AC-002: On mobile home, there is no large blue primary resume/continue card duplicating the first recent/current work item, and selecting a recent work row still opens that work.
- AC-003: On mobile work pages, the header displays work name and compact status/path/profile metadata; `Agent run` and `Team run` text is absent from the compact header/current context metadata.
- AC-004: On mobile Activity, no `All` tab/filter is rendered; users can select Tasks, Messages, and Tools directly, with counts retained when available and issue filters still available when opened.
- AC-005: On mobile Tools, `TOOLS` eyebrow text is absent, Terminal does not show `Workspace Terminal` as a redundant panel label, and default VNC/routine explanatory paragraphs are absent unless they are actionable error/setup guidance.
- AC-006: On mobile Chat with a selected team target, `Message target`, `Current:`, and `Chat messages, Files, and Activity stay aligned...` copy are absent; target name and `Change` remain available.
- AC-007: On mobile Chat, after scrolling through a long conversation, the bottom tab bar remains at the bottom and the composer remains above it; the page cannot be scrolled into a large blank region below the controls.
- AC-008: Automated or manual mobile viewport validation covers at least one narrow viewport comparable to the provided screenshots and verifies the simplified copy and chat scroll behavior.
- AC-009: Android icon assets render with the full logo inside the launcher icon mask in generated/packaged resources or documented preview evidence.
- AC-010: Desktop agent/team monitor smoke checks or tests show no unintended removal of desktop-only labels or layout behavior.
- AC-011: `autobyteus-web/docs/remote_access.md`, Android validation docs, or an explicit no-impact note are updated during docs sync for the compact-copy and icon changes.

## Constraints / Dependencies

- Must work with current mobile web/remote access route and Android wrapper/launcher asset pipeline.
- Must respect safe-area insets and browser/mobile WebView viewport behavior.
- Must avoid introducing compatibility modes or duplicate old/new mobile variants.
- The Android app loads desktop-served `/mobile`; mobile-web rebuild freshness and APK rebuild freshness are separate validation gates.
- The current ticket worktree does not have `autobyteus-web/node_modules`; implementation/validation may need dependency installation or an existing prepared workspace before running Vitest/build commands.

## Assumptions

- The screenshots correspond to the current `origin/personal` mobile experience or a close derivative.
- The mobile UI is implemented in this superrepo and can be changed without backend protocol changes.
- Core stores are existing capability providers for both desktop and mobile; this ticket should treat them as read-only dependencies except for normal existing UI calls.
- `All` in Activity is not required by a backend API contract; it is a frontend aggregate/filter choice.
- Run type can remain available in detailed contexts or accessible labels if needed, but should not be visible in compact mobile metadata.
- Resizing the Android adaptive icon foreground into the safe zone is sufficient to avoid launcher cropping across common masks.

## Risks / Open Questions

- A shared `AgentEventMonitor` layout fix could affect desktop monitor sizing; must be covered by desktop smoke/unit checks.
- Some existing tests assert old copy such as `Message target`, primary action behavior, or VNC helper copy and must be intentionally updated rather than blindly preserved.
- VNC reachability guidance remains important in docs and in actual error/setup states; removal should not eliminate actionable failure recovery copy.
- Android icon visual validation may require an emulator/device or generated preview evidence beyond static XML inspection.

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001
- REQ-002 -> UC-002
- REQ-003 -> UC-002, UC-003, UC-004, UC-005, UC-006
- REQ-004 -> UC-005
- REQ-005 -> UC-006
- REQ-006 -> UC-004
- REQ-007 -> UC-003
- REQ-008 -> UC-007
- REQ-009 -> UC-001 through UC-006
- REQ-010 -> UC-001 through UC-006
- REQ-011 -> UC-001 through UC-007

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates home copy reduction without losing node/current-work awareness.
- AC-002 validates removal of the duplicate resume action while preserving work opening.
- AC-003 validates compact work header/current-context metadata.
- AC-004 validates Activity category simplification.
- AC-005 validates Tools copy reduction while preserving useful setup/error guidance.
- AC-006 validates chat target copy reduction.
- AC-007 validates chat scroll containment.
- AC-008 validates mobile viewport test/probe coverage.
- AC-009 validates Android launcher icon fix.
- AC-010 validates desktop/core non-regression where shared monitor components are touched and confirms no core store/API semantics changed.
- AC-011 validates downstream documentation alignment.

## Approval Status

Proceeding as design-ready under the user's 2026-05-22 instruction to work on the bootstrapped ticket. No additional clarification is required from solution design; downstream reviewers should route back as `Requirement Gap` if the inferred scope conflicts with user intent.
