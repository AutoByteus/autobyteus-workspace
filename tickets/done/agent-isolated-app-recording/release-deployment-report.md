# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

- Ticket `agent-isolated-app-recording` covers the isolated app-instance lifecycle for agents. The workspace (`personal`) and autobyteus-mcps (`main`) are finalized separately (R-004).
- Route: reviewed, `task_size=Large`, `architectural_risk=High`. Delivery keeps this classification unchanged.
- Release: new beta requested by the user at verification on 2026-09-29.

## Handoff Summary

- Handoff summary artifact: `tickets/done/agent-isolated-app-recording/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-002`
- Notes: DR-001 was the pre-verification baseline. DR-002 records verification, finalization, the beta.6 release and cleanup.

## Initial Delivery Integration Refresh

- Bootstrap base reference:
  - workspace: `origin/personal@e6c16d80148ba3a9674c0bd847eb1df0e6ca5bbb`;
  - mcps: `origin/main@f11098c87955914c18657198e91c3c3c635ac7b0`.
- Latest tracked remote base reference checked (`git fetch origin`, 2026-09-29):
  - workspace: `origin/personal@5d617979712deff5b10d137bb39ded88b90c5db4`;
  - mcps: `origin/main@f11098c` (unchanged).
- Base advanced since bootstrap or previous refresh:
  - workspace: `Yes`. 4 commits: the AGY background-task fix, its tests and ticket archive, and the `1.4.91-beta.5` bump.
  - mcps: `No`.
- New base commits integrated into the ticket branch: workspace `Yes`; mcps `No`.
- Local checkpoint commit result: `Completed`.
  - workspace `907475467`: the reviewed durable tests (`isolated-app-lifecycle-probe.mjs`, the updated `electron-launch-profile-probe.mjs`, the `test:e2e:isolated-app` script) and the API/E2E and review artifacts. Build `dist/` outputs are excluded. A secret scan of the evidence found secret names only, no values.
  - mcps `c37b2b9`: 2 reviewed real-MCP tests.
- Integration method:
  - workspace: `Merge` (`git merge --no-ff origin/personal` → `c474cb9fc`);
  - mcps: `Already current`.
- Integration result: `Completed`. No conflicts. The base's files do not overlap this ticket's changed files. `autobyteus-web/package.json` merged cleanly: version `1.4.91-beta.5` plus the new script.
- Post-integration executable checks rerun: `Yes` (see Verification Checks)
- Post-integration verification result: `Passed`
- No-rerun rationale: N/A for the workspace. For mcps the base was current and no integration happened, but unit tests were rerun as a smoke check anyway.
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (as of 2026-09-29)
- Blocker: None

## User Verification

- Initial explicit user completion/verification received: `Yes`
- Initial verification / acceptance reference: user message on 2026-09-29, "finalize and release the meta beta thanks." ("meta beta" read as "new beta")
- Renewed verification required after later re-integration: `No`. Both targets were re-fetched after verification and had not advanced (`origin/personal@5d6179797`, `origin/main@f11098c`).
- Renewed verification received: `Not needed`
- Renewed verification / acceptance reference: —
- Related user decisions: release a new beta; keep the evidence MP4s (default; no objection).

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated` (in-branch docs verified against the integrated state; no delivery-stage edits)
- Docs updated:
  - workspace: `docs/isolated-app-instances.md`, `skills/autobyteus-isolated-app/SKILL.md`, `README.md`, `autobyteus-web/README.md`, `autobyteus-web/docs/electron_packaging.md`, `autobyteus-server-ts/docs/modules/secret_management.md`;
  - mcps: `browser-automation/SKILL.md`, `browser-automation/README.md`, `README.md`, `docs/mcp-to-cli-mapping.md`.
- No-impact rationale: N/A

## Ticket State Transition

- Ticket moved to `tickets/done/agent-isolated-app-recording`: `Yes` (`git mv`, commit `002d30d35`)
- Archived ticket path: `tickets/done/agent-isolated-app-recording/`

## Version / Tag / Release Commit

- Method: the documented release helper, `bash scripts/desktop-release.sh beta --branch finalize/agent-isolated-app-recording --no-push`. It ran in the isolated finalization worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording-finalize`, as for beta.5.
- Version: `1.4.91-beta.6`. `autobyteus-web/package.json` was bumped from `1.4.91-beta.5`.
- Release commit: `c84b577399ab4cc8f9c1b3d55b1cadd80c9b4ce6` ("chore(release): bump workspace release version to 1.4.91-beta.6")
- Tag: annotated `v1.4.91-beta.6` (tag object `5f6a776b6b15b2f0e536cdd408eddbf0817d9f70`), pointing at `c84b57739`

## Repository Finalization

