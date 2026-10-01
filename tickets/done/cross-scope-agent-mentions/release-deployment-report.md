# Delivery / Release / Deployment Report — cross-scope-agent-mentions

## Release / Publication / Deployment Scope

- Ticket `cross-scope-agent-mentions` (workspace repo only):
  - `@` collaborators in live standalone Agent, Team and Org runs (SR-010: one hosted instance per mention, `send_message_to` first);
  - the Agent collaboration root of standalone runs;
  - always-on `send_message_to` / `delegate_task`;
  - RD-004 "From <Sender>:";
  - product-wide task rows.
- Route: reviewed, `task_size=Large`, `architectural_risk=High`. Delivery keeps this classification unchanged. Integration revealed no new design impact.
- Release: new beta requested by the user at verification on 2026-10-01 (`v1.4.92-beta.5`).

## Handoff Summary

- Handoff summary artifact: `tickets/done/cross-scope-agent-mentions/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-005`
- Notes:
  - User verified on 2026-10-01; repository finalization is completed.
  - The release is **fully published** (DR-005). The macOS notarization blocker from DR-004 (Apple agreement) was resolved by the user, and the failed jobs were rerun.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal@8caa610ff` (`investigation-notes.md` › Bootstrap; implementation basis per `implementation-handoff.md`)
- Latest tracked remote base reference checked: `origin/personal@8caa610ff438c288d9aca9f2efe2c33924fbf517`, fetched on 2026-10-01 at DR-001, DR-002, after verification, and immediately before the final push, with the same result each time.
- Base advanced since bootstrap or previous refresh: `No`
- New base commits integrated into the ticket branch: `No`
- Local checkpoint commit result: `Not needed`
- Integration method: `Already current`
- Integration result: `Completed`
- Post-integration executable checks rerun: `No`
- Post-integration verification result: `Passed`. The code is byte-identical to the API/E2E-validated `bcff48200` state plus the reviewed test files.
- No-rerun rationale: no base commits were integrated, and delivery changed only Markdown docs and ticket artifacts.
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`
- Blocker: None

## User Verification

- Initial explicit user completion/verification received: `Yes`
- Initial verification / acceptance reference: 2026-10-01, the user wrote "finalize and release a new beta version."
  - R-1 (host-label casing): no separate instruction, so delivery's stated recommendation (accept as-is) applies.
  - Before this, API/E2E had run real desktop journeys at the user's request (API-REV-004). OBS-D3 was closed as the user's own manual click (DR-003).
- Renewed verification required after later re-integration: `No` (target did not advance)
- Renewed verification received: `Not needed`
- Renewed verification / acceptance reference: N/A

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated by delivery (9):
  - server `agent_tools.md`, `agent_communication.md`;
  - web `agent_teams.md`, `agent_orgs.md`, `chat.md`, `settings.md`, `agent_execution_architecture.md`;
  - `autobyteus-ts` `agent_memory_design.md`, `agent_memory_design_nodejs.md`.

  Implementation had already updated 10 docs.
- No-impact rationale: N/A

## Ticket State Transition

- Ticket moved to `tickets/done/cross-scope-agent-mentions`: `Yes`
- Archived ticket path: `tickets/done/cross-scope-agent-mentions/`

## Version / Tag / Release Commit

- Version: `1.4.92-beta.5` (`autobyteus-web/package.json`)
- Release commit: `d057801c8` "chore(release): bump workspace release version to 1.4.92-beta.5"
- Tag: annotated `v1.4.92-beta.5` (tag object `372035bcfd57e2495c49cfb87457921e305a05c1`), pointing at `d057801c8`
- Method: `bash scripts/desktop-release.sh beta --branch finalize/cross-scope-agent-mentions --no-push`, run in the finalization worktree, then pushed manually.

## Repository Finalization

