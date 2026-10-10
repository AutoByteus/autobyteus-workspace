# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

- Ticket `anthropic-prompt-caching`: native AutoByteus-runtime Anthropic prompt caching, the prefix-bound reasoning guard, the provider-native history boundary, the interrupt note after history, Token Meter cache pricing, Sonnet 5 pricing and SDK 0.132.1.
- Classification (preserved): `task_size=Large`, `architectural_risk=High`. Route: reviewed.
  - Solution: SR-005.
  - Architecture review: ARCH-REV-003.
  - Implementation: IR-001.
  - Code review: CRR-001 Pass.
  - API/E2E: API-REV-001 Pass (95%).
  - Test-code review: CRR-002 Pass.
- One repository: `codex/anthropic-prompt-caching` → `origin/personal`.
- Release: the user asked for a new beta, published as **`v1.4.99-beta.9`**.
- Current state: **Delivery Completed (DR-003)**: user verified, finalized, released and cleaned up.
  - DR-001 was held because the API/E2E desktop round was reopened at the user's request.
  - That round finished as API-REV-002 Pass (96%), with no test-code change, and was routed directly to delivery.

## Handoff Summary

- Handoff summary artifact: `tickets/done/anthropic-prompt-caching/ (on `personal`) handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/anthropic-prompt-caching/ (on `personal`) delivery-revision-record.md`
- Current delivery revision ID: `DR-003` (finalization and release)

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `927796780`
- Latest tracked remote base reference checked: `origin/personal` @ `e350a194b` (fetched 2026-10-09 ~13:15 CEST)
- Base advanced since bootstrap or previous refresh: `Yes`. 17 commits: delegate-to-existing-copy and `v1.4.99-beta.8`.
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed`. `b684a8963` contains the durable gated live E2E and the API/E2E and review artifacts. The untracked `*/dist/` folders were excluded.
- Integration method: `Merge`. `a89fe62cc` merges `origin/personal` into `codex/anthropic-prompt-caching`; no conflicts.
  - No file overlaps: the base changes are in server Tasks/projects, and the ticket changes are in the `autobyteus-ts` LLM/memory layers, server token-usage and the manifests/lockfile.
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`, on `a89fe62cc`:

  | Command | Result | Log |
  | --- | --- | --- |
  | `pnpm -C autobyteus-ts exec tsc --noEmit -p tsconfig.build.json` | exit 0 | `delivery-evidence/dr1-core-typecheck.log` |
  | `pnpm -C autobyteus-server-ts typecheck` | exit 0 | `delivery-evidence/dr1-server-typecheck.log` |
  | `pnpm -C autobyteus-ts exec vitest run tests/unit --no-watch` | 296/297 files and 1859/1860 tests pass. The 1 failure is the known Gemini retry-options test (`compaction-single-attempt-transport.test.ts`), which also fails on base and is the same as in API-REV-001 | `delivery-evidence/dr1-core-unit.log` |
  | `pnpm -C autobyteus-server-ts test:unit` | exit 0. 669 files pass, 4 skipped; 5168 tests pass, 7 skipped. This is the full suite including base additions; it was 5101 tests before the merge | `delivery-evidence/dr1-server-unit.log` |
  | `vitest run tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts --no-watch` without the gate | 7 skipped, exit 0 (the gate works) | `delivery-evidence/dr1-live-e2e-ungated-skip.log` |

  - The paid live E2E was not rerun at this point. The base changes do not touch the LLM, memory, request-assembly or token-usage paths, and run 6 (7/7) is still the authority.
  - The reopened API/E2E desktop round is building from this worktree after the merge, so its evidence will be on the integrated state.
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`. DR-002 brought it current again.

### DR-002 re-integration

- Latest tracked remote base checked: `origin/personal` @ `033a6d780`. 10 new commits from gemini-native-cache-hit (no release).
- Checkpoint: `328630c0a`. It contains the API-REV-002 desktop evidence, the `TESTING.md` row and the DR-001 artifacts. The two `.mp4` recordings are held for a user decision.
- Merge: `b7e318107`, with no conflicts.
  - Overlapping files: `autobyteus-server-ts/docs/modules/token_usage.md` (base adds an AGY section), `autobyteus-ts/docs/provider_model_catalogs.md` (base adds Gemini 3.1 Pro prices), `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` and `TESTING.md`.
  - Each merged additively and stays consistent.
- Checks on `b7e318107`:

  | Command | Result | Log |
  | --- | --- | --- |
  | `pnpm -C autobyteus-ts exec tsc --noEmit -p tsconfig.build.json` | exit 0 | `delivery-evidence/dr2-core-typecheck.log` |
  | `pnpm -C autobyteus-server-ts typecheck` | exit 0 | `delivery-evidence/dr2-server-typecheck.log` |
  | `pnpm -C autobyteus-ts exec vitest run tests/unit --no-watch` | 1860/1861 pass. The 1 failure is the known Gemini retry-options test, which also fails on base | `delivery-evidence/dr2-core-unit.log` |
  | `pnpm -C autobyteus-server-ts test:unit` | exit 0. 669 files pass, 4 skipped; 5172 tests pass, 7 skipped | `delivery-evidence/dr2-server-unit.log` |
  | `vitest run tests/e2e/token-usage/{gemini-native-pricing-graphql,token-usage-ledger-provider-semantics,token-usage-unit-prices-graphql}.e2e.test.ts` | 3 files, 10/10 pass. These are the base's new pricing E2Es, run against the merged catalog and meter | `delivery-evidence/dr2-token-usage-e2e.log` |

- The paid live E2E was not rerun. The base changes affect AGY usage ingestion and Gemini prices only, not the Anthropic request, memory or Anthropic pricing paths, and the token-usage checks above pass.
- Result: `Passed`.

## User Verification

- Initial explicit user completion/verification received: `Yes`.
- Initial verification / acceptance reference: the user on 2026-10-09: "finalize and release a new beta." Recorded in `handoff-summary.md` § User Verification.
- Renewed verification required after later re-integration: `No`. `origin/personal` was still `033a6d780` after verification.
- Renewed verification received: `Not needed`
- Pending user checks:
  - AC-007: the Anthropic Console shows prompt caching active and tokens reused, and the Token Meter total matches the Console. For restored runs, see DEF-B.
  - The release decision.

## Docs Sync Result

- Docs sync artifact: `tickets/done/anthropic-prompt-caching/ (on `personal`) docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated:
  - `TESTING.md` (delivery; uncommitted until finalization);
  - five design/module docs in `80845f45e`, checked again on the integrated state.

