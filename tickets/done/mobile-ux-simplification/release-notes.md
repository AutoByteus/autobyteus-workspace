# Release Notes

## Improvements

- Simplified the Phone Access mobile Home screen by removing redundant section labels and the duplicate primary next-action card while preserving node status, current work, recent work, switching, and troubleshooting access.
- Made mobile work headers and current-work metadata more compact by removing visible `Agent run` / `Team run` suffixes from default mobile metadata.
- Simplified mobile Activity to use distinct Tasks, Messages, and Tools categories instead of an aggregate `All` view.
- Reduced default mobile Tools copy so Terminal/VNC controls and selected workspace details take priority, with explanatory guidance reserved for actionable setup or error states.
- Simplified team-run Chat target selection to a compact target row with a clear `Change` action while preserving accessible target labels.

## Fixes

- Fixed long mobile Chat transcripts so the transcript feed scrolls independently and the composer plus bottom navigation remain anchored, preventing blank page scroll below the controls.
- Adjusted the Android adaptive launcher icon foreground so the AutoByteus mark stays inside common launcher masks.

## Validation

- Focused mobile/shared-monitor Vitest coverage passed: 6 files / 43 tests.
- `pnpm build` passed for `autobyteus-web` with only existing non-blocking chunk warnings.
- Desktop workspace view smoke passed: 2 files / 14 tests.
- Paired mobile browser E2E passed at 390x844 for Home, long Chat scroll containment, Activity, Tools, and compact team target/header behavior.
- Android debug APK build, launcher resource inspection, XML static assertion, and adaptive-mask preview passed.
- Physical-device ADB validation passed on an installed debug APK for native HTTP/pairing, paired Home, Weather Checker long Chat scroll, Activity, compact Tools, and Software Team target row.


## Scope Boundary

- This ticket is intentionally scoped to the `/mobile` Phone Access UI and Android launcher resources.
- No core stores, GraphQL/REST/WebSocket APIs, backend services, runtime behavior, desktop routes, or desktop journeys are intentionally changed.
- The only non-mobile source files touched are shared monitor layout components; those changes are layout-containment only and have passed desktop/shared monitor validation. If a stricter no-shared-UI-file policy is required, those shared monitor files should be reworked before finalization.
