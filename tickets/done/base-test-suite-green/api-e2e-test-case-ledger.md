# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green` (artifacts); execution on two fresh detached worktrees at `0e56d0a9f` merged (uncommitted) with the latest `origin/personal` `048ea6cec`:
  - FRESH = `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green-apie2e` (integration, typecheck, gates, PB-001)
  - FRESH2 = `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green-apie2e-unit` (unit suite after install + prebuild only, as documented)
- Coverage investigation: `api-e2e-coverage-investigation.md` (same folder)
- Execution coverage report: `api-e2e-execution-coverage-report.md` (same folder)
- API/E2E revision record: `api-e2e-revision-record.md` (same folder)
- Ledger scope and reason it is required: 16 independent cases, several full-suite runs of 5–20 minutes each; interruption risk.
- Evidence folder: `evidence/api-e2e/` (wrappers `run-cmd-clean-env.sh`, `run-cmd-sentinel-env.sh`; per-case `<label>.log`, `.json`, `.sentinel-{before,after}.txt`, `.home-autobyteus-watch.txt`)
- Last updated: 2026-10-08

## Planned Cases

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| V-01 | Fresh worktree install | AC-001/AC-003 precondition | pnpm workspace | `pnpm install --frozen-lockfile` (sentinel env) in FRESH | 1 | setup |
| V-02 | Integration command before prepare | AC-003 alternate, REQ-003 | prerequisite script | `pnpm -C autobyteus-server-ts test:integration` (clean env) | 2 | expect one message, exit 1, suite not started |
| V-03 | Integration prepare | REQ-003, AC-003 | prerequisite script + package builds | `pnpm -C autobyteus-server-ts test:integration:prepare` (sentinel env) | 3 | |
| V-04 | Integration clean run 1 | AC-003, QR-002 | vitest tests/integration | `pnpm -C autobyteus-server-ts test:integration -- --reporter=default --reporter=json` (clean env) | 4 | expect 2 PB-001 failures only |
| V-05 | Integration clean run 2 | QR-002 | same | same | 5 | |
| V-06 | Unit clean run 1 on install+prebuild-only worktree | AC-001, QR-002 | vitest tests/unit | `pnpm -C autobyteus-server-ts test:unit` (clean env) in FRESH2 | 6 | |
| V-07 | Unit clean run 2 | QR-002 | same | same | 7 | |
| V-08 | Unit with inherited agent-shell env (sentinel) | AC-002, AC-004, QR-001 | env isolation | `pnpm -C autobyteus-server-ts test:unit` (sentinel env) | 8 | |
| V-09 | Integration with inherited agent-shell env (sentinel) | AC-004, QR-001 | env isolation | `pnpm -C autobyteus-server-ts test:integration` (sentinel env) | 9 | |
| V-10 | Typecheck | AC-005 | tsc production config | `pnpm -C autobyteus-server-ts typecheck` | 10 | |
| V-11 | Typecheck negative probe | AC-005 | tsc | temporary type error in `src`, run, revert | 11 | temporary probe |
| V-12 | Opt-in gate activation under inherited env | REQ-004 (gates keep working), ASM-002 | env isolation allowlist | `RUN_CODEX_NATIVE_SURFACE_TESTS=1` gated file (sentinel env), plus ungated control | 12 | loopback capture only; no paid inference |
| V-13 | PB-001 cause confirmation | REQ-005, AC-007 | websocket cadence | I7 file on current src; temporary safe-companion probe; revert | 13 | temporary probe |
| V-14 | Per-test comparison against base inventory | REQ-001/002/006, AC-001/003 | vitest JSON | analysis script over base and V-04..V-09 JSON | 14 | no new skips; base-passing tests still pass |
| V-15 | Diff audit (no skip/only/delete; assertion deltas explained) | AC-006, REQ-006 | git diff | static | 15 | |
| V-16 | Latest-base parity | REQ-009 (pre-delivery check) | git | FRESH/FRESH2 include `origin/personal` at run time; re-check at end | 16 | delivery owns the merge-time re-run |

## Execution Events