## Ticket State Transition

- Ticket moved to `tickets/done/anthropic-prompt-caching`: `Yes` (`9fbe0bfbb`)
- Archived ticket path: `tickets/done/anthropic-prompt-caching/`

## Version / Tag / Release Commit

- Helper: `scripts/desktop-release.sh beta --branch release-tmp-apc --no-push`.
  - It ran in a temporary clean worktree (`autobyteus-worktrees/release-tmp-apc`, at merge `4e55cae2b`), because the ticket worktree held the untracked SDK `dist/` output.
  - The pushes happened only after confirming that `origin/personal` was still `4e55cae2b`.
- **`v1.4.99-beta.9`**: release commit `d7029b90a` on top of merge `4e55cae2b`. It changes `autobyteus-web/package.json` from 1.4.99-beta.8 to 1.4.99-beta.9.
- Pushes: `4e55cae2b..d7029b90a HEAD -> personal` and the new tag `v1.4.99-beta.9` (`delivery-evidence/beta9-release.log`).
- Content since beta.8: gemini-native-cache-hit (merged without a release) and this ticket.

## Repository Finalization

- Bootstrap context source: `investigation-notes.md` (base and finalization target `origin/personal`)
- Ticket branch: `codex/anthropic-prompt-caching` @ `9fbe0bfbb`.
  - Final commits: `b684a8963` checkpoint, `a89fe62cc` merge, `328630c0a` checkpoint, `b7e318107` merge, `9fbe0bfbb` archive.
- Ticket branch commit result: `Completed`
- Ticket branch push result: `Completed` (`[new branch] codex/anthropic-prompt-caching`)
- Finalization target: `origin` / `personal`
- Target advanced after verification / acceptance: `No` (`033a6d780`)
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `Completed`. The ticket worktree was detached at the fetched `origin/personal`, and the main checkout was not touched.
- Merge into target result: `Completed`, a `--no-ff` merge, `4e55cae2b`.
  - `check_licensing.py` and `check_repository_artifact_hygiene.py` both exit 0 (`delivery-evidence/finalization-hygiene.log`).
  - The longest new path is 113 characters.
