# Delivery / Release / Deployment Report — html-preview-isolation (autobyteus-417)

## Release / Publication / Deployment Scope

Finalize the HTML preview isolation (source `cdba18ba35`) on `personal`. There is no release: the Task says "release only on the user's word", and the release guide's default is no release. This repository has no deployment.

- Classification (unchanged by delivery): `task_size=Small`, `architectural_risk=High`, reviewed route (architecture review, source review, API/E2E, test-code review).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `277660ed19` (the same on `origin/personal` `c35d9dea11`; the merged base did not change it)
- Deviations from the guide and why: `None`
- Proposed guide fixes, and whether the user agreed: `None`

## Handoff Summary

- Handoff summary artifact: `tickets/done/html-preview-isolation/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/html-preview-isolation/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: The API-13 finding against FU-003 / SR-004 is carried to the Solution Designer (handoff summary, Note for the Solution Designer).

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `ff68bfb5fa`
- Latest tracked remote base reference checked: `origin/personal` @ `c35d9dea11`
- Base advanced since bootstrap or previous refresh: `Yes` (`c5c4bc8e4a` web version 1.5.12-beta.6; `c35d9dea11` autobyteus-419 delivery docs)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed`. `b3aeb1cced` commits the uncommitted ticket documents: the SR-004 edits and the code reviewer's CRR-001/002 documents.
- Integration method: `Merge` (`1d8ecc9a79`, no conflicts; no file overlap with the ticket)
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`. DEL-01: `HtmlPreviewer.spec.ts` `Tests 4 passed (4)`; `tests/unit/api/rest/workspaces.test.ts` `Tests 7 passed (7)`. Log: `evidence/delivery/DEL-01-merged-state-checks.log`.
- Post-integration verification result: `Passed`
- No-rerun rationale: N/A
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`
- Blocker (if applicable): None

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: the execution report's Acceptance-Criteria Proof and Cases (API-REV-001), confidence 95.4% (target 95%, no category below 90%), the implementation handoff's Checks Run for the reused cases (IMP-02/03/05), and the DEL-01 rerun on the merged state. I opened the files below and checked the lines the report names.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement (`Proven`/`Not Proven`/`User Check`) |
| --- | --- | --- | --- |
| AC-001 | IMP-02 log; API-10/11/13/15 reports | `Tests 4 passed (4)`; real DOM `"sandbox": "allow-scripts"` on every preview iframe | Proven |
| AC-002 | `API-10-desktop-files-preview-report.json`, `API-11-desktop-artifacts-preview-report.json` | `"origin": "null"`; `parent-document`, `parent-electronAPI`, `parent-electronAPI-call`, `localStorage` `blocked: SecurityError`; `own-electronAPI` `undefined`; app window `"electronAPI": "object"` | Proven |
| AC-003 | `API-10-node-state.json`, `API-10-node-log-excerpt.txt`, `API-11-node-state.json`, `API-12-positive-control.json`, `API-06-…log` | `REMOTE_ACCESS_ORIGIN_REFUSED /ws/terminal/hostile-ws… origin null`, `/graphql origin null` ×3, GET mutation `405`; `"markers": []`, `"hostileDefinitions": []`; control opened and created its marker; server E2E `Tests 7 passed (7)` | Proven |
| AC-004 | API-10 report; `API-13-refresh.txt`; `API-13b-2-workspace-10s-after-change.png` | Inline and classic scripts `ran`, CSS `rgb(255, 0, 0)`, `img-relative` `loaded 3x3`, CDN `ran`; `ART-V2` with a new Blob URL; `WS-V2` / `WS-V3` without user action, `WS-V4` after reopen; screenshot shows "WS-V2" in the Files preview | Proven |
| AC-005 | `API-14-static-route-headers.txt`, `API-14-static-url-top-level.json`; IMP-03 | `content-security-policy: sandbox allow-scripts` on HTML/JS/CSS/PNG, none on the 404 and `/content`; top-level `"origin": "null"`; `Tests 7 passed (7)` | Proven |
| AC-006 | `API-15-phone.json`, `API-15-node-state.json` | Credential present at the LAN origin; `blob:http://192.168.2.158:50113/…`, `"origin": "null"`, `parent-localStorage-phone-credential` `blocked: SecurityError`, `credentialStillStoredAfterPreview: true`, `pageErrors: []`; `hostileDefinitions: []` | Proven |
| AC-007 | API-10 report; `API-16-docs-check.txt`; `release-notes.md` | `module-script` `did-not-run`, `fetch-relative-json` failed, `font-relative` not loaded, `worker` / storage / cookie blocked; the docs state the same; the release notes (delivery) list them | Proven |
| AC-008 | IMP-05 log | `Test Files 46 passed (46)`, `Tests 295 passed (295)` (viewers, `ApplicationIframeHost`, mobile views) | Proven |

