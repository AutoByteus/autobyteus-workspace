# Design Spec — chat-composer-menus-open-upward

## Solution And Approval Basis

- Package: `chat-composer-menus-open-upward`; solution revision `SR-004`.
- Requirements: `requirements-doc.md` **Approved**. The user replied "approve" on 2026-09-30 to the SR-002 baseline: REQ-001–004, AC-001–005, DEC-001–004.
- Behavior-defining supplement: the user-confirmed Product UI/UX spec
  `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-composer-menus-open-upward/ui-ux-spec.md`
  plus VIS-001–VIS-010 in `visual-references/` (manifest SHA-256). Prototype `personal@d0c39a5`.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward`, branch `codex/chat-composer-menus-open-upward`, base `origin/personal@57df63f07`, finalization target `personal`.

## Current-State Read

All five new-chat composer menus use `autobyteus-web/composables/popover/useAnchoredPopover.ts`. Its `measure()` chooses `below` whenever the space below the trigger is at least the preferred height. The new-chat group is flex-centered with `pt-10 pb-[6vh]` (`ChatNewSurface.vue:3`), so desktop windows almost always choose `below`. That is the root cause of the user's screenshot. The running-conversation `/` menu (`useSkillTagMenu.ts:30`) uses the same composable and must keep `auto`.

Other current facts that matter:
- The `@`/`/` menu wrapper (`ChatMessageInput.vue:26-32`) is absolutely positioned. `ChatMessageInput`'s root is static, so the menu positions against the `relative` composer card (`ChatComposer.vue:4-5`). Today, measurement uses the textarea.
- Max height is applied only in the Workspace menu. The `@`/`/` lists have a fixed `max-h-64`. The Model and Thinking menus have no height limit.
- The Model runtime flyout (`ChatModelMenu.vue:136-158`) is top-aligned using `flyoutOffset` (`:196`, `:229-235`), so it grows downward.

## Task Size And Architectural Risk (Mandatory)

- `task_size`: **Small**. About 8 frontend files, all in `autobyteus-web/components/chat/` plus one composable. Class/style edits and one additive composable option.
- `architectural_risk`: **Low**. There is no API, persistence, security, concurrency, deployment or ownership change. The composable gains an opt-in option whose default (`auto`) keeps the existing behavior for its other caller (`useSkillTagMenu`).
- Evidence: the consumer list comes from `grep useAnchoredPopover`: 4 chat components plus `useSkillTagMenu`. The prototype already exercised the same delta at 15/15.
- Escalation trigger: if implementation finds another `useAnchoredPopover` consumer outside the new-chat page that would need `above`, or needs to change the default policy, return a Design Impact.

## Architecture Investigation Evidence

See `investigation-notes.md` (Source Log; Product Design Findings). Additional reading for design: `ChatComposer.vue`, `ChatMessageInput.vue`, `ChatTargetMenu.vue`, `ChatSkillMenu.vue`, `ChatModelMenu.vue`, `ChatThinkingControl.vue` and `ChatWorkspaceMenu.vue` at base `57df63f07`, and the prototype diff `045a4f7..d0c39a5` (reference only). No existing spec asserts `top-full`/`bottom-full` or the popover's height math.

## Intended Change

1. `useAnchoredPopover` gains an opt-in placement policy `'above'`. Under it, the menu always opens up and `maxHeight` = `floor(min(preferred, positioningBox.top − 6 − 16))`, clamped at ≥0 with no 220px floor. The positioning box is the menu's containing block: the root when the root is positioned, otherwise `root.offsetParent`.
2. The five new-chat menus opt in and apply `maxHeight` on non-narrow layouts. Their lists shrink (`min-h-0`) and scroll, and header/footer rows stay visible.
3. The Model runtime flyout becomes bottom-aligned (`bottom: -5px`) and gets a computed list max height (≤320px), replacing `flyoutOffset`.
4. The new-chat column padding changes from `pt-10 pb-[6vh]` to `pt-[14vh] pb-10`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior / REQ / AC | Production path | Change |
| --- | --- | --- |
| BEH-001 / REQ-001 / AC-001 (`@`, `/`) | `ChatMessageInput.vue` → `useAnchoredPopover(rootRef, textareaRef, 300, { placement: 'above' })` → wrapper `absolute left-2 bottom-full mb-1.5` against the composer card → `ChatTargetMenu` / `ChatSkillMenu` | Opt in; wrapper `flex flex-col` + `maxHeight` style; menus `min-h-0` on root and list |
| BEH-001 / REQ-001 / AC-002 (Workspace) | `ChatWorkspaceMenu.vue` (preferred 420) | Opt in (maxHeight already applied) |
| BEH-001 / REQ-001 / AC-002 (Model + flyout) | `ChatModelMenu.vue` (preferred 360) | Opt in; `maxHeight` style; list area `min-h-0`; flyout bottom-aligned + computed list max height |
| BEH-001 / REQ-001 / AC-002 (Thinking) | `ChatThinkingControl.vue` (preferred 240) | Opt in; `maxHeight` style + `overflow-y-auto` |
| BEH-002 / REQ-002 / AC-003 | `ChatNewSurface.vue:3` | `pt-[14vh] pb-10` |
| REQ-003 / AC-004 | `useAnchoredPopover.measure()` `above` branch | Height rule; never flips |
| BEH-003/004 / REQ-004 / AC-005 | narrow `fixed inset-x-2 bottom-2` branches; `useSkillTagMenu` (`auto`) | Unchanged |

## Relevant Supplemental Task Artifacts

Product UI/UX spec + VIS-001–010 (normative); `ui-behavior-test-matrix.md` and `prototype/scripts/validate-chat-composer-menus-open-upward.mjs` (evidence). Paths are in `investigation-notes.md` → Supplemental Artifact Inventory.

## Task Design Health Assessment (Mandatory)

- Root cause: the placement policy was implicit (always "auto by space"). This surface needs a deterministic policy. The right owner of that decision is the popover composable, set by each caller. Per-component hacks (e.g. forcing classes while `measure()` still computes a downward height) would split one decision across files.
- Decision: add an explicit, typed caller policy (`AnchoredPopoverPlacementPolicy = 'auto' | 'above'`) to the existing owner. No new module is needed.
- Measurement fix: measure from the menu's containing block, not from the trigger, under `above`. For the root-positioned menus the two are nearly the same. For `@`/`/` this is the only correct basis; textarea measurement put the menu 31px off-screen at 1024x520 in the prototype.
- Refactor needed: none beyond removing the now-dead `flyoutOffset` logic.

## Legacy Removal Policy (Mandatory)

Clean cut. Remove `flyoutOffset` and its downward-overflow math in `ChatModelMenu.vue`. Keep no compatibility path for the old top-aligned flyout. `auto` is not legacy: it stays as the live policy for `useSkillTagMenu`.

## Persisted Data / State Transition Decision

N/A. There is no persisted data. Purely presentational frontend state.

## Primary Execution Spine

User triggers a menu (keystroke `@`/`/` or click) → component calls `popover.show()`/`toggle()` → `measure()` sets `placement` and `maxHeight` → the component renders the wrapper with `bottom-full mb-1.5` and a `maxHeight` style (non-narrow) or the bottom sheet (narrow). The rest (filtering, selection, dismissal) is unchanged.

## Ownership Map

| Owner | Responsibility |
| --- | --- |
| `useAnchoredPopover.ts` | Open/close/dismiss, narrow breakpoint, **placement policy and height math** (extended) |
| Each menu component | Chooses its policy and preferred height; applies `placement` classes and `maxHeight` style; owns its internal scroll region |
| `ChatModelMenu.vue` | Flyout side and flyout list height (bottom-aligned) |
| `ChatNewSurface.vue` | New-chat group vertical layout |

## Interface Boundary Mapping

```ts
export type AnchoredPopoverPlacementPolicy = 'auto' | 'above'
export function useAnchoredPopover(
  rootRef: Ref<HTMLElement | null>,
  triggerRef: Ref<HTMLElement | null>,
  preferredHeight = 460,
  options: { placement?: AnchoredPopoverPlacementPolicy } = {},   // default 'auto'
): { open, placement, maxHeight, narrow, show, close, toggle }  // return shape unchanged
```

- `above`: `placement` is always `'above'`. The positioning box is `root` if `getComputedStyle(root).position !== 'static'`, else `root.offsetParent ?? root`, falling back to `trigger` when root is null. `maxHeight = Math.max(0, Math.min(preferredHeight, Math.floor(box.top − 6 − 16)))`. Constants: `MENU_GAP_PX = 6` (matches `mb-1.5`), `VIEWPORT_MARGIN_PX = 16`.
- `auto`: byte-for-byte the current algorithm (it may reuse the margin constant).
- Measurement stays on open only. There is no resize re-measure (explicitly out of scope in the UI spec).

## Existing Capability / Subsystem Reuse Check

Reuse `useAnchoredPopover`. Do not add a positioning library (e.g. floating-ui). Do not duplicate the height math in components.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-web/composables/popover/useAnchoredPopover.ts` | Policy option, `above` branch, constants, doc comment |
| `autobyteus-web/components/chat/ChatMessageInput.vue` | `{ placement: 'above' }`; wrapper `flex flex-col` + non-narrow `maxHeight` style |
| `autobyteus-web/components/chat/ChatTargetMenu.vue` | Root and list `min-h-0` (keep `max-h-64`) |
| `autobyteus-web/components/chat/ChatSkillMenu.vue` | Root and list `min-h-0` (keep `max-h-64`) |
| `autobyteus-web/components/chat/ChatWorkspaceMenu.vue` | `{ placement: 'above' }` |
| `autobyteus-web/components/chat/ChatModelMenu.vue` | `{ placement: 'above' }`; non-narrow `maxHeight` style; list area `min-h-0`; flyout `bottom: -5px`; `flyoutListMaxHeight = max(0, min(320, floor(rowBottom + 5 − 12 − 10)))`; remove `flyoutOffset` |
| `autobyteus-web/components/chat/ChatThinkingControl.vue` | `{ placement: 'above' }`; non-narrow `maxHeight` style + `overflow-y-auto` |
| `autobyteus-web/components/chat/ChatNewSurface.vue` | `pt-[14vh] pb-10` |
| `autobyteus-web/composables/popover/__tests__/useAnchoredPopover.spec.ts` (new) | Unit tests for both policies (see guidance) |
| `autobyteus-web/components/chat/__tests__/*` | Add/adjust placement assertions where the component specs mount menus |

