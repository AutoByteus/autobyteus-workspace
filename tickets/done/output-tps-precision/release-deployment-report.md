# Delivery / Release / Deployment Report — output-tps-precision

## Release / Publication / Deployment Scope

Finalize the per-call TPS change (`task_size=Large`, `architectural_risk=High`, route Reviewed) into `origin/personal` and publish it as beta `v1.5.4-beta.1`, which the user chose.

## Project Release Guide

- Release guide: `RELEASE.md` at repository root, revision `3514fe48ea`. Followed throughout:
  - finalize branch with a `--no-ff` merge;
  - pre-tag checks;
  - `desktop-release.sh beta --no-push`;
  - a fetch check before the push;
  - watching all four workflows and checking the 17 assets.
- Deviations from the guide and why: none.
- Proposed guide fixes: none for RELEASE.md. The `TESTING.md` agy recipe gap is recorded under Docs Sync.

## Handoff Summary

- Handoff summary artifact: `tickets/done/output-tps-precision/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/output-tps-precision/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal@1ea74caa2d`
- Latest tracked remote base reference checked: `origin/personal@214eaedc86`. Its 4 new commits are the stable v1.5.3 release: `.github/release-notes/release-notes.md`, `autobyteus-web/package.json` and a ticket folder.
- Base advanced since bootstrap: `Yes`
- New base commits integrated into the ticket branch: `Yes`. The base changes have no file overlap with the ticket.
- Local checkpoint commit result: `Completed` (`3bfcf88b94`). The untracked build `dist/` folders were excluded.
- Integration method: `Merge` (`d0849f1709`)
- Integration result: `Completed`, a clean merge.
- Post-integration executable checks rerun: `Yes`. Logs are in `evidence/delivery/`:
  - P1: server TPS unit set (`codex/`, `shared/`, model-call-throughput, the ACP/AGY/Claude throughput tests, the token-usage fold): 28 files / 354 tests pass;
  - P2: `pnpm -C autobyteus-server-ts typecheck`: pass;
  - P3: `autobyteus-ts` `llm-call-throughput.test.ts`: 7 tests pass;
  - P4: web Token Meter specs (`components/workspace/usage`, `tokenUsageMeterStore`, `tokenUsageThroughput`, `useTokenUsageWorkspaceScope`): 5 files / 62 tests pass;
  - P5: `codex-model-call-timing.test.ts` after the ticket move and the C-010 repoint: 7 tests pass;
  - P6: full `pnpm -C autobyteus-server-ts test:unit` after the move: 693 files / 5,494 tests pass, 4 files / 7 tests skipped.
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on:
  - API-REV-002 Pass, 95% confidence. No category is below 90%, and every critical AC (AC-001 to AC-010) is directly proven.
  - Evidence files I opened myself:
    - `round2/desktop/D01/D01-result.json` and `D01-2-reading-help.png`: native DeepSeek single call; the card shows 125.0 tokens/s = 171 tokens / 1.368 s, matching the server's `output_throughput` frame (AC-001, AC-007, AC-008).
    - `round2/live/codex/API-L04-codex-tool.json`: Codex tool-ending call reads 110 tok / 1,529 ms end to end; the `run_bash` tool window from 3,284 to 6,174 ms is excluded (AC-004).
    - `round2/live/codex-approval/vitest.log`: API-L08 pass. The first attempt's failure in `round2/live/codex/vitest.log` is the recorded test-setup issue, since fixed.
    - `round2/live/deepseek/vitest.log`: API-L09 pass.
    - `round2/desktop/D03/D03-result.json`: Org lead and crew member each get their own reading (AC-005).
    - `live/agy/API-L06-agy-thinking.json`: thinking 3,138 within output 3,284 (RSK-005).
    - `round2/repo/R04-server-integration.log`: the only failures are the 2 known baseline cases in `agent-status-websocket.integration.test.ts` that TESTING.md lists.
  - All five runtimes ran live, and the desktop journeys D01, D02 and D03 ran in the real app. Nothing was mocked in round 2.
  - Integrated-state rerun: P1–P6 above.
