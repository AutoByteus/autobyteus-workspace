# Delivery / Release / Deployment Report — test-and-tooling-hygiene-294 (autobyteus-294)

## Release / Publication / Deployment Scope

- Ticket `test-and-tooling-hygiene-294`: `task_size` `Large`, `architectural_risk` `High`, reviewed route (ARCH-REV-002, CRR-002, API-REV-001, CRR-003).
- Scope:
  - finalize the ticket branch `codex/test-and-tooling-hygiene-294` into `origin/personal`;
  - publish a beta, which the user asked for during delivery.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the repository root, as of `origin/personal` `73e4c4f329`.
- Deviations from the guide and why:
  - I read the guide from the main checkout, which was behind `origin/personal` and lacked the Secret Gate. The guide's own Finalization Target warns that this checkout is often behind. So I pushed the ticket branch and `personal`, and tagged, without running `scripts/check_secrets.sh`.
  - I ran it afterwards on everything pushed: `2f48d85d4d..3d50cedc1b` (62 commits) and `v1.5.9-beta.13..v1.5.9-beta.14` (62 commits), both `PASS (no secrets found)`. Nothing was exposed.
  - The worktree's `check_repository_artifact_hygiene.py` (current, with its tracked-imports check) did run before the push.
- Proposed guide fixes, and whether the user agreed: agreed by the user on 2026-10-28 ("I think yeah, that's important … document … the case study"), and committed on the ticket branch as `docs(release): …`:
  - a build-only release run (`pnpm release:test --ref personal`) is required before every tag, beta or stable;
  - watch the four runs together, and report "released" only once they are complete;
  - read the guide from `origin/personal`;
  - a Case Studies section records `v1.5.9-beta.14`.

## Handoff Summary

