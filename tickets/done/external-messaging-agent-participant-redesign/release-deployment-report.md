# Delivery / Release / Deployment Report — external-messaging-agent-participant-redesign

## Release / Publication / Deployment Scope

This delivery finalizes the removal of all external-channel and messaging-gateway code from the main product into `origin/personal`. The change set includes:

- a public API removal (GraphQL, REST, a remote-access route class);
- a shared stream-contract change;
- a destructive startup data migration plus a Prisma table drop;
- release, packaging and pnpm workspace changes.

The user requested a release at verification. It shipped as **`v1.4.80`** through the documented helper `scripts/desktop-release.sh` with this ticket's `release-notes.md` (see Version / Tag / Release Commit, including the Release Incident).

- Classification (carried): `task_size=Large`, `architectural_risk=High`. Route: reviewed. Architecture review ARCH-REV-002 Pass; code review CRR-004 Pass (9.45/10); API/E2E API-REV-002 Pass (95.3%); test-code review CRR-005 `Not Applicable`.

## Handoff Summary

- Handoff summary artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: written after the integration refresh and the post-integration checks.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `40b1783f4`
- Latest tracked remote base reference checked: `origin/personal` @ `fdbd07124` (fetched at delivery start, 2026-09-24)
- Base advanced since bootstrap or previous refresh: `Yes`. 8 commits: `b68847a8c`, `b1512bf25`, `49ce0d173`, `ba28b4bb7`, `f43bbe9de`, `ecfc8cc0f` (unified Team and Org run-history policy), `6674fc513` (v1.4.79 version bump) and `fdbd07124` (v1.4.79 delivery record).
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Not needed`. The reviewed and validated state was already committed as `40f769e0d`. The ticket folder is untracked and is not touched by a merge.
- Integration method: `Merge`. `git merge --no-ff origin/personal` produced merge commit `b818a6860`.
- Integration result: `Completed`. 2 conflicts, both mechanical, resolved while keeping both sides' intent:
  - `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/release-manifest.json` (modify/delete): the base only bumped it to v1.4.79, and the approved design deletes it. It stays deleted.
  - `autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` (content): the ticket replaced the removed channel launcher with `teamRunService.restoreTeamRun(...)`, and the base changed the next line's wait from `setTimeout(10)` to `await Promise.resolve()`. Both edits are kept.
  - Auto-merged and reviewed:
    - `autobyteus-message-gateway/package.json`: only the base's own version bump to 1.4.79. The ticket's dependency edits are intact, and this is not a ticket change to the gateway.
    - `autobyteus-server-ts/docs/modules/{agent_team_execution,run_history}.md`: ticket edits intact, no messaging content reintroduced.
  - This follows the repository precedent for delivery-resolved additive conflicts (for example `claude-sdk-background-task-lifecycle` and `agent-team-member-runtime-selection`).
  - Semantic check: the 35 code files the base changed use none of the removed symbols (the store-utils helpers, publishers, broadcaster, config parsers, internal URL, `EXTERNAL_SIGNATURE`, messaging identifiers).
- Post-integration executable checks rerun: `Yes`. Everything ran in a scrubbed env via `api-e2e-evidence/scripts/cleanenv.sh`. Logs are in `delivery-evidence/`.
  - D-01: REQ-120 content, path and residue gate (`req120-gate.sh`). Identical to the validated round-2 result: the content gate hits only the 4 allowed registry lines, and the path gate is empty.
  - D-02: `npx tsc -p tsconfig.build.json --noEmit` (server) passes.
  - D-03: targeted `vitest run` over the conflicted integration test, `tests/unit/run-history`, `tests/unit/agent-memory`, `tests/unit/agent-org-execution`, the base-changed app-data-migration tests, the cleanup migration test, `tests/unit/services/agent-streaming` and `tests/architecture`. 83/85 files and 507/509 tests pass. The 2 failures (`agent-run-history-catalog-service`, `published-artifact-projection-service`) are on the validator's pre-existing R-05 list. The conflicted test passes.
  - D-04: full `vitest run tests/unit tests/architecture`. 501/520 files pass, with 37 failing tests. **0 new** relative to R-05; 19 fewer failures, because the base fixed `agent-org-history-candidate-safety` and others.
  - D-05: full `vitest run tests/integration`. 49 files pass and 18 skip, with 46 FAIL lines. 45 are on the R-05 list. 1 is new: `file-system-watcher.integration.test.ts > respects nested .gitignore files`, which timed out waiting for a watcher event. 2 R-05 failures no longer fail.
  - D-08: the new watcher failure passes 14/14 in 3 of 3 isolated reruns. Neither the ticket nor the base changes `src/file-explorer` or its tests. It is classified as a load-timing flake, not a regression.
  - D-07: the added-file set against the new base is exactly the 6 designed additions. The ticket delta over the new base is 440 files, +579/−32279, identical to the reviewed delta. The SDK `dist/` folders have 0 tracked files.
- Post-integration verification result: `Passed`
- No-rerun rationale: N/A. New base commits were integrated. The web, `autobyteus-ts`, contract and gateway suites were not rerun because the base changed no code in those packages; it only bumped the `autobyteus-web/package.json` version.
- Delivery edits started only after integrated state was current: `Yes`. Docs, release notes and reports were written on the merged state, and the gate was rerun after docs sync (D-06, identical to D-01).
- Handoff state current with latest tracked remote base: `Yes` (as of `fdbd07124`)
- Blocker (if applicable): None

## User Verification

- User verification build: `Completed`. The user asked, "read the readme, and build the electron so i could test".
  - What was built: a local, unsigned macOS arm64 **personal** Electron build of integrated HEAD `b818a6860`, with no publication.
  - Command: `NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_ID= APPLE_APP_SPECIFIC_PASSWORD= APPLE_SIGNING_IDENTITY= AUTOBYTEUS_BUILD_FLAVOR=personal pnpm -C autobyteus-web build:electron:mac`. It ran detached, with the live-app env variables cleared, and exited 0.
  - App: `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
  - DMG: `AutoByteus_personal_macos-arm64-1.4.79.dmg`, SHA-256 `5d7245df…1193`, `hdiutil verify` VALID
  - ZIP: SHA-256 `ba9a4c0c…5003`
  - The content check shows the cleanup migration and the Prisma drop are bundled, and no messaging module or removed event is present (positive controls hit).
  - Logs: `delivery-evidence/D-09`, `D-10`.