- Bootstrap context source: `investigation-notes.md` (finalization target `origin` / `personal`)
- Ticket branch: `codex/cross-scope-agent-mentions`
- Ticket branch commit result: `Completed`. `e666d726f` (archived ticket, API/E2E durable tests, delivery docs sync) on top of the reviewed `bcff48200`. The untracked SDK `dist/` directories are excluded.
- Ticket branch push result: `Completed`. Created `origin/codex/cross-scope-agent-mentions` at `e666d726f`.
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: `No`. Re-fetched after verification and before the push: still `8caa610ff`.
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `Completed`. The finalization worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions-finalize` (branch `finalize/cross-scope-agent-mentions`) was created from `origin/personal@8caa610ff`.
- Merge into target result: `Completed`. Fast-forward to `e666d726f`, then the release commit `d057801c8`.
- Push target branch result: `Completed`. `git push origin HEAD:personal` moved `8caa610ff..d057801c8`, confirmed with `git ls-remote`.
- Repository finalization status: `Completed`
- Blocker: None
- Later state: this record is committed on top of `d057801c8` (see DR-004).

## Release / Publication / Deployment

- Applicable: `Yes` (new beta requested by the user)
- Method: `Git Tag Method`. Pushing the tag starts the desktop, Android, iOS and server Docker release workflows.
- Method reference / command: root `README.md` › Release workflow; `git push origin v1.4.92-beta.5`
- Release/publication/deployment result: **`Completed`** (DR-005). Workflow results at `d057801c8`:

  | Workflow | Run | Result |
  | --- | --- | --- |
  | Android APK Release | 36845911744 | success: APK attached to the pre-release |
  | iOS App Store Connect Release | 36845911739 | success |
  | Server Docker Release | 36845911822 | success |
  | Desktop Release | 36845911969 | attempt 1 **failure** (details below); attempt 2 (rerun of the failed jobs) **success** |

  Desktop Release jobs:
  - Resolve Release Metadata: success.
  - Linux ARM64, Linux x64 and Windows x64 builds: success.
  - **macOS ARM64 and macOS Intel x64 builds: failure.** Both signed the app and then failed at notarization: `Failed to notarize via notarytool … HTTP status code: 403. A required agreement is missing or has expired. This request requires an in-effect agreement that has not been signed or has expired.`
  - **Publish GitHub Release: skipped.**
- GitHub release: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.92-beta.5 (pre-release, published 2026-10-01T10:00:04Z by the Android workflow).
  - Its only assets are `AutoByteus_personal_android-1.4.92-beta.5-release.apk` and its `.sha256`.
  - It has no desktop installers and no updater `latest*.yml`, so desktop installs are **not** offered beta.5. They stay on beta.4; nothing is half-installed.
- Attempt 2 (DR-005):
  - The user accepted the updated Apple Developer Program License Agreement on developer.apple.com. The account banner had said it must be accepted by 2 October 2026 to keep access to certificates, App Store Connect and the App Store Connect API.
  - Delivery ran `gh run rerun 36845911969 --failed`.
  - Both macOS builds succeeded. Notarization succeeded on the first try (x64 at 10:49:53Z, ARM64 at 10:50:57Z, no retries).
  - Publish GitHub Release succeeded (10:57–10:58Z). The Linux and Windows builds from attempt 1 were reused.
- Final GitHub release assets for `v1.4.92-beta.5`:
  - macOS ARM64 and x64: dmg and zip, each with its blockmap;
  - Linux x64 and ARM64 AppImage;
  - Windows exe;
  - Android APK and its `.sha256`;
  - updater files `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml`.
- Cause classification (attempt 1): environment/account (Apple Developer Program agreement), not code. `v1.4.92-beta.4` passed the same workflow on 2026-09-30 (run 36698456716). This is a deployment-local blocker that only the account holder can resolve.
- Recovery:
  1. The Apple Developer account holder signs or renews the pending agreement (developer.apple.com › Account, or App Store Connect › Business / Agreements).
  2. Then run `gh run rerun 36845911969 --failed`. This reruns both macOS builds and the dependent Publish job on the same tag. No new commit or tag is needed.
- Release notes handoff result: `Not required` (beta tags use GitHub generated notes; the archived `release-notes.md` is supporting context)
- Blocker: None (resolved in DR-005)

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions`
- Worktree cleanup result: `Completed`. Removed with `git worktree remove --force` after confirming no process ran from it and nothing was unpushed. The leftovers were the untracked SDK `dist/` directories and ignored build output.
- Worktree prune result: `Completed`
- Local ticket branch cleanup result: `Completed`. `git branch -d codex/cross-scope-agent-mentions`; its tip `e666d726f` is contained in `origin/personal`.
- Remote branch cleanup result: `Not required`. `origin/codex/cross-scope-agent-mentions` is kept at `e666d726f`.
- Finalization worktree and branch: `Completed` (removed after the DR-004 push). The DR-005 record worktree is removed after its push.
- Blocker: None

## Escalation / Reroute

- No code reroute. The release blocker is an Apple account agreement and goes to the user.
- R-1 is accepted as-is per verification. OBS-D3 is closed (DR-003).

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `release-notes.md`
- Archived release notes artifact used for release/publication: `tickets/done/cross-scope-agent-mentions/release-notes.md`, kept as supporting context. Beta tags use GitHub generated notes.
- Release notes status: `Updated`

