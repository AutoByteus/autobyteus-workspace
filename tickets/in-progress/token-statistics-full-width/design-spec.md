# Design Spec

## Status

`Ready for architecture review round 4 — round-3 gaps resolved`

## Architecture Review Round 3 Resolution

| Finding | Resolution |
| --- | --- |
| `AR-005` | Defines desktop-zero navigation as mounted but `inert` and `aria-hidden`, interactive at every width above 0, fully restored below `md`, with exact bidirectional focus transfer when crossing the breakpoint at retained width 0 and Tab/AT/browser coverage. |
| `AR-006` | Replaces the width-consuming sibling with a zero-width relative flex anchor. The line overlays x=`boundary-1..boundary`, the 8px target has exact nonzero/zero offsets and z-index/pointer rules, and coordinate/hitability/document-width browser assertions are explicit. |

## Reset Decision

Architecture review round 2 and implementation commit `530587a707a48567d9bcf0a04736c091453f51fb` addressed the former collapsed-header design. That observable design is now rejected by the user and is not a valid implementation basis. This spec replaces it completely: restore the original Settings shell presentation and add only a manually draggable desktop separator.

## Current-State Read

The base `personal` implementation at `9fda25eac8fc70df97599758760b47f25620cec8` has one `pages/settings.vue` shell:

- root `flex-col md:flex-row` layout;
- inline navigation with `w-full md:w-64`, narrow `38dvh` cap, and desktop right border;
- shrinkable `min-w-0 flex-1` content;
- page-owned active section, Server Settings mode, route normalization, Back action, and manager mounting;
- table-local horizontal overflow and unchanged data/API owners.

Current branch HEAD `530587a70` replaces that menu with `SettingsNavigation`, automatically collapses Token Statistics, and inserts `SettingsCollapsedHeader` above content. The 1440×900 browser screenshot proves that the extra row shifts the content downward. The user rejected that result and chose manual separator resizing with the original UI at rest.

Existing `useHorizontalSplitResize.ts` and team communication panes establish local `col-resize` interaction language, but that composable clamps to a nonzero minimum, has mouse-only behavior, lacks keyboard/ARIA/focus recovery, and does not own cursor/user-selection restoration. Extending it would broaden risk for existing consumers. A Settings-specific composable is proportionate.

## Intended Change

1. Restore original `personal` Settings navigation/content markup and behavior from the parent of `530587a70`.
2. Replace the navigation's desktop right border with a zero-layout-width anchored separator whose one-pixel line overlays the same original boundary.
3. Give that line a transparent approximately 8px hit target and manual pointer/keyboard resizing from 0 through 256px.
4. Keep width ephemeral and section-independent: fresh mount 256px; same mounted Settings session retains chosen width; no automatic Token Statistics rule or persistence. At nonzero widths, approved partial clipping does not disable navigation.
5. At desktop zero width, keep the separator operable at the far left, make invisible navigation descendants unavailable via `inert`/`aria-hidden`, and show no alternate header, icon, label, rail, or overlay.
6. Preserve the original below-`md` stacked navigation. Use JavaScript media observation only to apply/remove desktop-zero interaction accessibility and to recover focus; CSS remains the layout authority.
7. Keep the active manager mounted and every route/data/API behavior unchanged.

## Supplemental Solution Artifacts

| Artifact | Purpose | Related IDs | Status / Relationship |
| --- | --- | --- | --- |
| `tickets/in-progress/token-statistics-full-width/ui-ux-spec.md` | Approved visual invariance, pointer/keyboard journeys, zero-width and responsive states | `REQ-001`–`REQ-012`, `AC-001`–`AC-015` | `Refined`; user-approved; governs observable UI |
| Earlier drawer mockups and collapsed-header browser screenshots | Rejected direction evidence | N/A | Superseded; preserve only as history |

## Task Design Health Assessment