- Real-data upgrade check on the user's machine: `Passed` (see `handoff-summary.md` → User Test Finding).
  - On the first run, a stale SUCCEEDED record written into the real DB by the implementation-stage smoke (inherited `DATABASE_URL`) made the runner skip the cleanup.
  - With the user's approval, delivery backed up the DB and deleted that one record.
  - On the relaunch, the cleanup ran: SUCCEEDED 4/4 against the real roots, about 6.9 GB freed, no token or config files left, 0 startup errors.
- Initial explicit user completion/verification received: `Yes`
- Initial verification / acceptance reference: user message on 2026-09-25, after running the local personal Electron build on real data: "its working now. lets finalize and release".
- Renewed verification required after later re-integration: `No`. `origin/personal` was re-fetched after verification and was still `fdbd07124`, so there was no re-integration.
- Renewed verification received: `Not needed`
- Renewed verification / acceptance reference: N/A

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-server-ts/README.md` (Production data migrations: cleanup migration and Prisma table drop) and `autobyteus-server-ts/docs/ARCHITECTURE.md` (Module Boundaries: chat-platform boundary)
- No-impact rationale: N/A

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`, after user verification and before the final ticket-branch commit.
- Archived ticket path: `tickets/done/external-messaging-agent-participant-redesign/`
- Pre-commit secret check of the archived folder: 185 files, 5.6 MB, no file above 1 MB. The exact values of all 14 key/token/secret variables in the environment appear in 0 text or binary files. The strict provider-key pattern has 0 hits; the `sk-` substring hits are test names such as `task-delegation…`.

## Version / Tag / Release Commit

- Released version: **`1.4.80`**, the only version this ticket published.
- Final release commit on `personal`: `3e5d6add5` "chore(release): restore workspace release version to 1.4.80". Its tree equals the build-only-proven `589005470` except for the `autobyteus-web/package.json` version line.
- Tag: annotated `v1.4.80` (tag object `01ed48dd3`), resolving to `3e5d6add5`.
- Curated notes: `.github/release-notes/release-notes.md`, identical to the archived `release-notes.md`.
- After this change the helper bumps only `autobyteus-web/package.json`. There is no gateway version or manifest sync.

