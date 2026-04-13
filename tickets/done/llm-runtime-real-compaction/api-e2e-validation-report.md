# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/llm-runtime-real-compaction/tickets/in-progress/llm-runtime-real-compaction/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/llm-runtime-real-compaction/tickets/in-progress/llm-runtime-real-compaction/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/llm-runtime-real-compaction/tickets/in-progress/llm-runtime-real-compaction/proposed-design.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/llm-runtime-real-compaction/tickets/in-progress/llm-runtime-real-compaction/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/llm-runtime-real-compaction/tickets/in-progress/llm-runtime-real-compaction/implementation-handoff.md`
- Current Validation Round: `9`
- Trigger: `2026-04-12 current-schema-only semantic-memory reset/rebuild refresh`
- Prior Round Reviewed: `8`
- Latest Authoritative Round: `9`

Round rules:
- Reuse the same scenario IDs across reruns for the same scenarios.
- Create new scenario IDs only for newly discovered coverage.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial API/E2E validation after implementation handoff | N/A | 1 ticket-scope failure | Fail | No | Focused TS/server/web suites passed, but scoped web static validation found a changed-source type error in `AgentEventMonitor.vue` |
| 2 | Local-fix follow-up for `AgentEventMonitor.vue` prop typing | Yes | 0 ticket-scope failures | Pass | No | Rechecked the changed web area; targeted web tests passed and `vue-tsc` no longer reported `AgentEventMonitor.vue` or any changed web implementation file |
| 3 | Live LM Studio compaction proof follow-up | Yes | 0 ticket-scope failures | Pass | No | Added successful real-provider LM Studio proof of request → compaction trigger → real LLM-backed compaction completion → compacted follow-up recall |
| 4 | Timeout-hardening follow-up for local providers | Yes | 1 ticket-scope failure | Fail | No | Focused timeout-hardening/provider tests and live LM Studio compaction rerun passed, but changed-file `tsc` intersection included a new error in touched test file `tests/unit/llm/api/openai-compatible-llm.test.ts` |
| 5 | Local-fix follow-up for timeout-hardening test typing | Yes | 0 ticket-scope failures | Pass | No | Rechecked the touched timeout-hardening test files; focused tests passed and the `autobyteus-ts` changed-file `tsc` intersection for those files became clean again |
| 6 | Deterministic planner/frontier/store redesign follow-up | Yes | 0 ticket-scope failures | Pass | No | Revalidated the redesigned planner/frontier/store path, schema-3 rebuild, tool-continuation persistence, retained timeout hardening, and server/web propagation; all focused suites passed and changed-file static intersections were clean |
| 7 | Startup/restore + semantic-memory schema-upgrade refresh | Yes | 0 ticket-scope failures | Pass | No | Revalidated schema-gate-first startup/restore, semantic-memory manifest v2 migration, typed semantic categories/salience rendering, retained runtime compaction, and the latest touched-file static intersection |
| 8 | Clarified current-schema-only persistence policy | Yes | 1 design-policy failure | Fail | No | The implementation intentionally migrated prior persisted semantic-memory formats through `CompactedMemorySchemaUpgrader`, which violated the clarified no-legacy/backward-compatibility design principle |
| 9 | Current-schema-only semantic-memory reset/rebuild refresh | Yes | 0 ticket-scope failures | Pass | Yes | The upgrader path was replaced by `CompactedMemorySchemaGate`; stale semantic memory is now reset, stale snapshots invalidated, and rebuild/reset happens without legacy migration logic |

## Validation Basis

Rounds 1-7 established that the implementation worked as coded, but round 8 intentionally failed the ticket on design-policy grounds because the startup/restore path still migrated old persisted semantic memory. Round 9 revalidated the refreshed implementation after that policy correction. The new implementation removes the upgrader path, installs a current-schema-only `CompactedMemorySchemaGate`, clears stale semantic memory on mismatch, invalidates stale snapshots, and rebuilds from canonical sources or starts clean. Focused executable validation passed, the LM Studio-backed compaction regression remained green, and the latest touched-file static-validation intersection stayed clean.

