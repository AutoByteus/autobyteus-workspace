# Delivery / Release / Deployment Report — projects-always-on

## Release / Publication / Deployment Scope

- Repository finalization into `origin/personal`.
- Release (desktop beta via `scripts/desktop-release.sh beta`) only if the user asks for it at verification. `scripts/check_repository_artifact_hygiene.py` is run before any tag.
- Classification: `task_size=Medium`, `architectural_risk=Low`, direct route. Review gates are `Not Applicable — direct low-risk route`.

## Handoff Summary

- Handoff summary artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: Pre-verification state. A user decision on product baseline fix `82960e903` is requested (delivery recommends keeping it).

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

- Ticket moved to `tickets/done/projects-always-on`: `No` (after verification)

## Version / Tag / Release Commit

- Pending the user's decision.

## Repository Finalization

- Ticket branch: `codex/projects-always-on`
- Finalization target: `origin/personal`
- Repository finalization status: Pending user verification

## Release / Publication / Deployment

- Applicable: to be decided by the user at verification
- Release/publication/deployment result: Pending

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on`
- Cleanup result: Pending

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

- Explicit user testing/verification complete: `No`
- Repository finalization complete: `No`
- Applicable release/deployment/rollout complete or not required: `No`
- Applicable safe cleanup complete or not required: `No`
- Unresolved blocker: None (waiting for user verification and the `82960e903` decision)
- Successful terminal package eligible for return: `No`
- Terminal package sent to `/solution_designer`: `No`
