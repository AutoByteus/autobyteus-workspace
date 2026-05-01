# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/done/cross-runtime-memory-persistence/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/done/cross-runtime-memory-persistence/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/done/cross-runtime-memory-persistence/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/done/cross-runtime-memory-persistence/design-review-report.md`
- Code review report requiring this local-fix round: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/done/cross-runtime-memory-persistence/review-report.md`

## What Changed

- Round 10 local fixes from the fresh source/architecture review:
  - `RunMemoryFileStore` construction is now read-only and no longer creates the target memory directory. Write paths continue to create parent directories at the point of write, and missing-run complete-corpus/include-archive reads now return empty results without mutating the memory tree.
  - Codex provider-boundary de-dupe now records the same thread/turn boundary window for stable-id events too, so `thread/compacted` and raw `type: "compaction"` surfaces with different stable-looking ids still emit one normalized boundary event.
  - Claude compaction boundary keys now include the source surface, keeping non-rotating `claude.status_compacting` provenance distinct from rotation-eligible `claude.compact_boundary` even when Claude reuses the same provider uuid/operation id.
- Implemented the shared segmented raw-trace archive kit in `autobyteus-ts/src/memory/store`:
  - `raw_traces.jsonl` remains the active raw-trace file.
  - `raw_traces_archive_manifest.json` plus immutable files under `raw_traces_archive/` now own archive storage.
  - `RunMemoryFileStore` is now the per-memory-directory facade for active raw traces, snapshots, full-corpus reads, and rotation/prune entrypoints.
  - `RawTraceArchiveManager` owns archive manifest reads/writes, pending/complete segment state, deterministic segment filenames, idempotent segment creation, and complete segment reads.
  - `raw-trace-archive-manifest.ts` defines the internal manifest and segment schema used by the archive manager.
- Refactored native memory storage to use the shared archive manager:
  - Native `FileMemoryStore` archive reads now go through complete segmented archive segments.
  - Native raw-trace pruning with archive enabled writes `boundary_type: "native_compaction"` archive segments instead of the old monolithic archive file.
  - Native `MemoryManager` behavior remains authoritative for Autobyteus semantic/episodic/snapshot compaction.
- Updated server memory storage/read paths to consume the shared primitives:
  - `RunMemoryWriter` remains a thin adapter over `RunMemoryFileStore`; sequence initialization reads active + complete archive segments so restored external runs do not reuse sequence numbers.
  - `AgentMemoryService`, server `MemoryFileStore`, run-history index/projection helpers, and memory view fixtures now read complete corpus data as complete archive segments + active records.
  - Complete-corpus reads ignore pending manifest entries, dedupe by raw trace `id` with active records preferred, and order by `ts`, `turn_id`, `seq`, then `id`.
  - Server index/read paths use facade methods for archive revision and corpus information rather than importing archive file names or scanning archive internals.
- Wired provider compaction boundary normalization and storage-only rotation:
  - Codex converter normalizes `thread/compacted` and raw Responses `type: "compaction"` items into `COMPACTION_STATUS` with a `provider_compaction_boundary` payload, with LRU boundary-key/window dedupe and `thread/compacted` preferred when it arrives first.
  - Codex de-dupe now covers thread-first, raw-first, repeated raw no-stable-id, and stable-id duplicate boundary cases within the converter window.
  - Claude session/converter normalizes SDK `status: "compacting"` as non-rotating provenance and `compact_boundary` as a rotation-eligible boundary.
  - Provider boundary marker parsing/writing/rotation moved into `ProviderCompactionBoundaryRecorder`, which suppresses duplicate boundary keys before appending a marker, retries marker-only/pending/no-complete replays by rotating from the existing marker, and cleans already-archived active records on complete-segment replays.
  - `RuntimeMemoryEventAccumulator` still does not update `working_context_snapshot.json` for provider markers, and rotates settled active records before the marker only when `rotation_eligible=true`.
  - `RunMemoryFileStore` repeat-boundary handling is now non-destructive: when a complete segment already exists for a boundary, it removes only records already archived from the full active file rather than dropping unarchived records that happen to precede a replayed marker.
- Preserved the existing cross-runtime recorder work:
  - `AgentRunMemoryRecorder` attaches/detaches as an `AgentRunManager` sidecar and skips `RuntimeKind.AUTOBYTEUS` so native memory remains authoritative.
  - Accepted user commands are captured through the internal `AgentRunCommandObserver` seam only after command acceptance.
  - Assistant text/reasoning/tool events are captured from normalized `AgentRunEvent`s, with segment and turn-completion flushing.
  - Claude team member `memoryDir` provisioning remains fixed for create/restore paths.
  - The Autobyteus-named projection fallback remains replaced by the runtime-neutral `LocalMemoryRunViewProjectionProvider`.

## Key Files Or Areas

- Shared memory/archive kit:
  - `autobyteus-ts/src/memory/store/memory-file-names.ts`
  - `autobyteus-ts/src/memory/store/raw-trace-archive-manifest.ts`
  - `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts`
  - `autobyteus-ts/src/memory/store/run-memory-file-store.ts`
  - `autobyteus-ts/src/memory/store/file-store.ts`
  - `autobyteus-ts/src/memory/index.ts`
- Server writer/recorder/accumulator:
  - `autobyteus-server-ts/src/agent-memory/domain/memory-recording-models.ts`
  - `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts`
  - `autobyteus-server-ts/src/agent-memory/services/provider-compaction-boundary-recorder.ts`
  - `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-payload.ts`
  - `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts`
  - `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts`
  - `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts`
  - `autobyteus-server-ts/src/agent-memory/services/agent-memory-index-service.ts`
  - `autobyteus-server-ts/src/agent-memory/services/team-memory-index-service.ts`
- Provider compaction conversion:
  - `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-name.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-raw-response-event-converter.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-name.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts`
- Run-history and memory projection readers:
  - `autobyteus-server-ts/src/run-history/services/agent-run-history-index-service.ts`
  - `autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-view-projection-provider.ts`
- Focused tests updated/added under:
  - `autobyteus-ts/tests/unit/memory/`
  - `autobyteus-server-ts/tests/unit/agent-memory/`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/events/`
  - `autobyteus-server-ts/tests/integration/agent-memory/`
  - `autobyteus-server-ts/tests/integration/run-history/`
  - `autobyteus-server-ts/tests/e2e/memory/`