## Validation Surfaces / Modes

- Durable unit validation via Vitest in `autobyteus-ts`
- Durable integration validation via Vitest in `autobyteus-ts`
- Scoped static validation via `tsc`
- Retained prior round-6 server/web/localization evidence
- Live LM Studio-backed compaction regression using a non-reasoning model on the `/v1/chat/completions` path
- Direct code-path validation of the schema gate replacing the prior legacy migration path

## Platform / Runtime Targets

- Host: `Darwin MacBookPro 25.2.0 arm64`
- Node.js: `v22.21.1`
- pnpm: `10.28.2`
- Worktree root: `/Users/normy/autobyteus_org/autobyteus-worktrees/llm-runtime-real-compaction`
- Project target for round 9 reruns:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/llm-runtime-real-compaction/autobyteus-ts`
- Retained prior evidence targets:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/llm-runtime-real-compaction/autobyteus-server-ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/llm-runtime-real-compaction/autobyteus-web`
- Live runtime target:
  - LM Studio at `http://127.0.0.1:1234`
  - target model: `gemma-4-31b-it`

## Lifecycle / Upgrade / Restart / Migration Checks

- Round 3 exercised a full live agent lifecycle across multiple turns for real compaction against LM Studio.
- Round 6 exercised schema-3 stale-cache rebuild and continuation-cycle behavior.
- Round 7 exercised the prior schema-gate-first startup/restore path, which still contained legacy migration logic.
- Round 9 revalidated the corrected current-schema-only startup/restore path through:
  - `tests/unit/memory/compacted-memory-schema-gate.test.ts`
  - `tests/unit/memory/working-context-snapshot-bootstrapper.test.ts`
  - `tests/integration/memory/working-context-snapshot-restore.test.ts`
  - `tests/integration/agent/working-context-snapshot-restore-flow.test.ts`
- Round 9 also revalidated that real compaction and typed semantic-memory behavior still work after the reset/rebuild policy change through:
  - `tests/integration/agent/memory-compaction-flow.test.ts`
  - `tests/integration/agent/memory-compaction-real-summarizer-flow.test.ts`
  - `tests/integration/agent/memory-compaction-real-scenario-flow.test.ts`
  - `tests/integration/agent/memory-compaction-quality-flow.test.ts`
  - `tests/integration/agent/memory-compaction-tool-tail-flow.test.ts`
  - `tests/integration/agent/runtime/agent-runtime-compaction.test.ts`

## Coverage Matrix