- Change posture: `Behavior Change`
- Current target design issue: `No`
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `Yes`, but only clean-cut removal of the rejected implementation plus extraction of resize mechanics into a focused composable.
- Evidence: the base SettingsPage is the correct shell owner and all manager/data boundaries are healthy. The former fixed width is not a defect against a prior invariant. The resize concern is a bounded shell interaction.
- Deferred refactor: the original page retains its long inline navigation. The revised task adds no destination/context mapping, so extracting navigation would not support the requirement and would unnecessarily preserve structure introduced for the rejected design.
- Residual risk: pointer and breakpoint-focus behavior can be browser-sensitive; exact live validation is mandatory.

## Terminology

- **Navigation width:** desktop Settings menu allocation, range `0..256px`.
- **Separator line:** the persistent one-pixel visual boundary.
- **Resize hit target:** transparent ~8px focusable/pointer area associated with the line.
- **Narrow layout:** original stacked navigation below `md`/768px; no separator.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Governing Owner |
| --- | --- | --- | --- | --- |
| `DS-001` | Primary resize | Separator pointer input | Clamped navigation width and complementary content width | SettingsPage + `useSettingsNavigationResize` |
| `DS-002` | Keyboard resize | Focused separator keydown | 16px/Home/End width update and ARIA value | `useSettingsNavigationResize` |
| `DS-003` | Zero-width interaction/breakpoint | Desktop width reaches 0 or viewport crosses `md` with retained 0 | Correct inert/AT state and focus on the newly available control | `useSettingsNavigationResize` |
| `DS-004` | Existing Settings flow | Route/section selection | Existing active manager at unchanged chosen width | SettingsPage |

## Spine Narratives

- `DS-001`: pointer-down records start X/width and activates cleanup-owned pointer listeners; pointer movement applies `clamp(startWidth + deltaX, 0, 256)`; pointer-up/cancel stops the session and restores document styles.
- `DS-002`: the separator handles ArrowLeft/ArrowRight/Home/End, prevents page scrolling for handled keys, updates the same width authority, and Vue updates `aria-valuenow`.
- `DS-003`: at desktop width 0 the navigation is `inert`/`aria-hidden`; at every nonzero width it is interactive. CSS hides the separator and restores full navigation width below `md`; media-query state removes the desktop-zero attributes. If separator focus becomes unavailable when crossing narrow, focus moves to Back. If a narrow navigation descendant would become inert when returning to desktop at retained 0, focus moves to the separator. Other breakpoint changes do not steal focus.
- `DS-004`: original route normalization and inline navigation remain. No selection path reads or writes navigation width, and resize changes no manager key/conditional.

## Governing Ownership

- `pages/settings.vue`: shell composition, binding the width CSS property, Back-button fallback ref, and existing route/manager state.
- `composables/useSettingsNavigationResize.ts`: width constants/state, clamping, pointer session, keyboard input, navigation/separator/fallback refs, desktop-zero interaction availability, bidirectional breakpoint focus recovery, and lifecycle cleanup.
- Separator markup in `settings.vue`: semantic boundary and transient visual feedback. It contains no business state.
- Existing navigation markup: unchanged destinations/labels/icons/active styling.
- Existing managers/tables/stores/APIs: unchanged.

## Exact Resize Contract

Create `autobyteus-web/composables/useSettingsNavigationResize.ts` with this focused public shape:

```ts
export const SETTINGS_NAVIGATION_DEFAULT_WIDTH = 256;
export const SETTINGS_NAVIGATION_MIN_WIDTH = 0;
export const SETTINGS_NAVIGATION_MAX_WIDTH = 256;
export const SETTINGS_NAVIGATION_KEYBOARD_STEP = 16;
export const SETTINGS_DESKTOP_MEDIA_QUERY = '(min-width: 768px)';

export function useSettingsNavigationResize(): {
  navigationWidth: Readonly<Ref<number>>;
  isResizing: Readonly<Ref<boolean>>;
  isDesktop: Readonly<Ref<boolean>>;
  isNavigationInteractionHidden: ComputedRef<boolean>;
  navigationRef: Ref<HTMLElement | null>;
  separatorRef: Ref<HTMLElement | null>;
  narrowFocusFallbackRef: Ref<HTMLButtonElement | null>;
  navigationWidthStyle: ComputedRef<Record<'--settings-navigation-width', string>>;
  separatorLineStyle: ComputedRef<{ left: string }>;
  separatorTargetStyle: ComputedRef<{ left: string }>;
  startResize: (event: PointerEvent) => void;
  handleSeparatorKeydown: (event: KeyboardEvent) => void;
};
```

