# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

autobyteus-402, slice S0 of autobyteus-394: Docker nodes publish only the ports they need.
- Classification: `task_size` `Small`, `architectural_risk` `Low`, direct route. Architecture review, code review and test-code review are `N/A — not applicable`.
- Finalization target: `origin/personal`. No release.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `9d8077fd2a`, read in the ticket worktree after integrating it.
- Deviations from the guide and why: `None`.
- Proposed guide fixes: `None`.

## Handoff Summary

- Handoff summary artifact: `handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `6324fb056d`
- Latest tracked remote base reference checked: `origin/personal` `9d8077fd2a` (fetched 2026-11-06)
- Base advanced since bootstrap or previous refresh: `Yes`. Six commits from autobyteus-401: `RELEASE.md`, `DESIGN.md` and that ticket's records; no code, no file this ticket touches.
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Not needed`. The tree was clean apart from untracked build output; the validated state was committed (`0a92a03563`).
- Integration method: `Merge` (`65ebba8291`, no conflicts)
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`
  - `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace scripts.tests.test_public_docker_launcher_update scripts.tests.test_public_docker_launcher_stop` → `Ran 46 tests in 64.117s` / `OK (skipped=2)`. The skips are the same as IMP-01: pwsh is absent on the Mac and port 8001 is in use. Both tests passed under pwsh in API-06 a.
  - `python3 scripts/check_repository_artifact_hygiene.py` → pass.
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`

## Verification

- Evidence judged: `Sufficient`.
- Evidence relied on: execution report API-REV-001. Final confidence is 94.9%: every critical AC directly proven, the lowest category 92%. The target is 95% and the 0.1-point gap is two limits API/E2E showed it cannot close here: no Windows host, and no gated real-Docker suite in the repository. Neither leaves a critical AC unproven. Delivery opened the files below and checked the named lines.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | IMP-01 log; IMP-07-06/07/08; API-07-02; API-08-01/02 | `Ran 37 tests` / `OK (skipped=2)`; `{"6080/tcp":[{"HostIp":"127.0.0.1","HostPort":"52433"}],"8000/tcp":[{"HostIp":"",…}]}`; state `BACKEND_PORT`/`NOVNC_PORT` only; `Port bind failed; retrying with fresh ports (attempt 2/5).` then `127.0.0.1:58924->6080/tcp`, marker kept | Proven |
| AC-002 | API-06a (both logs); API-06b-04/05 | `test_powershell_launcher_parses_when_pwsh_is_available … ok`, `test_preferred_port_collision_falls_back_for_that_service … ok`, rerun `Ran 8 tests` / `OK`; `127.0.0.1:56186->6080/tcp, 0.0.0.0:56184->8000/tcp`; JSON `"backendPort": 56184`, `"noVncPort": 56186` | Proven (Linux pwsh; Windows host not run) |
| AC-003 | IMP-07-05/08/09/10; API-06b-04/05/06 | `recreating the managed container while keeping named volumes`; same ports; `abx402-volume-marker` / `abx402-ps-volume-marker`; `already running with the current image and launcher config` | Proven |
| AC-004 | API-09-02 | env file `AUTOBYTEUS_BACKEND_PORT=59111`, `AUTOBYTEUS_WEB_VNC_PORT=59112` only; `127.0.0.1:59112->6080/tcp, 0.0.0.0:59111->8000/tcp`; LAN `ECONNREFUSED`; `RFB 003.008` | Proven |
| AC-005 | IMP-05; API-06b-08; API-11-04 | Guide specs and guards pass; `Show Backend, GraphQL and VNC Viewer (this computer only) URLs`; Guide in the real app shows the new text, `"mentionsNoVNC":false` | Proven |
| AC-006 | IMP-07-12; API-07-02/03 | VNC Viewer `127.0.0.1` connected, `::1` and LAN `ECONNREFUSED`, `localhost` connected via `127.0.0.1`; `lsof` `IPv4 … TCP 127.0.0.1:58396 (LISTEN)`; `RFB 003.008` on loopback | Proven |
| AC-007 | API-11-03 screenshot; API-11-04; API-07-04 | Node window, VNC Viewer tab: `localhost:60168`, "Connected to VNC server", node desktop rendered; canvas 1920x1080; noVNC in Chromium `"status":"connected"` via `ws://localhost` | Proven |
| QR-001 | IMP-07-12; API-07-03; API-09-02; `PortBindings` in all inspects | No `5900/tcp` or `9223/tcp` bindings; the 6080 port is refused from the LAN IP | Proven |

- Fresh-start build: API-10 checked (`exit=0` after every step; `[typecheck] PASS`; `== ALL DONE`). TESTING.md requires it for `scripts/**` and `autobyteus-server-ts/docker/**`. The build-only release run does not apply: the change does not touch a release workflow, packaging, a runner, or a build step or gate.
- The Workspaces-panel GraphQL error in the API-11 screenshot comes from the older test node image (1.5.11-beta.7) against the newer app. It is version skew and unrelated to this change.
- More evidence requested: `None`.
- User check needed: `No`. Every criterion was proven on real Docker and in the real desktop app. The residual Windows-host gap needs no user check: the changed PowerShell lines are values that ran under real pwsh.
- Re-verification after later re-integration: see the Finalization Record.

## Release Decision

- Decision: `No release`
- Decided by: RELEASE.md "Release Decision" default; no release was requested.

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated` (by the implementation; delivery checked and changed nothing)
- Docs updated: `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md`, the compose files, the Docker Guide copy (en, zh-CN)

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `tickets/done/docker-node-publish-needed-ports/`

## Version / Tag / Release Commit

Not applicable.

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` now. `release-notes.md` is written for the next release that includes this ticket. Its `## What you need to do` section (reinstall the launcher, then `upgrade --all`) goes into that release's notes (RELEASE.md, Beta notes with a user action).
- Note: the public launcher install URL serves from `personal`. The bash and PowerShell launcher change is available to users who reinstall the launcher once the merge is pushed, without a tagged release.

## Escalation / Reroute

None.

## Release Notes Summary

- Release notes artifact: `tickets/done/docker-node-publish-needed-ports/release-notes.md`
- Release notes status: `Updated` (for a later release; not used now)

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Directly Usable — No Migration`
- Delivery action required: `None`
- Result and evidence: v7 state written by the real v7 launchers was read by v8, kept its ports, and lost the two unused keys at the next write (IMP-07-08; API-06b-05).

## Rollback Criteria

Revert the merge on `personal`. The public launcher then serves v7 again. Users who already recreated nodes under v8 would need to reinstall the launcher and run `upgrade --all` again to get the v7 publishing back. Their named volumes are kept by that recreate. How v7 handles v8 state that lacks the VNC and debug ports was not tested. There is no data migration.

## Finalization Record

(Filled in after the merge.)

## Final Status

- Verification complete (from the evidence): `Yes`
- Repository finalization complete: see the Finalization Record
- Applicable release/deployment/rollout complete or not required: `Not required`
- Applicable safe cleanup complete or not required: see the Finalization Record
- Unresolved blocker: `None`
- Successful terminal package eligible for return: after finalization