- Bootstrap context source: `investigation-notes.md` (bootstrap), `handoff-architecture-design-complete.md` § Workspace Context
- Ticket branch: `codex/agent-isolated-app-recording` (in both repos)
- Ticket branch commit result: `Completed`.
  - Workspace commits on top of the reviewed state: `907475467` (checkpoint), `c474cb9fc` (base merge) and `002d30d35` (archive + delivery records). The untracked SDK `dist/` outputs were excluded, and the artifact hygiene check passed (`scripts/check_repository_artifact_hygiene.py`).
  - mcps: `c37b2b9`.
- Ticket branch push result: `Completed`. This created `origin/codex/agent-isolated-app-recording` in both repos (workspace `002d30d35`, mcps `c37b2b9`).
- Finalization target remote: `origin` (workspace and mcps)
- Finalization target branch: workspace `personal`; mcps `main`
- Target advanced after verification / acceptance: `No`. It was re-fetched after verification and again right before each push: `origin/personal@5d6179797`, `origin/main@f11098c`.
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `Completed`.
  - Workspace: finalization worktree from `origin/personal@5d6179797` (branch `finalize/agent-isolated-app-recording`).
  - mcps: detached worktree from `origin/main@f11098c`.
- Merge into target result: `Completed`.
  - Workspace: `git merge --ff-only codex/agent-isolated-app-recording` fast-forwarded to `002d30d35`, and the helper's release commit `c84b57739` went on top.
  - mcps: `git merge --no-ff`, following the repository convention, gave `6b395628785dcaa4aa7e5463e6535ae45eaf8deb`.
- Push target branch result: `Completed`, confirmed with `git ls-remote`.
  - Workspace: `git push origin HEAD:personal` moved `5d6179797..c84b57739`.
  - mcps: `git push origin HEAD:main` moved `f11098c..6b39562`.
- Repository finalization status: `Completed`
- Blocker: None

## Release / Publication / Deployment

- Applicable: `Yes`. The user requested a new beta. mcps has no release process, so merging into `main` is its publication.
- Method: `Git Tag Method`. Pushing the tag starts the desktop, Android, iOS and server Docker release workflows.
- Method reference / command: root `README.md` "Release workflow"; `git push origin v1.4.91-beta.6`
- Workflows at `c84b57739`: all `completed / success` (`delivery-evidence/release-workflows.json`)
  - Desktop Release: https://github.com/AutoByteus/autobyteus-workspace/actions/runs/36523043252
  - Android APK Release: https://github.com/AutoByteus/autobyteus-workspace/actions/runs/36523043209
  - iOS App Store Connect Release: https://github.com/AutoByteus/autobyteus-workspace/actions/runs/36523043204
  - Server Docker Release: https://github.com/AutoByteus/autobyteus-workspace/actions/runs/36523043246 (finished 2026-09-29T05:19:57Z)
- GitHub release: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.91-beta.6
  - Published 2026-09-29T04:49:50Z as a pre-release, not a draft.
  - 17 assets: macOS ARM64 and x64 DMG/ZIP with blockmaps, Windows EXE, Linux x64 and ARM64 AppImages, Android APK with sha256, and updater metadata `latest*.yml`.
  - Evidence: `delivery-evidence/github-release.json`
- Published-artifact feature check: the published `AutoByteus_personal_macos-arm64-1.4.91-beta.6.zip` contains `AutoByteus.app/Contents/Resources/isolated-launch.json` = `{"isolatedLaunchContract": 1}` (`delivery-evidence/published-marker-check.txt`). Installed beta.6 therefore passes the isolated-launch gate.
- Docker Hub, verified through the registry API (`delivery-evidence/docker-digests-{before,after}-beta6.txt`):
  - `autobyteus/autobyteus-server:1.4.91-beta.6` is `sha256:f1ab14c7dd1cb380a95ff21835acf0b7659d5a43ac09396bd6342e39ffd17655`, built for amd64 and arm64.
  - `:beta` moved from `sha256:d811e607…` (beta.5) to `sha256:f1ab14c7…`.
  - `:latest` is unchanged at `sha256:154f2c2b…` (stable).
- Channel behavior:
  - Desktop installs get beta.6 only when **Settings > Updates > Receive beta updates** is on.
  - GitHub "Latest" stays on the newest stable release.
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Not required`. Pre-release tags use GitHub generated notes. The archived `release-notes.md` is kept as supporting context.
- Blocker: None
- Not exercised by delivery: the published installers were not installed or launched; only the marker inside the macOS arm64 zip was inspected. Linux AppImages are unvalidated by user decision.

## Post-Finalization Cleanup

- Dedicated ticket worktree path:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording`;
  - `/Users/normy/autobyteus_org/autobyteus_mcps-agent-isolated-app-recording`.
- Worktree cleanup result: `Completed`.
  - Both ticket worktrees were removed with `git worktree remove --force`. Their only leftover content was untracked SDK `dist/` output, a git-ignored `electron-dist`/`.nuxt`, and mcps `.venv`/caches. All evidence had been committed.
  - Before removal, no reference to either worktree path was found in `~/.autobyteus` JSON, `~/.claude.json`, `~/.claude/settings.json` or `~/.codex/config.toml`.
  - The mcps detached finalization worktree was removed too.