- More evidence requested: `None`
- User check needed: `No`. API/E2E reports no behavior that only the user can check. The Codex desktop journey on the IR-002 build was not run (the user has no Codex tokens). The renderer is runtime-agnostic, and the Codex server path is proven live in L03, L04 and L08.
- Re-verification after later re-integration: `Not needed`. `origin/personal` stayed at `214eaedc86` from verification to push.

## Release Decision

- Decision: `Beta`
- Decided by: the user, 2026-10-14, during delivery: "i think we could release a a beta".

## Docs Sync Result

- Docs sync artifact: `tickets/done/output-tps-precision/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-web/README.md` (C-004), `autobyteus-web/docs/token_meter.md` (AGY thinking inside output), `TESTING.md` (agy 1.3.5 isolation gap). The implementation had already updated `token_usage.md` and `agent_execution_architecture.md`; delivery confirmed them accurate.

## Ticket State Transition

- Ticket moved to `tickets/done/output-tps-precision`: `Yes` (`git mv`, in commit `5fe746ab5c`)
- Archived ticket path: `tickets/done/output-tps-precision/` on `origin/personal`
- C-010: `codex-model-call-timing.test.ts` now reads `tickets/done/output-tps-precision/evidence/api-e2e/live/{codex,codex-repeat}/codex-wire.jsonl`, the same pattern as the `token-meter-accuracy` probes. Rerun passed (P5, P6).

## Version / Tag / Release Commit

- `bash scripts/desktop-release.sh beta --branch finalize/output-tps-precision --no-push` created release commit `8f9cb37d65` ("chore(release): bump workspace release version to 1.5.4-beta.1"; `autobyteus-web/package.json` → `1.5.4-beta.1`).
- Annotated tag `v1.5.4-beta.1`: tag object `f6d28a5673`, pointing at `8f9cb37d65`.
- Version is the first beta after stable v1.5.3 (`release_versions.py next-beta` → `1.5.4-beta.1`). The release helper's Android version-code guard passed.

## Repository Finalization

