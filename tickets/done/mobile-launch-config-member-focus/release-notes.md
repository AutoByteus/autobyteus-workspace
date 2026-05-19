# Release Notes: Mobile Launch Runtime/Model And Team Focus

## What's New

- Mobile **Start new** now lets users choose the runtime and model for agent and team launches instead of relying on hidden desktop defaults.
- Mobile team launches now include a searchable **First message target** picker so the first prompt can be sent to a selected leaf team member.
- Existing mobile team runs now expose a scoped **Message target** selector on work tabs where it controls the current run.

## Improvements

- Recent mobile team-run reopen restores the last valid focused member selected in the current mobile client.
- The mobile Runs tab keeps Start new focused by hiding the competing recent-runs list while setup is open.
- Mobile launch and focus pickers use phone-friendly searchable lists for long agent/team/member choices.
- Successful phone pairing now shows a checking state while status and work catalogs refresh, then opens Home with the connected node state instead of a stale `Unknown` status.

## Fixes

- Removed the mobile launch path's hidden runtime/model fallback that could discard the user's selected launch config.
- Prevented existing-run team focus controls from appearing on Runs or competing with Start new's first-message target selection.
- Cleaned up unpair and failed-pairing paths so they return to pairing bootstrap without leaking Home/checking state or writing a local mobile session.

## Notes / Residual Gaps

- The focused-member memory is current-client local; cross-device/backend focus persistence remains out of scope.
- Forced pairing failure can still show both local pairing-error copy and a connection diagnostic with similar recovery guidance; validation recorded this as non-blocking future mobile error-copy polish.
- Repository-wide Nuxt typecheck remains red from existing unrelated diagnostics; focused mobile/config/store regression suites passed and the changed mobile/composable/store typecheck filter emitted no diagnostics.
