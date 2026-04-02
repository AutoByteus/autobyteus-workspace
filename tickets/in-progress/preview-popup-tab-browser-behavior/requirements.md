# Requirements

- Ticket: `preview-popup-tab-browser-behavior`
- Status: `Design-ready`
- Last Updated: `2026-04-02`

## User Intent

Make Preview behave more like a real browser by supporting in-app popup/new-tab behavior instead of blanket-blocking `window.open()`, with best-effort support for social/OAuth login flows such as X + Google sign-in.

## Refined Requirements

1. Preview must no longer blanket-block all popup/new-window requests triggered from previewed pages.
2. User-initiated `window.open()` requests from a previewed page should open inside the app instead of being denied.
3. The popup/new-window behavior should align with the existing Preview UI model by creating another Preview tab/session rather than a separate OS window, unless investigation proves that is infeasible.
4. New popup-created Preview sessions must share the same persisted Electron browser session/profile so cookies and login state can participate in multi-tab/browser flows.
5. Existing preview/browser-use tools must keep working for popup-created tabs after they are opened.
6. OAuth/social-login flows should be supported on a best-effort basis. If specific providers still reject embedded login after popup support is added, that limitation must be documented truthfully instead of hidden.
7. The change should preserve current shell stability, ownership boundaries, and non-stealable shell lease behavior.
8. The implementation must follow the software-engineering workflow design principles and common design practices before code edits are unlocked.
9. Popup handling policy must remain bounded: the implementation should not silently allow arbitrary uncontrolled window spam or break the shell host with unexpected multi-window behavior.

## Acceptance Criteria

- A preview page that calls `window.open()` results in another in-app Preview tab/session rather than a denied popup.
- The original tab remains usable and the popup-created tab can be focused, switched, and closed through the existing Preview shell.
- Session/cookie continuity is preserved between the originating tab and popup-created tab.
- At least one realistic popup-driven site flow is validated end to end through the Preview shell.
- Known limits for embedded OAuth/social login, if any remain, are explicitly recorded in the ticket artifacts.
- Existing Preview follow-up tools continue to work against popup-created tabs by `preview_session_id`.
- The implementation does not regress the current shell lease rule by silently stealing a preview session into another shell window.

## Non-Goals

1. Guaranteeing that every OAuth or social-login provider will work inside an embedded Electron preview.
2. Replacing the current Preview UI vocabulary with a separate browser/tool renaming pass.
3. Opening popup-created content in separate OS windows as the primary UX.

## Open Questions

1. Should all popup windows become Preview tabs, or only user-initiated popup requests?
2. Should popup-created tabs inherit the opener title/label in some way, or simply use the loaded page title?
3. If a site requests a popup size/position, do we ignore that and always render as a Preview tab?
4. If a provider rejects embedded login despite popup support, is opening the provider flow externally acceptable, or should the limitation remain documented as unsupported?