### Release Incident: Two Failed Attempts, Recovered Under The Same Version

Delivery made two mistakes. All four workflows were cancelled or failed before anything published, so no user saw a broken release, and v1.4.79 stayed Latest throughout.

1. **Attempt 1: `v1.4.80` on `986d94714`.**
   - Desktop run `36094981782` failed at "Check repository artifact hygiene". Delivery's archive commit `339b13a41` had added 6 tracked paths longer than 200 characters under `api-e2e-evidence/fixture-legacy-baseline-40b1783f4/memory/`.
   - Android `36094981964` (stopped before publish), iOS `36094981690` (before upload) and Docker `36094982053` (before push) were cancelled.
   - Fix `1d6c94746`: the fixture `memory/` tree (13 files) was packed into a byte-verified `memory.tar.gz` with a note.
2. **Delivery wrongly bumped the version to `v1.4.81` (`41340cf21`) instead of re-running 1.4.80.**
   - Desktop run `36095241299` failed in "Build Windows x64" checkout with `invalid path`. Three archived log names contained `:` (`R-07-web-audit:localization-literals.log` and two guard logs).
   - Android `36095241304`, iOS `36095241305` and Docker `36095241297` were cancelled before publishing.
   - Fix `589005470`: renamed the three logs (`:` → `-`). A full tracked-tree Windows scan found 0 invalid characters, reserved names, trailing dots or spaces, over-length paths or case collisions.
   - Build-only proof run `36095434388` on `589005470` (`desktop-release.sh test --ref personal`, no publish): all 5 desktop builds succeeded (Windows x64, macOS ARM64/x64, Linux x64/ARM64).
3. **Delivery wrongly bumped again, to `v1.4.82` (`dc03f453f`).** The user objected that a failure should be fixed and re-run under the same version. All four `v1.4.82` runs (`36096673091`, `36096673145`, `36096673187`, `36096673137`) were cancelled before publishing.
4. **Recovery under the same version** (user direction: "fix the code and then still use the same version … trigger … manually"):
   - `3e5d6add5` restored `autobyteus-web/package.json` to `1.4.80`.
   - The unpublished tags `v1.4.81` and `v1.4.82` were deleted locally and on `origin`.
   - Remote `v1.4.80` was deleted and re-created on `3e5d6add5`. The tag push re-ran all four release workflows for 1.4.80.
- Verified before the recovery: there is no GitHub Release for 1.4.80, 1.4.81 or 1.4.82; Docker Hub returns 404 for `1.4.80`, `1.4.81` and `1.4.82`; and `latest` was unchanged since 2026-09-24T15:04Z.
- Process lessons:
  - Run `scripts/check_repository_artifact_hygiene.py` **and** a Windows path-validity scan before any release tag that includes new tracked ticket evidence.
  - Recover a failed, unpublished tag by fixing it and re-pointing the same tag with the user's go-ahead. Never bump the version to retry.
  - The hygiene script does not check Windows-invalid characters. That is a separate-ticket candidate.

## Repository Finalization

- Bootstrap context source: `solution-handoff.md` § Workspace (finalization target `personal`)
- Ticket branch: `codex/external-messaging-agent-participant-redesign`
- Ticket branch commit result: `Completed`. Commits:
  - `40f769e0d`: the reviewed change
  - `b818a6860`: base merge
  - `339b13a41`: docs sync plus ticket archive
- Ticket branch push result: `Completed`. `origin/codex/external-messaging-agent-participant-redesign` @ `339b13a41`.
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: `No`. `origin/personal` was still `fdbd07124` when re-fetched after verification and again before the merge.
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `Completed`. The local branch `delivery/external-messaging-agent-participant-redesign-release` was cut from the freshly fetched `origin/personal` @ `fdbd07124` inside the ticket worktree. The user's shared checkout was not touched.
- Merge into target result: `Completed`. `git merge --no-ff` produced `275da3520` "Merge external messaging removal from the main product". Its tree is identical to ticket branch `339b13a41`.
- Push target branch result: `Completed`. All pushes to `personal` were fast-forwards:
  - `fdbd07124..986d94714`
  - `..41340cf21`
  - `..589005470`
  - `..dc03f453f`
  - `..3e5d6add5`

  After the delivery record commit, `origin/personal` is at that record commit.