- Bootstrap context source: the code_reviewer handoff (branch `codex/output-tps-precision`, base `origin/personal@1ea74caa2d`) and RELEASE.md (target `origin/personal`).
- Ticket branch: `codex/output-tps-precision`
- Ticket branch commit result: `5fe746ab5c` (delivery docs, test repoint, archive). It sits on the checkpoint `3bfcf88b94` and the merge `d0849f1709`.
- Ticket branch push result: pushed to `origin/codex/output-tps-precision`.
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification: `No` (`214eaedc86` at both fetches)
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `finalize/output-tps-precision` created from `origin/personal@214eaedc86`.
- Merge into target result: `--no-ff` merge `f5bc9b02ef`, followed by release commit `8f9cb37d65`.
- Pre-tag checks on the merged state:
  - `python3 scripts/check_licensing.py`: consistent;
  - `python3 scripts/check_repository_artifact_hygiene.py`: exit 0, longest tracked path 200 characters (a pre-existing path; this ticket's longest is shorter), no Windows-invalid names. Log: `evidence/delivery/pre-tag-hygiene.log`.
- Build output: no `*/dist/` from the untracked build folders was committed; those folders were deleted before the release script ran. The only `dist/` changes committed are the already-tracked contract builds of `autobyteus-agent-presentation-contracts` and `autobyteus-team-stream-contracts`, as in earlier contract changes. `autobyteus-server-ts/db/test.db` (it holds the imported provider keys) is gitignored and was never staged.
- Push target branch result: `214eaedc86..8f9cb37d65 HEAD -> personal`, after a fetch confirmed `origin/personal` had not moved.
- Repository finalization status: `Completed`

## Release / Publication / Deployment

- Applicable: `Yes`
- Method: `Project Release Guide`, using the release script with `--no-push` and manual pushes.
- Method reference / command: `bash scripts/desktop-release.sh beta --branch finalize/output-tps-precision --no-push`; `git push origin HEAD:personal`; `git push origin v1.5.4-beta.1`.
- Pipelines triggered and their results (all `success`; evidence in `evidence/delivery/release/run-*.json`):

  | Workflow | Run | Result |
  | --- | --- | --- |
  | Desktop Release | 38546698352 | success |
  | Android APK Release | 38546698242 | success |
  | iOS App Store Connect Release | 38546698213 | success (Archive And Upload To App Store Connect: success) |
  | Server Docker Release | 38546698238 | success |

- Published artifacts checked against what the release should produce:
  - The GitHub pre-release https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.5.4-beta.1 has `isPrerelease=true`, is not a draft, and has exactly **17 assets**:
    - macOS arm64 and x64: dmg, zip and both blockmaps each;
    - Linux x64 and arm64 AppImages;
    - Windows exe;
    - the Android APK and its `.sha256`;
    - `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml`. `latest-mac.yml` reports `version: 1.5.4-beta.1`.
  - Docker Hub: `autobyteus/autobyteus-server:1.5.4-beta.1` and `:beta` share digest `sha256:6dfe389efee18970b13f3cc401c23669f32a7d7f52c0ef301c65805c2cd45df1` (amd64 and arm64). `:latest` stays on stable v1.5.3 (`sha256:01416762…`), as it should for a beta.
  - Evidence: `evidence/delivery/release/github-release.json`, `docker-tags.jsonl`.
- Release/publication/deployment result: `Completed`. All four workflows succeeded, so this is not a partial release.
- Release notes handoff result: `Not required` for publication. Beta tags always use GitHub generated notes. `release-notes.md` is prepared for the next stable release.

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision`
- Cleanup plan, after this report's commit is pushed:
  - remove the worktree; this also deletes the gitignored `db/test.db` with the imported keys;
  - prune worktrees;
  - delete the local branches `codex/output-tps-precision` and `finalize/output-tps-precision`;
  - keep the remote branch `origin/codex/output-tps-precision`, following the existing `codex/*` remote-branch practice.
- The actual cleanup result is recorded in the receipt at `/Users/normy/autobyteus_org/autobyteus-delivery-records/output-tps-precision/final-repository-receipt.json`, because the worktree no longer exists afterwards.

## Release Notes Summary

- Release notes artifact: `tickets/done/output-tps-precision/release-notes.md`. It is user-facing and has no internal IDs.
- Archived release notes artifact used for release/publication: not used. The beta uses generated notes; the file is ready for the next stable release.
- Release notes status: `Updated`

## Deployment Steps

No hosted service is deployed. The server rollout is the published Docker image: users on `--tag beta` get `1.5.4-beta.1` through `autobyteus-docker upgrade --all --tag beta`. Desktop installs with **Receive beta updates** enabled are offered the update through the updater metadata.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: Not Affected. No TPS is stored, and there are no schema or migration changes.
- Delivery action required: `None`

## Verification Checks

- P1–P6 post-integration (above).
- Pre-tag licensing and hygiene checks on the merged state (above).
- The four release workflows succeeded, there are 17 assets, the Docker tags and digests match, and the updater metadata version is correct (above).

## Rollback Criteria

- If the beta shows wrong or missing TPS readings, or any regression in Token Meter accounting: revert merge `f5bc9b02ef` on `personal` and cut `v1.5.4-beta.2`.
- Desktop updates never downgrade. Docker beta users can pin `1.5.3`.
- No persisted data is involved, so rolling back carries no data risk.
- Never move or delete `v1.5.4-beta.1`.

## Follow-Ups Recorded

These were sent to `/project_task_manager` and created as TODO Project Tasks:

- Token Meter number locale: `project_task_eabc71e7-1d69-46d6-b8f6-ce0064eb83b9`
- Unified agent-run data model: `project_task_14ea935d-20a5-498f-9644-07a769886c98`
- Codex generation-speed upgrade, if evidenced: `project_task_c2eca458-24a6-46e1-b09d-e51f41e0759c`
- Isolated signed-in agy for live tests: `project_task_4edf6ba2-a981-4f2b-a962-c23382e8bd0b`

## Final Status

- Verification complete (from the evidence): `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete: `Yes` (beta `v1.5.4-beta.1`, all 4 workflows, 17 assets)
- Applicable safe cleanup complete: see the receipt; it is done right after this commit.
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`, after the cleanup receipt confirms the cleanup.
- Terminal package sent to `/software_engineering_team/solution_designer`: recorded in the receipt and in DR-001's terminal reference.