| Scenario ID | Requirement / AC | Validation Method | Result | Evidence |
| --- | --- | --- | --- | --- |
| `SC-001` | `FR-001`, `FR-002`, `FR-003`, `FR-005`, `AC-001` | TS runtime integration + memory regression suite | Pass | Retained prior runtime coverage plus round-9 reruns of `tests/integration/agent/memory-compaction-real-summarizer-flow.test.ts`, `tests/integration/agent/memory-compaction-real-scenario-flow.test.ts`, `tests/integration/agent/memory-compaction-quality-flow.test.ts`, `tests/integration/agent/memory-compaction-tool-tail-flow.test.ts`, and `tests/integration/agent/runtime/agent-runtime-compaction.test.ts` |
| `SC-002` | `FR-004`, `FR-006`, `FR-007`, `AC-002`, `AC-003`, `AC-009` | TS runtime failure-path + handler/unit coverage | Pass | Retained prior runtime failure-path coverage; round 9 reran `tests/unit/memory/compactor.test.ts` and `tests/integration/agent/runtime/agent-runtime-compaction.test.ts` |
| `SC-003` | `FR-009`, `FR-011`, `FR-012`, `FR-013`, `FR-014`, `FR-017`, `AC-005`, `AC-006`, `AC-007`, `AC-008` | TS unit validation | Pass | Round 9 reran `tests/unit/memory/llm-compaction-summarizer.test.ts`, `tests/unit/memory/compaction-result-normalizer.test.ts`, `tests/unit/memory/retriever.test.ts`, `tests/unit/memory/compaction-snapshot-builder.test.ts`, and `tests/unit/memory/compactor.test.ts` |
| `SC-004` | `FR-008`, `FR-010`, `FR-016`, `AC-004` | Retained server/web focused suites + localization audit | Pass | Round-6 authoritative evidence retained: `autobyteus-server-ts` focused batch (`3` files / `34` tests), `autobyteus-web` focused batch (`8` files / `47` tests), and `audit:localization-literals` pass |
| `SC-005` | Scoped regression hygiene | Git ignore/path check | Pass | Round 1 verified `git check-ignore` exit code `1` for `autobyteus-ts/src/memory/compaction-snapshot-recent-turn-formatter.ts`; no later regression surfaced |
| `SC-006` | Static validation on changed implementation / touched ticket files | `tsc` changed-file intersection | Pass with known unrelated baseline failures | Round 9 reran broad `autobyteus-ts` `tsc`; it still hit baseline repo debt outside scope, but the latest-slice changed-file intersection was `none` |
| `SC-007` | Real-provider compaction-model execution | Live LM Studio top-layer/runtime-backed proof | Pass | Round 3 established the live LM Studio proof; round 9 reran LM Studio-backed `tests/integration/agent/memory-compaction-flow.test.ts` under `LMSTUDIO_TARGET_TEXT_MODEL=gemma-4-31b-it` and it passed |
| `SC-008` | Local-provider timeout hardening (`LMStudioLLM`, `OllamaLLM`, OpenAI-compatible adapter seam, shared fetch helper) | Retained focused provider/unit/integration batch | Pass | Round 4 timeout-hardening/provider batch remained authoritative; no later slice invalidated it |
| `SC-009` | 2026-04-12 deterministic planner / frontier / store redesign | Retained unit + integration validation on planner/frontier/store/bootstrap/runtime continuation seams | Pass | Round 6 planner/frontier/store evidence remained authoritative; round 9 changes build on that state and did not regress the touched restore/runtime tests |
| `SC-010` | 2026-04-12 startup/restore + semantic-memory schema-upgrade slice as implemented in round 7 | Historical executable evidence | Superseded | Round 7 proved the earlier migration-based path worked as coded, but that evidence is now superseded by round 9 because the implementation changed to current-schema-only reset/rebuild |
| `SC-011` | Current-schema-only persisted-memory policy: no legacy/backward-compatibility code for prior on-disk semantic formats | Design/policy compliance review using refreshed implementation handoff, direct code inspection, and executable schema-gate tests | Pass | `implementation-handoff.md` now states old flat semantic memory is no longer migrated; `CompactedMemorySchemaGate.ensureCurrentSchema(...)` clears stale semantic items and writes manifest v2 with `last_reset_ts`; `WorkingContextSnapshotBootstrapper.bootstrap()` invokes the schema gate before any snapshot validation/restore path; passing `tests/unit/memory/compacted-memory-schema-gate.test.ts` proves the current-schema-only reset path is active |

## Test Scope

Across the nine rounds, validation covered:
- real internal LLM-backed compaction summarizer behavior
- default `AgentFactory` runtime wiring
- compaction failure gating and synthetic error completion
- null-safe budget and snapshot rebuild regressions
- deterministic interaction-block planning and frontier selection
- store-owned raw-trace prune/archive by trace ID
- persisted `tool_continuation` boundaries for TOOL-origin continuation cycles
- schema-3 working-context snapshot rebuild / stale-cache restore
- current-schema-only startup/restore and compacted-memory manifest v2 reset semantics
- typed semantic categories, deterministic normalization, salience ranking, and priority-aware snapshot rendering
- local-provider timeout hardening for LM Studio and Ollama
- server settings exposure / live settings plumbing tests
- server-to-web compaction status propagation tests
- web typed compaction settings card, banner/event monitor tests, and localization audit
- live-provider LM Studio proof that an actual model can perform compaction end to end
- policy compliance for current-schema-only persisted-data handling