- Push target branch result: `Completed` (`033a6d780..4e55cae2b HEAD -> personal`, after re-checking that the target had not moved)
- Repository finalization status: `Completed`
- Blocker: none

## Release / Publication / Deployment

- Applicable: `Yes` (the user asked for a new beta)
- Method: `Release Script` (tag-triggered GitHub workflows)
- Method reference / command: `scripts/desktop-release.sh beta` (see above)
- Workflows: all 4 succeeded on attempt 1 (`delivery-evidence/workflows-beta9.json`):
  - Desktop `37930604625`
  - iOS `37930604641`
  - Server Docker `37930604539`
  - Android `37930604649`
- GitHub release `v1.4.99-beta.9` (`delivery-evidence/github-release-beta9.json`): a **pre-release**, not a draft, published 2026-10-09T12:35:53Z, with 17 assets.
- Updater metadata: `latest.yml`, `latest-mac.yml`, `latest-linux.yml` and `latest-linux-arm64.yml` all report `version: 1.4.99-beta.9` (`delivery-evidence/updater-metadata/`). GitHub `releases/latest` stays on stable `v1.4.98`.
- Docker `autobyteus/autobyteus-server` (`delivery-evidence/docker-tags.txt`):
  - `:1.4.99-beta.9` and `:beta` share digest `sha256:5766dcb8…ad8c` (amd64, arm64).
  - `:latest` is unchanged at `sha256:8aa17b23…5187` (1.4.98).
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Not required`. Beta mode publishes generated notes, and the archived `release-notes.md` stays as the ticket's user-facing summary for the next stable release.
- Blocker: none

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching`
  - The API/E2E desktop instance had already been stopped and its data removed (API-REV-002).
  - Before removal, the worktree held only the untracked SDK `dist/` build output and `finalization-hygiene.log`, which was copied into this commit.
- Worktree cleanup result: `Completed` (`git worktree remove --force`)
- Worktree prune result: `Completed`
- Local ticket branch cleanup result: `Completed` (`codex/anthropic-prompt-caching` deleted at `9fbe0bfbb`; it is contained in `origin/personal`)
- Remote branch cleanup result: `Not required`. `origin/codex/anthropic-prompt-caching` is kept as the review reference, as on earlier tickets.
- Release helper worktree `autobyteus-worktrees/release-tmp-apc` and branch `release-tmp-apc`: removed after this delivery record is pushed.
- Full desktop recordings (outside the repo): `/Users/normy/autobyteus_org/ticket-media/anthropic-prompt-caching/`

## Escalation / Reroute (DR-001, resolved at DR-002)

- Classification: final handoff blocked by a non-deployment issue: upstream validation was reopened during delivery.
- Recommended recipient: `/software_engineering_team/solution_designer` (coordinator), per the handoff rules.
- Why final handoff could not complete:
  - At about 13:25 CEST, after the CRR-002 package reached delivery, `api-e2e-test-case-ledger.md` gained cases DSK-001..DSK-004, "Added after the user asked for real Electron testing".
  - A `pnpm isolated-app start --build` began in this worktree, writing to `api-e2e-evidence/electron/`.
  - Asking the user to verify now would hand over a package whose validation evidence and findings are still changing.
  - Delivery did not touch or commit those in-progress files.

## Release Notes Summary

- Release notes artifact created before verification: `tickets/done/anthropic-prompt-caching/ (on `personal`) release-notes.md`
- Release notes status: `Updated`

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: no migration.
  - Saved snapshots with thinking load unchanged, and the first request after a restore strips thinking once (AC-013b, proven live).
  - Older builds read the same snapshot format.
- Delivery action required: `None`

## Verification Checks

