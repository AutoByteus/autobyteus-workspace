# Delivery / Release / Deployment Report

## Scope

Deliver `codex/follow-ups-of-461-500` (Project Task `autobyteus-500`, follow-ups of 461, deliveries 1 and 2; `task_size` `Large`, `architectural_risk` `High`, route `Reviewed`) into `origin/personal`. **Status (2026-11-17): `Blocked` at the initial integration refresh.** No docs sync, verification, archive or finalization has started.

## Release Decision

- `No release` unless the user asks (RELEASE.md default; the code reviewer's note: a release only on the founder's word). The build-only release run (`pnpm release:test --ref <branch>`) is still required before the merge (RELEASE.md "Build-only release run": FU-023 changes what the web build scans, G-1 changes the release script).

## Initial Delivery Integration Refresh

- Merge base `9695d310c5`; latest `origin/personal` `ff13782f36` (fetched 2026-11-17). The base advanced past two releases, `v1.5.13-beta.8` and `v1.5.13-beta.9`, plus later merges (448 part 1, 483, 458, 514, 515, 508, …).
- **Released migrations (the code reviewer's question):** neither beta.8 nor beta.9 shipped an app-data migration. The registry has the same entries at `v1.5.13-beta.7`, `v1.5.13-beta.8`, `v1.5.13-beta.9` and `origin/personal`, and the registry-order test's `RELEASED` still lists 45 IDs "as released in v1.5.13-beta.7". So `released-migration-order.json` (45 IDs) remains the true released list. The base did change the released `20261111` conversion's code (`run-file-conversion.ts`, `e0b58997f3`, autobyteus-508), which this branch does not touch.
- Local checkpoint commit: `281a09782c` (review documents that were untracked).
- Integration method: `Merge`. Result: **`Blocked`**, 4 conflicts; merge aborted, branch clean at `281a09782c`.

| File | Base side | This branch |
| --- | --- | --- |
| `autobyteus-server-ts/src/restart-resume/restart-notice.ts` (1 hunk) | autobyteus-448 part 1 restart reminder (`8b986307a8`, `d5e9f350cf`, `b78555d7bb`) | `75ee688dad` renames (FU-006, FU-010) |
| `autobyteus-server-ts/src/restart-resume/restart-resumer.ts` (1 hunk) | `8b986307a8` (448) | `75ee688dad` |
| `autobyteus-server-ts/docs/modules/restart_resume.md` (1 hunk) | 448 | 500 |
| `autobyteus-server-ts/tests/e2e/helpers/claude-live-agent-harness.ts` (1 hunk) | `30aec70770` (483), `ea86a9affe` (461 streams baseline) | `6107590026` (FU-011/018), `377e4bd319` (FU-036) |

## Escalation

- Classification: `Local Fix` (integration of the latest base).
- Recommended recipient: the implementation engineer, then the code reviewer's merge review (the reviewer asked for it), then the normal route.

## Second pass (2026-11-17/18)

- Integration: done by the implementation engineer (IR-004 merge `39325a1e50` of `ff13782f36`, IR-005 `eb741a097e`), merge review CRR-007/CRR-008 Pass. `origin/personal` still `ff13782f36`.
- Build-only release run (RELEASE.md, rule 12): `pnpm release:test --ref codex/follow-ups-of-461-500`, run 44191474370: Build macOS ARM64, macOS Intel x64, Linux x64, Linux ARM64, Windows x64 all success; Publish skipped. Pass.
- Post-integration check by delivery: server E2E folder on the merged state (`2dffa26760`, code `eb741a097e`, Node 22): stopped at the 2-hour background limit; 105 files reported, 21 with failures (48 tests), 12 of them not on API/E2E round 1's base-side list. Evidence `evidence/delivery/DEL-01-*`. **Delivery blocked**; routed to API/E2E (`Evidence Too Weak`: validate the merged state, separate branch / base / load).
- Docs sync so far: `RELEASE.md` "Cutting The Release" now describes G-1 (the script records `released-migration-order.json`), replacing the manual step from 461; the data migration guideline's matching sentence (`9314d13f48`). Release notes written (`fa4ac92497`).
- AC-008's user-only part (the migration on the user's own data) is not a finalization blocker: merging runs nothing on his data; it applies when a release carrying it reaches his machine (his decision), with M-5 backups.