`useSkillTagMenu.ts` and all `agentInput/*` files: **no change**.

## Backward-Compatibility Rejection Log (Mandatory)

- Rejected: keep `flyoutOffset` as a fallback when the flyout would fit below. The approved spec says the flyout always grows upward.
- Rejected: a global switch of the default policy to `above`. That would change the running-conversation menu (REQ-004).

## Change / Refactor Sequence

1. Composable policy + unit tests. 2. Opt in the four components and add height styling. 3. Model flyout rework. 4. `ChatNewSurface` padding. 5. Component specs + typecheck/lint/tests. 6. Visual check against VIS-001–010 at 1512x952, 1280x720, 1024x520, 1024x440, 390x844 and the run view.

## Key Tradeoffs

- Detecting the containing block via `getComputedStyle`/`offsetParent` is generic and matches CSS positioning exactly. The alternative, passing an explicit anchor ref from `ChatComposer` into `ChatMessageInput`, adds a prop that only restates the DOM. Chosen: containing-block detection, documented in the composable.
- `@`/`/` may overlap the heading/subtitle. This is accepted in the approved spec.

## Risks

- Model menu: while browsing runtimes, the runtime list area intentionally has no overflow so the flyout isn't clipped. The root `maxHeight` must therefore not add `overflow-hidden` to the Model menu root. With 5 runtimes, the content is far below 360px.
- jsdom has no layout. Unit tests must stub `getBoundingClientRect`, `offsetParent` and `getComputedStyle`.
- `docs/chat.md:91` mentions `pb-[6vh]`. Documentation sync belongs to Delivery.

## Guidance For Implementation

- Tests (minimum):
  - `above`: placement is `above` even with ample space below.
  - `maxHeight` = min(preferred, top − 22), floored at 0, and not clamped to 220.
  - Measurement uses `root.offsetParent` when root is static, and root when positioned.
  - `auto` results are unchanged, as a regression check.
  - Component-level: each of the five menus renders `bottom-full` on a wide window, and the narrow bottom sheet is unchanged.
- Keep menu content, ARIA, focus and keyboard code untouched.
- Match the UI spec's Implementation Fidelity Boundary. Pixel positions may vary with real content.