## Validation Setup / Environment

- The worktree used `autobyteus-ts/.env.test`; when absent it is copied from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/.env.test`.
- The LM Studio-backed compaction regression was run with:
  - `LMSTUDIO_TARGET_TEXT_MODEL=gemma-4-31b-it`
- Round 9 used the existing round-7 executable evidence where still relevant, reran the latest focused executable batch, and inspected the refreshed schema-gate implementation directly.

## Tests Implemented Or Updated

Round 9 directly exercised the refreshed current-schema-only reset/rebuild slice:
- `autobyteus-ts/tests/unit/memory/file-store.test.ts`
- `autobyteus-ts/tests/unit/memory/retriever.test.ts`
- `autobyteus-ts/tests/unit/memory/compaction-snapshot-builder.test.ts`
- `autobyteus-ts/tests/unit/memory/working-context-snapshot-bootstrapper.test.ts`
- `autobyteus-ts/tests/unit/memory/llm-compaction-summarizer.test.ts`
- `autobyteus-ts/tests/unit/memory/compactor.test.ts`
- `autobyteus-ts/tests/unit/memory/compaction-result-normalizer.test.ts`
- `autobyteus-ts/tests/unit/memory/compacted-memory-schema-gate.test.ts`
- `autobyteus-ts/tests/integration/memory/working-context-snapshot-restore.test.ts`
- `autobyteus-ts/tests/integration/agent/working-context-snapshot-restore-flow.test.ts`
- `autobyteus-ts/tests/integration/agent/memory-compaction-flow.test.ts`
- `autobyteus-ts/tests/integration/agent/memory-compaction-real-summarizer-flow.test.ts`
- `autobyteus-ts/tests/integration/agent/memory-compaction-real-scenario-flow.test.ts`
- `autobyteus-ts/tests/integration/agent/memory-compaction-quality-flow.test.ts`
- `autobyteus-ts/tests/integration/agent/memory-compaction-tool-tail-flow.test.ts`
- `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-compaction.test.ts`

Retained round-6 server/web/localization evidence remains authoritative because later slices did not touch those packages.

## Durable Validation Added To The Codebase

Confirmed the repo contains durable validation for:
- top-layer success and failure runtime proofs in `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-compaction.test.ts`
- current-schema-only startup/restore and manifest-reset behavior in:
  - `autobyteus-ts/tests/unit/memory/compacted-memory-schema-gate.test.ts`
  - `autobyteus-ts/tests/unit/memory/working-context-snapshot-bootstrapper.test.ts`
  - `autobyteus-ts/tests/integration/memory/working-context-snapshot-restore.test.ts`
  - `autobyteus-ts/tests/integration/agent/working-context-snapshot-restore-flow.test.ts`
- typed semantic-memory normalization/retrieval/rendering in:
  - `autobyteus-ts/tests/unit/memory/compaction-result-normalizer.test.ts`
  - `autobyteus-ts/tests/unit/memory/retriever.test.ts`
  - `autobyteus-ts/tests/unit/memory/compaction-snapshot-builder.test.ts`
- timeout-hardening coverage from prior rounds in:
  - `autobyteus-ts/tests/unit/llm/api/openai-compatible-llm.test.ts`
  - `autobyteus-ts/tests/unit/llm/api/lmstudio-llm.test.ts`
  - `autobyteus-ts/tests/unit/llm/api/ollama-llm.test.ts`
  - `autobyteus-ts/tests/unit/llm/transport/local-long-running-fetch.test.ts`

## Other Validation Artifacts

- Canonical validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/llm-runtime-real-compaction/tickets/in-progress/llm-runtime-real-compaction/api-e2e-validation-report.md`

