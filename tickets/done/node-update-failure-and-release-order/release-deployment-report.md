# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

Ticket `node-update-failure-and-release-order` (Project Task autobyteus-412): a node card drops an automatic-update failure the node has passed (FU-003), and Desktop Release publishes the `latest*.yml` updater files only after the server packages (FU-004). `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed`. Scope of this delivery: integration refresh, verification from the evidence, docs sync, finalization into `origin/personal`, cleanup. No release (Release Decision below).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` as on the ticket branch after merging `origin/personal` @ `933163361c` (the ticket's own edits in `df789a89a5` included), read in the ticket worktree
- Deviations from the guide and why:
  - **Build-only release run not run.** RELEASE.md's Build-only release run section lists "a release workflow (`.github/workflows/release-*.yml`)" among the changes that need `pnpm release:test --ref <ticket-branch>` before the merge, and this ticket changes `release-desktop.yml`. Not run, because:
    - the change is confined to the `publish-release` job (two `files` lists shortened, two new steps after them). That job's `if:` requires a tag ref or `publish_release == 'true'`, so the build-only run skips it and cannot execute a single changed line;
    - the guide's source rules, DESIGN.md rule 12 and TESTING.md ("A change to a build step or gate also needs the build-only release run"), scope it to a build step or gate. No build step or gate changed, and the step reads no build output;
    - what the run would otherwise show is proven: the workflow parses (actionlint 1.7.12 with shellcheck, clean, API-03); the build jobs are unchanged and the macOS arm64 build passes from a fresh clone (API-02); the steps' logic and the publish job's structure are covered by `test_desktop_release_server_package_wait.py` (11 tests, which fail 10 on the base workflow, IMP-10 B); the updater file paths match the download layout (`actions/download-artifact@v4` with no name → `release-artifacts/<artifact-name>/`; artifact roots are `autobyteus-web/electron-dist/`).
    - The design spec (Guidance For Implementation), implementation handoff and API/E2E report reached the same conclusion.
  - The real proof of the order is the asset `createdAt` check on the first tag (AC-005, RSK-002), which the guide already names.
- Proposed guide fixes, and whether the user agreed:
  - Build-only release run: change "a release workflow (`.github/workflows/release-*.yml`)" to "a build job or gate step of a release workflow (`.github/workflows/release-*.yml`); a change confined to the publish job, which the build-only run skips, is proven by its step test and checked on the next tag", so the guide matches DESIGN.md rule 12 and TESTING.md. Not changed: it is a project rule, and the user has not been asked.

## Handoff Summary

- Handoff summary artifact: `tickets/done/node-update-failure-and-release-order/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/node-update-failure-and-release-order/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: —

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `6225a734a3`
- Latest tracked remote base reference checked: `origin/personal` @ `933163361c` (`git fetch origin personal`, 2026-11-07)
- Base advanced since bootstrap or previous refresh: `Yes` (autobyteus-427, phone conversation file link: `autobyteus-web` workspace/mobile components, `TESTING.md`, `docs/design-cases.md`, its ticket folder)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Not needed` (the worktree was clean apart from untracked build output `*/dist/`; head `b63568eaa9` already committed)
- Integration method: `Merge` (`git merge --no-ff origin/personal`) → `8ffbcd361c`
- Integration result: `Completed`, no conflicts. Only shared file `docs/design-cases.md` auto-merged: 427's Case 2 entry and 412's Case 10 entry both kept
- Post-integration executable checks rerun: `Yes`, DEL-01 (`evidence/DEL-01-post-integration-rerun.log`) on `8ffbcd361c`:
  - `pnpm -C autobyteus-web exec vitest run --config ./electron/vitest.config.ts electron/nodeAutoUpdate` → `Tests  88 passed (88)`, EXIT 0
  - `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run components/settings/nodes` → `Tests  67 passed (67)`, EXIT 0
  - `python3 -m unittest scripts/tests/test_desktop_release_server_package_wait.py` → `Ran 11 tests`, `OK`, EXIT 0
- Post-integration verification result: `Passed`. The base touched no file of this change's code paths.
- No-rerun rationale: N/A
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`
- Blocker: —

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: the execution report's Acceptance-Criteria Proof and Cases (API-REV-001), the files below opened and checked; final confidence 95% (target 95% met), every category ≥ 93%; broader validation on an isolated packaged desktop built from a fresh clone with a test-owned Docker node behind a logging proxy. Mocked: the seeded `AUTO_FAILED` entry (a real one needs the race this ticket removes) and `gh`/`sleep` in the step tests.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement (`Proven`/`Not Proven`/`User Check`) |
| --- | --- | --- | --- |
| AC-001 | API-06 `API-06-proxy.log`, `API-06-record-after.json`; API-07 `API-07-run2-first-view.json`, `API-07-run2-record-after.json`; API-08 `API-08-record-after.json`, `API-08-proxy.log`; API-09 `API-09-record-after.json`, `API-09-proxy.log` | `"ua":"node"` rechecks `?target=1.5.12-beta.7`; records `{"entries": {}}` (no `AUTO_UPDATED`); no `POST /rest/node-update` in API-08/09; API-09 cleared by the pass with no window | Proven |
| AC-002 | API-10 `API-10-proxy.log`, `API-10-node-answers.txt`, `API-10-record-after.json` | Pass `?target=1.5.12-beta.7` at 20:27:27.787Z leaves the entry; after the Nodes view `"ua":"node"` `?target=1.5.12-beta.3` at 20:27:54.369Z; node `"relation":"older"`; record `{"entries": {}}` | Proven |
| AC-003 | API-06 `API-06-card-timeline.jsonl`; API-07 run 2; API-08 `API-08-first-view.json` | Line stays through `"Restarting…"`, then `"notice": "Updated to 1.5.12-beta.7."`, `"autoFailedLine": null`; API-07 `added` .252Z / `removed` .280Z with `"sameDocument": true` (no reload) | Proven |
| AC-004 | API-04 `API-04-card-final.json`, `API-04-proxy.log`; API-05 `API-05-proxy.log` | Card `Server 1.5.12-beta.3` with the beta.7 failure line; the only POSTs are `/graphql`; no `POST /rest/node-update` in API-05 with the switch on | Proven |
| AC-005 | API-03 `API-03-step-tests-actionlint.log`; IMP-07, IMP-10 B | `Ran 54 tests`, `OK`, `EXIT 0`; actionlint `EXIT 0` with no findings | Proven for the wait logic. The real asset order: on the first tag (RSK-002), planned so in the requirements |
| AC-006 | API-03, IMP-07 | Timeout path: fails naming the tag and missing files, no updater upload | Proven |
| AC-007 | API-03, IMP-07 | Ref without `system-level.json` does not wait | Proven |
| AC-008 | CRR-001; delivery docs sync | RELEASE.md order, check and recovery match the workflow | Proven |
| AC-009 | API-02 `API-02-verify-steps.log`, `API-02-fresh-build-excerpt.log`; IMP-04/06; API-04 | `Build completed`, `PRISMA VERIFY OK`, `TERMINAL VERIFY OK`, `EXIT 0`; switch `aria-checked="false"` by default | Proven |

