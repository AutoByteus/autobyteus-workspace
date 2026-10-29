# Handoff Summary — run-file-change-live-cache-race

## What Changed For Users

- **Files no longer go missing from a running agent's Artifacts list.** The race happened when the list loaded just as the agent recorded its first file. That file could stay out of the live list, and opening it said "File change not found". After the agent's next file, the saved record lost it too. This affected standalone runs, team and org members, and copies.
- **The fix:** the server fills its live list from the saved record only if nothing has filled it in the meantime. Reads still never wait.
- **Not restorable:** files lost this way before the fix stay lost. The release notes say so.

## Classification And Route

- `task_size=Small`, `architectural_risk=Low`
- Route: direct. Implementation (IR-001), then API/E2E (API-REV-001, Pass, 95.6%), then delivery. Architecture review, source review and test-code review: `Not Applicable — direct low-risk route`.

## Integrated State

- Ticket branch `codex/run-file-change-live-cache-race`. The fix and tests are in `c2bd6991b0`; the probe update is in `4667ec6613`.
- Integration: merge `0fac00e191` brings in `origin/personal` @ `fee828e9cf`. That covers the stable v1.5.6 cut: release notes, `autobyteus-web/package.json` 1.5.6-beta.11 → 1.5.6, and ticket records. No code changed.
- Post-integration checks on `0fac00e191` (`evidence/DLV-*`):
  - DLV-01 server typecheck: exit 0.
  - DLV-02 `tests/unit/services/run-file-changes/`: 3 files, 17/17.
  - DLV-03 gated owner-scoped member E2E, without the old wait: 2/2.

## Verification

- Verified from the evidence; no user check was needed. The table is in `release-deployment-report.md` (Verification).

## Release Decision

- `No release`. None was requested, and that is the `RELEASE.md` default. The change ships with the next release; stable v1.5.6 was just cut without it. `release-notes.md` is ready.

## Known Residuals (accepted)

- R-002: files lost before the fix cannot be restored. The release notes say so.
- R-001: a run that detaches and re-attaches within one disk read. The design accepts this as contrived; it is not tested.
- Nuxt dev cold-start errors appeared only during the probe's warm-up, which records them by design and does not assert them. Every journey had zero browser errors, except B-005's two expected 404s.

## Durable Artifacts

- Docs sync: `docs-sync-report.md`
- Delivery: `release-deployment-report.md`, `delivery-revision-record.md`, `release-notes.md`
- Validation: `api-e2e-execution-coverage-report.md`, `evidence/`