## Third integration refresh (2026-11-18)

- API/E2E round 3 (API-REV-003) passed on the merged state `eb741a097e`; test-code review CRR-009 Pass (`d600a2af71`). Then `origin/personal` had moved again, `ff13782f36` → `0570c47fd9` (95 commits; merged tickets 522, 524, 448 part 2, 493, 525; no release, no change under `src/app-data-migrations/`, so `released-migration-order.json` stays the released list).
- Checkpoint `90a316cc88` (CRR-009 records). Merge attempt: **13 conflicts**, aborted; branch clean.
  - autobyteus-448 part 2: `remote-run-channel.ts`, `run-status-service.ts`, `remote-run-view-provider.ts`, `standalone-paired-agent-access.ts` (modify/delete: this ticket deleted it), `run-status-service.test.ts`, `remote-run-view-provider.test.ts`, web `AgentOrgRunMemberTree.vue`.
  - autobyteus-493: `agent-memory-layout.ts`, `build-studio-server.ts`, `e2e-run-history-services.ts`, `agent-org-run-service-model-selection.test.ts`.
  - also `run-agent-access.ts`, `team-run-agent-access.ts`.
- **Blocked**, routed to the implementation engineer (Local Fix), then the code reviewer's merge review and an API/E2E round on the merged state, as in the second pass.

## Fourth integration refresh (2026-11-18)

- The third merged state passed: IR-006 merge `e93671cce0` (+ `4db98c6d1a`), CRR-010 Pass, API/E2E round 4 (API-REV-004) Pass at 95% after F-4 (test-side, `8d14de45e3`), CRR-012 Pass.
- `origin/personal` moved again, `0570c47fd9` → `24d438fa31`: release `v1.5.13-beta.10` and tickets 517, 524 round 2, 526. Beta.10 shipped no app-data migration (registry identical at beta.9, beta.10, `origin/personal`; no change under `src/app-data-migrations/`), so `released-migration-order.json` still holds the released order.
- Merge attempt: 2 conflicts, aborted; branch clean.
  - `src/restart-resume/restart-resumer.ts` (1 line): 526 (`6517199e36`) passes the whole `message` to `restartNoticeLifecycleObserver` (one notice id); this ticket renamed `host` → `readyAgent`.
  - `src/compositions/build-studio-server.ts` (1 large hunk, `closeStudioProcessResources`): 524 round 2 (`2e5b0198e2`) ends the file watches without their OS close at shutdown; this ticket's restructure of the same function; the 500-line limit applies.
- Routed to the implementation engineer (Local Fix) with a targeted route: merge review, then API/E2E on the shutdown and restart-resume paths only.

## Fifth and sixth integration refreshes (2026-11-18)