- More evidence requested (from whom, what, result): `None`
- User check needed: `No`. Every criterion is proven on the real desktop app, the real node and the phone web app; API/E2E marked nothing for the user.
- User check reference, when needed: N/A
- Re-verification after later re-integration: see Repository Finalization (target re-checked before the push).

## Release Decision

- Decision: `No release`
- Decided by: the Task's constraint "release only on the user's word" (`handoff.md` § Original request) and `RELEASE.md` § Release Decision ("No release … the default when the user does not ask for one"). A beta or stable release is available on request; `release-notes.md` is ready for it.

## Docs Sync Result

- Docs sync artifact: `tickets/done/html-preview-isolation/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-server-ts/docs/modules/workspaces.md` (Workspace Static Route section). The web docs were updated in the source commit `cdba18ba35`.
- No-impact rationale (if applicable): N/A

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `tickets/done/html-preview-isolation/`

## Version / Tag / Release Commit

None (no release).

## Repository Finalization

- Bootstrap context source: `investigation-notes.md` (finalization target `origin` / `personal`) and `RELEASE.md` § Finalization Target
- Ticket branch: `codex/html-preview-isolation`
- Ticket branch commit result: see Finalization Record below
- Ticket branch push result: see Finalization Record below
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: see Finalization Record below
- Delivery-owned edits protected before re-integration: see Finalization Record below
- Re-integration before final merge result: see Finalization Record below
- Target branch update result: see Finalization Record below
- Merge into target result: see Finalization Record below
- Push target branch result: see Finalization Record below
- Repository finalization status: see Finalization Record below
- Blocker (if applicable): None

## Release / Publication / Deployment

- Applicable: `No`
- Method: N/A
- Method reference / command: N/A
- Pipelines triggered and their results: none (no tag pushed)
- Published artifacts checked against what the release should produce: N/A
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` (kept in the archived ticket for a later release)
- Blocker (if applicable): None

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation`
- Results: see Finalization Record below

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `tickets/in-progress/html-preview-isolation/release-notes.md` (written after the evidence audit and before finalization; archived with the ticket)
- Archived release notes artifact used for release/publication: `tickets/done/html-preview-isolation/release-notes.md` (not used now; no release)
- Release notes status: `Updated`. They state the approved losses (DEC-001, AC-007): relative module scripts, fetch/XHR of workspace files, workspace web fonts, Web Workers, browser storage and cookies. They also carry a `## What you need to do` section, so a beta's notes reach affected users too.

## Deployment Steps

None. This repository deploys no hosted service.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: none needed (no stored data changes)
- Delivery action required: `None`
- Result and evidence: N/A

## Verification Checks

- DEL-01 (merged state): see Initial Delivery Integration Refresh.
- `python3 scripts/check_repository_artifact_hygiene.py` on the ticket branch before the final commit: `Repository artifact hygiene check passed.` Evidence names use `-`, not `:`.
- Secret Gate: see Finalization Record.

## Rollback Criteria

- Revert the merge commit on `personal`; no stored data changes, so a revert is clean. If a release has already shipped it, cut a new release (`RELEASE.md` § Rollback).
- Revert only if previews users depend on break beyond the approved losses. The approved losses themselves are intended.

## Final Status

- See Finalization Record below.

## Finalization Record