## Important Assumptions

- Codex/Claude provider compaction is real provider/session metadata, but it is not local semantic compaction.
- Provider boundaries may only create storage-only provenance markers and rotate settled active records into shared archive segments; they must not create semantic/episodic memory, delete trace history, rewrite trace content, inject external memory, retrieve external memory, or instantiate native `MemoryManager`.
- `status: "compacting"` from Claude is non-rotating provenance; Claude `compact_boundary`, Codex `thread/compacted`, and Codex raw `type: "compaction"` items are rotation-eligible after converter normalization/dedupe.
- The old monolithic `raw_traces_archive.jsonl` is intentionally not a compatibility read/write target for this refactor.
- Pending archive manifest entries are retry state only and are not exposed to readers; complete-corpus readers include only `complete` segments plus active records.
- Accepted user-message turn resolution remains `result.turnId`, then active lifecycle turn, then deterministic `fallback-turn-N`.
- Assistant text and reasoning are accumulated by segment id and flushed on `SEGMENT_END`; any pending segment/reasoning content for a turn is flushed on `TURN_COMPLETED`.

## Known Risks

- Real Codex/Claude provider payload shapes may need small converter adjustments after live SDK/app-server validation. Unit tests cover the approved surfaces and expected normalization behavior.
- `ClaudeSession` remains close to the proactive source-file size guardrail (`497` effective non-empty lines). The accumulator was split for this local-fix round and remains `419` effective non-empty lines; future additions near these paths should still consider extraction first.
- Existing historical monolithic `raw_traces_archive.jsonl` files are not migrated or read by the new target path. This matches the no-compatibility design decision; historical inspection would need a separately approved migration if required.
- Segmented archives preserve the complete trace corpus but do not add compression, retention, or snapshot windowing. Those remain future storage-policy work.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.json --noEmit` remains unsuitable as a whole-project check because the repo `tsconfig.json` includes tests while `rootDir` is `src`, producing existing TS6059 errors. Build config checks were used instead.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - `RAW_TRACES_ARCHIVE_MEMORY_FILE_NAME` and source/test references to `raw_traces_archive.jsonl` were removed from active source/test paths.
  - Server `RunMemoryWriter` delegates archive rotation to shared `RunMemoryFileStore` instead of defining archive schema/file names independently.
  - No Codex/Claude recorder path calls native `MemoryManager` or native semantic compaction.
  - No provider boundary path prunes/deletes/reuses semantic memory; provider rotation moves settled active records into complete-corpus archive segments and leaves the boundary marker active.
  - Effective non-empty changed-source counts checked after Round 10: shared store facade `279`, raw-trace archive manager `182`, accumulator `419`, provider-boundary recorder `137`, Codex converter `338`, Claude converter `313`, Claude session `497`, writer `164`.
  - Archive filename constants and manifest schema exports were removed from the public memory index; archive file-name policy is now localized to `RawTraceArchiveManager`.
  - Guardrail grep now finds `raw_traces_archive` references only inside `RawTraceArchiveManager` under source/test paths.

## Environment Or Dependency Notes

- No new external dependencies were added.
- Existing Node built-ins (`node:crypto`, `node:fs`, `node:path`) are used in the shared file store.
- `pnpm -C autobyteus-server-ts run build` runs shared package builds, Prisma client generation, server build, and managed messaging asset copy.

## Local Implementation Checks Run

Implementation-scoped checks run from `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence`:

- Round 10 local-fix re-checks for CR-005/CR-006/CR-007:
  - `pnpm -C autobyteus-ts exec vitest run tests/unit/memory/run-memory-file-store.test.ts tests/unit/memory/raw-trace-archive-manager.test.ts tests/unit/memory/file-store.test.ts --reporter=dot` — passed (`3` files, `15` tests), including no-mutation missing-run complete-corpus read coverage.
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts tests/unit/agent-memory/agent-memory-service.test.ts tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts --reporter=dot` — passed (`5` files, `48` tests), including Codex different-stable-id same-window de-dupe, Claude same-uuid status-to-boundary identity separation, and server includeArchive no-mutation coverage.
  - `pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit && pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
  - `pnpm -C autobyteus-ts run build && pnpm -C autobyteus-server-ts run build` — passed.

- `pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-ts run build` — passed.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-ts exec vitest run tests/unit/memory/run-memory-file-store.test.ts tests/unit/memory/file-store.test.ts tests/unit/memory/compactor.test.ts` — passed (`3` files, `14` tests).
- `pnpm -C autobyteus-ts exec vitest run tests/unit/memory/file-store.test.ts tests/unit/memory/working-context-snapshot-store.test.ts tests/unit/memory/memory-manager.test.ts tests/unit/memory/memory-manager-working-context-snapshot-persistence.test.ts tests/unit/memory/run-memory-file-store.test.ts tests/unit/memory/compactor.test.ts` — passed (`6` files, `26` tests).
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-memory/run-memory-writer.test.ts tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts tests/unit/agent-memory/agent-memory-service.test.ts tests/unit/agent-memory/memory-file-store.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts tests/integration/run-history/memory-layout-and-projection.integration.test.ts tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` — passed (`8` files, `54` tests).
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-memory/run-memory-writer.test.ts tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts tests/unit/agent-memory/agent-run-memory-recorder.test.ts tests/unit/agent-memory/agent-memory-service.test.ts tests/unit/agent-memory/memory-file-store.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts tests/unit/run-history/projection/local-memory-run-view-projection-provider.test.ts tests/unit/run-history/projection/run-projection-provider-registry.test.ts tests/unit/agent-execution/agent-run-manager.test.ts tests/unit/agent-team-execution/team-run-runtime-context-support.test.ts tests/integration/agent-team-execution/claude-team-run-backend-factory.integration.test.ts tests/integration/run-history/memory-layout-and-projection.integration.test.ts tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` — passed (`14` files, `70` tests).
- Final focused re-check after marker metadata completion: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit && pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` — passed (`1` file, `6` tests for the Vitest portion).
- Final build: `pnpm -C autobyteus-server-ts run build` — passed.
- Guardrail grep: `grep -R "RAW_TRACES_ARCHIVE_MEMORY_FILE_NAME\|raw_traces_archive\.jsonl" -n autobyteus-ts/src autobyteus-server-ts/src autobyteus-ts/tests autobyteus-server-ts/tests` — no matches.

- Local-fix re-checks for code review findings CR-001/CR-002:
  - `pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
  - `pnpm -C autobyteus-ts exec vitest run tests/unit/memory/run-memory-file-store.test.ts` — passed (`1` file, `5` tests), including duplicate same-boundary replay preserving active+archive corpus.
  - `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` — passed (`2` files, `25` tests), including Codex thread-first/raw-first/repeated-raw/stable-id dedupe and accumulator duplicate-boundary no-loss behavior.
  - `pnpm -C autobyteus-server-ts run build` — passed.