## Temporary Validation Methods / Scaffolding

- Earlier rounds used and removed temporary LM Studio/OpenAI/Ollama smoke files.
- Round 9 added no temporary scaffolding.

## Dependencies Mocked Or Emulated

- Durable runtime proofs still use deterministic doubles where appropriate for stable orchestration assertions.
- The LM Studio-backed compaction flow uses the live local LM Studio runtime with a non-reasoning model.
- Unit tests around normalization, retrieval, schema-gate behavior, and store behavior use local fixtures/mocks rather than external services.
- Retained server/web evidence continues to come from unit/component tests rather than a full browser session.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `SC-006` changed-source `vue-tsc` failure in `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` | Local Fix | Resolved | Round 2 targeted web vitest rerun passed and `vue-tsc` changed-source intersection became `0` | Fix was the null-normalized banner binding `:status="compactionStatus ?? null"` |
| 3 | `SC-007` live-provider evidence gap | Non-blocking evidence gap | Resolved | Round 3 live LM Studio proof passed with non-skipped `compaction_completed`, persisted memory, archived traces, and successful follow-up recall | This evidence remains valid in round 9 |
| 4 | `SC-006` changed-file `tsc` failure in `autobyteus-ts/tests/unit/llm/api/openai-compatible-llm.test.ts` | Local Fix | Resolved | Round 5 focused vitest rerun passed and the changed-file `tsc` intersection for the touched test files became `none` | Fix replaced tuple-unsafe constructor-call access with typed destructuring |
| 8 | `SC-011` design-policy failure: legacy semantic-memory migration logic still active | Design Impact | Resolved | Round 9 direct code inspection plus `tests/unit/memory/compacted-memory-schema-gate.test.ts` show the upgrader path has been replaced by current-schema-only reset/rebuild logic | The policy mismatch is closed because legacy migration logic is no longer present in restore/bootstrap |

## Scenarios Checked

### `SC-011` Round-9 focused `autobyteus-ts` schema-gate/restore + typed-memory batch
- Ran:
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/llm-runtime-real-compaction/autobyteus-ts exec vitest run tests/unit/memory/file-store.test.ts tests/unit/memory/retriever.test.ts tests/unit/memory/compaction-snapshot-builder.test.ts tests/unit/memory/working-context-snapshot-bootstrapper.test.ts tests/unit/memory/llm-compaction-summarizer.test.ts tests/unit/memory/compactor.test.ts tests/unit/memory/compaction-result-normalizer.test.ts tests/unit/memory/compacted-memory-schema-gate.test.ts tests/integration/memory/working-context-snapshot-restore.test.ts tests/integration/agent/working-context-snapshot-restore-flow.test.ts tests/integration/agent/memory-compaction-real-summarizer-flow.test.ts tests/integration/agent/memory-compaction-real-scenario-flow.test.ts tests/integration/agent/memory-compaction-quality-flow.test.ts tests/integration/agent/memory-compaction-tool-tail-flow.test.ts tests/integration/agent/runtime/agent-runtime-compaction.test.ts`
- Result:
  - `15` files / `32` tests passed on rerun.
- Notes:
  - the implementation handoff reported `15 files / 35 tests`; authoritative rerun in this validation environment observed `15 files / 32 tests`
  - no ticket-scope failure was associated with that count mismatch

### `SC-007` Round-9 live LM Studio compaction regression
- Ran:
  - `LMSTUDIO_TARGET_TEXT_MODEL=gemma-4-31b-it pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/llm-runtime-real-compaction/autobyteus-ts exec vitest run tests/integration/agent/memory-compaction-flow.test.ts`
- Result:
  - `1` file / `1` test passed.
- Notes:
  - non-blocking stderr included the usual GEMINI / ANTHROPIC metadata warnings and an Ollama-connect warning before LM Studio discovery continued successfully

### `SC-006` Round-9 latest-slice `tsc` intersection recheck
- Ran:
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/llm-runtime-real-compaction/autobyteus-ts exec tsc -p tsconfig.json --noEmit`
  - captured output and searched for the latest schema-gate reset/rebuild touched files from the refreshed handoff