- More evidence requested (from whom, what, result): `None`
- User check needed: `No`. Every part was driven on an isolated desktop and a test-owned node; the user's nodes were not contacted; the user did not ask to check. AC-005's real order needs a tag, which is a release decision, not a user check.
- User check reference, when needed: —
- Re-verification after later re-integration: `Not needed` (`origin/personal` stayed at `933163361c` through the final push)

## Release Decision

- Decision: `No release`
- Decided by: the bootstrap handoff ("Release only on the user's word") and RELEASE.md's default ("No release … the default when the user does not ask for one"). The user has not asked. A beta (`v1.5.12-beta.8`, `python3 scripts/release_versions.py next-beta`) or stable release is available on request.

## Docs Sync Result

- Docs sync artifact: `tickets/done/node-update-failure-and-release-order/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `RELEASE.md`, `autobyteus-web/docs/electron_packaging.md`, `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/github-actions-tag-build.md` (all in `df789a89a5`, confirmed by delivery; the last is outside the design's list and confirmed needed and accurate). Also changed by its owner: `docs/design-cases.md` (Solution Designer)
- No-impact rationale: N/A

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes` (commit `9561637ce2`)
- Archived ticket path: `tickets/done/node-update-failure-and-release-order/`

## Version / Tag / Release Commit

None: no release. `autobyteus-web/package.json` stays `1.5.12-beta.7`; no tag.

## Repository Finalization