- Round 9 ownership-split re-checks:
  - `pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
  - `pnpm -C autobyteus-ts exec vitest run tests/unit/memory/run-memory-file-store.test.ts tests/unit/memory/raw-trace-archive-manager.test.ts tests/unit/memory/file-store.test.ts` — passed (`3` files, `13` tests).
  - `pnpm -C autobyteus-ts run build` — passed.
  - `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts tests/e2e/memory/memory-view-graphql.e2e.test.ts` — passed (`4` files, `31` tests).
  - `pnpm -C autobyteus-server-ts run build` — passed.
  - `grep -R "raw_traces_archive\|RAW_TRACES_ARCHIVE" -n autobyteus-ts/src autobyteus-server-ts/src autobyteus-ts/tests autobyteus-server-ts/tests` — only `RawTraceArchiveManager` owns archive filename references.

- CR-003 re-checks:
  - `pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
  - `pnpm -C autobyteus-ts exec vitest run tests/unit/memory/run-memory-file-store.test.ts tests/unit/memory/raw-trace-archive-manager.test.ts tests/unit/memory/file-store.test.ts` — passed (`3` files, `14` tests), including stale pending archive retry coverage.
  - `pnpm -C autobyteus-ts run build` — passed.
  - `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` — passed (`2` files, `26` tests), including marker-only/no-complete provider-boundary replay retry coverage.
  - `pnpm -C autobyteus-server-ts run build` — passed.