## Deployment Steps

No hosted deployment applies. Now that the desktop release is published:
- desktop installs with "Receive beta updates" on are offered 1.4.92-beta.5 through the updater;
- Docker launcher users on the beta track run `autobyteus-docker upgrade --all`. The Docker image is already published.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Directly Usable — No Migration` (SR-010; the SR-007 collaborator shapes were never released).
- Delivery action required: `None`
- Result and evidence:
  - API/E2E P01: old-shape Team and Org trees reopen and continue.
  - API/E2E A04: traces without `sender_id` replay user-style.
  - API-REV-004 RESTORE: a full desktop restart keeps collaborators and conversations unchanged.
  - `collaborator-tree-records.test.ts`: exact key sets.

## Verification Checks

| Check | Command (cwd) | Result |
| --- | --- | --- |
| Base currency (each round and before the push) | `git fetch origin personal`; ancestor check | `8caa610ff`, fast-forward possible |
| Doc anchors added | manual check of `chat.md#-in-a-live-run-collaborators` and `agent_communication.md#target_agent_run_id-global-direct-route` against their headings | match |
| Stale-term scan | `grep` across server, web and `autobyteus-ts` docs for the SR-007 symbols and the visible "Started by" | only accessible-label wording remains |
| Executable evidence of record | API/E2E round 2 (`api-e2e-execution-coverage-report.md`) on `bcff48200` | Pass, 95% |
| Real desktop journeys (API-REV-004, CRR-008) | isolated Electron instance built from the ticket worktree, public agent package, Claude `haiku` | Pass, 96%: D0–D3, BI-1…4, RESTORE (25 checks). OBS-D3 closed (manual user click) |
| Evidence hygiene before commit | `grep` of the ticket folder for API-key and token patterns and for `~/.autobyteus` paths | none found (only worktree-dev `.autobyteus/` paths) |
| Commit scope | `git diff --cached --name-only` | ticket folder + 7 test files + 9 docs; SDK `dist/` excluded |
| Remote refs | `git ls-remote origin refs/heads/personal refs/tags/v1.4.92-beta.5` | `personal` = `d057801c8`; tag peels to `d057801c8` |
| Release workflows | `gh run list --commit d057801c8…` | Android, iOS, Docker success. Desktop: attempt 1 failed (notarization 403); attempt 2 succeeded after the agreement was accepted |
| Release assets | `gh release view v1.4.92-beta.5` | all desktop installers, blockmaps and updater `latest*.yml`, plus the Android APK |

## Rollback Criteria

- Code: revert the ticket range `8caa610ff..e666d726f` on `personal` (every commit in it belongs to this ticket; `personal` fast-forwarded). Data needs no transformation, but note:
  - runs with collaborators written by the new version are rejected by older builds;
  - prefer a forward fix over a downgrade.
- Release: beta.5 is a pre-release offered only to installs with beta updates on. To withdraw it, delete the GitHub pre-release or its `latest*.yml` assets. Already-updated installs need a forward fix (beta.6).

## Final Status

- Explicit user testing/verification complete: `Yes`
- Repository finalization complete: `Yes` (`personal` at `d057801c8` for this ticket)
- Applicable release/deployment/rollout complete or not required: `Yes`. `v1.4.92-beta.5` is fully published, and all 4 workflows succeeded.
- Applicable safe cleanup complete or not required: `Yes`. The ticket worktree and local branch are removed; the finalization worktree is removed after this push.
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to `/solution_designer`: sent immediately after this record was pushed. See DR-005.
- Terminal message/reference: DR-005

### Follow-ups recorded (not blockers)

- Release workflow: `.github/workflows/release-desktop.yml` retries every "Failed to notarize" error as transient, including a permanent 403 agreement error. Each retry rebuilds the app, adding about 10–15 minutes per macOS job. Consider excluding `HTTP status code: 403` / "agreement" from the retry pattern (separate small ticket).
- R-4: rerun the gated Grok live E2E when the provider quota resets.
- C-11 (no Agent-root self-delegation guard) and C-15 (inert `hasTaskExecutionAt` in `collaborator-root-port-resolver.ts`): minor code notes.
- The Event Monitor "earlier events" page still shows agent deliveries user-style.
- Size watch: `memory-manager.ts` (500) and `root-team-run.ts` (495) are near the 500-line limit.
- Web docs debt: `autobyteus-web/docs/settings.md` duplicates `agent_execution_architecture.md`.