- Handoff summary artifact: `tickets/done/test-and-tooling-hygiene-294/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/test-and-tooling-hygiene-294/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `2f48d85d4d`
- Latest tracked remote base reference checked: `origin/personal` `73e4c4f329` (fetched 2026-10-28)
- Base advanced since bootstrap or previous refresh: `Yes`. The new base commits are `d3502d2911` (save knowledge), `9b8b32a4b0` (merge) and `73e4c4f329` (revert of `d3502d2911`). `git diff 2f48d85d4d 73e4c4f329` is empty.
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed`: `b27b5c1061` (the code reviewer's round-2 and test-code review documents)
- Integration method: `Merge` (`9ac984a599`)
- Integration result: `Completed`, no conflicts. Outside the ticket folder, the tree is identical to the validated `ecd7dc2d0f`.
- Post-integration executable checks rerun: `Yes`. The AC-032 clean clone of the integrated branch (DEL-01), and a full server `test:integration` rerun (DEL-02).
- Post-integration verification result: `Passed`, with one load-timing flake outside the ticket (see Verification Checks; FU-014).
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on:
  - the execution report's Acceptance-Criteria Proof and Cases;
  - final confidence of 95.3%, with every category at 94% or above (target 95% met);
  - the evidence files below, opened and checked line by line;
  - the integrated-state clean clone (DEL-01, DEL-02).

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement (`Proven`/`Not Proven`/`User Check`) |
| --- | --- | --- | --- |
| AC-001, AC-005 | API-03 `API-03-server-test-unit.log`; DEL-01 | `tests/architecture files: 7`, `tests/agent-work-journal files: 7`, `Test Files  864 passed \| 5 skipped (869)`; the same count in DEL-01 | Proven |
| AC-002, AC-020, AC-034 | API-05 `API-05-web-test-nuxt.log`; IMP-08 `IMP-08-beh032-base-fail.log`; DEL-01 | 666 files, 4836 passed; IMP-08: `Failed Tests` on the base, then `passed` with the fix, for each of the four BEH-032 specs | Proven |
| AC-003, AC-023 | API-20 `API-20-server-e2e-per-file.log` | `END 204 PASS … archive-run-history-graphql … 6 passed (6)`; `END 90 PASS … agent-runtimes-running-agents … 4 passed (4)`; 207 END lines. The three FAIL lines (indices 1 and 8, sleep boundary; index 21, fixed by `bce2f8b4e3`) passed on rerun | Proven |
| AC-004 | API-03 | the two `compaction-agent-flow` boundary tests and `… without provider traffic` ✓; no live compaction run | Proven |
| AC-006, AC-021, AC-025, AC-026, AC-029 (grep) | API-10, API-02, API-09; DEL-01 (gateway) | 0 matches for each name; tracked `.js` count 0; `i-heroicons-` count 0; gateway 86 files pass in DEL-01 | Proven |
| AC-007, AC-009 | API-07, API-24 `API-24-electron-isolation.log`; DEL-01 | `[typecheck] production errors: 0 …`, `PASS`; the build chain line contains `pnpm typecheck`; the Electron 27 errors are all baselined specs (design § H-07; 8 `electron/**/__tests__` entries) | Proven |
| AC-008 | API-11 → IMP-06 | SC-1..SC-5 `exit: 1`; the gate files are unchanged since | Proven |
| AC-011, AC-012, AC-013, AC-027 | API-17, API-18, API-19, API-21 logs | `Tests  3 passed (3)`, `3 passed`, `2 passed`, `1 passed` | Proven |
| AC-014 | API-14 `API-14-agent-runtimes-result.json` | `Pass`, `darwin-arm64`; ARP-08 not applicable. Linux was not run ("when available"; no host available) | Proven (macOS) |
| AC-016 | API-24 run 2 evidence JSON | E2E-PKG-001..005 `pass`, `failures []` | Proven |
| AC-018 | API-16 | `Tests  4 passed (4)` | Proven |
| AC-019 | API-12, IMP-12 | `FSTDEP 0` in every backend log; 0 request-log lines | Proven |
| AC-024 | API-01; DEL-01 | `Brief Studio importable package missing (…); build it with: pnpm -C autobyteus-server-ts test:integration:prepare`; the suites pass after the prepare step (API-20) | Proven |
| AC-028 | API-15 result JSON | `"meaningSearch": {"state": "UNAVAILABLE", "reason": "… no outside network (huggingface.co)"}`; PT-E2E-013 `Pass` | Proven |
| AC-029 | API-25 result JSON | `leftoverClassElements: 0` on all 6 steps; heroicon SVGs with a non-zero size | Proven |
| AC-031, AC-033 | API-26 | 12 of 12 providers; `docs(testing): live compaction runs are not required proof` | Proven |
| AC-032 | DEL-01, DEL-02 | clean clone at `9ac984a599`: every step exit 0 except one `test:integration` run with 2 watcher timeouts. That file passes alone 3 of 3 times and in the full rerun (DEL-02), and this ticket does not change it | Proven |

- More evidence requested: `None`
- User check needed: `No`. No criterion needs the user's accounts or nodes, and the user did not ask to check.
- Re-verification after later re-integration: see Repository Finalization.

## Release Decision

- Decision: `Beta`
- Decided by: the user, during delivery, 2026-10-28: "release a new beta please if everythign works thanks"

## Docs Sync Result

- Docs sync artifact: `tickets/done/test-and-tooling-hygiene-294/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated:
  - by delivery: `autobyteus-web/docs/electron_packaging.md`;
  - by the implementation, verified here: `TESTING.md`, `agent_definition.md`, `agent_team_definition.md`, `agent_tools_mcp_server.md`.

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-294/tickets/done/test-and-tooling-hygiene-294/`

## Version / Tag / Release Commit

- Version: `1.5.9-beta.14` (`python3 scripts/release_versions.py next-beta`; the highest existing tag is `v1.5.9-beta.13`)
- Release commit and tag: `4c34e5b71d` `chore(release): bump workspace release version to 1.5.9-beta.14` (sets `autobyteus-web/package.json` to `1.5.9-beta.14`), with annotated tag `v1.5.9-beta.14`, made by `scripts/desktop-release.sh beta --branch finalize/test-and-tooling-hygiene-294 --no-push`. Pushed to `personal` and pushed the tag, after checking that `origin/personal` was still `3f0f22f8c2`.

## Repository Finalization

- Bootstrap context source: the Code Reviewer handoff and RELEASE.md § Finalization Target
- Ticket branch: `codex/test-and-tooling-hygiene-294`
- Ticket branch commit result: `0d8d864ddd` (docs sync, verification, archive)
- Ticket branch push result: pushed to `origin/codex/test-and-tooling-hygiene-294`
- Finalization target remote / branch: `origin` / `personal`
- Target advanced after verification: `No` (`origin/personal` still at `73e4c4f329`)
- Re-integration before final merge result: `Not needed`
- Merge into target result: `finalize/test-and-tooling-hygiene-294` from `origin/personal`, `git merge --no-ff` → `3f0f22f8c2`. The tree is identical to the ticket branch. `check_licensing.py` and `check_repository_artifact_hygiene.py` passed on the merged state.
- Push target branch result: `73e4c4f329..3f0f22f8c2  HEAD -> personal`
- Repository finalization status: `Completed`

## Release / Publication / Deployment

- Applicable: `Yes` (beta, at the user's request)
- Method: `Project Release Guide` (RELEASE.md § Cutting The Release, beta)
- Pipelines triggered and their results (tag `v1.5.9-beta.14`):
  - Desktop Release `40640209395`: **failure**. All five build jobs (macOS ARM64, macOS x64, Linux x64, Linux ARM64, Windows x64) failed in `Build Electron …`, and Publish was skipped.
  - Android APK Release `40640209403`: success.
  - iOS App Store Connect Release `40640209398`: success.
  - Server Docker Release `40640209389`: success (`autobyteus/autobyteus-server:1.5.9-beta.14`; `:beta` moves to it)
- Published artifacts checked: `gh release view v1.5.9-beta.14` → pre-release with 2 of 17 assets (`AutoByteus_personal_android-1.5.9-beta.14-release.apk` and its `.sha256`); no desktop assets and no `latest*.yml`, so no desktop update is offered.
- Release/publication/deployment result: **`Partial`**. Per RELEASE.md § Recovery, the tag stays in place.
- Desktop failure cause: **a defect in this ticket's change**:
  - In CI, the job runs `pnpm install` and then `pnpm build:electron:<platform>`.
  - The new type gate (`pnpm typecheck`) runs in that chain before `pnpm prepare-server`.
  - `@autobyteus/application-sdk-contracts` resolves its types from `dist/index.d.ts` (`package.json` `types`). That `dist/` is built only by the server `prebuild` → `prepare:shared`, which in the build chain runs inside `prepare-server`.
  - On a fresh runner, the gate therefore saw 23 production errors (`TS2307: Cannot find module '@autobyteus/application-sdk-contracts'`, plus implicit `any`s that follow from it) and a changed test-file count: `[typecheck] FAIL`, `production errors: 23; test-file errors: 296 in 141 files (baseline 298 in 139 files)`.
- Why validation did not catch it:
  - every local run had the contracts `dist/` present: API-24 built in the worktree, and the clean clone (API-01, DEL-01) followed TESTING.md's install order, which runs server `prebuild` before the suites;
  - neither reproduced the CI job's order: install, then the build chain.
- Classification: `Local Fix` (packaging), routed to the implementation engineer. The gate must build or wait for the workspace packages it type-checks against: for example, run the shared-package build before `typecheck` in every `build:electron*` chain, or move `typecheck` after `prepare-server`. Then prove it from a fresh clone with no prior build, in the release job's order: `pnpm install` → `pnpm -C autobyteus-web build:electron:mac`, or at least `pnpm install` → `pnpm -C autobyteus-web typecheck` with no shared `dist/`.
- Recovery plan (RELEASE.md § Recovery, "the tag's content is at fault"): fix on `personal`, then cut the next beta, `v1.5.9-beta.15`. Do not re-dispatch or move `v1.5.9-beta.14`.
- Release notes handoff result: `Not required` (beta)

### Build-only release run on the fix (RELEASE.md § Build-only release run)

- Run: Desktop Release `40649647049`. Dispatched with `pnpm release:test --ref codex/test-and-tooling-hygiene-294` (`workflow_dispatch`, `publish_release=false`) on `1f5a4a19df`, the reviewed code of IR-003 and IR-004. Later commits up to `7608a73c57` change only ticket documents.
- Before the push: Secret Gate on `origin/codex/test-and-tooling-hygiene-294..1f5a4a19df` (11 commits): `PASS (no secrets found)`.
- Attempt 1:
  - Linux x64, Linux ARM64 and macOS Intel x64 succeeded.
  - macOS ARM64 failed in `Install workspace dependencies`: `ERR_PNPM_FETCH_503  GET https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz: Service Unavailable - 503`, after 3 tries. This was transient: the host answered `200` minutes later. Follow-up FU-015.
  - Windows x64 hung in `Install workspace dependencies` for 44 minutes (a normal Windows job takes about 15 minutes in total), so I cancelled the run.
- Attempt 2 (`gh run rerun 40649647049 --failed`, RELEASE.md § Recovery, transient): macOS ARM64 and Windows x64 succeeded.
- Result: **`success` on all five builds**. Publish was `skipped` (build-only), with no tag and nothing published.
- Every job's gate line was identical: `[typecheck] production errors: 0; test-file errors: 298 in 139 files (baseline 298 in 139 files)`, then `[typecheck] PASS`. Nuxt run times:
  - Linux x64 job `122686857119`: 33.8 s;
  - Linux ARM64 job `122686857159`: 53.1 s;
  - macOS Intel x64 job `122686857187`: 56.5 s;
  - Windows x64 job `122702912714`;
  - macOS ARM64 job `122702912310`: 75.5 s.
- No `FATAL` or SIGABRT on either macOS runner.

### Recovery release `v1.5.9-beta.15` (RELEASE.md § Recovery: the tag's content was at fault)

- **Decision:** the user, 2026-10-28: "if no problem then we should release … Release the beta please". The gate stays in `build:electron*`, as REQ-007 / DEC-004 have it. The idea of moving it out of the GitHub pipeline is not part of this release; the Solution Designer was told it is a separate change.
- **Repository finalization of the fix:**
  - Secret Gate `origin/personal..codex/test-and-tooling-hygiene-294` (12 commits): PASS;
  - ticket branch pushed (`2c23d65cac`);
  - `finalize/test-and-tooling-hygiene-294` from `origin/personal` `4c34e5b71d`, `git merge --no-ff` → `620a4d988b` (tree identical to the ticket branch);
  - Secret Gate on the merged state (13 commits): PASS; licensing and hygiene checks: passed;
  - `origin/personal` unchanged, so pushed `4c34e5b71d..620a4d988b`.
- **Checks before tagging** (RELEASE.md as updated in `aca8655bdd`):
  - `scripts/check_secrets.sh v1.5.9-beta.14..HEAD`: PASS (13 commits).
  - Build-only release run `40658284610` (`pnpm release:test --ref personal`, head `620a4d988b`): `success` on the first attempt. All five builds show `[typecheck] production errors: 0; test-file errors: 298 in 139 files (baseline 298 in 139 files)`, `[typecheck] PASS`. Publish was `skipped`.
  - Server Docker image (no build-only mode in `release-server-docker.yml`, which always pushes), built locally from a clean detached checkout of `620a4d988b` with `docker build -f autobyteus-server-ts/docker/Dockerfile.monorepo`: `docker build exit: 0 (241s)`. The image holds `autobyteus-server-ts/mobile-web` (the `build:mobile-web` output) and `dist`; image and checkout removed (`evidence/DEL-03-server-docker-local-build.log`). This covers the one Docker input the fix changed (`autobyteus-web/nuxt.config.ts`, a type-check exclude list).
  - Android and iOS: their workflows build only the native projects; nothing they build changed since `v1.5.9-beta.14`, where both succeeded.
- **Release commit and tag:**
  - `517cf5b604` `chore(release): bump workspace release version to 1.5.9-beta.15`, with annotated tag `v1.5.9-beta.15` (`scripts/desktop-release.sh beta --branch finalize/test-and-tooling-hygiene-294 --no-push`);
  - `origin/personal` was still `620a4d988b`, so I pushed `620a4d988b..517cf5b604` and the tag.
- **Rollout** (the four runs watched together):

  | Workflow | Run | Result | Time (UTC) |
  | --- | --- | --- | --- |
  | Desktop Release | `40662983257` | success | 09:16:40 → 09:50:59 |
  | Server Docker Release | `40662983271` | success | 09:16:40 → 09:54:58 |
  | Android APK Release | `40662983285` | success | 09:16:40 → 09:22:14 |
  | iOS App Store Connect Release | `40662983305` | success | 09:16:40 → 09:34:42 |

- **Published artifacts:**
  - `gh release view v1.5.9-beta.15`: pre-release, not a draft, **17 of 17 assets**:
    - Android APK and its `.sha256`;
    - Linux x64 and ARM64 AppImages;
    - macOS ARM64 and x64 `.dmg`/`.zip` with blockmaps;
    - the Windows `.exe`;
    - `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml`.
  - Docker Hub: `autobyteus/autobyteus-server:1.5.9-beta.15` and `:beta` share digest `sha256:b0c7a64ef0b4…408aab`, for `linux/amd64` and `linux/arm64`.
- **Result:** `v1.5.9-beta.15` is `Completed`. `v1.5.9-beta.14` stays as the partial release (Android, iOS, Docker; no desktop assets), and its tag was not moved.

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-294`
- Worktree cleanup result: `Completed` after this record is pushed, the same way as the previous delivery. Only untracked build output (`autobyteus-web/electron-dist/`, git-ignored) remains in it.
- Local ticket branch cleanup result: `Completed` after this record is pushed. `codex/test-and-tooling-hygiene-294` and `finalize/test-and-tooling-hygiene-294` are both contained in `origin/personal`.
- Remote branch cleanup result: `Not required`. `origin/codex/test-and-tooling-hygiene-294` is kept as pushed ticket history, as for earlier tickets.
- Temporary items: the clean clones, the Docker check image and its checkout, and `/tmp/ab294-delivery` were removed.

## Release Notes Summary

- Release notes artifact: not required. RELEASE.md: beta tags publish GitHub generated notes; curated notes are for stable releases only.
- Release notes status: `Not required`

## Deployment Steps

- No hosted deployment (RELEASE.md § Deployment). The server rollout is the Docker image `autobyteus/autobyteus-server:1.5.9-beta.15`; `:beta` points to it (same digest). Users upgrade with `autobyteus-docker upgrade --all --tag beta`.
- Desktop installs with **Receive beta updates** on are offered the update.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected`
- Delivery action required: `None`
- Result and evidence: API-16 and the startup-migration E2E files in API-20 pass.

## Verification Checks

- Checks before the final commit:
  - `python3 scripts/check_repository_artifact_hygiene.py`: passed;
  - `python3 scripts/check_licensing.py`: consistent;
  - archived ticket paths: at most 100 characters, with no Windows-hostile names.
- DEL-01 (clean clone at `9ac984a599`): every step exit 0, except `test:integration` (79 passed, 20 skipped, 1 failed). The failing file was `file-system-watcher.integration.test.ts`: 2 cases `Timed out waiting for event`.
- DEL-02: the watcher file alone, 14/14 three times; full `test:integration`, `Test Files  80 passed | 20 skipped (100)`, exit 0.
- Classification: a load-timing flake in a test this ticket does not change. An earlier delivery (`external-messaging-agent-participant-redesign`) recorded the same timeout on another case. Follow-up FU-014.

## Rollback Criteria

- If the beta shows a regression, revert the merge on `personal` and cut the next beta (RELEASE.md § Rollback).
- Desktop updates never downgrade.
- No app-data migration in this change, so an older build reads the data unchanged.

## Final Status

- Verification complete: `Yes`.
  - From the evidence (API-REV-001, and API-REV-003 for the fix) and the clean clone (DEL-01, DEL-02).
  - Plus the release-runner proof the first release lacked: build-only runs `40649647049` (fix branch) and `40658284610` (`personal`), and the local Docker build DEL-03.
  - No user check was needed.
- Repository finalization complete: `Yes`.
  - `3f0f22f8c2` (ticket), `620a4d988b` (fix), release commits `4c34e5b71d` (beta.14) and `517cf5b604` (beta.15);
  - this record goes in a docs commit on top.
- Applicable release/deployment/rollout complete: `Yes`.
  - `v1.5.9-beta.15`: all four workflows succeeded, 17 of 17 assets, Docker `:beta` moved.
  - `v1.5.9-beta.14` is recorded as partial.
- Applicable safe cleanup complete: `Yes`, after this record is pushed (see Post-Finalization Cleanup).
- Unresolved blocker: `None`.
- Proposed guide fix not yet agreed by the user: one line in Checks Before Tagging, saying that when a change touches the server or the web files the server Docker image builds (`Dockerfile.monorepo`: `build:mobile-web`), build that image locally before tagging, because `release-server-docker.yml` has no build-only mode.
- Successful terminal package eligible for return: `Yes`.
- Terminal package sent to the Solution Designer: `Yes`, `Delivery Completed`, after the push of this record.