Internal invariants:

- `navigationWidth` initializes to 256 and is mutated only through one `applyWidth(requested)` clamp.
- `isNavigationInteractionHidden` is exactly `isDesktop && navigationWidth === 0`. SettingsPage binds it to both `:inert` and `:aria-hidden`; it never unmounts the navigation.
- Widths `1..256` remain interactive even when the user-approved clipped text is incomplete.
- No storage, route, store, watcher on `activeSection`, or Token Statistics special case.
- Only primary pointer input begins resize; mouse non-left buttons are ignored.
- One active pointer session at a time. Starting another first stops the old session.
- Track `startX`, `startWidth`, and active pointer identity; use pointer capture or window `pointermove`/`pointerup`/`pointercancel` listeners consistently.
- During drag set body cursor to `col-resize` and user-select to `none`, preserving prior inline values; cleanup restores exact prior values.
- `startResize` focuses `separatorRef` before geometry changes, ensuring a focused navigation descendant cannot remain focused when pointer drag reaches desktop 0.
- Cleanup runs on pointer-up, pointer-cancel, lost capture where applicable, and `onBeforeUnmount`.
- Keyboard mapping is exact: Left `-16`, Right `+16`, Home `0`, End `256`; other keys pass through.
- `navigationWidthStyle` yields `{'--settings-navigation-width': '<n>px'}`.
- `separatorLineStyle.left` is `0px` at width 0 and `-1px` otherwise.
- `separatorTargetStyle.left` is `${Math.max(-navigationWidth, -4)}px`; because the anchor sits at x=`navigationWidth`, the global 8px target left is exactly `max(0, navigationWidth-4)`.

## Breakpoint Focus Contract

The composable owns all three element refs to avoid selector-based DOM reach-through:

- `navigationRef` binds to the restored navigation wrapper and is used only for containment/focus-availability checks.
- `separatorRef` binds to the semantic hit target.
- `narrowFocusFallbackRef` binds to the existing Back to Workspace button; adding the ref changes no visible markup.
- On mount, create `matchMedia(SETTINGS_DESKTOP_MEDIA_QUERY)`, initialize/update `isDesktop`, and add a document `focusin` listener that records the last meaningful non-body focused element as `separator`, `navigation`, or `other`.
- When changing to narrow, `isDesktop=false` first makes `isNavigationInteractionHidden=false`, removing `inert`/`aria-hidden`. After render, if the last meaningful focus was the separator and active focus is the separator or `BODY`, focus `narrowFocusFallbackRef` and record navigation focus.
- When changing to desktop with retained width 0, `isNavigationInteractionHidden=true`. If the last meaningful focus was a descendant of `navigationRef` and active focus is still in navigation or has fallen to `BODY`, focus `separatorRef`. This is the only narrow-to-desktop focus transfer.
- When returning to desktop with width above 0, or when focus is on another available control, do not transfer focus.
- Pointer `startResize` focuses the separator, so reaching 0 by drag cannot strand focus inside newly inert navigation. Keyboard Home already originates on the separator.
- Remove media/focus listeners on unmount.
- This media query is forbidden from changing navigation width or visual layout; it only synchronizes interaction/accessibility availability and focus with CSS presentation.

## DOM / CSS Contract

The restored page root retains `flex h-full min-w-0 flex-col bg-white md:flex-row` and applies `navigationWidthStyle`.

Navigation wrapper:

- keep original narrow classes and content;
- remove only `md:w-64 md:border-r`;
- add a singular class such as `settings-page-navigation-resizable` and desktop `overflow-x: hidden`;
- scoped CSS at `min-width: 768px` sets `width: var(--settings-navigation-width)` and keeps `flex-shrink: 0`;
- bind `ref="navigationRef"`, `:inert="isNavigationInteractionHidden || undefined"`, and `:aria-hidden="isNavigationInteractionHidden ? 'true' : undefined"`; both attributes are absent at nonzero desktop widths and all narrow widths;
- below `md`, width remains `100%`, cap remains `38dvh`, and vertical scrolling remains unchanged.

Separator geometry uses a **zero-width flex anchor**, not a one-pixel sibling allocation:

```html
<div
  class="settings-navigation-separator-anchor relative z-20 hidden w-0 shrink-0 self-stretch overflow-visible md:block"
>
  <div
    class="settings-navigation-separator-line pointer-events-none absolute inset-y-0 w-px bg-gray-200"
    :style="separatorLineStyle"
    aria-hidden="true"
  />
  <div
    ref="separatorRef"
    class="settings-navigation-resize-target absolute inset-y-0 z-20 w-2 cursor-col-resize touch-none bg-transparent"
    :style="separatorTargetStyle"
    role="separator"
    aria-orientation="vertical"
    aria-label="<localized Resize Settings menu>"
    aria-valuemin="0"
    aria-valuemax="256"
    :aria-valuenow="navigationWidth"
    tabindex="0"
    data-testid="settings-navigation-resize-handle"
    @pointerdown="startResize"
    @keydown="handleSeparatorKeydown"
  />
</div>
```

- The anchor has `width:0`, is `position:relative`, and participates in the desktop flex row only as a coordinate origin. Therefore `navigation right == anchor x == content left`; it contributes zero pixels.
- At the default width the common boundary/content origin is x=256 relative to the Settings shell. The absolute line uses `left:-1px`, occupying x=255..256 exactly where the original in-box right border rendered.
- At widths `w >= 4`, the 8px target uses `left:-4px`, occupying x=`w-4..w+4` over both adjacent panes. For `0 <= w < 4`, local left is `-w`, so global target coordinates remain x=0..8. The target is `z-index:20`; the anchor is also a defined stacking context above default-z navigation/content. The decorative line is `pointer-events:none`; the target alone receives pointer events.
- At width 0, the line changes to `left:0` (x=0..1) and the target remains x=0..8. Nothing extends into negative viewport coordinates, and neither absolute child contributes to flex/document width.
- The page root must not add horizontal padding/margin to the anchor and must retain `min-w-0`; browser validation proves `document.scrollWidth === document.clientWidth` at 0 and 256.
- Resting state remains transparent; hover/focus/active state highlights only the one-pixel line/outline.
- The content wrapper retains its original classes and receives no conditional top padding/header.

## Accessibility Interface

| Interface | Exact Contract | Owner |
| --- | --- | --- |
| Separator semantics | `role=separator`, vertical orientation, localized label, min 0, max 256, reactive now | Page markup/composable state |
| Pointer resize | Primary pointer, 0..256 clamp, `col-resize`, cleanup | Composable |
| Keyboard resize | Left/Right 16px, Home/End bounds | Composable |
| Focus indication | Visible separator focus treatment at desktop | Page CSS |
| Desktop-zero navigation | `inert` plus `aria-hidden=true`; descendants excluded from Tab/AT, DOM and manager state mounted | Page binding from composable computed state |
| Partial navigation | Widths 1..256 stay interactive; approved text clipping only | Page/composable |
| Desktop-to-narrow focus | Remove inert/hidden, then separator/body -> Back only when separator was last meaningful focus | Composable/ref boundary |
| Narrow-to-desktop at retained 0 | Focused navigation descendant/body -> separator as navigation becomes inert | Composable/ref boundary |
| Narrow accessibility | Separator ancestor `display:none`; nav forced full width and never inert/aria-hidden | Responsive CSS + computed interaction state |

## Existing Capability Reuse Decision

