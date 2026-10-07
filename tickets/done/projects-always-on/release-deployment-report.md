# Delivery / Release / Deployment Report — projects-always-on

## Release / Publication / Deployment Scope

- Repository finalization into `origin/personal`.
- Release (desktop beta via `scripts/desktop-release.sh beta`) only if the user asks for it at verification. `scripts/check_repository_artifact_hygiene.py` is run before any tag.
- Classification: `task_size=Medium`, `architectural_risk=Low`, direct route. Review gates are `Not Applicable — direct low-risk route`.

## Handoff Summary

- Handoff summary artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/delivery-revision-record.md`
- Current delivery revision ID: `DR-002`
- Notes: DR-001 was the pre-verification state. DR-002 covers verification, finalization, beta `v1.4.96-beta.5` and cleanup. A stable `v1.4.96` was requested afterwards and is recorded as DR-003.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal@93d1b18b4`
- Latest tracked remote base reference checked: `origin/personal@93d1b18b4` (fetched 2026-10-07)
- Base advanced since bootstrap or previous refresh: `No`
- New base commits integrated into the ticket branch: `No`
- Local checkpoint commit result: `Completed`. `8a1ed4647` contains the PMU-016 probe change, the Projects probe `finally` restore with diagnostics, and the API/E2E artifacts. The SDK `dist/` was excluded, and the secret-pattern scan was clean.
- Integration method: `Already current`
- Integration result: `Completed`
- Post-integration executable checks rerun: `No` (not required). A delivery smoke run passed:
  - `node --check` on `project-manager-ux-probe.mjs` and `projects-feature-probe.mjs` → OK;
  - `pnpm -C autobyteus-web test:nuxt components/projects stores utils/projects components/settings components/layout composables/projects --run` → 149 files / 1294 tests pass;
  - `python3 scripts/check_repository_artifact_hygiene.py` → pass. Untracked ticket paths were also checked: none over 200 characters.
- Post-integration verification result: `Passed`
- No-rerun rationale: no base commits were integrated, so the API/E2E-validated state is the integrated state. Delivery edits are docs only.
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`
- Blocker: None

## User Verification

- Initial explicit user completion/verification received: `Yes`
- Initial verification / acceptance reference: `user-verification-record.md` ("finalze and release a new beta.", 2026-10-07)
- Product baseline-fix decision (`82960e903`): kept. The user did not ask to remove it after the keep recommendation.
- Follow-up after verification: `0446c378c` (drops the visible "Show" picker label), requested directly by the user, who said no further testing was needed. Delivery smoke: 26 files / 112 tests, the localization guard and audit, and the hygiene check all pass.
- Renewed verification required: `No` (the user requested the follow-up; the target was unchanged at `93d1b18b4`)

## Docs Sync Result

- Docs sync artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`, `TESTING.md`, `autobyteus-web/docs/projects.md`

## Ticket State Transition

- Ticket moved to `tickets/done/projects-always-on`: `Yes`
- Archived ticket path: `tickets/done/projects-always-on/`

## Version / Tag / Release Commit

- `python3 scripts/check_repository_artifact_hygiene.py` passed before tagging.
- `bash scripts/desktop-release.sh beta` exited 0 from the clean finalized `personal`.
- Version `1.4.96-beta.5`. Release commit `5316a0cad`, pushed `395d0840c..5316a0cad`. The annotated tag `v1.4.96-beta.5` is pushed.
- Receipt: `delivery-evidence/dr-002/beta-release.log`.

## Repository Finalization

- Ticket branch: `codex/projects-always-on`. Archive and docs-sync commit `6e27961bd` (on top of follow-up `0446c378c`). Pushed.
- Finalization target: `origin/personal`, unchanged at `93d1b18b4` after verification.
- Merge: an isolated clean clone was used. The `--no-ff` merge `395d0840c` has tree `400713940`, identical to the ticket head. Pushed `93d1b18b4..395d0840c`.
- Repository finalization status: `Completed`. Receipt: `delivery-evidence/dr-002/final-merge.log`.

## Release / Publication / Deployment

- Applicable: `Yes`. The user requested a beta.
- Method: `Release Script` (`scripts/desktop-release.sh beta`)
- Release/publication/deployment result: `Completed`
- Workflows for `v1.4.96-beta.5`, all Success: Desktop 37643640675, Android 37643640958, iOS 37643640756, Server Docker 37643640813 (`workflows-final.json`).
- GitHub prerelease: non-draft, published 2026-10-07T15:28:23Z, 17 assets, none empty (`github-release.json`).
- Updater metadata: all four `latest*.yml` files report `1.4.96-beta.5`.
- Docker `:1.4.96-beta.5` and `:beta` share digest `sha256:09b3919b8772547046818d75da2b5a068cfe9e4099be64da52706dfe4002f9f0` (linux/amd64 and linux/arm64).

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on`
- Worktree cleanup result: `Completed`. Head `6e27961bd` was verified in `origin/personal` first. Only the untracked SDK `dist/` was discarded.
- Worktree prune result: `Completed`
- Local and remote ticket branch cleanup result: `Completed`

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `release-notes.md`
- Release notes status: `Updated`

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: no migration. A stored `ENABLE_PROJECTS` is not read and lists as a deletable custom setting (DEC-001). The only new client state is one `localStorage` picker choice per node.
- Delivery action required: `None`

## Rollback Criteria

- Revert the final merge on `personal`, and cut a new beta if one was published.
- After a rollback, nodes whose stored `ENABLE_PROJECTS` is `false` (or unset) hide Projects again. No data loss.

## Final Status

- Explicit user testing/verification complete: `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes` (beta.5). The stable `v1.4.96` is tracked in DR-003.
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
