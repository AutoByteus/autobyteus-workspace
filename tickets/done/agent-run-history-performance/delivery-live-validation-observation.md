# Delivery Live-Validation Observation

## Status

`Design Impact / investigation requested by user` — 2026-07-20.

## User Observation

The integrated Electron frontend was connected as a remote node to the already-running AutoByteus backend at `http://127.0.0.1:8000` so the user could validate the Event Monitor against the existing large dataset. Opening the `linkedin_marketer` history appeared to load for several minutes before the conversation became visible.

## Delivery Diagnosis

This validation path did **not** exercise the complete integrated performance implementation:

- The remote process on port 8000 is PID 45, started as `node dist/app.js --host 0.0.0.0 --port 8000 --data-dir /home/autobyteus/data`, with working directory `/app/autobyteus-server-ts`.
- Its compiled `local-memory-run-view-projection-provider.js` still contains `includeArchive: true`.
- That runtime does not contain `dist/run-history/projection/recent-run-projection-policy.js`.
- The newly built integrated Electron package starts its bundled backend on port 29695 from the ticket worktree package and its compiled provider contains `includeArchive: false` plus the new recent-window policy, but it uses `/root/.autobyteus/server-data`, not the large port-8000 dataset.

Therefore the new frontend was waiting on the old backend to read/reconstruct/transport archive-scale history. The frontend bound can cap retained/rendered content after arrival, but it cannot prevent the remote old backend's archive I/O and unbounded response construction.

## Visual Evidence

- Node-bound window creation recorded at `2026-07-20T08:43:36.538Z`.
- A local screenshot captured after the conversation became visible showed `linkedin_marketer` selected with historical conversation rendered; it confirmed eventual completion, not acceptable latency.
- The screenshot is intentionally excluded from repository publication because it contains user-owned live conversation and workspace data. This text records the material observation without publishing that data.

## Questions for Solution Investigation

1. Confirm whether the user's perceived delay is entirely explained by the old port-8000 backend or whether node-bound window bootstrap/catalog/workspace hydration has a separate material delay outside the current Event Monitor scope.
2. Define a safe, reproducible validation topology that exercises **both** integrated backend and integrated frontend against representative existing data without allowing two servers to write the same live data directory concurrently. A snapshot/copy of `/home/autobyteus/data` served by the integrated backend on an isolated port is the current recommended direction.
3. Measure separately: node-bound window bootstrap, row-selection request TTFB/total, returned projection cardinality/payload, frontend usability, and Event Monitor mounted count.
4. Determine whether any newly observed delay creates a requirement gap or design impact beyond the approved active-only/newest-100 Event Monitor scope.

## Safety Constraint

Do not point the integrated backend and the existing port-8000 backend at `/home/autobyteus/data` concurrently. Preserve the live data and use a consistent snapshot or stop/exclusive-owner procedure.