- Round 5 (API-REV-005) Pass at 95%, CRR-013 and CRR-014 Pass on the fourth merged state (`eecb228bd6`).
- Refresh 5, by delivery: `origin/personal` `24d438fa31` → `f7b4d68711` (534 phone text size; stable `v1.5.13`'s release commit). No server change; one overlapping file, `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`, auto-merged. Merged clean as `f5a7d789c9`. Checks on it:
  - the probe's start-up duplicate-ID scan, run alone: 14 sources, 75 case IDs, duplicates 0;
  - `pnpm -C autobyteus-web typecheck`: PASS, production 0, tests 87 in 37 files (baseline);
  - 534's web specs: 6 files, 40 tests passed.
- Build-only release run on `f5a7d789c9` (run 44306459004): Windows, Linux x64, Linux ARM64, macOS Intel success; **macOS ARM64 cancelled**: "The job was not acquired by Runner of type hosted even after multiple attempts" with the ARM64 capacity annotation. Classification: **platform** (RELEASE.md's own example). Not rerun on this commit, because refresh 6 supersedes it; to run on the final merged commit.
- Docs sync: `Updated` (`docs-sync-report.md`, `00f7a4bc7b`); handoff summary and release-notes fix `241b6718ad`.
- Refresh 6: `origin/personal` `f7b4d68711` → `75048cbaf4` (v1.5.13's release records and the merges that followed its tag: 517 FU-002/FU-003). No change under `src/app-data-migrations/`. Merge attempt: **1 conflict, 19 hunks**, in `autobyteus-server-ts/tests/integration/file-explorer/file-system-watcher.integration.test.ts`: this ticket's FU-021 (outcome waits under one 60 s hang guard, the ENVIRONMENT / INCONCLUSIVE probe; AC-005's Linux 5/5 gate) against 517's `b55ce60b5e` (waits take the shared `OS_FILE_EVENT_WAIT_MS` from `tests/helpers/os-latency-under-load.ts`). Aborted; branch clean at `00f7a4bc7b`. Routed to the implementation engineer.

## Seventh integration refresh (2026-11-18)

- The seventh merged state passed: merge `bb42531c7d` of `75048cbaf4` (CRR-015 Pass), API/E2E round 6 (API-REV-006) Pass at 95%, AC-005 5/5 on Linux; CRR-016 Not Applicable (no test changes).
- `origin/personal` moved again, `75048cbaf4` → `53b72018ad`: autobyteus-491 (retired memory items and stale built-ins; **new app-data migration `20261118_remove_retired_built_in_agents`**, unreleased) and autobyteus-492 (list running agents: the run ID is the address; `send_message_to` reaches any running agent by run ID). 311 base files, 54 overlapping.
- Merge attempt: **18 conflicts**, aborted; branch clean. The registry conflict needs the unreleased order: this ticket's `20261117_delegated_run_own_attachment_links` and its follow-up before 491's `20261118_…` (the order test: entries after the released ones in date order). Conflicts:
  - `autobyteus-server-ts/src/agent-collaboration/communication/cross-run-message-delivery.ts`
  - `autobyteus-server-ts/src/agent-communication/services/global-agent-run-message-router.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts`
  - `autobyteus-server-ts/src/agent-tools/mcp/providers/default-agent-tool-mcp-adapter-providers.ts`
  - `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts`
  - `autobyteus-server-ts/src/compositions/build-studio-server.ts`
  - `autobyteus-server-ts/src/compositions/remote-collaboration-composition.ts`
  - `autobyteus-server-ts/src/remote-collaboration/inbound/remote-message-receiver.ts`
  - `autobyteus-server-ts/tests/app-data-migrations/collaborators-to-delegated-runs-v1/collaborators-to-delegated-runs-v1-app-data-migration.test.ts`
  - `autobyteus-server-ts/tests/app-data-migrations/delegated-copy-own-file-complete-v1/delegated-copy-own-file-complete-v1-app-data-migration.test.ts`
  - `autobyteus-server-ts/tests/app-data-migrations/remove-skill-improvement-data/remove-skill-improvement-data-migration.test.ts`
  - `autobyteus-server-ts/tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts`
  - `autobyteus-server-ts/tests/fixtures/collaboration-contract/contract-states.json`
  - `autobyteus-server-ts/tests/unit/agent-collaboration/delegation/cross-run-message-delivery.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-collaboration/result-catalogue.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-communication/global-agent-run-message-router.test.ts`
  - `autobyteus-server-ts/typecheck-baseline.json`
  - `autobyteus-web/tests/e2e/skill-improvement-removal-cases.mjs`
- Routed to the implementation engineer (Local Fix); this one needs a full API/E2E round on messaging and the migration order, not a short check.

## Eighth state passed; ninth refresh blocked by a release (2026-11-18)

- Eighth merged state: merge `5eb8246076` of `53b72018ad` (491, 492), CRR-017 Pass; API/E2E round 7 (API-REV-007) Pass at 95% (MO-1: this ticket's two migrations, then 491's, in one first start; RC 49/49; LRN-1/2); CRR-018 Pass. Docs recheck clean (`d06ff7b9eb`).
- Build-only release run on `179a63dfe6` (run 44354909653): all five desktop builds **success**; publish skipped. Pass.
- `origin/personal` then moved to `2eb195603a`: release **`v1.5.14-beta.1`** (autobyteus-538), cut from `05dde06bb4`, tagged (`7bcac96456`); Android and Docker published, desktop and iOS queued. Its release recorded the released set by hand (`428d5e0055`, `1f835e3e7f`, RELEASE.md's pre-G-1 step): **46 IDs, ending with 491's `20261118_remove_retired_built_in_agents`, now released.**
- Consequence for this ticket:
  - its two unreleased migrations `20261117_delegated_run_own_attachment_links` and `20261117_delegated_run_own_attachment_links_after_task_agent_own_run` are dated before, and registered before (IR-009), a released migration. The order rule (guideline "Registry order and late predecessors"; the order test) requires them appended after the released 46, dated after `20261118`;
  - the run order on users' data reverses: 491's runs first (on beta.1), then this ticket's. API/E2E MO-1 proved only the earlier order; the late-predecessor classification of 491's migration against this ticket's conversion (design M-7) is needed;
  - `released-migration-order.json` must become beta.1's 46.
- Merge attempt: 1 git conflict (`app-data-migration-registry-order.test.ts`: this ticket's JSON-reading test against the base's hand-updated `RELEASED`); aborted, branch clean.
- Classification: **Design Impact** (migration IDs, registry place and predecessor classification) → the Solution Designer.

## Final pass (2026-11-18)

- SR-017 / D-15 (the Solution Designer): the migrations renamed to `20261119_delegated_run_own_attachment_links` and `20261119_…_after_task_agent_own_run`, appended after 491's released `20261118_…`; 491's classified "none" (agent-definition folders under `agents/` against traces under `memory/`); `released-migration-order.json` = v1.5.14-beta.1's 46 IDs. Architecture review, IR-010 (which also merged `origin/personal` `7984543255`), CRR-019 Pass, API/E2E round 8 (API-REV-008) Pass at 95%: both upgrade paths on a built server (from before beta.1: 491's, then both of this ticket's; from beta.1: only this ticket's two, 491's record untouched; backups, links open, a second start changes nothing); CRR-020 Pass.
- `origin/personal` `7984543255` is contained in the branch: no further integration.
- Build-only release run: run 44354909653 on `179a63dfe6` passed (all five builds). Since then no build input of this ticket changed (`scripts/desktop-release.sh`, the web build scan); the one build-input path changed, `autobyteus-web/package.json`, is the base's (beta.1's version bump, another ticket's probe script). The rest is TypeScript source under round 8's type gates. Not rerun; reason recorded.

## Verification

- Evidence judged: `Sufficient`. API-REV-008 and its rounds' proof table (AC-001 … AC-012; AC-007 out of the package), final confidence 95%. Spot-checked: round 3's full-folder triage of every failing file (alone on branch and base), round 5's stop and restart-resume lines, round 7's MO-1 and RC 49/49, round 8's both upgrade paths (code reviewer and API/E2E report).
- User check: `No` for finalization. AC-008's user-only part (the migration on the user's own data) applies when a release carrying it reaches his machine; never run on his data without his approval (D-8); backups per M-5.

## Release Decision

- `No release` (not requested; RELEASE.md default). `release-notes.md` is ready. A release only on the user's word.