## Downstream Validation Hints / Suggested Scenarios

- Run a live Codex session that reaches `thread/compacted` and/or raw Responses `type: "compaction"`; verify exactly one `provider_compaction_boundary` marker is written for a duplicate boundary window and settled records before the marker move to a complete archive segment.
- Run a live Claude session that emits `status: "compacting"` only; verify a marker/provenance event is recorded without active-file rotation.
- Run a live Claude session that emits `compact_boundary`; verify rotation creates a manifest entry + segment and leaves the boundary marker active.
- Exercise native Autobyteus compaction and confirm selected raw traces archive into segmented `boundary_type: "native_compaction"` segments while semantic/episodic/snapshot behavior remains native-owned.
- Query memory view/run-history projection for a run with archive segments plus active records; verify complete corpus ordering and dedupe are stable.
- Restore a Codex/Claude run with archive segments and active records, append new traces, and confirm per-turn sequence numbers continue above archived values.
- Inspect retry behavior by leaving a synthetic `pending` manifest entry; readers should ignore it, and a retry with the same boundary key should safely supersede pending state.

## API / E2E / Executable Validation Still Required

API/E2E and broader executable validation remain required and are owned by `api_e2e_engineer` after code review passes. The checks above are implementation-scoped local build/type/unit/narrow integration checks only.
