# Delivery / Release / Deployment Report — search-model-settings (autobyteus-146)

Current delivery revision: `DR-002`. DR-001 (verification blocked on O-5, `Unclear`) is kept in `delivery-revision-record.md`.

## Release / Publication / Deployment Scope

- Ticket: `search-model-settings` (Project Task autobyteus-146): Settings → Server Settings → Embedding (models and Project indexes), and indexing after Task writes (REQ-011).
- `task_size`: Medium. `architectural_risk`: High. Route: reviewed.
  - Source review: CRR-005 Pass on `8c283c6acc`.
  - API/E2E: API-REV-002 Pass, 95%.
  - Test-code review: CRR-006 Pass.
- Requirements basis: SR-008 (DEC-015 clarifies REQ-007 and AC-015; the Solution Designer decided within the direction, and the user was informed).
- One repository: workspace superrepo → `origin/personal`.

## Project Release Guide

- `RELEASE.md` at `origin/personal` `fc93276e6f`. Deviations: `None`. Proposed guide fixes: `None`.

## Handoff Summary

- Handoff summary artifact: `tickets/done/search-model-settings/handoff-summary.md` — `Updated`.
- Delivery revision record: `tickets/done/search-model-settings/delivery-revision-record.md`, current `DR-002`.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `8d40ba3b6c`.
- Latest tracked remote base reference checked: `origin/personal` @ `fc93276e6f`. Integrated in DR-001 and rechecked at DR-002 start: not moved.
- Local checkpoint commits: `4882be5bc4` (CRR records), `d6c1280f9f` (SR-008 records). Both touch ticket files only.
- Integration method: `Merge` → `f9de3d57d7`, no conflicts. The semantic overlap with the base's "part of" relation was checked; see DR-001.
- Post-integration executable checks: `Yes`, all on `f9de3d57d7` (`evidence/delivery/DR-001-*`):
  - typecheck exit 0;
  - server unit `745 passed | 4 skipped`, `6112` tests;
  - `tests/e2e/projects` `7 passed | 18 skipped`, `44` tests, including `projects-graphql` 12/12 and `embedding-settings` 6/6;
  - web settings and projects `74 passed`, `450` tests.
- Post-integration verification result: `Passed`.
- Since the checks, the ticket changed only ticket files and two doc sentences, so no rerun is needed.
- Handoff state current with the latest tracked remote base: `Yes`.

## Verification

- Evidence judged: `Sufficient` on the clarified requirements (SR-008).
- Evidence relied on:
  - `api-e2e-execution-coverage-report.md` (API-REV-002): Pass, 95% confidence, no category below 90%;
  - the review chain: CRR-005 and CRR-006 Pass;
  - the DR-001 integration checks.
- What was mocked:
  - network loss, made with an `/etc/hosts` block of huggingface.co;
  - an unreachable node, made with `docker stop`;
  - Linux, run as a Docker Desktop VM;
  - status-only writes, stood in for by dependency-only writes.
  None of these hides a criterion.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001, AC-005, AC-011 | API-L01, API-L07, API-R06 `result.json` | `Active·Not downloaded`, `On disk: 0 MB`, no `embeddings` 20 s later; probe `"result": "Pass"`, EMB-001 Pass | Proven |
