# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-linked-skills-always-auto-approve`
- Coverage investigation: `api-e2e-coverage-investigation.md` (same folder)
- Execution coverage report: `api-e2e-execution-coverage-report.md` (same folder)
- API/E2E revision record: `api-e2e-revision-record.md` (same folder)
- Ledger scope and reason it is required: multiple independent server E2E cases, long live AGY suites and browser journeys, with a real risk of interruption.
- Last updated: 2026-10-01

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | Server source typecheck | — | compiler | `npx tsc -p tsconfig.build.json --noEmit` | 1 | |
| R2 | AGY + skills unit suites | AC-001..009 (unit) | unit | `vitest run tests/unit/agent-execution/backends/antigravity tests/unit/skills` | 2 | |
| E01 | ALL_INSTALLED chat-shaped run, `.venv`/dangling/40 MiB skill, stored false | AC-001, AC-002, AC-006 | real server + fake CLI | `agy-linked-skills-transport.e2e.test.ts` | 3 | |
| E02 | ALL_INSTALLED with a workspace-owned skill → skip + warning | AC-004 | same | same | 3 | |
| E03 | CONFIGURED standalone unusable skill → error names skill + reason | AC-005, REQ-006 | same | same | 3 | |
| E04 | Team member CONFIGURED failure surfaces skill + reason | REQ-006 (ARCH trigger) | same, team WS | same | 3 | |
| E05 | Team + org members with stored false → skip-permissions | AC-006 | same | same | 3 | |
| E06 | Delegated AGY child via real MCP `delegate_task`, stored false → skip-permissions | AC-006 | same | same | 3 | |
| E07 | Resume after the skill source is deleted | AC-008 | same | same | 3 | |
| E08 | Resume a pre-change copied capsule | AC-009 | same | same | 3 | |
| R4 | Fake-CLI AGY transport regression suites | regression | real server + fake CLI | `RUN_AGY_FAILURE_E2E=1 … tests/e2e/runtime/agy-*` | 4 | |
| R5 | Web component specs | AC-007 | component | `vitest run` (web) | 5 | |
| R6 | Live AGY suites (`RUN_AGY_*`, `AGY_LIVE`) | regression, ASM-001 | real agy | per-file env | 6 | real model calls |
| B01 | Live Chat on AGY with the user's real skill set | AC-001, ASM-001 | browser + real backend + real agy | ticket probe | 7 | |
| B02 | Team new-run form + member override with AGY | AC-007 | browser | ticket probe | 7 | |
| B03 | Org new-run panel with AGY | AC-007 | browser | ticket probe | 7 | |
| B04 | Mobile launch card with AGY | AC-007 | browser (phone viewport) | ticket probe | 7 | |
| B05 | Switch away from AGY → editable on those surfaces | AC-007 alt | browser | ticket probe | 7 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R1 | 2026-10-01 22:40 | Completed | `npx tsc -p tsconfig.build.json --noEmit` (server) | clean | clean (`TSC_OK`) | Pass | console | — |
| 2 | R2 | 2026-10-01 22:40 | Completed | `vitest run tests/unit/agent-execution/backends/antigravity tests/unit/skills` | all pass | 21 files / 277 tests pass, 3 live-gated files skipped | Pass | console | — |
| 3 | E01–E08 | 2026-10-01 22:44 | Checkpoint | first run of the new suite | — | E03 helper used `createAgentRun` (activates eagerly); test adjusted to the desktop `prepareAgentRun` → WS path, plus a mobile `createAgentRun` assertion | — | — | test-code fix, not product |
| 4 | E01–E08 | 2026-10-01 22:47 | Checkpoint | second run | — | Standalone cases sent before `CONNECTED` (`SESSION_NOT_READY`); the helper now waits for `CONNECTED` as the UI does | — | `/tmp/agy-linked-e2e-run2.log` | test-code fix |
| 5 | E01–E08 | 2026-10-01 22:49 | Completed | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs vitest run tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts` | 8 pass | 8/8 pass | Pass | `api-e2e-evidence/R3-R4-fake-cli-suites.log` | — |
| 6 | E01–E08 (mutation) | 2026-10-01 22:50 | Completed | temporarily dropped `--dangerously-skip-permissions` in `agy-stream-process.ts` (restored via `git checkout`, verified clean) | suite fails | 7/8 fail with `AGY_PERMISSION_MODE_MISMATCH`; E03 passes (fails before launch) | Pass (suite detects regression) | `/tmp/agy-mutant.log` | — |
| 7 | R4 | 2026-10-01 22:51 | Completed | same env; `agy-failure-transport`, `agy-background-task-transport`, `agy-mcp-tool-call-transport`, `agy-native-image-step-output` + new suite | all pass with argv-faithful fixture | 5 files / 17 tests pass | Pass | `api-e2e-evidence/R3-R4-fake-cli-suites.log` | — |
| 8 | R5 | 2026-10-01 22:52 | Completed | web `vitest run` policy, chat, mobile, workspace config, chatLaunchService specs | all pass | 33 files / 290 tests pass | Pass | `api-e2e-evidence/R5-web-specs.log` | — |
| 9 | R6 unit-live | 2026-10-01 22:54 | Completed | `AGY_LIVE=1` production-live, restore-live, mcp-team-live | pass | production-live 2/2 (incl. linked capsule skill) and restore-live 1/1 pass. mcp-team-live 2/2 fail: `ENOENT` writing evidence to the archived path `tickets/in-progress/antigravity-cli-runtime-redesign-20260924/` (the file is unchanged by this diff; `dispatch.forwarded` passed first) | Checkpoint | `api-e2e-evidence/R6-unit-live.log` | Rerun with that evidence folder created temporarily |
| 10 | R6 capability | 2026-10-01 22:55 | Completed | `RUN_AGY_CAPABILITY_E2E=1` native-image app-chat + codex-skill | pass | 3 pass, 2 skipped (file-internal gates) | Pass | `api-e2e-evidence/R6-capability.log` | — |
| 11 | R6 team-org | 2026-10-01 22:56 | Completed | `RUN_AGY_E2E=1 agy-team-inter-agent-roundtrip` | pass | 2/2 pass (team send_message_to roundtrip, org direct + nested) | Pass | `api-e2e-evidence/R6-team-org.log` | — |
| 12 | R6 background | 2026-10-01 23:07 | Completed | `RUN_AGY_BACKGROUND_E2E=1` live + updates-live | pass | 8/8 pass | Pass | `api-e2e-evidence/R6-background.log` | — |
| 13 | R6 recovery | 2026-10-01 23:10 | Completed | `RUN_AGY_RECOVERY_E2E=1` stop-recovery-live | pass | 5/5 pass | Pass | `api-e2e-evidence/R6-recovery.log` | — |
| 14 | B01–B04 | 2026-10-01 23:08 | Checkpoint | probe run 1 | — | B01, B02 Pass. B03 (nested team select hidden behind its chevron) and B04 (ambiguous text locator) failed on probe navigation, not product behavior | — | (superseded) | probe fixes |
| 15 | B03, B04 | 2026-10-01 23:13 | Checkpoint | probe runs 2–4 | — | B03 Pass. B04 lock checks passed; the launch step needed the custom model dropdown and a first message (lazy activation) | — | (superseded) | probe fixes |
| 16 | R6 A1 | 2026-10-01 23:16 | Completed | `AGY_LIVE=1 agy-mcp-team-live` with the archived evidence folder created temporarily (removed after) | pass | 2/2 pass | Pass | `api-e2e-evidence/R6-mcp-team-live-rerun.log` | pre-existing test path defect noted |
| 17 | B01–B04 | 2026-10-01 23:25 | Completed | consolidated final probe run `probes/agy-api-e2e-browser-probe.mjs` (commit `e5edfafdf`, agy 1.2.14) | all pass | B01–B04 Pass, 0 browser errors, owned processes/root cleaned, skills checkout unchanged | Pass | `api-e2e-evidence/browser-probe/` | — |

## Re-entry And Reconciliation

- Last durably recorded event: 17 (B01–B04 consolidated, Pass)
- Last completed case and result: B04 Pass
- Cases still running, interrupted, or not started: None
- Next case or recovery action: None
- Interruption, context-compression, or rerun note: Checkpoints 3, 4, 14 and 15 were test/probe-code corrections, not product failures
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md` § Test-Case Ledger Reconciliation
- Reconciliation note for any case missing a terminal result: None
