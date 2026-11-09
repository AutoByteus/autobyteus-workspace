# Delivery / Release / Deployment Report — phone-registered-folders-436 (autobyteus-436)

## Release / Publication / Deployment Scope

- Ticket branch `codex/phone-registered-folders-436`, `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed`.
- Release: **Beta**, the next after `v1.5.12-beta.10`.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` on `origin/personal` `a85bf4f38d` (unchanged since the previous delivery read it).
- Deviations from the guide and why: `None`.
- Proposed guide fixes: `None`.
- Build-only release run: not required. The ticket changes no release workflow, packaging, runner or build step/gate (server route, phone views, tests, docs).

## Handoff Summary

- Handoff summary artifact: `tickets/done/phone-registered-folders-436/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/phone-registered-folders-436/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `97ed263074`
- Latest tracked remote base reference checked: `origin/personal` `a85bf4f38d`
- Base advanced since bootstrap: `Yes` (one commit: the beta.10 release record, two ticket documents)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed` (`27a3f0b06f`, the code reviewer's untracked CRR-001/CRR-002 records)
- Integration method: `Merge` (`e8d8b1a073`), no conflicts
- Post-integration executable checks rerun: `Yes`: `npx vitest run tests/e2e/node-files` (autobyteus-server-ts) → `Test Files 1 passed`, `Tests 5 passed` (`evidence/delivery/DR1-node-files-e2e.log`)
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`

## Verification

- Evidence judged: `Sufficient`. API-REV-001 Pass, final confidence 95%, no category below 90%, every critical AC directly proven, no user-only part.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | API-01 `evidence/api-e2e/API-01-mobile-shell.log` | 23 `[mobile-shell] MSP-xx Pass` lines, including MSP-16/17 (file links outside the run's folder) | Proven |
| AC-002 | R-IMP IMP-05 `evidence/implementation/IMP-05-server-e2e-node-files-access.log`; `tests/e2e/node-files/node-files.e2e.test.ts`; DR1-01 | `node-files.e2e.test.ts (5 tests)` pass: owner and phone read; peer and memory sync 403 `NODE_ROUTE_NOT_PERMITTED`, none 401; POST/PUT/DELETE not served | Proven |
| AC-003 | IMP-05; API-02 `API-02-docker/API-02-phone-docker.log` | `404 NODE_FILE_NOT_FOUND`, `400 NODE_FILE_IS_FOLDER`; relative and `..` 400; symbolic link followed | Proven |
| AC-004 | API-01 MSP-16, API-02b, API-03 `API-03-unreadable/API-03-unreadable.log` | the two messages; `NODE_FILE_UNREADABLE` → "The file preview could not be opened." | Proven |
| AC-005 | API-02, API-02b `API-02-docker/API-02b-conversation.log` | a test-owned Docker node over Tailscale: `tap /home/autobyteus/shared/ac005-notes.md: opens read-only ("…SHARED-MARKER-436…")`, `ac005-large.pdf (18 MB): {"canvases":1,"drawn":true}, 721 ms` | Proven |
| AC-006 | API-01 23/23, API-04 desktop probes, API-05 + `API-05-base-comparison.log` | 15 server e2e files fail identically on the base `97ed263074` (0 tests failing on the branch that pass on the base) → FU-004 (urgent) | Proven for this ticket |

- More evidence requested: `None`.
- User check needed: `No`. The real-phone large-PDF item is a residual risk, not an AC part.

## Release Decision

- Decision: `Beta`
- Decided by: the user, in advance for this ticket: "There will be a new ticket coming for the deploy, so for this new ticket we also deploy a new beta version, and of course the same waive conditions." The waiver: the Codex and Grok runtimes of `scripts/release_smoke.py` are waived only on a usage-limit refusal.

## Docs Sync Result

- Docs sync artifact: `tickets/done/phone-registered-folders-436/docs-sync-report.md`
- Docs sync result: `No impact` by delivery (the ticket's own doc updates are in `271656acc0`).

## Release Notes Summary

- `tickets/done/phone-registered-folders-436/release-notes.md` (written by delivery). It has no `## What you need to do` section: the phone page comes from the node, so updating the node is enough and the Android app is unchanged.
