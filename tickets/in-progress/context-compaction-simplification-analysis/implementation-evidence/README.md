# Implementation evidence — IR-001

- Source implementation commit: `3eb43f0dc457fb5d5960eee62618d8d497e42e9b`.
- Reviewed base: `046279298f53fb98d7688ee9dc2b2ba0fa827685`.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`; branch `codex/context-compaction-simplification-analysis`.
- These are implementation-scoped checks, not independent source-review, API/E2E, live-model-quality or delivery approval.
- `implementation-source-inventory.json` contains all 173 source/test paths and hashes (48 removed); `implementation-source-diff-stat.txt` is the source commit stat. `source-size-check.json` records 70 changed handwritten production files, maximum 492 nonempty lines; generated contracts/GraphQL and tests excluded. Deleted old parser/collector account for >220-line source deltas; no remaining changed handwritten source exceeds 500 nonempty lines.

Verbatim upstream prompt/history and raw log bytes are preserved. Whole-ticket staged whitespace check reports their trailing spaces/terminal blank lines; implementation source and newly authored handoff/report Markdown pass scoped whitespace checks.

## Current focused results

| Evidence | Outcome | Scope |
| --- | --- | --- |
| dependency-install.log | PASS | Frozen workspace dependency install; Node 22.23.1 / pnpm 10.28.2 |
| core-build.log | PASS | Core TypeScript build/runtime-dependency verification |
| server-build.log | PASS | Server TypeScript/assets plus sanitized builtin bootstrap smoke |
| web-build.log | PASS | Nuxt production build; no temporary fixture page |
| graphql-codegen.log | PASS | Local server schema generation; retained only compaction-related generated diff |
| web-prepare.log | PASS | Nuxt preparation |
| core-local-tests.log | 60 files / 363 tests PASS | Provider API units, agent config/factory/compaction units, all memory units, two narrow runtime integrations |
| server-local-tests.log | 32 files / 277 tests PASS | Construction, request shapes, status, startup migration, settings, builtins, historical memory readers, v5 migration |
| web-local-tests.log | 10 files / 122 tests PASS | Settings config/save/node state, streaming/progress, historical Event Monitor witnesses |
| additional-core-local-tests.log | 5 files / 45 tests PASS | Final direct summarizer 19 tests, factory config callback and isolated client cleanup |
| presentation-contract-tests.log | 2 tests PASS | Strict direct-summary DTO and native provider discriminator |
| localization-checks.log | PASS | Boundary guard and zero unresolved literal findings |
| final-test-cleanup-check.log | 1 file / 6 tests PASS | v5 migration after removing unused lineage test variable |
| rendered-result-check.md | Completed with limits | Real component interaction using synthetic state; regression found and fixed |

Counts overlap; do not sum them into a unique suite total. No standalone web typecheck pass: `web-typecheck-unavailable.log` records unavailable vue-tsc. Core/server builds include their TypeScript checks.

## Reproduction commands

Run from `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`:

```sh
pnpm install --frozen-lockfile
pnpm -C autobyteus-ts build
pnpm -C autobyteus-server-ts build:full
pnpm -C autobyteus-web build
pnpm -C autobyteus-agent-presentation-contracts test
pnpm -C autobyteus-web guard:localization-boundary
pnpm -C autobyteus-web audit:localization-literals