- Worktree prune result: `Completed` (both repos)
- Local ticket branch cleanup result: `Completed`. `git branch -d codex/agent-isolated-app-recording` in both repos. mcps printed a "not merged to HEAD" warning only because the user's own `autobyteus_mcps` checkout is on a stale local `main` (`f11098c`); the commit is contained in `origin/main`. That checkout was left untouched because it holds unrelated untracked user files.
- Finalization worktree and branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording-finalize` on `finalize/agent-isolated-app-recording`. Both are removed right after this record is pushed to `personal`, and the terminal message confirms it.
- Remote branch cleanup result: `Not required`. `origin/codex/agent-isolated-app-recording` is fully merged in both repos and is kept, following the beta.5 precedent.
- Blocker: None

## Escalation / Reroute (Use Only If Final Handoff Cannot Complete)

- N/A

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `release-notes.md`
- Archived release notes artifact used for release/publication: `tickets/done/agent-isolated-app-recording/release-notes.md`, kept as supporting context only. The beta uses generated notes.
- Release notes status: `Final`

## Deployment Steps

None. This is a beta-channel publication; no hosted deployment was requested.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: Not Affected. The only files involved are an ephemeral instance registry and recording state files, all cleaned up.
- Delivery action required: `None`
- Result and evidence: `api-e2e-execution-coverage-report.md` § Compatibility / Legacy Scope Check
- Migration completion, validation, recovery, and rollout evidence: N/A

## Verification Checks

Delivery reruns on the integrated state, 2026-09-29, logs in `delivery-evidence/`:

| Check | Command (cwd) | Result | Log |
| --- | --- | --- | --- |
| R-01 | `node --test scripts/isolated-app/__tests__/*.node-test.mjs scripts/electron-launch/__tests__/*.node-test.mjs scripts/electron-e2e/__tests__/*.node-test.mjs` (`autobyteus-web`) | 55/55 pass | `R-01.log` |
| R-02 | `pnpm exec vitest run --config ./electron/vitest.config.ts electron/server electron/updater` (`autobyteus-web`) | 13 files, 103/103 pass | `R-02.log` |
| R-03 | `pnpm test:nuxt --run stores/__tests__/appUpdateStore.spec.ts components/settings/__tests__/AboutSettingsManager.spec.ts tests/integration/isolated-launch-marker.integration.test.ts` (`autobyteus-web`) | 3 files, 49/49 pass | `R-03.log` |
| Base-changed web specs | `pnpm test:nuxt --run services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts services/runHydration/__tests__/runProjectionConversation.spec.ts` | 2 files, 27/27 pass | `base-web-specs.log` |
| R-07 | `node tests/e2e/isolated-app-lifecycle-probe.mjs --app electron-dist/mac-arm64/AutoByteus.app --output-dir /tmp/dr001/R-07` (`autobyteus-web`) | LC-001..LC-006 pass, `failures: []`, production before == after; `isolated-app list` empty afterwards | `R-07.log`, `R-07-isolated-app-lifecycle-evidence.json` |
| R-04 (mcps) | `uv run --frozen --extra test pytest tests/unit -q` (`browser-automation`) | 138 passed | `R-04-mcps-unit.log` |

- The worktree build used for R-07 predates the merge. That is fine because the merge changed no Electron, launch or updater source: the base touched only AGY server files, two web specs, the web `package.json` version and ticket docs.

## Rollback Criteria

- Workspace: revert the ticket's commits on `personal` (range `5d6179797..002d30d35`, excluding the base-merge commit `c474cb9fc`), then release a newer beta. Do not delete or move the published `v1.4.91-beta.6` tag. The feature is additive except for the isolated server-env policy and the disabled updater, which apply only to the isolated/e2e profile. Production launch composition is verified identical.
- mcps: revert merge `6b39562` on `main` (`git revert -m 1`). The two new tools and attach-only mode are additive, and existing tools keep their connect–operate–disconnect behavior.
- Trigger rollback if a production launch shows a changed server env or update behavior, or if existing browser-automation tools regress.

## Final Status

- Explicit user testing/verification complete: `Yes` (2026-09-29)
- Repository finalization complete: `Yes` (workspace `personal@c84b57739`, then this evidence commit; mcps `main@6b39562`)
- Applicable release/deployment/rollout complete or not required: `Yes` (`v1.4.91-beta.6` published; all 4 workflows succeeded; the published marker is present)
- Applicable safe cleanup complete or not required: `Yes`. Ticket worktrees and branches are removed; the finalization worktree is removed after this push.
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to `/solution_designer`: sent immediately after this record was pushed. See DR-002.
- Terminal message/reference: `send_message_to` → `/solution_designer` (`Delivery Completed`)
