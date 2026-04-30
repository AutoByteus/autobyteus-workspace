# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/in-progress/cross-runtime-memory-persistence/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/in-progress/cross-runtime-memory-persistence/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/in-progress/cross-runtime-memory-persistence/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/in-progress/cross-runtime-memory-persistence/design-review-report.md`

## What Changed

- Added the shared low-level memory file kit in `autobyteus-ts/src/memory/store`:
  - `memory-file-names.ts` now owns canonical memory file names.
  - `run-memory-file-store.ts` now owns direct run/member memory-directory IO for raw traces, archive, semantic items, compacted manifest, and working-context snapshots.
- Refactored native `FileMemoryStore` to delegate common file/path operations to `RunMemoryFileStore` while preserving native `agentRootSubdir` behavior and native compaction/archive/semantic/manifest behavior.
- Updated native `WorkingContextSnapshotStore` to share the canonical snapshot file name.
- Added the internal accepted-command observer seam in `AgentRun` via `AgentRunCommandObserver`; observers are notified only after `postUserMessage(...)` returns `accepted: true`, and observer failures are isolated.
- Added storage-only Codex/Claude memory recording under `autobyteus-server-ts/src/agent-memory`:
  - `AgentRunMemoryRecorder` attaches/detaches with `AgentRunManager` active-run lifecycle.
  - `RuntimeMemoryEventAccumulator` converts accepted user commands and normalized `AgentRunEvent`s into durable raw traces and snapshot updates.
  - `RunMemoryWriter` remains a thin server adapter over `RunMemoryFileStore`, `RawTraceItem`, and shared working-context snapshot serialization primitives.
- Wired `AgentRunManager` to attach the recorder sidecar for active runs and skip native Autobyteus in the recorder.
- Fixed Claude team member memory-dir provisioning for create and restore paths so Claude team members have the same local member memory layout as Codex.
- Extended memory view domain/service/GraphQL conversion to expose raw trace `id` and `sourceEvent`.
- Replaced the Autobyteus-named local projection fallback with `LocalMemoryRunViewProjectionProvider`; fallback now reads explicit `source.memoryDir` by local directory basename and supports `reasoning` traces.
- Added compaction addendum behavior: Codex/Claude recorder paths ignore provider-internal compact/status/boundary-like payloads for local memory mutation. No server recorder path prunes, archives, or rewrites local raw traces based on provider compact/status/token/reasoning signals.
- Round 4 storage/rotation refinement required no source behavior change: the implementation intentionally does not add raw-trace rotation, chunking, timestamped active raw-trace replacement files, archive moves by size/time/turn/provider boundary, or opportunistic `working_context_snapshot.json` retention/windowing.
- Round 5 corrected Codex compaction handling in documentation/tests: Codex provider/session compaction is treated as real metadata (`thread/compacted`, Responses `type: "compaction"` items, `/responses/compact`, auto-compact limits), but still not as permission for local memory mutation.

## Key Files Or Areas

- Shared memory kit:
  - `autobyteus-ts/src/memory/store/memory-file-names.ts`
  - `autobyteus-ts/src/memory/store/run-memory-file-store.ts`
  - `autobyteus-ts/src/memory/store/file-store.ts`
  - `autobyteus-ts/src/memory/store/working-context-snapshot-store.ts`
  - `autobyteus-ts/src/memory/index.ts`