| Need | Existing Capability | Decision | Reason |
| --- | --- | --- | --- |
| Horizontal splitter visual language | Team communication/delegated-task panes | Reuse visual convention | Matches established `col-resize` separator |
| `useHorizontalSplitResize` | Generic 168..360 mouse-only clamp | Do not extend/reuse | Missing zero width, pointer cancel, keyboard, focus, cleanup contract; modifying impacts other panes |
| Settings navigation | Original inline page markup | Restore/reuse unchanged | User explicitly wants original UI |
| Rejected navigation model/header | Current commit | Remove | Exists solely for rejected behavior |
| `useLeftPanel()` and shared panel icon | Workspace shell | Do not use | No icon/toggle in approved design |

## File Responsibility Mapping

| File | Responsibility | Change |
| --- | --- | --- |
| `autobyteus-web/pages/settings.vue` | Restore base navigation/content UI; bind width, separator, Back fallback ref | Replace rejected implementation, then modify minimally |
| `autobyteus-web/composables/useSettingsNavigationResize.ts` | Settings-specific resize state/input, desktop-zero interaction state, focus, cleanup | Add |
| `autobyteus-web/composables/__tests__/useSettingsNavigationResize.spec.ts` | Clamp, pointer, cleanup, keyboard, inert-state computation, bidirectional media-focus contract | Add |
| `autobyteus-web/pages/__tests__/settings.spec.ts` | Original route/section coverage plus separator DOM/style/session behavior | Replace rejected-collapse tests and extend |
| `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts` | Accessible `Resize Settings menu` label only | Remove rejected labels; add one label |
| Rejected files listed below | No remaining target responsibility | Remove/revert |

## Removal / Decommission Plan

Remove all source introduced only for the rejected header design:

- `components/settings/SettingsCollapsedHeader.vue`
- `components/settings/SettingsNavigation.vue`
- `components/settings/settingsNavigation.ts`
- their focused test files
- `components/layout/LeftPanelToggleIcon.vue`
- the `AppLeftPanel.vue` import/use and its new shared-icon test assertions, restoring the original inline SVG
- the `nuxt.config.ts` source-scan ignore added only for `settingsNavigation.ts`
- `settings.page.openMenuLabel`, `closeMenuLabel`, and `navigationAriaLabel` localization entries
- page auto-collapse/header/focus/model logic and associated tests.

Do not retain wrappers, aliases, dead components, alternate selection paths, or the failed `BROWSER-002-RESIZE` expectation for a header that no longer exists. Historical ticket reports/screenshots remain evidence and are not deleted.

## Dependency Rules

Allowed:

- SettingsPage imports `useSettingsNavigationResize`.
- The composable depends only on Vue lifecycle/reactivity and browser DOM APIs guarded for SSR.
- Page binds refs directly to its separator and existing Back button.

Forbidden:

- No active-section/Token Statistics dependency inside resize logic.
- No `useLeftPanel`, shared panel icon, navigation model, category header, rail, overlay, or manager integration.
- No localStorage/sessionStorage/store/route persistence.
- No table/API/store changes.
- No JavaScript breakpoint-driven visual layout; media observation is limited to desktop-zero `inert`/`aria-hidden` synchronization and focus recovery.
- No parent/child selector queries when refs provide the boundary.

## Change / Refactor Sequence

1. Restore rejected implementation files to the exact pre-commit behavior or remove files added by `530587a70`; retain ticket evidence/artifacts.
2. Confirm original focused Settings/AppLeftPanel tests are restored before adding revised behavior.
3. Add `useSettingsNavigationResize.ts` and its focused tests.
4. Modify original `settings.vue`: bind width style, replace desktop border with sibling separator, add Back fallback ref, and keep all selection/manager code otherwise unchanged.
5. Replace rejected localization entries with the separator accessible label.
6. Add page tests for semantic markup, default/session width, no automatic Token behavior, zero/max bounds, absence of rejected UI, and narrow classes.
7. Run implementation checks; send through source review and full API/E2E again.

There is no temporary seam in the final working tree: rejected components/config/tests are removed before handoff, and only one width authority exists.

## Failure / Edge Behavior

