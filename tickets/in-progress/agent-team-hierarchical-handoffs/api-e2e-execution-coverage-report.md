# API/E2E Execution And Coverage Report

## Report Meta

- Current API/E2E Revision: `API-REV-015`
- Trigger: `CRR-032` — `Fail — Local Fix` for `TR-F-002` and `TR-F-003`
- Product source basis: `SR-015` / `ARCH-REV-009` / `IR-018` (`035fba611e6895187f7f6d4644993e22efd8c38c`) / `CRR-031`
- Prior completed result: `API-REV-014 — Pass / 96%`
- Current result: `Pass / 96%`
- Scope of this revision: bounded cumulative durable-coverage correction and reporting reissue. CRR-032 explicitly preserves API-REV-014's product/runtime result and real three-runtime evidence.
- Working directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs`
- Evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-015`

## Corrected Coverage Decisions

### TR-F-002 — stale skipped/excluded paths

| Path group | Final decision | Correction and evidence |
| --- | --- | --- |
| Seven changed capability-gated runtime E2Es | `Replace / Restore` | Restored exactly to artifact HEAD. Their ticket changes were mechanical `recipient_address` edits layered over stale create-run/schema/socket setup, so they are not maintained current coverage and are not counted as skipped passes. Current durable unit/integration/API owners plus the API-REV-014 real AutoByteus/Codex/Claude Team matrix replace their intended changed-boundary evidence. |
| Duplicate `xml-patch-prompt-tool-parsing-state.test.{js,ts}` edits | `Out Of Scope / Restore` | Restored exactly to artifact HEAD. They are server-Vitest-excluded and import deleted source, so they provide no executable ticket evidence. |

All nine restorations have zero current diff and recorded hashes in `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-015/restored-stale-paths-final.log`.

### TR-F-003 — exact inventory and live-harness ownership

API/E2E owns the two cumulative support changes:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/test-support/live-e2e/live-e2e-harness.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/test-support/live-e2e/run-live-e2e.mjs`

They propagate the exact launched `AUTOBYTEUS_TEST_DATABASE_URL`, canonicalize it through the existing safe test-database resolver, and make the in-process harness reject a mismatch before live scenario execution. Focused proof accepted an explicit owned disposable database and rejected a second safe-but-wrong test database with `LIVE_E2E_DATABASE_TARGET_MISMATCH`; the operational database was not referenced.

The authoritative inventory is:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-015/cumulative-durable-coverage-inventory.tsv`
- Current delta: `53` paths — `4 added / 47 updated / 2 removed`
- Component split: `49 server / 2 web / 2 live-E2E support`
- Additional explicit restored dispositions: `9` paths outside the current delta
- Total inventory/disposition rows: `62`

The 49 server paths comprise 46 executable changed tests, one shared current-schema fixture, and two removed/replaced historical token-owner tests. The two web tests and both live-E2E support files are named individually in the inventory.

## Executed Validation

| Validation | Exact command / mode | Result | Evidence |
| --- | --- | --- | --- |
| Full server build and sanitized bootstrap | `pnpm --filter autobyteus-server-ts build` from repository root | `Pass`; TypeScript build, managed assets, built-in agent bootstrap, sanitized built-module smoke | `api-rev-015/harness-build.log` |
| Production TypeScript | `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false` in `autobyteus-server-ts` | `Pass` | `api-rev-015/production-typecheck-final.log` |
| Live-harness exact database isolation | Temporary executable probe starts built server with a unique database under `autobyteus-server-ts/db`, runs real-E2E preflight once with the exact URL and once with a distinct safe URL, then cleans both | `Pass`; matching target accepted (`1` preflight file), mismatch rejected with exact stable code, no operational DB reference | `api-rev-015/live-harness-isolation-final.log` |
| Launcher/harness static validation | `node --check test-support/live-e2e/run-live-e2e.mjs` plus exact propagation/mismatch-source audit | `Pass` | `api-rev-015/live-harness-static-final.log` |
| Exact active changed server selection | `pnpm exec vitest run <46 generated current active test paths> --no-watch` | `46 files / 298 tests passed`; `0 skipped` | `api-rev-015/changed-server-tests-final.log` |
| Affected web streaming tests | `pnpm exec vitest run services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts --no-watch` | `2 files / 34 tests passed` | `api-rev-015/web-affected-final.log` |
| Restored-path verification | Compare nine paths with artifact HEAD and hash current bytes | `Pass`; zero diff for all nine | `api-rev-015/restored-stale-paths-final.log` |
| Exact delta reconciliation | Generate inventory from Git state across server tests, web tests, and live support | `Pass`; `53` current + `9` restored disposition rows | `api-rev-015/cumulative-durable-coverage-inventory.tsv`; summary log |
| Diff and safety audit | `git diff --check`; exact restored-path/current-selection/inventory/harness/cleanup checks | `Pass` | `api-rev-015/final-audit.log` |