| AC-002, AC-003, AC-004 | API-L03, API-L05, API-R06 EMB-002…004; round-1 API-L08 | failed download leaves no model folder and Retry completes; Cancel → `Not downloaded`; switch writes the setting, Active Ready | Proven |
| AC-006, AC-007 | `API-L06-r2-01-indexing.txt`; EMB-005, EMB-007 | `Indexing 56 of 1000` → left and returned → `Indexing 80 of 1000` → Ready; Beta `Ready · 20 Tasks` after Rebuild | Proven |
| AC-008 | Docker cases API-L01…L06, L11, L12 | a browser on the Docker node throughout | Proven |
| AC-009, AC-010 | API-R03, API-L11 | GraphQL E2E; meaning searches return the new and edited Tasks | Proven |
| AC-012 | `API-L04-r2-01-unavailable-retry.txt` | `Active·Unavailable \| Unavailable: Could not reach huggingface.co…`; Index all disabled with its title; Retry → Ready in 7.7 s | Proven |
| AC-013 (+ CR-003) | `API-L12-01-docker-no-model-load.txt`, `API-L12-02-desktop-no-model-load.txt` | after restart `Active·Ready`. Docker threads `23 → 22` after a dependency-only write, `26` for the description control. Desktop `27 → 26` at 433 MB, then `30` / 684 MB for the control | Proven |
| AC-014 | `API-L05-r2-01-o4-o2-node-stopped.txt` | `actionError: 'Couldn’t reach the server.' role: alert`; next action clears it | Proven |
| AC-015 (SR-008 text) | `API-L11-02-docker-index-after-writes.txt`, `API-L11-03-docker-server-index-timing.txt`, `API-L11-04-desktop-ui-index-after-writes.txt`, EMB-006 | saves `70` / `14` ms (Docker), `84` / `107` ms (UI). Server `+3804 ms … READY`; desktop `+3399 ms … READY`. Meaning searches find both Tasks. Settings opened after the writes shows `Ready · 9 Tasks`. An open panel showed Ready at 11,239 ms, about 7.4 s after the server finished (within 10 s) | Proven |
| REQ-007 (SR-008 text) | API-L06; API-L11(a); design DS-001 | user-started work updates live (`56 → 80 of 1000` across leave and return); server-started indexing appears at the next idle refresh | Proven |
| QR-001 (DEC-012) | `API-L02-r2-01-docker-dec012.txt`, `API-L02b-02-desktop-first-load-samples.txt` | Docker refresh medians 8–9 ms; first load 1,764–2,111 ms, within the Projects list's 1,440–2,709 ms. Desktop refresh median 4 ms; 15 of 16 first loads ≤ 1 s, the outlier 1,204 ms at load 12.9 | Proven (thin desktop margin) |
| Licensing / hygiene | `API-R07-r2-licensing-hygiene.log`; rerun before the final commit | `Licensing is consistent.`, `Repository artifact hygiene check passed.` | Proven |

- More evidence requested: `None`.
- User check needed: `No`. Everything was proven through the real Docker node, the packaged desktop and the browser.
- Re-verification after later re-integration: recorded in Repository Finalization.

## Release Decision

- Decision: `No release`.
- Decided by: the release guide's default. Neither the package nor the user asked for one; a beta is available on request.

## Docs Sync Result

- Artifact: `tickets/done/search-model-settings/docs-sync-report.md`.
- Result: `Updated`. The change's docs were reviewed, and delivery added the DEC-015 cadence (`autobyteus-web/docs/settings.md`) and "part of" marks (`embeddings.md`).

## Ticket State Transition

- Moved to `tickets/done/search-model-settings`: `Yes` (archive commit).

## Version / Tag / Release Commit

- None.

## Repository Finalization

Recorded after finalization in DR-002.

## Release / Publication / Deployment

- Applicable: `No`. Result: `Not required`. Release notes: `Not required`.

## Environment Or Persisted-Data Transition Notes

- Approved decision: `Directly Usable — No Migration`. The fingerprint inputs live in memory only; existing model folders and vectors are used as they are (API-L12, API-L12b).

## Rollback Criteria

- Roll back if the Embedding section, or the Task writes that trigger indexing, break or slow normal Project use. Examples: saves slowed or failed, a model loaded by non-description writes, or status reads loading the backlog on every refresh.
- Method: revert the merge on `personal` and cut the next release. No data written by this change needs migration. A rolled-back build keeps using the active-model setting and existing vectors.

## Final Status

Recorded after finalization in DR-002.