- Agent execution observer/lifecycle:
  - `autobyteus-server-ts/src/agent-execution/domain/agent-run-command-observer.ts`
  - `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
- Server recorder/writer:
  - `autobyteus-server-ts/src/agent-memory/domain/memory-recording-models.ts`
  - `autobyteus-server-ts/src/agent-memory/services/agent-run-memory-recorder.ts`
  - `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts`
  - `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-payload.ts`
  - `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts`
- Server memory readers/indexes:
  - `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts`
  - `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts`
  - `autobyteus-server-ts/src/agent-memory/services/agent-memory-index-service.ts`
  - `autobyteus-server-ts/src/agent-memory/services/team-memory-index-service.ts`
  - `autobyteus-server-ts/src/api/graphql/types/memory-view.ts`
  - `autobyteus-server-ts/src/api/graphql/converters/memory-view-converter.ts`
- Claude team memory layout parity:
  - `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-run-backend-factory.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/team-run-runtime-context-support.ts`
- Run-history projection:
  - removed `autobyteus-server-ts/src/run-history/projection/providers/autobyteus-run-view-projection-provider.ts`
  - added `autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-view-projection-provider.ts`
  - `autobyteus-server-ts/src/run-history/projection/run-projection-provider-registry.ts`
  - `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts`
  - `autobyteus-server-ts/src/run-history/services/agent-run-history-index-service.ts`
- Added/updated focused tests in `autobyteus-ts/tests/unit/memory` and `autobyteus-server-ts/tests/unit` / `tests/integration` around the changed code paths.

## Important Assumptions

- Codex/Claude persistence is storage-only projection, not runtime memory injection; the recorder never creates or uses native `MemoryManager` for these runtimes.
- Native Autobyteus compaction remains native-owned. Native code may continue emitting `COMPACTION_STATUS`, writing compacted memory/snapshot state, and pruning selected local raw trace ids through native memory paths.
- Codex provider/session compaction paths are real metadata, not absent. Current local-safe behavior is still non-destructive: `thread/compacted`, Responses `type: "compaction"` items, `/responses/compact` output, auto-compact limit metadata, token usage, reasoning summaries, opaque raw events, and provider-internal compact/status/boundary signals must not delete, prune, rewrite, archive, semantically compact, or inject local memory.
- If future work persists provider compaction markers, it should be append-only/non-destructive and normalized at the Codex/Claude converter boundary; the memory recorder should not parse provider raw event formats directly.
- Long-running Codex/Claude active raw-trace growth and working-context snapshot growth are accepted future storage/log-retention concerns. This change keeps the current single active `raw_traces.jsonl` plus existing archive semantics and does not create chunks or timestamped replacement active files.
- Accepted user-message turn resolution uses `result.turnId`, then active lifecycle turn, then deterministic `fallback-turn-N`.
- Tool event turn resolution uses active turn/fallback rules and de-duplicates by invocation id when present.
- Assistant text and reasoning are accumulated by segment id and flushed on `SEGMENT_END`; any still-pending segment/reasoning content for a turn is flushed on `TURN_COMPLETED`.
- AgentMemoryService snapshot compatibility is exercised through its parser against snapshots written by `RunMemoryWriter`.

## Known Risks

- If an external runtime emits an accepted user command after a full lifecycle has already completed and no command result turn id exists, the recorder may use a deterministic fallback rather than the completed turn. The covered Claude risk is lifecycle start before command notification.
- Anonymous tool events without invocation ids can only be paired deterministically by local FIFO fallback; unrelated anonymous calls from a runtime could be ambiguous.
- The recorder logs and skips recordable runtimes when `memoryDir` is missing; the Claude team path was fixed, but any future factory path must still provide `memoryDir`.
- Very long Codex/Claude runs can still create large active `raw_traces.jsonl` and `working_context_snapshot.json` files. This is explicitly out of current scope per Round 4 and should be handled by a future storage/rotation design that updates all readers/projections/indexers over the complete chronological corpus.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.json --noEmit` is not a usable whole-project check in the current repo state because `tsconfig.json` includes `tests` while `rootDir` is `src`, producing TS6059 for test files outside rootDir. The build config and package build were used instead.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - Removed `AutobyteusRunViewProjectionProvider` and its test; replaced with `LocalMemoryRunViewProjectionProvider`.
  - No public user-message stream event was added.
  - No Codex/Claude `MemoryManager` wrapper was introduced.
  - Server recorder code does not call `RunMemoryFileStore.pruneRawTracesById(...)` or other archive/rewrite operations for provider compact/status/boundary signals. It reads archive traces only to continue per-turn sequence numbers across restore.
  - Server recorder code does not parse Codex provider raw compaction formats directly. The focused accumulator test now includes Codex-like `thread/compacted` / `type: "compaction"` metadata only as a non-mutating payload.
  - No raw-trace rotation/chunking/snapshot-retention policy was introduced: no timestamped active replacement files, no moves to archive/chunks by size/time/turn count/provider boundary, and no opportunistic snapshot truncation/windowing.
  - Changed source-file effective non-empty line counts checked: accumulator 409, payload helper 50, writer 134, recorder 121, shared store 179, `AgentRunManager` 214, `AgentRun` 103.