- Bootstrap context source: `handoff-architecture-design-complete.md` (worktree, branch, base `origin/personal` @ `6225a734a3`, target `origin/personal`) and RELEASE.md Finalization Target
- Ticket branch: `codex/node-update-failure-and-release-order`
- Ticket branch commit result: `Completed`, `9561637ce2` (delivery docs and archive), on top of merge `8ffbcd361c`
- Ticket branch push result: `Completed`, `origin/codex/node-update-failure-and-release-order` @ `9561637ce2`, after the Secret Gate (`scripts/check_secrets.sh origin/personal..codex/node-update-failure-and-release-order`: 9 commits, PASS, exit 0) and the hygiene check (`python3 scripts/check_repository_artifact_hygiene.py`: passed, exit 0; no ticket path has a Windows-hostile character or exceeds 200 characters)
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: `No` (`origin/personal` @ `933163361c` at each fetch: after verification, before the merge, before the push)
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `Completed`, `finalize/node-update-failure-and-release-order` from `origin/personal` @ `933163361c`
- Merge into target result: `Completed`, `git merge --no-ff` → `f3079ff2f8`; Secret Gate on the merged state PASS (10 commits, exit 0)
- Push target branch result: `Completed`, `933163361c..f3079ff2f8  HEAD -> personal`, after a fetch confirmed `origin/personal` had not moved. This report and `delivery-revision-record.md` follow in a records commit on `personal`, pushed the same way.
- Repository finalization status: `Completed`
- Blocker: —

## Release / Publication / Deployment

- Applicable: `No`
- Method: N/A
- Method reference / command: N/A
- Pipelines triggered and their results: none (no tag pushed; pushes to `personal` start no release workflow)

| Failed Run And Job | Classification (`Platform`/`Ours`) | Log Lines That Show The Cause | Action (rerun, or handed to whom) | Result |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

- Published artifacts checked against what the release should produce: N/A
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` now; `tickets/done/node-update-failure-and-release-order/release-notes.md` is ready for the release that ships this change
- For the first release that contains this change (whoever delivers it): after the four workflows succeed, run `gh release view <tag> --json assets --jq '.assets[] | [.createdAt, .name] | @tsv' | sort` and check that every `latest*.yml` is newer than all six `autobyteus-server-*` files (AC-005, RSK-002; RELEASE.md Watching The Rollout). If "Wait for the server packages" fails, follow RELEASE.md Recovery "The server packages are missing" (RSK-001, intended).
- Blocker: —

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-update-failure-and-release-order`
- Worktree cleanup result: `Completed` after the records commit was pushed: `git worktree remove --force` from the main checkout (`--force` only for the untracked build output `*/dist/`, which RELEASE.md says is never committed)
- Worktree prune result: `Completed` (`git worktree prune`)
- Local ticket branch cleanup result: `Completed`: local `codex/node-update-failure-and-release-order` and `finalize/node-update-failure-and-release-order` deleted (both contained in `origin/personal`)
- Remote branch cleanup result: `Not required` (the project keeps ticket branches)
- Probe, isolated-instance and Docker cleanup (API/E2E's): already done, receipts in the execution report's Temporary Methods And Cleanup
- Blocker: —

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `tickets/done/node-update-failure-and-release-order/release-notes.md` (written during delivery, before finalization)
- Archived release notes artifact used for release/publication: N/A (no release)
- Release notes status: `Updated`

## Deployment Steps

None. The node-card fix reaches users with the next desktop release. The release-order fix takes effect on the next tag, since the workflow runs from the tagged revision.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Directly Usable — No Migration` (`node-auto-updates.json` shape unchanged)
- Delivery action required: `None`
- Result and evidence: existing stale entries (such as the user's RUN-01 beta.7 entries) are cleared by the normal rule at the first check after the fixed build runs (QR-002; API-04..API-10 on an RUN-01-shaped record)

## Verification Checks

- Secret Gate on the ticket range and on the merged state: PASS (exit 0)
- Repository artifact hygiene: passed (exit 0)
- No checks before tagging: no tag

## Rollback Criteria

Revert merge `f3079ff2f8` on `personal`. The record change needs no data rollback (no shape change; removed entries were stale). Reverting the workflow restores the old upload order. Once released, roll back by reverting and cutting a new release (RELEASE.md Rollback).

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes` (not required)
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: `Yes`
- Terminal message/reference: `Delivery Completed` to `/software_engineering_team/solution_designer`