- Repository finalization status: `Completed`
- Blocker (if applicable): None

## Release / Publication / Deployment

- Applicable: `Yes`. The user requested it: "lets finalize and release".
- Method: `Release Script` (documented helper, tag-triggered GitHub Actions)
- Method reference / command:
  - `bash scripts/desktop-release.sh release 1.4.80 --release-notes tickets/done/external-messaging-agent-participant-redesign/release-notes.md --branch delivery/external-messaging-agent-participant-redesign-release --no-push`, then `git push origin HEAD:personal` and `git push origin v1.4.80`.
  - The final `v1.4.80` tag was re-created on `3e5d6add5` as described above.
- Release/publication/deployment result: `Completed`. All four tag-triggered workflows for the final `v1.4.80` succeeded on `3e5d6add5`:
  - [Desktop Release `36096950461`](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/36096950461): Linux x64/ARM64, Windows x64, macOS ARM64/x64, and publish.
  - [Android APK Release `36096950438`](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/36096950438)
  - [iOS App Store Connect Release `36096950478`](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/36096950478): archive and upload succeeded. This does not cover App Store review or TestFlight availability.
  - [Server Docker Release `36096950480`](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/36096950480): succeeded. `autobyteus/autobyteus-server:1.4.80` and `latest` are live for amd64 and arm64. The `zh` image step was skipped by its workflow condition, as in recent releases (`latest-zh` was last updated 2026-09-02).
  - No messaging-gateway workflow exists or ran.
- GitHub Release: [v1.4.80](https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.80), non-draft, stable, **Latest**, published 2026-09-25T05:05:59Z, target `3e5d6add5`.
  - It has 17 assets. Compared with v1.4.79's 21, the only differences are the 4 removed gateway assets (`autobyteus-message-gateway-*-node-generic.tar.gz{,.json,.sha256}` and `release-manifest.json`), which is REQ-117 confirmed in production.
  - Assets: Android APK plus `.sha256`; Linux x64/ARM64 AppImages; macOS ARM64/x64 DMG and ZIP with blockmaps; the Windows installer; `latest.yml`, `latest-mac.yml`, `latest-linux.yml` and `latest-linux-arm64.yml`.
