# Delivery / Release / Deployment Report — autobyteus-305, build step 4 (desktop: node version and "Update to <version>")

This report holds the latest delivery round (DR-004, step 4). Earlier reports are in git: DR-001 at `77fb8bf2d1`, DR-002 at `6b34f900b6`, DR-003 (step 3 and beta v1.5.11-beta.6) at `1bed6deeaf`.

## Release / Publication / Deployment Scope

Repository finalization of build step 4 of 5 into `personal`. No release: none was requested for this step, and RELEASE.md's default is no release.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` on `origin/personal` @ `1bed6deeaf`, read in the ticket worktree.
- Deviations: none for the guide. As in earlier rounds, the ticket folder stays in `tickets/in-progress/`, and the worktree and branch are kept (step 5 remains).
- Proposed guide fixes: the DR-003 proposal still stands (a beta whose change needs a user action adds that action to the generated notes); no new one.

## Handoff Summary

- `handoff-summary.md` (`Updated`); `delivery-revision-record.md`, current `DR-004`.
- `Large` / `High`, route `Reviewed`. Classification unchanged by delivery.

## Initial Delivery Integration Refresh

- Bootstrap base and latest tracked remote base: `origin/personal` @ `1bed6deeaf`; not advanced.
- Integration method: `Already current`. Local checkpoint: `Not needed` (the code reviewer's records go into the delivery commit).
- Post-integration executable checks: confirmation on the delivered state, DEL-11 (`evidence/DEL-11-step4-delivery-checks.log`):
  - `vitest run components/settings/nodes … nodeServerUpdateStore.spec.ts dockerNodeLauncherCommands.spec.ts` `Test Files 6 passed / Tests 48 passed`;
  - `guard:web-boundary` and `guard:localization-boundary` `Passed`;
  - server `tests/unit/node-update tests/unit/remote-access` `Tests 71 passed`;
  - `test:starter` `# pass 49 / # fail 0`;
  - licensing, hygiene, Secret Gate PASS.
- No-rerun rationale for the full suites: nothing integrated. IMP4-01 (web suite, 4889 tests) and IMP4-02 (guards and typecheck) ran on code `deead7bf05`, identical to HEAD outside `tickets/`.
- Result: `Passed`. Delivery edits started on the current state: `Yes`.

## Verification

- Evidence judged: `Sufficient`.
- Evidence relied on: the execution report (API-REV-004) and its Cases, IMP4-01..06, and DEL-11.

| Acceptance-Criteria ID | Cases And Evidence | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (click → the node runs B in the same container and image; the desktop shows B and "updated") | API-41 items 3 and 5 (`API-41-desktop/drive-log.jsonl`, `API-41-G-*.png`, `API-41-H-*.png`) | `Downloading 1.5.11-beta.6…` for 82 s → `Preparing…` → `Restarting…` → `Server 1.5.11-beta.6 Updated to 1.5.11-beta.6.`; same container and image; a host-started update followed after reopening | Proven |
| AC-009 (desktop request accepted and logged with its client address; phone refused; no agent tool) | API-41 item 3 (node log `"requestedFrom":"172.17.0.1"`), API-40 (IMP4-06 phone 403 on POST and GET; no-tool grep), round 2 API-21 | As stated | Proven |
| AC-010 (nothing changes until the user acts) | API-41 item 8 (`requests.json`) | `"minutes":24,"iGets":4,"iPosts":0`; the only POSTs are the four clicked nodes, one each | Proven |
| REQ-011 on the desktop (version, progress, result, why not) | API-41 items 1–7 | Failure with the old version back and the button kept (F); `NEEDS_NEW_IMAGE` with Copy command, `"after":"Copied"` (L, run 2); 5-minute outage → `Not reachable. Last known: …` → recovered within one 10 s poll after `docker start` (R2); zh-CN render; pre-starter node `Not reachable.` (P) | Proven |
| AC-004, AC-005 on the desktop | API-41 items 1, 2 | Texts as above; node outcomes as round 3 | Proven |
| AC-007 | — | Step 5 | Not in step 4 |

- Run 1's 3 `CHECK FAIL`s were fixture faults, redone in run 2 with 0 failures: the copy text was read synchronously although the copy is asynchronous, and a random host port changed on `docker start`.
- Confidence 94.7%, no category below 90%. The gap is non-durable real-app journeys (a packaged app plus Docker in CI), with unit coverage using fake timers. Accepted: a further round could not turn these journeys into durable CI coverage inside this ticket.
- Visible-behavior basis: every row state is settled by the design (row states, DEC-018, DS-005) or by ARCH-REV-005 N-4 (an `error` answer, and a failed GET → "Not reachable."). So no `Requirement Gap`. The product observations go to the Solution Designer (handoff summary).
- More evidence requested: `None`. User check needed: `No`.

## Release Decision

- Decision at finalization: `No release` (RELEASE.md default; not requested then). Afterwards, the user asked for a beta: **`Beta` v1.5.11-beta.7** (DR-005, below).

## Docs Sync Result

- `docs-sync-report.md`: `Updated` (`autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docs/features/remote_access.md`).

## Ticket State Transition

- Not moved (step 5 remains).

## Repository Finalization

- Ticket branch commit / push: `Completed`: `5c545a7bc8` (Secret Gate PASS before the push)
- Finalization target: `origin` / `personal`; target advanced after verification: `No`
- Merge into target: `Completed`: `--no-ff` merge `db0881a96e`, Secret Gate PASS on the merged state, tree equal to the verified ticket branch
- Push target branch: `Completed`: `1bed6deeaf..db0881a96e`
- Repository finalization status: `Completed`

## Final Status

- Verification complete: `Yes`; repository finalization complete: `Yes`; release: `Completed` (beta v1.5.11-beta.7, 4/4 workflows, 23/23 assets, first real in-place update proven); cleanup: `Not required` (step 5 continues)
- Unresolved blocker: `None`; successful terminal package eligible for return: `Yes`

## Release / Publication / Deployment

- Applicable: `Yes`, after finalization: the user asked for a beta ("there is no beta release for this? i think we need a beta release", 2026-10-31). This is round DR-005 of this report.
- Method: `Project Release Guide` (as in DR-003).
- Checks before tagging, on `8e463448be` (`evidence/DEL-12-beta7-pretag-checks-and-release-smoke.log`): licensing consistent; hygiene passed; `scripts/check_secrets.sh v1.5.11-beta.6..HEAD` PASS (8 commits).
- **Release smoke and the user's Grok waiver for beta.7** ("yes Waive grok"):
  - Run 1 aborted the live suite because the Grok CLI did not offer the pinned `grok-4.7` (`grok model grok-4.7 is not offered; available: grok-4.5, grok-4.6`; the known flaky pin, FU-005 of `tickets/done/work-journal-neutral-vocabulary`). Antigravity and AutoByteus passed.
  - Run 2 (started by `release_smoke.py --help`, which takes no arguments): Claude 3/3, Codex 3/3, Antigravity 2/2, AutoByteus 2/2 PASS; Grok 0/3 refused by its quota (`free-usage-exhausted`, 604934/600000 tokens), as for beta.6.
- Build-only release run `41169372699` on `8e463448be`: success on all five desktop targets (`evidence/DEL-13-beta7-build-only-run.log`).
- Version / tag / release commit: `chore(release): bump workspace release version to 1.5.11-beta.7` `8faae96899`, tag `v1.5.11-beta.7`; `personal` re-fetched (still `8e463448be`) and pushed `8e463448be..8faae96899`; tag pushed 05:05:50 UTC.
- Pipelines, all **success** (`evidence/DEL-15-beta7-rollout.log`): Desktop `41171202589`, Android `41171202588`, iOS `41171202636`, Server Docker `41171202581` incl. Publish Server Package `linux/amd64` and `linux/arm64`.
- Published artifacts: pre-release, not draft, **23/23 assets** incl. the six `autobyteus-server-1.5.11-beta.7-linux-{arm64,x64}.*`; GitHub "Latest" remains `v1.5.10`; Docker `:1.5.11-beta.7` = `:beta` (`sha256:8bcf8eabfafe…`), `:latest` unchanged.
- **First real in-place update** (`evidence/DEL-14-first-real-in-place-update-beta6-to-beta7.log`): the test-owned container `ab305-b7-inplace` (fresh volumes, never the user's nodes) on the published `1.5.11-beta.6` image ran `cli.mjs update --track beta`.
  - The starter resolved `1.5.11-beta.7` from GitHub, downloaded and verified it with the production key, passed the self-check, switched and confirmed: `checking` 0 s → `downloading` 2 s → `preparing` 33 s → `confirming` 42 s → `succeeded` 103 s, "Updated to 1.5.11-beta.7.".
  - The old server exited at 05:48:54.067; the new one started at 05:48:54.073.
  - Same container (`757b6b56b583`) and same image (`68965197f9b2`). The server runs from `/home/autobyteus/server-packages/packages/1.5.11-beta.7` (`source: installed`). Health ok, C1 `version 1.5.11-beta.7`, the data marker kept, no key material in the node log. Removed afterwards.
- Release notes handoff result: `Used`. Generated notes, with the ticket's `release-notes.md` (step-4 version) added above them by `gh release edit` after all workflows finished (the DR-003 deviation, repeated).
- Release/publication/deployment result: `Completed`

## Post-Finalization Cleanup

- Worktree and branch: `Not required` (kept for step 5). Delivery created no containers or images in this round.

## Release Notes Summary

- `release-notes.md` rewritten for the release that ships step 4. It covers the Nodes page update, the restart note, and why old nodes show "Not reachable." with the reinstall and `upgrade --all` commands. Status: `Updated` (not used yet; no release).

## Environment Or Persisted-Data Transition Notes

- Not changed by step 4.

## Rollback Criteria

- Before a release: revert the merge on `personal`. After a release: RELEASE.md rules; the desktop line only reads C1 and sends the update on a click.
