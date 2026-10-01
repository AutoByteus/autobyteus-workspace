# Investigation Notes — chat-composer-menus-open-upward

## Investigation Meta

- Package: `chat-composer-menus-open-upward`
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward`
- Branch: `codex/chat-composer-menus-open-upward`
- Base: `origin/personal@57df63f079363ccab4f2301213f9d8a3458f72fa` (fetched 2026-09-30)
- Finalization target: `personal`
- Date: 2026-09-30

## Initial Request And Clarifications

> "look on the chat page, the input message box area is too hihg, causing the workspace dropdown goes down. i feel like its better to always make them go up and move down the input message box a bit. please talk to product prototyper for first fixing UI"

Screenshot: `user-screenshot-2026-09-30.png`. It shows the new-chat page with `@` typed. The "Chat with @" agent menu opens **below** the composer, covers the temp-workspace hint line and gets cut off at the bottom of the window.

## Source Log

| Source | Observation |
| --- | --- |
| `autobyteus-web/composables/popover/useAnchoredPopover.ts` `measure()` | Opens **below** if space below ≥ `preferredHeight`, or if neither side fits and below ≥ above. Otherwise above. Max height clamped to ≥220px. |
| `ChatMessageInput.vue:95` | `@`/`/` menu uses `useAnchoredPopover(rootRef, textareaRef, 300)`. Anchor is the textarea. |
| `ChatWorkspaceMenu.vue:159` | Workspace menu, preferred height 420. |
| `ChatModelMenu.vue`, `ChatThinkingControl.vue` | Same composable, same `above`/`below` class switch. |
| `composables/agentInput/useSkillTagMenu.ts:30` | Running-conversation `/` skill menu also uses the composable (height 300). Input sits at the bottom, so it resolves to `above` already. |
| `ChatNewSurface.vue:3` | Column `justify-center ... pb-[6vh] pt-10`; composer `mt-8 max-w-3xl`; hint line `mt-2.5` below composer. |
| `ChatComposer` consumers | Only `ChatNewSurface.vue` (the new-chat page). |
| `tickets/done/chat-composer-polish` | Previous ticket already lowered the bias from 14vh → 6vh (REQ-007). User still finds it too high. |

## Relevant Existing Behavior

- Composer center ≈ middle of viewport, so on typical desktop heights space below > 300–420px → menus open down (root cause of the screenshot).
- Narrow (<640px) → bottom sheet, independent of placement.

## Assumptions, Unknowns, And Risks

- Space above the composer is roughly the same as space below today; moving the composer down adds room above for upward menus.
- Short windows: forced-up menus need a height limit (OQ-001).
- Changing the shared composable's default would also affect `useSkillTagMenu`. That menu already resolves to `above`, so impact is low, but the design should let the caller choose placement rather than change the global default.

## Product Design Request Context

User explicitly asked for Product Prototyper to fix the UI first. Focus: menu direction and composer vertical position on the new-chat page.

## Notes For Architecture Design (preliminary, not authoritative)

Likely a small change: add a placement preference (e.g. `prefer: 'above'`) to `useAnchoredPopover`, use it in the four new-chat composer menus, and adjust `ChatNewSurface.vue` vertical spacing per Product result.

## Product Design Findings (2026-09-30)

Product Prototyper `Prototype Completed` (user-confirmed). Package verified by Solution Designer: the spec is `Approved`, the user quote is recorded, and the spec links the runnable prototype and VIS-001–VIS-010 (manifest SHA-256). Provenance: pin `origin/personal@57df63f07`, result `d0c39a5`, integration `df1377c`. Validation: 15/15 at 1512x952, 1280x720, 1024x520, 1024x440, 390x844 and the run view.

- Key engineering fact: the `@`/`/` menu is positioned against the composer card, because the message-input root is not positioned. Space must be measured from that box, not from the textarea (textarea measurement put the menu 31px off-screen at 1024x520).
- The Model runtime flyout (`ChatModelMenu.vue:140`, `absolute z-50 w-[17rem]`) also needs upward alignment.
- Prototype touched: `useAnchoredPopover.ts`, `ChatNewSurface.vue`, `ChatMessageInput.vue`, `ChatWorkspaceMenu.vue`, `ChatModelMenu.vue`, `ChatThinkingControl.vue`, `ChatTargetMenu.vue`, `ChatSkillMenu.vue`. This is reference only.

## Supplemental Artifact Inventory

| Supplement | Owner | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-composer-menus-open-upward/ui-ux-spec.md` + `visual-references/` VIS-001–010 | Product Prototyper | Normative UI/UX spec and final references | REQ-001–004, AC-001–005 | Approved | User-confirmed 2026-09-30 |
| `.../ui-behavior-test-matrix.md`, `prototype/scripts/validate-chat-composer-menus-open-upward.mjs` | Product Prototyper | Behavior matrix / validation evidence | AC-001–005 | Final | Evidence only |
| `user-screenshot-2026-09-30.png` | User | Original problem evidence | BEH-001 | — | Evidence |

## Architecture Investigation Findings (2026-09-30)

- `ChatComposer.vue:4-5`: the card is `relative`, so it is the containing block for the `@`/`/` wrapper, because the `ChatMessageInput` root is static.
- Current max-height application: Workspace only (`ChatWorkspaceMenu.vue:28`). `@`/`/` lists have a fixed `max-h-64`. Model and Thinking have none.
- `ChatModelMenu.vue:196, 229-235`: the flyout is top-aligned via `flyoutOffset` (downward growth). `:58` runtime list has no overflow while browsing, so the flyout isn't clipped.
- No spec asserts popover placement classes or height math (`grep top-full|bottom-full|flyoutOffset` in `*.spec.ts`: none).
- `docs/chat.md:91` documents `pb-[6vh]`, which becomes stale after the change (Delivery docs sync).
- Prototype reference diff: `git -C /Users/normy/autobyteus_org/autobyteus-web-prototype diff 045a4f7 d0c39a5 -- '*.ts' '*.vue'`.