- Docker Hub: `autobyteus/autobyteus-server:1.4.80` and `latest`, both amd64 and arm64, updated 2026-09-25T05:29Z.
- Release notes handoff result: `Used`. The published body equals the archived `release-notes.md` except for one trailing blank line added by GitHub.
- Blocker (if applicable): None
- Release-path facts for this change:
  - A tag push now starts 4 workflows (desktop, Android, iOS, server Docker).
  - The server Docker release builds `autobyteus-server-ts/docker/Dockerfile.monorepo`, which has no messaging references.

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign`
- Safety check before cleanup: no process runs from the worktree (`pgrep` and `lsof` on `electron-dist` are empty). The user is running `/Applications/AutoByteus.app`, not the local test build.
- Remote branch cleanup result: `Completed`. `origin/codex/external-messaging-agent-participant-redesign` was verified as an ancestor of `origin/personal`, then deleted.
- Local ticket branch cleanup result: `Completed`. `codex/external-messaging-agent-participant-redesign` (`339b13a41`) was deleted.
- Worktree cleanup result: performed as the final step, right after this record is committed and pushed to `personal`. It uses `git worktree remove --force` from the shared checkout, since the worktree holds only ignored build output (`node_modules`, `dist`, `electron-dist`), which the local test build also lived in. The worktree's local branch `delivery/external-messaging-agent-participant-redesign-release`, which is fully merged, is then deleted. The result is confirmed in the terminal message to `/solution_designer`.
- Worktree prune result: `git worktree prune`, in the same final step.
- Blocker (if applicable): None

## Escalation / Reroute

Not applicable. There is no blocker. The release incident was delivery-local and was resolved within delivery (see Version / Tag / Release Commit → Release Incident).

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `tickets/in-progress/external-messaging-agent-participant-redesign/release-notes.md`. It covers:
  - messaging removed;
  - messaging stops on upgrade, and bindings, runtimes and bot tokens are deleted with no backup;
  - orphan tables dropped;
  - history preserved;
  - the Docker all-in-one `gateway.log` and gateway-memory volume are not pruned (R-3), with manual cleanup steps;
  - MCP and skills unchanged.

  It contains no REQ-120 identifiers, supplementary residue patterns or provider names, because the helper copies it into the gate-searched `.github/release-notes/release-notes.md`.
- Archived release notes artifact used for release/publication: `tickets/done/external-messaging-agent-participant-redesign/release-notes.md`, synced to `.github/release-notes/release-notes.md` and published as the v1.4.80 body.
- Release notes status: `Updated`
- The code reviewer's item "replace the published 'messaging bindings' note" is already satisfied by the merged base: `.github/release-notes/release-notes.md` is now the v1.4.79 note, with 0 "messaging" matches.

## Deployment Steps

1. User verification: the local personal Electron build ran on real data. The cleanup ran after the stale record was repaired. The user wrote: "its working now. lets finalize and release".
2. Re-fetched `origin/personal`. It was unchanged at `fdbd07124`.
3. Pre-commit secret scan of the ticket folder, then archived it to `tickets/done/`. Commit `339b13a41`, pushed to the ticket branch.
4. Cut the delivery branch from `origin/personal` and ran `merge --no-ff` to produce `275da3520` (tree identical to `339b13a41`). The final REQ-120 gate was identical to D-06.
5. Removed the untracked SDK `dist/` build output so the helper's clean-tree check passed.
6. Release attempts, recovery and the final `v1.4.80`: see "Release Incident" above.
7. Monitored all four final workflows to success, then verified the GitHub Release (assets, notes, target) and the Docker Hub tags.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision:
  - A: discard the four messaging data roots through startup migration `20260924_remove_external_messaging_data`, with no backup (DEC-110).
  - B: drop the orphan tables through Prisma `20260924120000_remove_external_channel_tables`.
  - C: historical run memory is directly usable, with no migration.
- Delivery action required: `Discard or Rebuild`. It is performed automatically by the shipped migrations on each installation's first start. Delivery performs no manual data action.
- Result and evidence:
  - L-02 (upgrade on real baseline-produced data), L-04 (fault injection, FAILED then retry then SUCCEEDED) and G-01 (a default-data-dir start is clean).
  - On this machine, the live data dir `/Users/normy/.autobyteus/server-data` currently holds about 6.9 GB in the four roots (read-only measurement). It is deleted when the user first runs a build containing this change.
- Not covered by design (R-3): the Docker all-in-one `<logs>/gateway.log` and any gateway-memory named volume. This is documented in the release notes and the server README.
- Migration completion, validation, recovery and rollout evidence: N/A (`Discard or Rebuild`, not `Migration Required`)

## Verification Checks

See "Initial Delivery Integration Refresh" (D-01 to D-08) and `handoff-summary.md` → Validation Evidence.

## Rollback Criteria

- Code: revert the merge commit on `personal`. Old clients or gateways then get the pre-change routes back.
- **Data is not rollback-able.** After a build containing this change has started on an installation, its messaging bindings, gateway runtimes, config and bot tokens are gone. Rolling back the code would require reinstalling the gateway and re-creating bindings and bot tokens. This is accepted in DEC-110 and ASM-103.
- Rollback triggers:
  - a non-messaging feature regression traced to a removed module or shared contract;
  - the cleanup migration touching anything beyond its four roots (a design escalation trigger; not observed in unit tests, L-02 or L-04).

## Final Status

- Explicit user testing/verification complete: `Yes` (2026-09-25, "its working now. lets finalize and release")
- Repository finalization complete: `Yes`. Merged into `personal` as `275da3520`, plus the release and record commits.
- Applicable release/deployment/rollout complete or not required: `Yes`. `v1.4.80` published: 4 of 4 workflows succeeded, GitHub Release Latest, Docker `1.4.80`/`latest` live.
- Applicable safe cleanup complete or not required: `Yes`. The ticket branches are deleted locally and remotely. Worktree removal plus deletion of its merged delivery branch is the final step after this commit.
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to `/solution_designer`: sent after the final cleanup step. The confirmation is in the delivery conversation.
- Terminal message/reference: `send_message_to` → `/solution_designer` (Delivery Completed)
