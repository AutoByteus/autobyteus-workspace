# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/raw-traces-active-runtime/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/raw-traces-active-runtime/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/raw-traces-active-runtime/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/raw-traces-active-runtime/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/raw-traces-active-runtime/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/raw-traces-active-runtime/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review passed the implementation and explicitly handed off stale `autobyteus-server-ts/tests/e2e/**` raw-trace active filename expectations/imports for API/E2E ownership.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is a clean active raw-trace filename rename from `raw_traces.jsonl` to `raw_traces_active.jsonl`. Runtime writers, server read boundaries, GraphQL raw-trace file summaries/selectors, imported Memory Sync corpora, and runtime/memory layout examples must use the new active filename. Raw-trace segment files (`raw_traces_000001.jsonl` etc.) and `raw_traces_manifest.json` remain unchanged. Old filename knowledge is migration-only; there must be no steady-state runtime fallback read, dual write, exported old constant alias, or GraphQL old-file selector alias. Existing invalid-selector behavior may fall back generically to a currently listed backend file, but the old active filename must not be treated as a valid alias.

The implementation handoff's `Legacy / Compatibility Removal Check` states that no backward-compatibility mechanisms were introduced, no legacy old behavior was retained in live runtime source, and E2E coverage remained intentionally stale for this stage. The code review report independently passed the implementation and documented that old active filename references remain in `autobyteus-server-ts/tests/e2e/**` for this coverage stage.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Active raw-trace physical file for runtime and fixtures | Changed | RTR-001, AC-RTR-001, AC-RTR-002; design DS-001 | E2E fixtures and runtime assertions must use `raw_traces_active.jsonl` and stop asserting `raw_traces.jsonl` as active. |
| Server/GraphQL raw-trace file summaries and selected filename | Changed | RTR-004, AC-RTR-004; design `RawTraceFileSourceService` boundary | GraphQL E2E must expect active summary `fileName: raw_traces_active.jsonl`, `kind: active`, and selected active filename to match. |
| Stale/invalid raw-trace selector behavior | Changed | Design rejects old GraphQL selector alias; implementation hints request stale selected filename coverage | E2E should assert requesting `raw_traces.jsonl` falls back to listed `raw_traces_active.jsonl` rather than reading old-name data. |
| Raw-trace segment files and manifest | Preserved | RTR-003, AC-RTR-003; design keeps archive manager unchanged | Segment fixture names and expectations remain `raw_traces_<index>.jsonl` and `raw_traces_manifest.json`. |
| Imported Memory Sync active raw-trace file path | Changed | RTR-006, AC-RTR-005; design includes imported Memory Sync corpora/current sync | Memory Sync API/multiprocess E2E should seed/export/import `raw_traces_active.jsonl`; old incoming path is out of scope compatibility. |
| Self-evolution work-trace markdown filename | Preserved | RTR-005, AC-RTR-006; design DS-005 | No E2E change required here; existing non-E2E self-evolution coverage was already updated by implementation. |
| Startup migration of existing old active files | Added | RTR-006, AC-RTR-005; implementation migration tests | Durable unit migration tests already cover local/imported rename; no additional API/E2E migration edit required unless E2E startup migration coverage is discovered missing and practical. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts` / active metadata default selection | GraphQL lists active raw trace file and defaults selected raw trace file to active | RTR-004, AC-RTR-004 | Needs Update | Static inspection found writes/expects `raw_traces.jsonl`; scenario is still the correct API boundary. | Update fixture and expectations to `raw_traces_active.jsonl`. |
| `autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts` / segment selection, pending segment hiding, invalid selector, merged corpus | GraphQL lists active + complete segments, hides pending segments, reads selected segment, falls back on invalid selector, and preserves merged corpus order | RTR-003, RTR-004; AC-RTR-003, AC-RTR-004 | Needs Update | Segment assertions remain valid; active fixture/expected fallback filename is obsolete. | Update only active filename; preserve segment names; add stale old-name selector fallback assertion. |
| `autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts` / imported read-only raw trace file selection | Imported memory source lists active + segment raw trace files and reads selected segment | RTR-004, RTR-006; AC-RTR-004, AC-RTR-005 | Needs Update | Imported active file fixture and expected summary use old active filename. | Update imported active fixture and expectation to `raw_traces_active.jsonl`. |
| `autobyteus-server-ts/tests/e2e/memory/memory-explorer-graphql.e2e.test.ts` | Agent memory explorer detects runs with raw traces | RTR-001, RTR-002, RTR-007 | Needs Update | Touches old active filename to make `hasRawTraces` true. | Touch new active filename. |
| `autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` | Run-history projection can replay tool calls from local raw traces | RTR-001, RTR-002, RTR-007 | Needs Update | Imports removed `RAW_TRACES_MEMORY_FILE_NAME` and writes using that old symbol. | Update import and write path to `RAW_TRACES_ACTIVE_MEMORY_FILE_NAME`. |
| `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` | GraphQL/REST Memory Sync exports local memory to imported memory, ignores partial/imports, exposes imported memory view | RTR-006, AC-RTR-005 | Needs Update | Seeds local active file, asserts imported file, and posts REST batch with old path. Current upgraded source behavior should use new active file. | Update local seed, import assertions, and REST operation relative path to new active filename. |
| `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` | Real source/hub processes sync memory files and imported manifest records | RTR-006, AC-RTR-005 | Needs Update | Seeds source and asserts hub imported path/manifest with old active filename. | Update source seed, imported file assertion, and manifest expectation to new active filename. |
| `autobyteus-server-ts/tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` | Archive mutations hide inactive runs without deleting disk/index data | RTR-001, RTR-002, RTR-007 | Needs Update | Seed helper writes old active file and deletion-preservation checks assert old path still exists. Scenario remains useful for disk persistence. | Update seed and preservation checks to new active filename. |
| `autobyteus-server-ts/tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` | Optional live Codex E2E persists raw traces and working context from a real Codex turn | RTR-001, AC-RTR-001 | Needs Update | Imports removed old active filename constant; scenario remains valid but is gated by `RUN_CODEX_E2E=1`. | Update import to new active constant and assert old active filename is absent when the live test runs. |
| Other `autobyteus-server-ts/tests/e2e/**` files | No direct raw-trace active filename references found | RTR-007 | Out Of Scope | `rg` search found old active filename references only in the paths listed above. | No action. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| E2E assertions expecting active filename `raw_traces.jsonl` | Active raw-trace API/file layout uses `raw_traces.jsonl` | Active file was intentionally renamed to `raw_traces_active.jsonl`; old name is migration-only and must not be an API/runtime steady-state contract. | RTR-001, RTR-004, AC-RTR-001, AC-RTR-004, AC-RTR-007; design legacy removal policy; code review residual-risk note | Update same E2E scenarios to assert `raw_traces_active.jsonl` while retaining segment `raw_traces_<index>.jsonl` coverage. | N/A |
| E2E import of `RAW_TRACES_MEMORY_FILE_NAME` | Old exported active filename constant remains available for tests | The old export was intentionally removed in favor of `RAW_TRACES_ACTIVE_MEMORY_FILE_NAME`. | Design removal plan; implementation handoff `What Changed` | Update to new constant. | N/A |
| Memory Sync E2E operation relative path `*/raw_traces.jsonl` for current source/imported active files | Current source/imported Memory Sync active files use old path | Upgraded/current nodes should sync the new active filename; no protocol compatibility shim for old-path inputs is allowed. | RTR-006, AC-RTR-005; design Backward-Compatibility Rejection Log | Update operation paths to `raw_traces_active.jsonl`. | Older independently deployed sources sending old paths are accepted residual risk and out of scope, not durable compatibility coverage. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| E2E-RTR-OLD-SELECTOR-001 | Requesting stale old active filename `raw_traces.jsonl` is not a valid alias and falls back generically to the backend-listed active file `raw_traces_active.jsonl` | RTR-004; design rejects old GraphQL selector alias; code review API/E2E readiness notes request stale selector behavior | Add assertion to `autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts` | This is an API-visible no-backward-compatibility boundary and was specifically called out for API/E2E validation. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| E2E-RTR-MEMVIEW-001 | `tests/e2e/memory/memory-view-graphql.e2e.test.ts` active/default file scenario | Use/write/expect `raw_traces_active.jsonl` | RTR-004, AC-RTR-004 | Preserve record limit behavior. |
| E2E-RTR-MEMVIEW-002 | `tests/e2e/memory/memory-view-graphql.e2e.test.ts` segment/merged/imported scenarios | Use new active filename; keep segment filenames unchanged | RTR-003, RTR-004, RTR-006; AC-RTR-003, AC-RTR-004, AC-RTR-005 | Include stale selector add-on above. |
| E2E-RTR-EXPLORER-001 | `tests/e2e/memory/memory-explorer-graphql.e2e.test.ts` | Touch new active filename to represent raw trace presence | RTR-001, RTR-002 | Detects `hasRawTraces` through server summary. |
| E2E-RTR-RUNHISTORY-001 | `tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` | Replace old constant import/use with active constant | RTR-001, RTR-002 | Local replay remains otherwise unchanged. |
| E2E-RTR-MEMSYNC-001 | `tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` | Use new relative path for source seed, hub import assertions, and REST batch imported trace | RTR-006, AC-RTR-005 | Does not add old-path compatibility assertions. |
| E2E-RTR-MEMSYNC-002 | `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` | Use new active filename in source seed, imported file assertion, and imported manifest expectation | RTR-006, AC-RTR-005 | Exercises real built server processes. |
| E2E-RTR-ARCHIVE-001 | `tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` | Seed/preserve new active filename | RTR-001, RTR-002 | Disk preservation scenario still applies. |
| E2E-RTR-LIVE-CODEX-001 | `tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` | Replace old constant import/use; add old-file absence assertion | RTR-001, AC-RTR-001 | Execution is environment-gated; run will likely report skipped unless `RUN_CODEX_E2E=1`. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | No whole durable E2E scenario is obsolete; only old active filename assertions/imports/fixtures are obsolete. | N/A | Update existing scenarios in place. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-RTR-HYGIENE-001 | `rg` search across `autobyteus-server-ts/tests/e2e` and changed source/test/docs scopes after edits | No stale E2E old filename/import references remain; any remaining old filename literals in E2E are deliberate negative no-compatibility assertions | Search is execution evidence, not a repository-resident test. |
| TEMP-RTR-DIFF-001 | `git diff --check` | Coverage edits have no whitespace/patch syntax errors | Standard local hygiene check, not durable coverage. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Optional live Codex raw-trace persistence E2E with a real Codex app-server turn | Existing test is gated by `RUN_CODEX_E2E=1` and availability of a working Codex binary/model; default local run should not force external live execution. | Lower confidence in this environment for real Codex runtime side effects, but durable gated coverage will use the new active filename when enabled. | Record skipped/pass status; no escalation unless the gated test fails when explicitly enabled. |
| Older independently deployed Memory Sync source still sending `raw_traces.jsonl` after hub/source upgrade mismatch | Approved residual risk; design explicitly rejects protocol old-path translation/compatibility shim. | Such old-path imports may not be readable as active traces by upgraded readers. | None for this ticket; do not add compatibility coverage. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently | N/A | Requirements/design/code review are explicit: clean rename, migration-only old filename, no compatibility. | N/A |

## Execution Plan

1. Update the E2E files listed above to use `raw_traces_active.jsonl` / `RAW_TRACES_ACTIVE_MEMORY_FILE_NAME` for active raw-trace file setup and assertions while preserving segment filenames.
2. Add a stale old-name GraphQL selector assertion in `memory-view-graphql.e2e.test.ts` proving `raw_traces.jsonl` falls back to listed `raw_traces_active.jsonl` instead of acting as an alias.
3. Run source hygiene searches over `autobyteus-server-ts/tests/e2e` and the broader reviewed scopes for stale old active filename/import references, distinguishing intentional negative no-compatibility assertions from obsolete active-file setup.
4. Run `git diff --check`.
5. Run targeted executable checks for the updated E2E files that do not require external live Codex by default:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory/memory-view-graphql.e2e.test.ts tests/e2e/memory/memory-explorer-graphql.e2e.test.ts tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts`
   - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory-sync/memory-sync-api.e2e.test.ts`
   - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` after ensuring build/dist is current.
   - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` to record default skip or pass depending on environment.
6. If all current valid coverage passes, write the execution coverage report and return the cumulative package to `code_reviewer` because repository-resident durable E2E coverage will have been updated.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing E2E tests are valid scenarios but stale in filename fixtures/assertions/imports. No design or implementation reroute is required before updating durable coverage.
