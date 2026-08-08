# Release Notes — Runtime Streaming Performance Follow-up

> **No release or version bump requested.** These notes are retained as a
> durable change summary; API-REV-005 and CRR-008 pass before repository
> finalization.

## Highlights

- Keeps long-running standalone and team responses responsive by moving live content cadence to one shared server WebSocket egress instead of stacking a frontend presentation timer.
- Adds **Settings -> Server Settings -> Basics -> Live response update interval (ms)** for the currently bound server. The recommended/default and Reset value is 500 ms; accepted values are whole numbers from 100 through 2,000 ms and apply without restart.
- Shows complete escaped text/reasoning while output is still active, then switches to the existing full Markdown, code highlighting, math, Mermaid, image, link, file-action, and sanitization behavior at completion.
- Preserves exact live content bytes/order, existing routine status visibility, runtime/provider-independent streaming behavior, stored configuration compatibility, and future native reasoning across raw-trace-backed history hydration.

## Validation

A 600.999-second production-path Chrome run accumulated exactly 120,220 characters with matching SHA-256, reduced ordinary client content frames by 95.712%, kept renderer/backend/interaction metrics within the approved bounds, and passed two-node Settings behavior. API-REV-005 then passed at 98.6%: future native reasoning persisted in exact ordered raw traces/provenance, standalone/team GraphQL hydration passed, and a real DeepSeek team retained Thinking through member reselection, hard reload/history reopen, and post-reload reselection. CRR-008 passed both durable coverage edits with no findings.

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
