# Delivery / Release / Deployment Report — mention-candidates-in-run

## Release / Publication / Deployment Scope

- Repository finalization into `origin/personal`. A release only if the user asks.
- Classification: `task_size=Medium`, `architectural_risk=Low`, direct route.

## Handoff Summary

- Handoff summary artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-candidates-in-run/tickets/in-progress/mention-candidates-in-run/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-002`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal@f48dbfbf3`
- Latest tracked remote base reference checked: `origin/personal@f48dbfbf3` (fetched 2026-10-06)
- Base advanced since bootstrap or previous refresh: `No`
- New base commits integrated into the ticket branch: `No`
- Local checkpoint commit result: `Completed` (`ee8d0b6f0`)
- Integration method: `Already current`
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`. They were not required, because nothing new was integrated, but delivery ran confirmation checks anyway:
  - `pnpm -C autobyteus-agent-presentation-contracts test` → 12/12, `dist/` drift 0
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-collaboration/collaborators tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts` → 5 files / 35 tests
  - `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fake> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts tests/e2e/projects/task-closure-root-visibility.e2e.test.ts` → 2 files / 6 tests
  - `pnpm -C autobyteus-web exec vitest run utils/collaborators stores/__tests__/chatDraftStore.spec.ts components/chat components/agentInput` → 18 files / 119 tests
- Post-integration verification result: `Passed`
- No-rerun rationale: not applicable, because the checks were run.
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`

## User Verification

- Initial explicit user completion/verification received: `Yes`
- Initial verification / acceptance reference: `user-verification-record.md` ("finalize and release a new beta", 2026-10-06)
- Renewed verification required after later re-integration: `No` (the target was unchanged)
- Renewed verification received: `Not needed`

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`. The implementation and API/E2E updates were verified, and delivery corrected stale `@` bring-in wording in server `agent_tools.md`, server `agent_orgs.md` and web `agent_orgs.md`.

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `tickets/done/mention-candidates-in-run/`

## Repository Finalization

- Bootstrap context source: `investigation-notes.md` § Bootstrap (`origin/personal`)
- Ticket branch: `codex/mention-candidates-in-run`
- Ticket branch commit result: `Completed`. Archive commit `3d4b97bd0`.
- Ticket branch push result: `Completed`
- Finalization target remote / branch: `origin` / `personal`
- Target advanced after verification / acceptance: `No` (still at `f48dbfbf3`)
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `Completed`. A clean isolated clone was used; the shared main checkout was not used.
- Merge into target result: `Completed`. `--no-ff` merge `5216e607d` ("Merge verified mention-candidates-in-run"); its tree is identical to the verified head.
- Push target branch result: `Completed` (`f48dbfbf3..5216e607d`)
- Repository finalization status: `Completed`
- Receipt: `delivery-evidence/dr-002/final-merge.log`

## Version / Tag / Release Commit

- One `bash scripts/desktop-release.sh beta` run from the clean finalized `personal` (exit 0). No stable release and no manual dispatch.
- Version `1.4.95-beta.7`. Release commit `96dc5a25f`, pushed `5216e607d..96dc5a25f`.
- Annotated tag `v1.4.95-beta.7` (tag object `a59323e96`) resolves to `96dc5a25f`. The tag push is `Completed`.
- Receipt: `delivery-evidence/dr-002/beta-release.log`

## Release / Publication / Deployment

- Applicable: `Yes`. The user requested one new beta.
- Method: `Release Script`, `bash scripts/desktop-release.sh beta`
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Not required` for publication. The beta helper takes no curated notes, and the pre-release uses generated notes. The archived `release-notes.md` stays for the next stable release.

## Hosted Publication / Rollout Verification

| Workflow | Run | Result |
| --- | --- | --- |
| Desktop Release | 37494726447 | Success |
| Android APK Release | 37494726454 | Success |
| iOS App Store Connect Release | 37494726449 | Success |
| Server Docker Release | 37494726667 | Success |

- GitHub release https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.95-beta.7 is non-draft and marked prerelease, published 2026-10-06T16:23:38Z. It has 17 assets, none empty (`github-release.json`).
- Updater metadata `latest`, `latest-mac`, `latest-linux` and `latest-linux-arm64` (assets of the beta.7 release) all report `version: 1.4.95-beta.7` (`updater-metadata/`).
- Docker `autobyteus/autobyteus-server:1.4.95-beta.7` has digest `sha256:dad910f4f227c419d4b1c9705e8d964a606f66b35f35097c00dcac3021a83558` (linux/amd64 and linux/arm64; `docker-version-manifest.txt`).
- **Docker `:beta` was left on the beta.6 digest, by design.** A parallel delivery (Codex native-agent suppression, `8b6edb103`) released `v1.4.95-beta.8` (`30c3f40d5`) at 16:27, on top of our `96dc5a25f`.
  - When the beta.7 job's "Move beta tag" step ran, beta.7 was no longer the newest tag, so it logged "Left `autobyteus/autobyteus-server:beta` unchanged" (`docker-beta-tag-decision.log`; snapshot in `docker-beta-manifest.txt`).
  - `v1.4.95-beta.8` contains merge `5216e607d` (ancestry verified). The beta channel (desktop updater, and Docker `:beta` once the beta.8 job finishes) therefore delivers this change through beta.8.
  - The beta.8 rollout belongs to that other delivery and is not claimed here.
- `workflows-final.json` records all four beta.7 runs.

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-candidates-in-run`
- Worktree cleanup result: `Completed`. Removed after verifying that its head `3d4b97bd0` is in `personal`; only the untracked SDK `dist/` build output was discarded.
- Worktree prune result: `Completed`
- Local ticket branch cleanup result: `Completed`
- Remote branch cleanup result: `Completed` (`origin/codex/mention-candidates-in-run` deleted)
- Shared main checkout: fast-forwarded to `96dc5a25f` with `--ff-only`. Its unrelated tracked uncommitted diff was preserved (same checksum).
- The isolated finalization clone and the temporary log folder are removed after the receipt commit is pushed.
- The tutorial-video files were kept, at the user's request ("no need to delete").

## Environment Or Persisted-Data Transition Notes

- No persisted-data change. Saved notes of every form still parse (REQ-004).
- Delivery action required: `None`

## Rollback Criteria

- Revert merge `5216e607d` on `personal` and cut a new beta. Never move or delete published tags. There is no data migration.
- Not verified: an older build may show the raw note text for messages saved with the new "already in this run" note form. This is cosmetic.

## Final Status

- Explicit user testing/verification complete: `Yes` (`user-verification-record.md`)
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes`. beta.7 is published and verified; `:beta` follows the newer beta.8, which includes this change.
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to `/solution_designer`: sent after this receipt commit is pushed.