- Result:
  - broad `autobyteus-ts` `tsc` still exits non-zero on baseline repo debt
  - latest-slice changed-file intersection = `none`

### `SC-011` Round-9 current-schema-only persistence policy check
- Reviewed:
  - refreshed `implementation-handoff.md`
  - `autobyteus-ts/src/memory/restore/compacted-memory-schema-gate.ts`
  - `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts`
  - `autobyteus-ts/src/memory/store/compacted-memory-manifest.ts`
  - passing round-9 schema-gate tests, especially `tests/unit/memory/compacted-memory-schema-gate.test.ts`
- Observed:
  - the handoff explicitly states old flat semantic memory is no longer migrated
  - `CompactedMemorySchemaGate.ensureCurrentSchema(...)` clears stale semantic items and invalidates the cached snapshot on mismatch
  - `WorkingContextSnapshotBootstrapper.bootstrap()` invokes the schema gate before any snapshot validation/restore path
  - the runtime no longer contains the prior legacy semantic-memory migration behavior in the restore/bootstrap path
- Policy result:
  - the clarified current-schema-only persistence principle is now satisfied

## Passed

- Round 9 focused `autobyteus-ts` schema-gate/restore + typed-memory batch passed: `15` files / `32` tests on authoritative rerun.
- Round 9 live LM Studio-backed compaction regression passed: `1` file / `1` test.
- Round 9 latest-slice changed-file `tsc` intersection is clean (`none`).
- All previously authoritative round-6 server/web/localization and round-3 live-provider evidence remain valid.
- The prior design-policy failure from round 8 is resolved.

## Failed

- None in ticket scope in round 9.

## Not Tested / Out Of Scope

- A full browser-driven E2E session for the web compaction banner/settings surface was not run; web coverage remains from component/service tests.
- A deliberately slow >5-minute LM Studio or Ollama hold-open probe was not rerun after the timeout-hardening slice; the seam remains covered by prior provider tests plus successful live-provider compaction regressions, but the explicit long-idle probe remains unexecuted.
- LM Studio native `/api/v1/chat` reasoning-control support remains deferred follow-up work, not part of this ticket.

## Blocked

- None in ticket scope.

## Cleanup Performed

- No new temporary validation scaffolding was added in round 9.

## Classification

- `Local Fix`: the main issue is a bounded implementation correction.
- `Design Impact`: the main issue is a weakness or mismatch in the reviewed design.
- `Requirement Gap`: intended behavior or acceptance criteria are missing or ambiguous.
- `Unclear`: the issue is cross-cutting, low-confidence, or cannot yet be classified cleanly.

## Recommended Recipient

- `code_reviewer`

## Evidence / Notes

- Non-blocking stderr during focused suites included the existing `AUTOBYTEUS_SSL_CERT_FILE` warning, provider metadata warnings for GEMINI / ANTHROPIC, local Autobyteus discovery warnings, and an Ollama-connect warning during the LM Studio regression; these did not affect ticket-scope classification.
- Live LM Studio validation continues to use the non-reasoning model `gemma-4-31b-it` because reasoning-oriented models on the current `/v1/chat/completions` path can return empty `content`, which is incompatible with the current compaction parser.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: `The current-schema-only semantic-memory reset/rebuild contract is now implemented. Focused schema-gate/restore tests passed, LM Studio-backed compaction remained green, the latest touched-file TypeScript intersection was clean, and the prior policy failure is resolved.`
