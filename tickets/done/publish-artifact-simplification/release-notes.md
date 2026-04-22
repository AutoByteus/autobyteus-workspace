## What's New
- `publish_artifact` now uses one simplified runtime-wide contract: `{ path, description? }`.

## Improvements
- Published artifacts are now durably snapshotted per run and exposed to applications through runtime-control artifact reads plus best-effort live `artifactHandlers.persisted` callbacks.
- Brief Studio and Socratic Math Teacher now reconcile missed artifact deliveries by `revisionId`, including terminal/orphaned bindings until catch-up completes.
- Brief Studio’s runnable package now boots cleanly through the Applications host again, and live brief creation through the real Brief Studio UI persists successfully.

## Fixes
- Legacy application-journal artifact delivery and removed tool payload fields no longer stay active behind compatibility behavior.
- The current web Artifacts tab remains on file-change telemetry only, so published artifacts no longer depend on `ARTIFACT_UPDATED` or file-change-synthesized artifact semantics.