## Environment Or Dependency Notes

- No new external dependencies were added.
- `pnpm install --offline --ignore-scripts` was run earlier to restore local workspace dependencies for checks.
- `pnpm -C autobyteus-server-ts run build` runs `prepare:shared`, including `autobyteus-ts` build, application SDK contract/backend SDK builds, Prisma client generation, server build, and managed messaging asset copy.

## Local Implementation Checks Run

Implementation-scoped checks run from `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence`:

- `pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-ts run build` — passed.
- `pnpm -C autobyteus-ts exec vitest run tests/unit/memory/file-store.test.ts tests/unit/memory/working-context-snapshot-store.test.ts tests/unit/memory/memory-manager.test.ts tests/unit/memory/memory-manager-working-context-snapshot-persistence.test.ts tests/unit/memory/run-memory-file-store.test.ts` — passed (`5` files, `22` tests).
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-memory/run-memory-writer.test.ts tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts tests/unit/agent-memory/agent-run-memory-recorder.test.ts tests/unit/run-history/projection/local-memory-run-view-projection-provider.test.ts tests/unit/run-history/projection/run-projection-provider-registry.test.ts tests/unit/agent-execution/agent-run-manager.test.ts tests/unit/agent-team-execution/team-run-runtime-context-support.test.ts tests/integration/agent-team-execution/claude-team-run-backend-factory.integration.test.ts tests/integration/run-history/memory-layout-and-projection.integration.test.ts tests/unit/agent-memory/agent-memory-service.test.ts tests/unit/agent-memory/memory-file-store.test.ts` — passed (`11` files, `42` tests).
- `pnpm -C autobyteus-server-ts run build` — passed.
- Guardrail searches:
  - `grep` found no `MemoryManager` / `CodexMemoryManager` / `ClaudeMemoryManager` references in server runtime recording paths.
  - `grep` found memory file-name string literals only in `autobyteus-ts/src/memory/store/memory-file-names.ts` under source paths.
  - `grep` found no server recorder destructive prune/archive rewrite calls; only archive read for sequence initialization.
  - Round 4 grep review found no recorder/writer storage rotation, timestamped active-file replacement, archive chunking, or provider-boundary-driven retention behavior added. The only `chunk` matches in runtime source are provider stream/payload chunk names, not memory-file chunks.
- Round 5 focused re-check after adding Codex-like compaction metadata to the non-mutation test:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` — passed (`1` file, `5` tests).
- Non-pass check recorded for transparency: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.json --noEmit` fails with TS6059 because tests matched by `tsconfig.json` are outside `rootDir: src`; this appears to be an existing config shape, not a failure of the implementation build config.

## Downstream Validation Hints / Suggested Scenarios

- Create/send a standalone Codex run and verify `raw_traces.jsonl` and `working_context_snapshot.json` are written without requiring a WebSocket client.
- Create/send a standalone Claude run and verify accepted user, assistant text/reasoning, tool call/result, and missing turn-id fallback behavior in memory files.
- Create a Claude team run and verify member memory lands under `memory/agent_teams/<teamRunId>/members/<memberRunId>/` on create and restore paths.
- Verify native Autobyteus memory behavior still emits compaction status and can prune/archive local raw trace ids through native memory compaction, while Codex/Claude provider compact/status payloads do not prune/archive/rewrite local raw traces.
- Verify Codex provider compaction metadata, if later exposed by converter work, is either ignored/log-only or persisted through a separately approved append-only marker schema; it must not be parsed directly by the memory recorder or used for destructive local memory mutation.
- During long-run smoke coverage, verify this change still writes the canonical active `raw_traces.jsonl`/`working_context_snapshot.json` files only and does not create timestamped active replacements or chunk files.
- Query memory view GraphQL and verify raw traces expose `id` and `sourceEvent` and snapshots parse via `AgentMemoryService`.
- Exercise run-history projection fallback with `source.memoryDir` whose basename differs from provider/platform run id; projection should use local memory basename but return projection for the requested source run id.

## API / E2E / Executable Validation Still Required

API/E2E and broader executable validation remain required and are owned by `api_e2e_engineer` after code review passes. The checks above are implementation-scoped local build/type/unit/narrow integration checks only.
