# Handoff Summary

## Summary Meta

- Ticket: `ios-demo-operation-coverage` (Project Task `autobyteus-584`; requested by `/project_task_manager`, 2026-11-21): the prerequisite for the next beta, after `v1.5.14-beta.4`'s iOS build failed.
- Date: `2026-11-21`
- Classification: `task_size: Small`, `architectural_risk: Low`; route: direct low-risk (no architecture review, no source review, no test-code review by policy). API/E2E `API-REV-001` Pass, final confidence 96.5 % (target met, no category below 90 %).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`).
- Branch: `codex/ios-demo-operation-coverage`, base `origin/personal` `90c4958a35` at bootstrap; integrated once with `origin/personal` `726c5beaf9` (one commit, the beta.4 release record; clean merge `44deff6562`). Code `0d197a73b9`.

## Delivery Summary

- Delivered scope:
  - **The demo build passes its operation coverage again.** `demo/graphql/unreachable-operations.json` lists `AgentSemanticMemoryFolder`, `GlobalSemanticMemoryFolder`, `ListAgentEpisodes` and `ListMemoryGroupMembers` as unreachable with the existing reason `memory` (they serve only the desktop memory page), and drops `ListAgentRunsWithMemory`, which no longer exists. These are the five lines that failed the iOS release run `44877725696` on `v1.5.14-beta.4`.
  - **A fast local check of the same rule.** `scripts/mobile-build-checks.mjs` gains `sourceOperations(webRoot)` (every operation defined in the web source, outside dependencies, build outputs, generated code, tests and `demo/`), and `demoOperationCoverage` now takes the set to check; `build-mobile-web.mjs` passes `compiledOperations(...)` as before. `scripts/__tests__/mobileBuildChecks.spec.ts` applies the rule to the source in the web suite (2 s, no build) and names any unanswered, stale or unexplained operation. The measured equality that makes this sound: the phone build compiles exactly the operations the source defines (252 = 252).
  - **The testing rule.** `TESTING.md` "Choosing the path" has a row: a change to GraphQL documents, an inline operation or `demo/**` runs the spec, then `autobyteus-ios/scripts/prepare-demo-web.sh --build` (the authority). Added by API/E2E in its own commit. The check lives where it can fail earliest, not in a release step.
- Docs synced (`docs-sync-report.md`): `autobyteus-web/docs/remote_access.md` ("The demo build (iOS)": the source-level check). `TESTING.md` was updated by the ticket and verified by delivery. `DESIGN.md`, `RELEASE.md`: no change.
- Durable coverage: the spec's two new tests (the source reader's exclusions; the real source against the real list) and the existing build-time check, which stays the authority. No release notes: the change is internal, with no user-facing effect.

## Verification Summary

- Verified from evidence by delivery. Every critical acceptance criterion (AC-001…AC-004) is directly proven; nothing needs the user's check.
- Final confidence 96.5 % (target 95 % met).
- Key evidence opened by delivery (details in `release-deployment-report.md`):
  - AC-001/AC-004: build-only iOS release run `44881140728` (workflow_dispatch, `publish_app_store_connect=false`, `release_ref` = the ticket branch), which I read from GitHub directly: `conclusion: success`, head `929976f818`; "Build the bundled demo: success" with `The demo answers all 252 compiled operations (handled or listed as unreachable).`; "Generate, build, and run implementation checks: success" (`** BUILD SUCCEEDED **`, `** TEST SUCCEEDED **`, 56 tests, 0 failures); "Validate iOS Publish Secrets" and "Archive And Upload To App Store Connect" skipped; no `v1.5.14-beta.5` tag exists. The same line on the demo build run locally (`IMP-04`).
  - AC-002: the spec passes 8/8 on the real source; with a temporary unlisted `query ProbeOnlyOperation584` it fails with `"unanswered": ["ProbeOnlyOperation584"]`, so it catches a new operation, not only the five known names; on the base list it failed on exactly the four unlisted operations and the stale entry (`IMP-01`). Delivery reran it on the merged tree: 8/8.
  - AC-003: the `TESTING.md` row, checked against the code (above).
  - Fresh-start build (the ticket changes `autobyteus-web/scripts/**`, a build input): API/E2E cloned at `929976f818`, ran `pnpm install --frozen-lockfile` and the macOS ARM64 job's `build:electron:mac -- --arm64`: guards pass, `[typecheck] PASS` at baseline, the DMG and zip built, both of the job's verify steps pass. Signing, notarization, x64, Linux and Windows are not tested locally (they need the runner).
- Integrated-state check on the merged tree (`evidence/delivery/`): the coverage spec 8/8; server typecheck at baseline (0 production errors, 1006 test-file errors in 315 files); web typecheck at baseline (0 and 86 in 36 files) once `dist-mobile-demo/` was moved aside (below). The one new base commit changes ticket files only, and nothing but `TESTING.md` changed in the code since the tested commit.

## Residual Risks For The User

- **FU-001 (urgent, open):** while a demo build's `autobyteus-web/dist-mobile-demo/` exists, `pnpm -C autobyteus-web typecheck` runs out of memory, because `nuxt.config.ts` excludes `../dist-mobile/**` but not `../dist-mobile-demo/**`. Delivery hit it: the first web typecheck on the merged tree aborted (`heap limit`, `evidence/delivery/DEL-02-web-typecheck-first-run-oom.log`) and passed at baseline with the 13 MB folder moved aside. The new TESTING.md row says to remove the folder first. Until FU-001 is fixed, anyone who builds the demo locally and then typechecks meets it.
- **R-1 (by design):** the source's operation set and the build's compiled set could diverge (an operation compiled from somewhere the source reader skips). The demo build's check stays the authority, and the iOS release runs it.
- **Not tested:** the TestFlight upload itself (the build-only run skips it by design; it needs the publish secrets); signing and notarization, and the other desktop targets (they need the runner).
- **For the next beta (`v1.5.14-beta.5`, waiting for the founder's word):** this ticket makes the iOS "Build the bundled demo" step pass. The release record of beta.4 says the iPhone/iPad TestFlight line (autobyteus-571, Xcode 27) was dropped from its notes after the iOS failure and "moves to the beta that carries iOS": that line belongs in the next beta's notes, which the release ticket writes.

## Follow-ups

- `follow-ups.md` lists FU-001 for the Solution Designer to send: urgent, from the implementation (the Nuxt type project must exclude `../dist-mobile-demo/**`; its suggested Task now also says to drop the TESTING.md sentence that FU-001's fix makes stale). Delivery found nothing else outside this ticket's scope.

## Release

- No release: the user did not ask for one in this ticket (the task states `v1.5.14-beta.5` waits for the founder) and `RELEASE.md` makes none the default. This ticket is its prerequisite.
