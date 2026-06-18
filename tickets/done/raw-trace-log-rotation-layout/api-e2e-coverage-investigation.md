# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-log-rotation-layout/tickets/in-progress/raw-trace-log-rotation-layout/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-log-rotation-layout/tickets/in-progress/raw-trace-log-rotation-layout/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-log-rotation-layout/tickets/in-progress/raw-trace-log-rotation-layout/design-spec.md`
- Design Rework Response: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-log-rotation-layout/tickets/in-progress/raw-trace-log-rotation-layout/design-rework-response-round-1.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-log-rotation-layout/tickets/in-progress/raw-trace-log-rotation-layout/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-log-rotation-layout/tickets/in-progress/raw-trace-log-rotation-layout/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-log-rotation-layout/tickets/in-progress/raw-trace-log-rotation-layout/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review Round 2 pass requested API/E2E coverage investigation and execution, especially startup migration orchestration and cross-runtime native/Codex/Claude memory persistence paths.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior changes raw trace rotated segment storage from an archive subdirectory layout to a log-rotation-style raw trace file family directly under the run memory directory. New writes must create `raw_traces_manifest.json` plus `raw_traces_<zero-padded-index>.jsonl` next to the active `raw_traces.jsonl`; they must not create new segment files under `raw_traces_archive/` or write the old `raw_traces_archive_manifest.json`. Runtime writer paths for native/AutoByteus compaction, Codex provider compaction, and Claude compact boundaries must continue to use the shared `RawTraceArchiveManager`/`RunMemoryFileStore` boundary.

The manifest remains authoritative for segment order/status, `boundary_key`, boundary type, timestamps, and record count. Boundary idempotency must continue to use manifest `boundary_key`, and full raw trace corpus reads must continue to merge rotated records plus active `raw_traces.jsonl` in stable order. Old-layout reads are required as data-read safety, not as a new-write compatibility fork. A required startup app-data migration must convert old `raw_traces_archive_manifest.json` + `raw_traces_archive/` layouts into the new layout; complete entries migrate, pending entries are excluded and backed up if present, missing pending files do not fail, missing complete files fail only that run, and successful migrations decommission original old authoritative manifests so reruns are idempotent.