pnpm -C autobyteus-ts exec vitest run tests/unit/llm/api tests/unit/agent/context/agent-config.test.ts tests/unit/agent/factory/agent-factory.test.ts tests/unit/agent/loop/llm-phase-compaction.test.ts tests/unit/agent/loop/llm-phase-memory-compaction-configuration.test.ts tests/unit/memory tests/integration/agent/runtime/agent-runtime-compaction.test.ts --no-watch
pnpm -C autobyteus-ts exec vitest run tests/unit/clients tests/unit/llm/llm-factory-config-composition.test.ts tests/unit/memory/direct-llm-compaction-summarizer.test.ts --no-watch
pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/compaction tests/unit/agent-execution/agent-provider-factory-builder.test.ts tests/unit/agent-execution/backends/autobyteus tests/unit/services/server-settings-service.test.ts tests/unit/built-in-agents tests/unit/startup/compaction-model-settings-migration.test.ts tests/unit/agent-memory tests/unit/run-history/projection/local-memory-run-view-projection-provider.test.ts tests/unit/app-data-migrations/migrate-native-working-context-snapshots-v5-migration.test.ts --no-watch
pnpm -C autobyteus-web test:nuxt components/settings/__tests__/CompactionConfigCard.spec.ts components/settings/__tests__/CompactionModelSettings.spec.ts components/settings/__tests__/ServerSettingsCompactionFailure.spec.ts components/progress/__tests__/CompactionActivityItem.spec.ts components/workspace/agent/__tests__/AgentCompactionLiveFlow.spec.ts components/workspace/agent/__tests__/CompactionStatusRow.spec.ts tests/stores/serverSettingsStore.test.ts services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts services/agentStreaming/__tests__/AgentStreamingService.spec.ts services/eventMonitor/__tests__/recentEventMonitorPresentationWitness.spec.ts --run
```

Final direct tests were extended after the 363-test run; the later 45-test run validates those final edits. The unused-import cleanup of retired GraphQL strategy test scaffolding did not execute the remaining GraphQL E2E suite; that belongs downstream.

## Coverage and residuals

| Design area | Local evidence | Not proved here |
| --- | --- | --- |
| Exact prompt/parser | SHA-256 literal assertion; six headings/order, CRLF, `(none)`, exterior prose, empty/ambiguous/bad marker cases | Model adherence distribution |
| First/repeated compaction | Scripted summaries on controlled temporary file-backed history; one region, preserved retained messages/tool IDs, raw corpus and no new category artifacts | Semantic recall or useful-detail quality from a real model |
| Provider/capacity | Mocked SDK response statuses for seven adapter families, final request fields/config, fresh factory cap/input refusal without clipping | Live provider availability, deployed RPA caps or stop metadata |
| Cancellation/failure | Before creation/send, during/late return; provider/output/precommit errors; distinct explicit retry; cleanup isolation | Remote SDK behavior under every network failure |
| Commit/restore | Archive/snapshot/prune fault injection, exact archive selection verification/reuse, postcommit reporter failure, strict v5/category-independent restore | Actual process crash, filesystem power-loss/fsync guarantees |
| Settings/startup | Current/env precedence, null/default/old override, source retention, durable failure/malformed handling, atomic tuple saves and node binding | Production app-data census, live multi-node API writes |
| Historical access/status | Memory reader/projection and Event Monitor tests, shared strict DTO, provider-native discriminator unchanged | Full integrated historical browsing matrix |

### Semantic quality status — separate from mechanics

**Unverified.** First and repeated summaries in local fixtures are scripted, not real LLM outputs. No quality score, recall claim, live cost benchmark or provider ranking is inferred. Downstream must run controlled first/repeated-summary fixtures covering explicit constraints, decisions/rationale, references/tool IDs, unresolved work and older facts, and report omissions/distortions separately from parser/mechanics success. No private user conversation was sampled and no paid/live provider request was made during implementation. RPA termination stays `unknown`; it is not silently promoted to complete.

### Broader-check limitations (not hidden as PASS)

- `broader-core-incomplete.log`: a broader core agent/LLM run did not finish; `agent-worker.test.ts` remained running and the process was stopped. Changed stale config tests were repaired and passed in focused checks. `baseline-worker-timeout.log` records the unchanged base's isolated worker test also timing out after 35 seconds, run from an extracted baseline using the same installed core dependencies. This demonstrates the baseline symptom, not a full baseline-suite result.
- `broader-server-failures.log`: exploratory wider unit run reported 9 failed / 75 passed / 3 skipped files and 26 failed / 739 passed / 5 skipped tests, plus one suite setup failure. In-scope stale tests were repaired and are represented in the final focused server log. Four other failure areas remain **unclassified**, not assumed preexisting: provisioning-service missing method (1), Antigravity missing ticket fixtures (8), Claude first-query interruption assertion (1), Codex tool-log correlation admission (4). Those 14 test failures were not repaired or baseline-proven; independent review should assess their origin and relevant blast radius.
- No full repository-suite pass, actual crash test, broad executable-validation signoff or standalone full web typecheck is claimed.

## Coverage retired with obsolete behavior

Removed tests that exercised category generation/normalization/projection/lineage membership, child compactor lifecycle/recursion and strategy APIs. The old LMStudio child-agent/category live E2E harness is obsolete and removed. New scripted runtime integration verifies continuation and explicit retry, not a replacement live semantic-quality harness. Other existing E2E/integration fixtures were mechanically updated for the new injected factory; they were not executed as downstream validation. API/E2E owns replacement system/quality coverage.
