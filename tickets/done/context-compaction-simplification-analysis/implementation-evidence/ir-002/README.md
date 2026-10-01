# IR-002 — CRR-001 Local Fix evidence

## Basis and scope

- Source delta commit: `7886aeb78449fa54a09ce715fc6e0d74134b386f`, after IR-001 source `3eb43f0dc457fb5d5960eee62618d8d497e42e9b` and ticket commit `3538fe75c`.
- Trigger: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/code-review-report.md`, **CRR-001 Fail — Local Fix**, **CR-001 / CR-002**. SR-012/SR-013 and ARCH-REV-001 unchanged. Large/High preserved. No new product behavior or design change.
- `source-inventory.json` pins eight changed source/test paths; `source-audit.txt` records the size/removal audit. Two production files are 79 and 252 nonempty lines. The large net deletion in the shared live harness is test-support cleanup, exempt from the production source-size limit.

## Corrections submitted for re-review

**CR-001:** removed shared harness imports of deleted lineage/builtin APIs, deleted-template reads, child/correction topology classifier and assertions, lineage version/category output requirements and old projection-prefix expectation. Both existing managed-compaction scenario registrations remain; they now use production `createCompactionLlm` with an observational extension, record one direct system/user request per completed operation, verify exact prompt/framing and normalized status, and compare accepted Markdown with the strict-v5 snapshot and next request. Result schema and E2E caller now expose direct invocation/model/status/count/summary evidence. No production APIs restored, no compatibility compactor, no scenario disabled to avoid the finding. Existing exact-retention artifact, task-anchor/tool-sequence and Unicode shield fixtures retained. Summarizer selection uses the actual current server setting (explicit override or parent), not a forced scenario override; result records the actual summarizer model separately.

**CR-002:** current core CompactionStatusData now explicitly declares/assigns the six direct fields; nullable new metadata is preserved exactly as the previous passthrough did. Removed unused reporter logExecutionContext/logResultSummary; used budget logging remains. Historical server/web read shapes untouched. This corrects type/cleanup drift; CRR-001 established that the prior wrapper did **not** drop new metadata.

## Checks (implementation-scoped only)

| Log | Final result / boundary |
| --- | --- |
| core-status.log | 12 files / 81 tests PASS: notifier → AgentEventStream round trip, all normalized statuses/null diagnostics and native-vs-summarizer provider independence; existing streaming/compaction execution checks |
| server-boundary-and-history.log | 18 files / 119 tests PASS: 3 new no-provider setup/framing checks plus direct construction/provider/status and historical memory units |
| web-status-history.log | 4 files / 61 tests PASS: progress/live-flow/status handler and historical Event Monitor |
| presentation-contracts.log | 2 tests PASS: current strict DTO/native discriminator |
| core-build.log | PASS: TypeScript/runtime dependency verification |
| server-build.log | PASS: TypeScript/assets/sanitized builtin bootstrap smoke |
| test-support-transpile.log | PASS: harness and changed live caller syntax only, not a full typecheck or E2E run |
| shared-harness-unit-residual.log | **1 failure / 16 pass**: unchanged facade requires provider input normalizer; CRR-001 independently reproduced this at baseline |

The no-provider setup tests stub discovery and stop at backend construction after exercising the injected **production direct configuration factory** with its provider-availability boundary mocked. They do not call parent/summarizer generation, inspect credentials, or claim complete backend/AgentRun/live execution. A separate check renders the existing Unicode fixture through the real prompt builder and checks current source-tool framing without changing fixture bytes.

### Initial local failures corrected before final logs

`harness-boundary.log` and duplicate `harness-boundary-initial.log` preserve the first syntax failure (unescaped slash in a new regex). `server-boundary-and-history-initial.log` then caught the unit fixture using its original run_bash name rather than the harness's read_file wrapper; the test now mirrors that real wrapper. `core-status-initial.log` caught nullable metadata being converted to undefined while adding explicit assignments; corrected to preserve prior passthrough semantics and added null/status regressions. These intermediate logs are not the final result.

## Exact commands

From the task worktree:

```sh
pnpm -C autobyteus-ts exec vitest run tests/unit/agent/streaming tests/unit/agent/loop/llm-phase-compaction.test.ts tests/unit/agent/loop/llm-phase-memory-compaction-configuration.test.ts tests/unit/memory/pending-compaction-executor.test.ts --no-watch
pnpm -C autobyteus-server-ts exec vitest run tests/unit/secret-management/live-e2e-compaction-boundary.test.ts tests/unit/agent-execution/compaction tests/unit/agent-memory --no-watch
pnpm -C autobyteus-server-ts exec vitest run tests/unit/secret-management/live-e2e-harness.test.ts --no-watch
pnpm -C autobyteus-web test:nuxt components/progress/__tests__/CompactionActivityItem.spec.ts components/workspace/agent/__tests__/AgentCompactionLiveFlow.spec.ts services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts services/eventMonitor/__tests__/recentEventMonitorPresentationWitness.spec.ts --run
pnpm -C autobyteus-agent-presentation-contracts test
pnpm -C autobyteus-ts build
pnpm -C autobyteus-server-ts build:full
```

## Audit correction and limits

IR-001 removed the separate core child/category LMStudio E2E file but **missed the still-active shared live harness**. Its broad cleanup/caller-audit claim was incomplete. IR-002 fixes that missed seam; the original inventory remains an IR-001 baseline and this delta inventory is additive. No live semantic-quality result is claimed from this cleanup. The old child/correction topology is not a permitted target behavior.

CRR-001 independently reproduced all 15 sampled broader failures on the unchanged base (the original 14 plus the shared facade input-normalizer prerequisite). IR-002 reran the shared file and still observes that one prerequisite failure; it is neither attributed to the compaction refactor nor silently waived. It can block full live harness execution and must be resolved/triaged by the downstream validation owner before live results are claimed. The other 14 were not rerun in this bounded revision. Full baseline commands/results remain in `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/code-review-evidence/README.md` and `residual-comparison.json`.

No live provider request, broader API/E2E environment, first/repeated semantic-quality benchmark, actual crash/power-loss campaign or full-suite pass. API/E2E retains target live/durable coverage ownership after source re-review. No new frontend rendering: IR-002 changes test support/core payload typing, not rendered UI; IR-001 synthetic interaction evidence remains applicable with its recorded limits. No push or merge.