One non-evidence command attempt used the unavailable Bash `mapfile` builtin, which caused Vitest to begin an unintended broad selection. It was immediately interrupted after the first isolated test process began. It touched only the repository test database under `autobyteus-server-ts/tests/.tmp`; the corrected exact 46-file command was then run cleanly and is the sole final server-selection evidence.

## Preserved Real-System Evidence

CRR-032 explicitly states that API-REV-014's runtime result is not reopened. No production source changed during this correction, and the nine restored edits never supplied executable product proof. Therefore the following direct real evidence remains authoritative rather than being redundantly repeated:

- Actual `pnpm secrets:import` against the exact disposable test application-data root/database, followed by a `READY` vault status with `9` configured identifiers and `0` blocked.
- Public staged nested-classroom package import through the built server and real frontend.
- Fresh AgentTeam rows for AutoByteus `gpt-5.6-luna`, Codex App Server `gpt-5.6-luna` with persisted `reasoning_effort: medium`, and authenticated Claude `sonnet` with medium reasoning.
- Every row passed rooted metadata, exact persistent nested delivery, exact same-task-Team peer delivery with nonempty ordered task chain and task-scoped AgentRuns, exact submit result, accepted review, and lifecycle cleanup.
- Structured summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-014/live/nested-classroom-live-matrix-summary.json`.

`pnpm secrets:import` makes the vault ready only for the selected application-data root/database when the imported source and target configuration are valid. API-REV-014 confirmed that exact target with a post-import status check; the command is not a global guarantee for every environment.

## Confidence Scorecard

| Category | Score | Evidence and remaining uncertainty |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 97% | All critical collaboration, migration, provider, browser, and three-runtime live rows retain direct API-REV-014 proof; local-fix coverage reporting is now exact. |
| Changed-boundary execution directness | 97% | 46/46 active changed server files, 298/298 tests, the exact affected web selection, and prior real task-Team execution directly cover the changed owners. |
| Cross-boundary integration realism and mock gap | 95% | Built server, GraphQL/WebSocket, real frontend, and real providers were exercised. The retained Claude teardown-only MCP 404 remains bounded after accepted settlement. |
| Environment, configuration, identity, and fixture fidelity | 96% | Exact disposable secret import/database/provider/model configuration is retained; current harness additionally proves explicit target acceptance and mismatch rejection. |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | Strict routing negatives, migration rollback/retry, task lifecycle, terminate/restore, and fail-closed harness mismatch are covered. |
| User-surface, browser, and desktop-shell confidence | 95% | Real browser Agents/Teams across all runtimes passed. Native Electron-shell-only behavior was not material to this server/web change. |
| Durable regression coverage quality and relevance | 95% | Exact current delta is fully reconciled; all maintained executable changed tests pass; stale skipped/excluded ticket edits are explicitly restored rather than misreported. Proportional reviewer approval is still required. |

Overall confidence: `96%` (rounded mean `95.9%`). No category is below 90%, and no critical acceptance criterion is missing or failing.

## Cleanup, Safety, And Residual Disclosures

- Focused API-REV-015 harness runtime/database artifacts were removed; no `api-rev-015-*` test database or runtime remains.
- No live server/frontend/browser/provider process was started for this bounded reissue beyond the owned built-server harness probe; that server was stopped.
- API-REV-014 already removed its disposable runtime/database/vault/stage and stopped owned ports/processes; all Team rows were inactive.
- Source `/Users/normy/.autobyteus/server-data/.env` was not modified and secret values were not printed or copied into evidence.
- Mandatory operational disclosure remains: an initial API-REV-014 setup attempt inherited `DATABASE_URL` and mutated `/Users/normy/.autobyteus/server-data/db/production.db` by applying pending Prisma migration `20260801090000_token_usage_member_display_name` and writing a failed canonical migration record with 203 failures. No automatic rollback was attempted. All accepted results, including this round's harness proof, use isolated test-owned databases.
- Prior non-clean whole-server/web baselines remain classified as unrelated and are not represented as acceptance. The exact affected/cumulative selections above are the current evidence.

## Result And Routing

- Result: `Pass`
- Final validation confidence: `96%`
- Prior API/E2E failure resolved: `API-F-010` remains resolved by API-REV-014 and CRR-031.
- Test-review findings resolved locally: `TR-F-002`, `TR-F-003`
- Open API/E2E findings: `None`
- Durable repository delta: `4 added / 47 updated / 2 removed` across server, web, and live-E2E support (`53` current paths); exact per-path inventory attached.
- Recommended recipient: `code_reviewer` for proportional re-review of the corrected cumulative durable coverage package. Delivery remains gated on that review.