| Sequence | Case ID | Timestamp | Event (`Started`/`Checkpoint`/`Completed`) | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`/`N/A`) | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | V-01 | 2026-10-08 | Completed | `pnpm install --frozen-lockfile`, sentinel env, FRESH | exit 0 | exit 0, 191 s; sentinel unchanged; `~/.autobyteus` changes only live-app logs/db/memory, no test signature | Pass | `evidence/api-e2e/v01-fresh-pnpm-install.*` | V-02 |
| 2 | V-02 | 2026-10-08 | Completed | `pnpm -C autobyteus-server-ts test:integration`, clean env, FRESH, nothing built | one message, exit 1, vitest not started | one message listing all 6 missing artifacts + `pnpm -C autobyteus-server-ts test:integration:prepare`; exit 1; vitest not started | Pass | `evidence/api-e2e/v02-fresh-test-integration-before-prepare.log` | V-03 |
| 3 | V-03 | 2026-10-08 | Completed | `pnpm -C autobyteus-server-ts test:integration:prepare`, sentinel env, FRESH | exit 0, check passes | 4 steps ran in order (server build incl. sanitized smoke, frontend SDK, devkit, Brief Studio pack via devkit CLI — no bin link needed on a fresh install); "Integration test prerequisites are present."; exit 0, 221 s; sentinel unchanged; `~/.autobyteus` changes = live-app log/db/memory only | Pass | `evidence/api-e2e/v03-fresh-test-integration-prepare.*` | V-04 |
| 4 | V-15 | 2026-10-08 | Completed | `git diff ebf68c4af..0e56d0a9f -- autobyteus-server-ts/tests` | no added skip/only/todo, no deleted files, assertion deltas traceable | 0 added/removed skip/only/todo/skipIf/runIf; 0 deleted/renamed files; test count changes: content-service unit +1 (I11 relocation). `expect(` deltas: U12 −1 (removed `initialize` mechanism, per design Legacy Removal Policy), I11 −1 (relocated to the content-service unit test, +1 there) | Pass | this ledger; coverage investigation § Existing Durable Coverage | |
| 5 | V-06 (setup) | 2026-10-08 | Checkpoint | FRESH2: `pnpm install --frozen-lockfile` + `pnpm -C autobyteus-server-ts prebuild`, sentinel env | install + prebuild only | both exit 0; FRESH2 has no server `dist` and no frontend-SDK `dist` (unit suite will run without prepare-only artifacts); sentinel unchanged | — | `evidence/api-e2e/v20-fresh2-pnpm-install.*`, `v21-fresh2-prebuild.*` | run V-06 after V-04 |
| 6 | V-04 | 2026-10-08 | Completed | `pnpm -C autobyteus-server-ts test:integration --reporter=default --reporter=json`, clean env, FRESH | 338 passed / 68 skipped / 2 failed (PB-001 only) | 338 passed / 68 skipped / 2 failed (both PB-001 cadence cases), 0 suite errors besides that file; 133 s; per-test identical to implementation r2 | Pass (with REQ-005 documented exception PB-001) | `evidence/api-e2e/v04-integration-clean-r1.{log,json}`, `v14-integration-r1-vs-base.txt` | V-05 |
| 7 | V-06 | 2026-10-08 | Completed | `pnpm -C autobyteus-server-ts test:unit`, clean env, FRESH2 (install + prebuild only) | 0 failed; 6 gated skips | 5,084 passed / 6 skipped / 0 failed, 410 s (ran concurrently with V-04/V-05); vs base: 0 base-passing regressions, 0 new skips; identity changes = 5 renamed titles + 1 relocated I11 case (+ a timestamp-in-title test) | Pass | `evidence/api-e2e/v06-unit-clean-r1.{log,json}`, `v14-unit-r1-vs-base.txt` | V-07 |
| 8 | V-05 | 2026-10-08 | Completed | same as V-04 | identical to V-04 | 338 / 68 / 2 (PB-001); 0 per-test outcome differences vs V-04 | Pass (QR-002 integration) | `evidence/api-e2e/v05-integration-clean-r2.{log,json}` | V-09 |
| 9 | V-14 | 2026-10-08 | Checkpoint | `compare-runs.py` base vs V-04/V-06 | no regressions, no new skips | integration: only base-"passing" tests now failing are the 2 PB-001 cases (base passed them only because the stale double crashed publication: base error `Cannot read properties of undefined (reading 'kind')`); 3 team-communication tests that base skipped (suite error) now run and pass; 68 skips are all opt-in/live/WSL gates. Unit: 6 skips = AGY_LIVE (5) + win32 `runIf` (1) | — | `evidence/api-e2e/v14-*.txt` | finalize after V-08/V-09 |
| 10 | V-09 | 2026-10-08 | Completed | `pnpm -C autobyteus-server-ts test:integration`, inherited agent-shell env + sentinel, FRESH | same as clean | 338/68/2 (PB-001); 0 per-test differences vs V-05; sentinel unchanged; `~/.autobyteus` watch: only `logs/app.log` + live `project_task_manager` memory, no test signature | Pass | `evidence/api-e2e/v09-integration-sentinel.*` | V-10 |
| 11 | V-10 | 2026-10-08 | Completed | `pnpm -C autobyteus-server-ts typecheck`, clean env, FRESH | exit 0 | `tsc -p tsconfig.build.json --noEmit` exit 0 | Pass | `evidence/api-e2e/v10-typecheck.log` | V-11 |
| 12 | V-11 | 2026-10-08 | Completed | temporary `export const __apiE2eTypecheckProbe: number = "not a number";` appended to `src/file-explorer/file-explorer.ts`; typecheck; restore | non-zero | exit 2, `TS2322` at line 492; restored, `git status` clean | Pass | `evidence/api-e2e/v11-typecheck-negative-probe.log` | V-12 |
| 13 | V-12 | 2026-10-08 | Completed | `RUN_CODEX_NATIVE_SURFACE_TESTS=1` + `pnpm exec vitest run tests/integration/runtime-management/codex/client/codex-native-multi-agent-disabled.integration.test.ts`, inherited env + sentinel; control without gate | gate on → runs; off → skipped | on: 4/4 passed (codex-cli 0.161.0, loopback capture); off: 4 skipped; sentinel unchanged both | Pass | `evidence/api-e2e/v12-gate-codex-native-surface-{on,off}.*` | V-13 |
| 14 | V-13 | 2026-10-08 | Completed | I7 file on FRESH: (a) current src; (b) temp `AGENT_INPUT_STATE` in `SAFE_COMPANION_TYPES`; (c) temp removal of the double's `compactionRecovery`; all restored | (a) 2 fail; (b) 7 pass; (c) cadence passes only via crash | (a) 2 failed/5 passed, `SEGMENT_CONTENT` flushed before window end; (b) 7/7; (c) cadence cases pass, `[AgentRun] failed to publish runtime events … reading 'kind'`, 1 other case fails; `git status` clean after restore. Code read: `agent-run.ts` publishes input state after every batch; Codex `handleAppServerMessage` emits one batch per app-server message | Pass (PB-001 confirmed as product defect) | `evidence/api-e2e/v13a/b/c-*.log` | V-08 |
| 15 | V-07 | 2026-10-08 | Completed | `pnpm -C autobyteus-server-ts test:unit`, clean env, FRESH2 | identical to V-06 | 5,084/6/0; 0 per-test differences vs V-06 except one test whose title embeds a timestamp (passed both) | Pass (QR-002 unit) | `evidence/api-e2e/v07-unit-clean-r2.{log,json}` | |
| 16 | V-08 | 2026-10-08 | Completed | `pnpm -C autobyteus-server-ts test:unit`, inherited env + sentinel, FRESH2 | identical to clean | 5,084/6/0; identical to V-07 (timestamp-title only); E1 22/22, E2 5/5 passed; sentinel unchanged; `~/.autobyteus` watch: live-app log/db/memory only, no test signature | Pass | `evidence/api-e2e/v08-unit-sentinel.*` | |
| 17 | V-12b | 2026-10-08 | Completed | static inventory of `process.env.X` reads in tests/{unit,integration,helpers,fixtures,setup} vs `TEST_ENVIRONMENT_ALLOWLIST` | every input variable allowlisted or test-set | 73 names: 50 allowlisted, 23 set by the test/setup; 2 "read-only" (`AUTOBYTEUS_STREAM_PARSER_SUFFIX`, `QWEN_BASE_URL`) are post-write assertions | Pass | `evidence/api-e2e/v12b-allowlist-static-inventory.txt` | |
| 18 | V-14 | 2026-10-08 | Completed | `compare-runs.py` over base + all runs | — | see checkpoint 9; all runs mutually identical | Pass | `evidence/api-e2e/v14-*.txt` | |
| 19 | V-16 | 2026-10-08 | Completed | `git fetch origin personal` | base unchanged since FRESH creation | `origin/personal` = `048ea6cec` (docs-only), which FRESH/FRESH2 contained | Pass | — | delivery re-runs at merge |
| 20 | cleanup | 2026-10-08 | Completed | `git worktree remove --force` ×2, prune; `rm -rf /tmp/apie2e-*` | — | removed | N/A | — | |

## Re-entry And Reconciliation

- Last durably recorded event: 20
- Last completed case and result: all cases V-01..V-16 terminal (Pass)
- Cases still running, interrupted, or not started: none
- Next case or recovery action: handoff
- Interruption, context-compression, or rerun note: V-06/V-07/V-08 ran concurrently with V-04/V-05/V-09..V-13 on a different worktree; no flake observed
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md` § Test-Case Ledger Reconciliation
- Reconciliation note for any case missing a terminal result: none