- REQ-009 / AC-010, cache hit per Anthropic-serving path and runtime:

  | Path / runtime | Cache hit | Evidence |
  | --- | --- | --- |
  | Native AutoByteus + Opus 5.5, **before** | 0.0%. The user's run had 1,727,704 uncached tokens, $7.31, and the Console showed "Prompt caching: Not enabled" | `investigation-notes.md` (DB since 2026-08-01; 11/13–15.png) |
  | Native AutoByteus + Opus 5.5, **after** | **94.9%** run-level (679,606 / 715,809 over 31 calls and 4 turns). Every call after the first reads from cache. All writes are 1h. A new turn writes only its new input | `api-e2e-evidence/live-run-6/`, `api-e2e-execution-coverage-report.md` APC-E2E-001/003 |
  | Native AutoByteus, after restore / after a tools change | One full-prefix rewrite (24,237 / 36,569 tokens), then append-only reads again | APC-E2E-005 / 004 |
  | Native Claude Sonnet 5 | Before: 0.0%. After: the same adapter path as Opus, not measured live separately | `investigation-notes.md` |
  | Compaction summarizer (native Anthropic) | Not cached by design (unique content; AC-005) | Unit tests |
  | Claude Agent SDK runtime + Opus 5.5 | 98.3% over 295 runs. Its harness already caches; this ticket does not change it | `investigation-notes.md` BEH-006 |
  | Other providers (no change) | Codex App Server 93–97%; Antigravity CLI Gemini 3.8 99%; native DeepSeek v4 96.5%; OpenAI-compatible DeepSeek 94–97%; native Gemini 3.x 66–83%; native OpenAI gpt-5.6-luna positive | `investigation-notes.md` DB aggregate |

## Rollback Criteria

- If Anthropic requests return 400 on kept thinking or on cache markers, revert the ticket merge on `personal` and republish. The snapshot format needs no data rollback.
- If meter totals diverge from the Console beyond rounding, apart from the known pre-existing DEF-B on restored runs: investigate pricing first. The fallback is to revert the merge.

## Final Status

- Explicit user testing/verification complete: `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes` (`v1.4.99-beta.9` published)
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to `/solution_designer`: `Yes`, after this record is pushed (DR-003)

## Stable Release v1.5.0 (DR-004)

- Trigger: on 2026-10-10 the user asked: "now release a stable version … its just about releasing."
- Prompt caching itself had already shipped in stable `v1.4.99` (2026-10-09, composer-context-file-removal DR-003).
  - `v1.5.0` is therefore the next stable release. After X.Y.99 the version moves to the next minor, because the Android versionCode cannot encode patch 100.
  - It contains every ticket merged since `v1.4.99` that was previously only in `v1.5.0-beta.1`: anthropic-incomplete-content-block, draft-run-id-validation and skill-sources-dialog-redesign, plus the release-tooling fix.
- Notes: `release-notes-v1.5.0.md`, curated from those tickets' release notes (commit `5c2dd480e`).
- Helper: `scripts/desktop-release.sh release 1.5.0 --release-notes tickets/done/anthropic-prompt-caching/release-notes-v1.5.0.md --branch release-v1.5.0 --no-push`, run in a temporary clean worktree at `e50826755`.
- Release commit `305685451` (1.5.0-beta.1 → 1.5.0, notes synced to `.github/release-notes/release-notes.md`).
- Pushes: `e50826755..305685451 HEAD -> personal` and the tag `v1.5.0`, after re-checking that `personal` had not moved (`delivery-evidence/v1.5.0-release.log`).
- Checks on the tagged tree: licensing and hygiene both exit 0 (`delivery-evidence/v1.5.0-hygiene.log`).
- Workflows, all succeeded on attempt 1 (`delivery-evidence/workflows-v1.5.0.json`):
  - Desktop `38044620382`
  - iOS `38044620385`
  - Server Docker `38044620378`
  - Android `38044620367`
- GitHub release `v1.5.0`: **Latest** (`releases/latest` = `v1.5.0`), not a pre-release, not a draft, published 2026-10-10T10:26:20Z, with 17 assets and the curated notes (`delivery-evidence/github-release-v1.5.0.json`).
- Updater metadata: all 4 `latest*.yml` report `version: 1.5.0` (`delivery-evidence/v1.5.0-updater-metadata/`).
- Docker: `:1.5.0`, `:latest` and `:beta` share `sha256:6b76d613…a06d` (amd64, arm64) (`delivery-evidence/v1.5.0-docker-tags.txt`).
- Release-helper check: with `v1.5.0` stable, `release_versions.py next-beta` gives `1.5.1-beta.1`.
  - Simulated: 1.4.99 → 1.5.0-beta.1; 1.5.99 → 1.6.0-beta.1.
  - `android-version-code` refuses 1.4.100 and 1.4.100-beta.1.
- Cleanup: the release helper worktree `autobyteus-worktrees/release-v1.5.0` and branch `release-v1.5.0` are removed after this record is pushed.
- Result: `Completed`.
