# Release Notes — Runtime Streaming Performance Follow-up

> **No release requested; delivery validation still open:** `IR-004` corrects
> the `CR-003` native reasoning writer and `CRR-007` passes source review, but
> API-REV-005 and proportional review of its durable coverage changes must pass
> before repository finalization.

## Highlights

- Keeps long-running standalone and team responses responsive by moving live content cadence to one shared server WebSocket egress instead of stacking a frontend presentation timer.
- Adds **Settings -> Server Settings -> Basics -> Live response update interval (ms)** for the currently bound server. The recommended/default and Reset value is 500 ms; accepted values are whole numbers from 100 through 2,000 ms and apply without restart.
- Shows complete escaped text/reasoning while output is still active, then switches to the existing full Markdown, code highlighting, math, Mermaid, image, link, file-action, and sanitization behavior at completion.
- Preserves exact live content bytes/order, existing routine status visibility, runtime/provider-independent streaming behavior, and stored configuration compatibility. Preservation of native reasoning across raw traces and history hydration is currently failing and is the release blocker.

## Validation

A 600.999-second production-path Chrome run accumulated exactly 120,220 characters with matching SHA-256, reduced ordinary client content frames by 95.712%, kept renderer/backend/interaction metrics within the approved bounds, and passed two-node Settings behavior. The earlier live provider-to-DOM Thinking controls also passed. `API-REV-004` then found the native raw-trace hydration defect. `IR-004` corrects future native reasoning writes and `CRR-007` passes source review, but the required API-REV-005 persisted GraphQL/browser revalidation is not yet authoritative.

## Compatibility And Limits

- Existing `AppConfig`/Settings data is directly usable; no settings migration
  is required.
- Affected existing raw traces with omitted reasoning cannot be reconstructed by
  the bounded future-write fix; no migration or heuristic fallback is approved.
- Abrupt physical socket loss still has no replay guarantee.
- A **Thinking** disclosure appears only for turns where the selected
  provider/model actually emits a reasoning segment; it is not guaranteed for
  every model or response.
- The realistic renderer proof used Chrome on the changed web-equivalent path; unchanged Electron-shell code was not re-executed.