- Pointer cancel or window loss: stop resize, preserve last clamped width, restore styles/listeners.
- Unmount during drag: same cleanup; no stale global listener.
- Non-primary/right-click: no resize.
- Drag beyond viewport left/right: clamp exactly 0/256.
- At desktop 0px: separator remains reachable; navigation horizontally clips, becomes inert/AT-hidden, and its descendants are skipped by Tab without alternate UI.
- At widths 1..255px: approved incomplete text clipping is visual only; visible/clipped original controls remain focusable and available to AT.
- Direct Token Statistics: starts/continues at current manual width; no automatic mutation.
- Loading/error/empty/form manager: geometry changes only.
- Desktop 0 -> narrow: inert/hidden attributes are removed and full stacked navigation returns; separator focus transfers to Back with no `BODY` end state.
- Narrow -> desktop at retained 0: if focus is in the navigation that becomes inert, focus transfers to the separator; otherwise focus stays where it is.

## Testing / Validation Design

Implementation-scoped durable coverage:

- composable constants and clamp bounds;
- pointer start/move/up/cancel/unmount and exact body-style restoration;
- keyboard handled/unhandled keys and ARIA value source;
- desktop-zero inert/aria computation and navigation Tab/AT exclusion bindings;
- focus recovery for separator-last-focus on desktop-to-narrow and navigation-last-focus on narrow-to-desktop at retained 0;
- original default layout/routes/Server modes/Back behavior;
- Token Statistics does not auto-resize;
- section changes retain width and manager resize does not cause remount;
- rejected header/icon/model elements are absent;
- narrow stacked class behavior remains.

API/E2E/browser coverage must re-investigate old scenarios because prior durable tests encode rejected requirements. Required live evidence includes:

- 1440×900 original 256px resting visual equivalence and zero extra top offset;
- pointer drag through partial, 0, and back to 256 widths;
- exact default geometry: nav right, zero-width anchor x, and content left all x=256; line x=255..256; target x=252..260;
- exact zero geometry: nav right, anchor, and content left x=0; line x=0..1; target x=0..8; pointer hit at x=4 restores width; no document overflow;
- partial geometry: nav right/anchor/content share the chosen width and the 8px z-ordered target receives pointer input over both panes;
- desktop-zero Tab order and accessibility snapshot omit Back/destinations while retaining separator; narrow at retained 0 restores them;
- Created Time fit/no table scroll after sufficient manual shrink;
- request count, manager identity, statistics state, and scroll preservation;
- keyboard/ARIA and visible focus;
- 390×844 stacked layout;
- desktop-to-narrow separator-focus recovery to Back and narrow-to-desktop retained-zero navigation-focus recovery to separator, reusing the failure intent of `BROWSER-002-RESIZE` with the new control identity;
- Browser production renderer and Electron-equivalent build/tests.

## Persisted Data / Migration

`Not Affected`. Width is ephemeral and reset on remount. No migration, compatibility wrapper, rollout, or cleanup job exists.

## Observability / Security / Privacy

No telemetry or backend observability is needed. Browser DOM geometry, focus identity, request counts, screenshots, and structured test evidence are appropriate. No security or privacy boundary changes.

## Alternatives Rejected

- Top collapsed header with category label: explicitly rejected after screenshot review.
- Automatic Token Statistics collapse: replaced by manual control.
- Narrow icon rail: not selected; still consumes width and changes original UI.
- Overlay drawer/backdrop: changes layout model and is unnecessary.
- Extending the generic horizontal resize composable: disproportionate impact and insufficient contract.
- Persisting width: contradicts original-on-fresh-mount simplicity and was not requested.

## Design Review Checklist

- Revised user-approved direction reflected: Yes.
- Original UI at rest, no extra vertical space: Yes.
- Manual-only 0..256 splitter: Yes.
- Zero-width recovery without header/rail/icon: Yes.
- Desktop-zero Tab/AT removal and narrow restoration: Yes.
- Original 256px content origin and exact overlay geometry: Yes.
- Pointer/keyboard/ARIA/cleanup exact: Yes.
- Breakpoint focus failure explicitly addressed: Yes.
- Rejected implementation removal complete in design: Yes.
- Managers/data/API/persistence unchanged: Yes.
