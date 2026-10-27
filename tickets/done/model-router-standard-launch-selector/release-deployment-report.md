# Delivery / Release / Deployment Report — autobyteus-313 (Model Router: standard launch selector)

## Release / Publication / Deployment Scope

The Model Router's launch with the app's standard launch controls and model settings, the same names as the rest of the app on all four tabs, the launch check on save, and a new router run on any launch change. Finalization target: `origin/personal`. Release: **Beta**, as the user asked.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `83e8e12125`
- Deviations from the guide and why: `None`
- Proposed guide fixes: `None`

## Handoff Summary

- Handoff summary artifact: `tickets/done/model-router-standard-launch-selector/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `1c54ffec6a`
- Latest tracked remote base reference checked: `origin/personal` @ `1c54ffec6a`
- Base advanced since bootstrap: `No`
- New base commits integrated into the ticket branch: `No`
- Local checkpoint commit result: `Completed` (`8e43e74d78`: the Solution Designer's documents and `follow-ups.md`, which were uncommitted)
- Integration method: `Already current`
- Post-integration executable checks rerun: `Yes`: the clean-clone proof DEL-01 (below)
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on:
  - the execution report's Acceptance-Criteria Proof and Cases (API-REV-001, 95%, no category below 90%);
  - the files opened by delivery, listed below;
  - the implementation's rendered checks (`IMP-05-rendered-checks.json`, 11/11, no browser errors);
  - delivery's clean-clone proof DEL-01.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | `IMP-05-rendered-checks.json`; `IMP-05-02-configuration-model-menu-1440.png`, `IMP-05-06-…-thinking-saved-1440.png` | The standard model menu (search; AutoByteus 35, Codex App Server, Claude Agent SDK, Grok Build, Antigravity CLI), the saved launch "claude-opus-5-5 Claude SDK" with thinking "Low"; `same-menu` ok | Proven |
| AC-002 | `API-01-02-live-router-launch.json` `API-01` | Valid launch stores `llmConfig {thinking_enabled: true, reasoning_effort: "high"}`. Refused with `BAD_USER_INPUT`: "Value is not one of the supported options.", "Expected boolean.", "The model 'no-such-model' is not available on claude_agent_sdk.". `statusAfterRefusals` = the valid launch | Proven |
| AC-003 | same file `API-02`, `checks` | All true. CLI 1: `--effort high`, session `8f6e8d00`, reused without a change; after the effort change a new session `761f5995` with `--effort low`; `r2LlmConfig` "low"; `knowledgeCarriedUnchanged`; `routedEachTime` | Proven (FU-004: the old session stays running) |
| AC-004 | rendered checks `decisions-names`, `overview-names`, `runtimes-names`, `zh-CN`; `IMP-05-08-decisions-names-1440.png` | "claude-sonnet-5-5 Claude SDK", "gpt-5-codex Codex"; Overview legend and Runtimes headings "Codex App Server", "Claude Agent SDK", …; no short page names | Proven |
| AC-005 | `API-03-upgrade-from-beta12.json` | Data written by released beta.12. After the update: `routerLaunch … llmConfig: null`, `active: true`; one router run `model_router_d44eeb4d…` throughout, reused and routing ("chosen by the Model Router (release notes)"); `migrationRecordsIdentical: true` (27 Prisma, 34 app-data); no Prisma change | Proven |
| Done-when "prove from a clean clone" | DEL-01 | See below | Proven |

- More evidence requested: `None`
- User check needed: `No`. The Task's "Done when" ("… covered by tests; merged to personal") asks for none, and nothing is reserved for the user.
- Clean-clone proof (`evidence/delivery/DEL-01-clean-clone-proof.log`): `git clone --no-local --branch codex/model-router-standard-launch-selector` at `8e43e74d78`. All commands ran with `env -i`.
  - Setup: `pnpm install --frozen-lockfile`, `autobyteus-ts` build, server prebuild, `nuxt prepare`: all exit 0.
  - Server typecheck: exit 0.
  - Server unit `tests/unit/model-routing/`: 49/49.
  - Web `ChatModelMenu` and model-routing specs: 31/31.
  - Web guards: exit 0 ×3.
  - Server build: exit 0.
  - E2E MR-01…09: 9/9.
  - E2E two-server: 41/41. The first run stopped in setup ("Brief Studio's importable package is missing"); after its documented preparation, `pnpm -C autobyteus-server-ts test:integration:prepare`, it passed.
  - The clone was removed afterwards.

## Release Decision

- Decision: `Beta`
- Decided by: the user, in the delivery conversation of 2026-10-27: "if everythign fine, release a new beta thanks"

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `No impact` for delivery (the implementation's `model_routing.md`, `settings.md` and design case 13 were verified)

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `tickets/done/model-router-standard-launch-selector/`

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: one added server setting (`AUTOBYTEUS_MODEL_ROUTER_LLM_CONFIG`); stored launches without it read as "no settings"; no migration (REQ-005, DESIGN.md rule 10).
- Delivery action required: `None`. API-03 proves the user's router configuration is kept on data written by the released beta.

## Rollback Criteria

- Revert the merge on `personal` and cut the next beta.
- An older build ignores the added setting and keeps using the stored runtime and model. The user's router configuration stays usable.

## Repository Finalization And Release

Recorded below after the merge and the release.

## Finalization Record

- Bootstrap context source: the API/E2E handoff (branch `codex/model-router-standard-launch-selector`, base and target `origin/personal` `1c54ffec6a`) and RELEASE.md
- Ticket branch: `codex/model-router-standard-launch-selector`
- Ticket branch commit result: archive commit `4ff2d67ab2`. Code: `09f99eed32`, `f9c58612e5`, `1357063994`. Docs: `e9c25f3801`. API/E2E: `0b6911aaac`. Checkpoint: `8e43e74d78`.
- Name check before the commit: `check_repository_artifact_hygiene.py` passed. The longest ticket path is 139 characters, with no Windows-hostile names.
- Ticket branch push result: pushed `origin/codex/model-router-standard-launch-selector` @ `4ff2d67ab2`, after the Secret Gate passed
- Finalization target: `origin/personal`
- Target advanced after verification: `No` (`1c54ffec6a` at verification, at the merge and before the push)
- Merge into target result: `git merge --no-ff` on `finalize/model-router-standard-launch-selector` (a clean release worktree) → `baf87f2269`. Checks on the merged state:
  - Secret Gate PASS;
  - `check_repository_artifact_hygiene.py` passed;
  - `check_licensing.py`: "Licensing is consistent."
- Push target branch result: pushed with the release commit, `1c54ffec6a..57f986e75a  HEAD -> personal`
- Repository finalization status: `Completed`

## Beta Release v1.5.9-beta.13

- Decision: `Beta`, by the user ("if everythign fine, release a new beta thanks", 2026-10-27)
- Checks before tagging, on `baf87f2269`: licensing consistent; hygiene passed; `scripts/check_secrets.sh v1.5.9-beta.12..HEAD` PASS.
- Version: `next-beta` gave `1.5.9-beta.13` (previous `v1.5.9-beta.12`, a pre-release published 2026-10-27).
- Command: `bash scripts/desktop-release.sh beta --branch finalize/model-router-standard-launch-selector --no-push`. It produced release commit `57f986e75a` (`autobyteus-web/package.json` only) and the annotated tag `v1.5.9-beta.13`. The identity is the same as on earlier releases.
- Push: `origin/personal` was confirmed still at `1c54ffec6a`; then `HEAD -> personal` and `[new tag] v1.5.9-beta.13`, at 13:30:46Z.

| Workflow | Run | Result |
| --- | --- | --- |
| Android APK Release | 40512673547 | success (13:35:29Z) |
| iOS App Store Connect Release | 40512673651 | success (13:50:14Z), TestFlight upload |
| Desktop Release | 40512673701 | success (13:57:27Z) |
| Server Docker Release | 40512673564 | success (14:36:47Z) |

- Published artifacts:
  - `gh release view v1.5.9-beta.13`: `isPrerelease: true`, 17 assets (macOS arm64/x64 `.dmg`/`.zip` with blockmaps, Linux x64/arm64 AppImages, Windows `.exe`, four `latest*.yml`, the Android APK and its `.sha256`). This matches RELEASE.md.
  - Docker Hub, read through its public tag API: `autobyteus/autobyteus-server:1.5.9-beta.13` and `:beta` both `sha256:0abe3082d408d83d5a5884a94f985fed4fe7ee2435cbea50ec5508115816f525` (amd64, arm64); `:latest` unchanged (`sha256:ff6bf251…`, 2026-10-22).
  - The local `docker buildx imagetools inspect` hung on the Docker Desktop credential helper, so it was stopped.
- Release result: `Completed` (not partial)
- Release notes: GitHub generated notes (pre-release tag)
- Rollback: never move or delete the tag; fix forward with the next beta, or revert the merge on `personal` and cut the next beta.

## Post-Finalization Cleanup

- Ticket worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/model-router-standard-launch-selector`, release worktree `…-release`, and the local `codex/` and `finalize/` branches: removed after this record is pushed. Only untracked build output was left, and both branches are contained in `origin/personal`.
- Remote branch: `origin/codex/model-router-standard-launch-selector` is kept as pushed ticket history.
- The clean clone `/tmp/ab313-clone` and its scripts were removed after the log was copied to `evidence/delivery/`.

## Final Status

- Verification complete: `Yes` (from the evidence and a clean clone; no user check required)
- Repository finalization complete: `Yes` (merge `baf87f2269`, release commit `57f986e75a` on `personal`)
- Applicable release complete: `Yes` (beta v1.5.9-beta.13, complete)
- Applicable safe cleanup complete: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: right after this record is pushed
