# Requirements Document — chat-composer-menus-open-upward

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-004`
- Package identifier: `chat-composer-menus-open-upward`
- Request / ticket: User chat request of 2026-09-30, with screenshot `user-screenshot-2026-09-30.png`
- Requirements owner: Solution Designer
- Date: 2026-09-30
- Approval state and reference: Approved. The user replied "approve" in the Solution Designer chat on 2026-09-30 to the SR-002 baseline. The UI/UX supplement had already been user-confirmed in the Product conversation on 2026-09-30.
- Exact approved requirements baseline / solution revision: SR-002 content (REQ-001–004, AC-001–005, DEC-001–004)
- Behavior-defining supplements and their approved versions: Product UI/UX spec `Approved` (user-confirmed 2026-09-30), prototype `personal@d0c39a5` (integration record `df1377c`): `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-composer-menus-open-upward/ui-ux-spec.md`, final references VIS-001–VIS-010 in `visual-references/` (manifest.json SHA-256)

## Problem And Desired Outcome

- Problem: On the new-chat page, the composer sits high enough that the composer menus open **downward**
  (screenshot: the `@` agent/team menu drops below the composer, covers the workspace hint line and runs
  off the bottom of the window). The user says the workspace dropdown also goes down.
- Affected actors: Desktop/web user starting a new chat.
- Desired outcome (user's words): "always make them go up and move down the input message box a bit."
- Observable definition of success: see AC-001…AC-005.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | New-chat composer menus (`@` agent/team, `/` skill, workspace, model, thinking) open below when there is ≥ the menu's preferred height below the trigger; the centered composer usually has that space | On windows ≥640px wide these menus always open upward: `@`/`/` above the composer card, Workspace/Model/Thinking above their trigger, Model runtime flyout bottom-aligned and growing upward | Menu contents, search, keyboard navigation, selection, Escape/outside-click dismissal | `useAnchoredPopover.ts` `measure()`; `ChatMessageInput.vue:31`, `ChatWorkspaceMenu.vue:27`, `ChatModelMenu.vue:31`, `ChatThinkingControl.vue:36` |
| BEH-002 | User | SCN-003 | Composer group sits in a vertically centered column with `pb-[6vh]` bias (lowered from 14vh in `chat-composer-polish`) | The group sits lower: column padding `pt-[14vh] pb-10` (was `pt-10 pb-[6vh]`), still flex-centered; net move 10vh − 40px (56px at 952px tall) | Heading, subtitle, composer and hint order; centered layout | `ChatNewSurface.vue:3` |
| BEH-003 | User | SCN-004 | Narrow windows (<640px) show menus as a bottom sheet | Unchanged (DEC-001) | Bottom-sheet behavior | `useAnchoredPopover.ts` `NARROW_MAX_WIDTH_PX` |
| BEH-004 | User | — | Running-conversation input (`AgentUserInputForm`) sits at the bottom of the view; its `/` skill menu already opens upward | Unchanged | Running-conversation layout | `useSkillTagMenu.ts:30`, `AgentEventMonitor.vue:35` |

## Supported Scenarios

- SCN-001 (Supported Normal): User on the new-chat page types `@` or `/` → menu appears above the composer.
- SCN-002 (Supported Normal): User opens the Workspace, Model or Thinking menu from the composer footer → menu appears above.
- SCN-003 (Supported Normal): User opens the new-chat page → composer appears a bit lower than today.
- SCN-004 (Supported Explicit Edge): Short window where the space above the composer is less than the menu's preferred height → menu still opens up and is height-limited and scrollable (to be confirmed by Product, see OQ-001).

## Scope Guardrail

### In-Scope Use Cases

- UC-001: Composer menus on the new-chat page (`@`, `/`, workspace, model, thinking).
- UC-002: Vertical position of the composer on the new-chat page.

### Out Of Scope

- Menu contents, search and selection logic.
- Running-conversation input and its menus (BEH-004).
- Other popovers in the app that do not use the new-chat composer.

### Non-Goals

- Redesigning the composer itself.

### Preserved Behavior Boundary

BEH-003 (unless Product recommends a change), BEH-004, and all menu interaction behavior listed in BEH-001.

### Review Authority

Standard: blocking findings must cite a REQ/AC/BEH ID; new behavior is a Requirement Gap.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | On windows ≥640px wide, the new-chat `@`, `/`, Workspace, Model and Thinking menus always open upward. `@`/`/` sit 6px above the composer card and may overlap the heading/subtitle. Workspace, Model and Thinking sit above their trigger. The Model runtime flyout is bottom-aligned with its runtime row and grows upward. | BEH-001 | Must | User request; DEC-001 |
| REQ-002 | The new-chat column padding changes from `pt-10 pb-[6vh]` to `pt-[14vh] pb-10` and the group stays flex-centered. Examples: 56px lower at 952px tall, 32px at 720px. | BEH-002 | Must | User request; DEC-002 |
| REQ-003 | Menus never flip down at any window height. Max height = min(preferred height, space above the menu's positioning box − 6px gap − 16px margin). Preferred heights: `@`/`/` 300, Workspace 420, Model 360, Thinking 240. Runtime flyout list max 320px. The list scrolls; header and footer rows stay visible. Space is measured from the box the menu is positioned against (the composer card for `@`/`/`). | BEH-001 | Must | DEC-003 |
| REQ-004 | The workspace hint line stays directly under the composer and no menu covers it. The <640px bottom sheet and the running-conversation `/` menu are unchanged. Menu contents, search, keyboard use, focus and selection are unchanged. | BEH-003, BEH-004 | Must | DEC-004; preservation |

## Acceptance Criteria

- AC-001: At ≥640px wide, typing `@` or `/` in the new-chat composer shows the menu above the composer card (VIS-002, VIS-003, VIS-007). (REQ-001)
- AC-002: Opening Workspace, Model (including the runtime flyout) or Thinking shows the menu above its trigger (VIS-004–VIS-006). (REQ-001)
- AC-003: The new-chat column uses `pt-[14vh] pb-10`; at 1512x952 the heading top is about 379px (VIS-001). (REQ-002)
- AC-004: At 1024x520 and 1024x440, each menu opens above, stays fully on screen and its list scrolls (VIS-008). (REQ-003)
- AC-005: The hint line is not covered by any menu. The <640px bottom sheet (VIS-009) and the running-conversation `/` menu (VIS-010) behave as before. (REQ-004)

## Decisions (from approved Product result)

- DEC-001: always-up placement for all five menus on ≥640px (answers the user's main request).
- DEC-002 (OQ-002): padding `pt-[14vh] pb-10`.
- DEC-003 (OQ-001): never flip; shrink and scroll; no minimum height needed (1024x440 still gives the `@` menu 166px).
- DEC-004 (OQ-003): hint line stays under the composer.

## Verification Intent

Component tests for placement and height limits; visual checks against VIS-001–VIS-010 at the listed viewports.