Implementation handoff `Legacy / Compatibility Removal Check` was reviewed. It reports no old-layout new writes, required data-read safety only for old layout reads, old manifest decommission after migration, and the CR-001 partial-state fix. Static inspection of the implementation and tests matches that report.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| New rotated raw trace segment path | Changed | REQ-001, REQ-002, AC-001, design DS-001..DS-003 | Execute archive manager and file-store tests proving direct run-dir `raw_traces_<index>.jsonl` files and no new `raw_traces_archive/` creation. |
| New raw trace manifest path | Changed | REQ-003, AC-002, design intended change | Execute archive manager/file-store tests and migration tests proving `raw_traces_manifest.json` is used. |
| Active `raw_traces.jsonl` path | Preserved | REQ-004 | Execute file-store/full-corpus and memory-service/projection tests to prove active+rotated complete-history semantics remain stable. |
| Manifest metadata and boundary-key idempotency | Preserved | REQ-005, REQ-006, AC-007, code review | Execute focused archive manager/store tests and provider runtime tests. |
| Full corpus reads from rotated plus active records | Preserved | REQ-007, AC-004..AC-006 | Execute `autobyteus-ts` store tests plus server memory service/projection/cross-runtime tests. |
| Runtime writer coverage through shared manager: native, Codex, Claude | Changed physical layout; preserved runtime semantics | REQ-008, AC-014, design DS-001..DS-003 | Execute native/provider file-store coverage, runtime memory accumulator, and cross-runtime memory persistence integration tests. |
| Old-layout read fallback | Added/preserved as data-read safety | REQ-009, UC-006, design compatibility rationale | Existing archive-manager old-layout read test remains valid. Execute it; do not add compatibility-only coverage beyond required data-read safety. |
| Required startup app-data migration | Added | REQ-010..REQ-017, AC-008..AC-018, design DS-005 | Execute raw trace migration unit tests, app-data migration runner tests, and a temporary runner orchestration probe that invokes the raw trace migration through `AppDataMigrationRunner.runPending()`. |
| Original old manifest/old archive evidence after successful migration | Removed/decommissioned | REQ-016, AC-015..AC-017, design rework DR-001 | Execute migration tests including partial cleanup and CR-001 regression. |
| Pending-entry migration policy | Added/clarified | REQ-017, AC-018, design rework DR-002 | Execute migration pending/missing coverage. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/memory/raw-trace-archive-manager.test.ts` — direct rotated files and manifest authority | New `archiveRecords` writes `raw_traces_<index>.jsonl` directly under run dir, writes `raw_traces_manifest.json`, does not create old archive dir/manifest, preserves full boundary key, and replay is idempotent. | REQ-001..REQ-006, AC-001..AC-003, AC-007, design DS-001..DS-003 | Still Valid | Inspected test assertions match the approved current behavior and were code-review passed. | Execute. |
| `autobyteus-ts/tests/unit/memory/raw-trace-archive-manager.test.ts` — old-layout fallback and pending handling | Reads old manifest + old archive segment files when no new manifest exists; ignores pending entries; stale pending is superseded on retry. | REQ-003, REQ-009, AC-004, AC-005, design DS-004 and data-read safety rationale | Still Valid | Old-layout read fallback is explicitly required; pending complete-read behavior is unchanged. | Execute. |
| `autobyteus-ts/tests/unit/memory/run-memory-file-store.test.ts` — native prune path | Native compaction/prune writes a direct rotated raw trace segment, no old archive dir, and archive reads remain correct. | UC-001, REQ-001, REQ-002, REQ-008, AC-001, AC-014 | Still Valid | Test reaches public store path through shared manager. | Execute. |
| `autobyteus-ts/tests/unit/memory/run-memory-file-store.test.ts` — provider boundary and corpus path | Provider boundary rotation writes direct segment, no old archive dir, complete corpus ordering and same-boundary replay remain correct. | UC-002/UC-003, REQ-006..REQ-008, AC-006, AC-007, AC-014 | Still Valid | Test exercises provider boundary path at `RunMemoryFileStore` boundary. | Execute. |
| `autobyteus-server-ts/tests/unit/app-data-migrations/raw-trace-rotation-layout-migration.test.ts` | Migration converts standalone and nested team old layouts; skips already-new layout; isolates missing complete failures; excludes/backs up pending entries; cleans partial old+new states; covers CR-001 runtime-write-before-migration regression. | REQ-010..REQ-017, AC-008..AC-018, design DS-005, DR-001/DR-002 | Still Valid | Inspected test covers the specific migration policies and CR-001 fix from code review. | Execute. |
| `autobyteus-server-ts/tests/unit/app-data-migrations/app-data-migration-runner.test.ts` | Generic app-data migration runner rejects duplicates, retries stale running records, lists registered definitions. | REQ-010, REQ-015, AC-013 | Still Valid | Tests runner semantics used by startup migrations but not the raw trace migration specifically. | Execute as runner coverage; supplement with temporary raw-trace runner probe. |
| `autobyteus-server-ts/tests/unit/app-data-migrations/*` | Existing app-data migration suite validates framework and other required migrations still pass with registry/import changes. | AC-013 and migration subsystem regression | Still Valid | Code review ran the full unit migration suite; this remains relevant for registry sequencing/build health. | Execute. |
| `autobyteus-server-ts/tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` | Provider compaction markers rotate settled active traces into segmented archives, dedupe replay, and retry from marker-only state. | UC-002/UC-003, REQ-006..REQ-008, AC-014 | Still Valid | Server recorder semantics remain current; physical layout is owned below by shared store manager. | Execute. |
| `autobyteus-server-ts/tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | Codex compaction and Claude status/compact-boundary flows persist memory through realistic runtime manager/converter/recorder setup. | UC-002/UC-003, REQ-008, AC-014 | Still Valid | Existing integration exercises Codex and Claude runtime persistence paths; selected for broader executable coverage. | Execute. |
| `autobyteus-server-ts/tests/unit/agent-memory/agent-memory-service.test.ts` — includeArchive complete corpus | Server memory service reads rotated/archive segments plus active traces. | UC-004, REQ-007, AC-006 | Still Valid | Valid higher-level read API coverage and relevant to old/new physical layout not leaking to service callers. | Execute. |
| `autobyteus-server-ts/tests/integration/run-history/memory-layout-and-projection.integration.test.ts` — projection after provider boundary rotation | Run-history projection reads archived/rotated plus active raw traces and compaction activity. | UC-004, REQ-007, AC-006 | Still Valid | Valid integration-level memory projection coverage. | Execute. |
| `autobyteus-server-ts/tests/e2e/memory/*` and broader browser/GraphQL suites | Memory GraphQL/UI behavior, live E2E surfaces. | Indirect relation to memory read APIs | Out Of Scope | This ticket changes internal filesystem layout and startup migration, not GraphQL schema/browser contract. Selected service/projection/runtime integration tests cover relevant executable boundaries with less external flake. | Do not execute. |
| `autobyteus-server-ts/tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` | Live Codex memory persistence. | Indirect to Codex runtime path | Out Of Scope for this round | Cross-runtime integration exercises local Codex converter/manager persistence without live external process cost; physical layout is shared manager-owned. | Do not execute. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None found during API/E2E investigation | N/A | Code-review-passed implementation already updated old-layout new-write expectations before this stage. | Code review report and static inspection of relevant tests. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None | N/A | Existing code-review-passed durable coverage covers runtime store, migration policies, and provider persistence. Startup orchestration can be validated by temporary executable probe without adding repository-resident coverage in API/E2E. | N/A | No durable coverage change is needed after code review. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | Existing durable coverage was updated before code review. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TV-001 | Run focused `autobyteus-ts` archive manager and file-store Vitest tests. | New layout writes, old fallback reads, idempotency, native/provider store paths, full corpus ordering. | These are existing durable tests; no temporary repo changes. |
| TV-002 | Run server app-data migration unit suite. | Raw trace migration policies plus existing migration framework regressions. | Existing durable tests; no temporary repo changes. |
| TV-003 | Run server provider/runtime and memory read integration/unit tests. | Codex/Claude persistence paths, provider accumulator, memory service/projection reads. | Existing durable tests; no temporary repo changes. |
| TV-004 | Temporary `/tmp` TypeScript probe invoking `AppDataMigrationRunner.runPending()` with `RawTraceRotationLayoutMigration` and an in-memory repository against an old-layout fixture. | Startup migration orchestration calls the required migration through the runner, records a succeeded status/log, migrates old layout, and does not rerun once succeeded. | This composes already-durable runner and raw trace migration behavior for this handoff; adding a repository test would be redundant and would require post-API/E2E code review. |
| TV-005 | Run `autobyteus-ts` and `autobyteus-server-ts` builds. | Source compilation/runtime dependency verification and server smoke build remain clean. | Build validation only. |
| TV-006 | Run `git diff --check`, source `rg` checks, and status review. | Whitespace clean; old/new layout references match intended scope; no unexpected API/E2E source changes. | Repository hygiene only. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live external Codex/Claude process E2E | The layout change is owned by local shared storage; provider converters/managers are exercised by local integration tests without external provider dependencies. | Low. External provider behavior does not own segment path/name creation. | None. |
| Browser/GraphQL memory explorer E2E | No public API/schema/UI contract changed; service/projection tests cover read semantics. | Low. | None. |
| Concurrent migration/runtime writes | Not newly specified; CR-001 runtime-before-migration partial state is covered. True concurrent filesystem race is outside current requirements. | Low/pre-existing. | None. |
| `pnpm --filter autobyteus-server-ts typecheck` | Implementation handoff and code review identify pre-existing TS6059 rootDir/tests configuration issue; server build compiles source via `tsconfig.build.json`. | Low for source correctness because `pnpm --filter autobyteus-server-ts build` is selected. | None for this ticket. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified | N/A | Requirements, reworked design, implementation handoff, code review Round 2, and static inspection align. No old-layout new-write branch or unresolved migration cleanup gap observed. | N/A |

## Execution Plan

1. Execute focused `autobyteus-ts` memory tests: `pnpm --filter autobyteus-ts exec vitest run tests/unit/memory/raw-trace-archive-manager.test.ts tests/unit/memory/run-memory-file-store.test.ts`.
2. Execute server app-data migration and runtime/memory coverage: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/app-data-migrations tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts tests/unit/agent-memory/agent-memory-service.test.ts tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts tests/integration/run-history/memory-layout-and-projection.integration.test.ts`.
3. Run temporary startup orchestration probe from `/tmp` that composes `AppDataMigrationRunner.runPending()` with `RawTraceRotationLayoutMigration`.
4. Run `pnpm --filter autobyteus-ts build` and `pnpm --filter autobyteus-server-ts build`.
5. Run `git diff --check`, `rg` source/reference checks, final status review, and write the execution coverage report.
6. If no repository-resident durable coverage is changed in API/E2E, route to `delivery_engineer`; otherwise route back to `code_reviewer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing reviewed durable coverage is sufficient. API/E2E will supplement it with a temporary startup runner orchestration probe and broader runtime/persistence executions without repository-resident coverage edits.
