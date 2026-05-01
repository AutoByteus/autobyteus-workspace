# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete on 2026-05-01.
- Current Status: No-migration clarification incorporated on 2026-05-01 after superseding the initial raw-rewrite sanitization response to `AR-001`; package prepared for architecture re-review.
- Investigation Goal: Determine whether remaining memory-domain `tags`/`reference` metadata has concrete consumers and define a clean current-schema removal plan.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: Multiple memory models, compaction normalization/snapshot paths, server runtime-memory recording paths, provider-boundary archive behavior, tests, and docs are touched, but the behavior change is a bounded schema cleanup.
- Scope Summary: Remove remaining memory-domain `tags`, semantic `reference`, and raw tool-result reference metadata from current schemas/writers while preserving compaction, restore, archive, provider-boundary, inspection, and run-history behavior.
- Primary Questions Resolved:
  - Remaining semantic/episodic/raw trace `tags` and semantic `reference` fields have no active retrieval/UI/runtime consumer.
  - Raw trace tag meanings are already carried by explicit trace fields or archive manifest fields.
  - Stale semantic records with `reference`/`tags` should be schema-gated/reset under a compacted-memory schema version bump.
  - `toolResultRef` has no current producer/owner and should be included in the cleanup.
  - Raw trace prune/archive rewrite paths copy raw dictionaries today; after architecture clarification, this ticket must not add migration/scrubbing code for stale raw/episodic files. Current writes stop producing removed fields, while stale historical bytes are not a supported current schema and are not migrated.

## Request Context

The initial request noted that compactor-facing `tags` and `reference` were removed in the completed agent-based compaction ticket, then asked why similar fields still exist in lower-level memory code. The request framed those fields as low-value unless a concrete consumer exists and asked for a refactoring ticket to remove them across the memory schema/codebase where appropriate. The initial bootstrap stopped before deeper investigation so a later software-engineering pass could continue from the ticket artifacts. The current continuation request authorized proceeding from the bootstrapped ticket.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `<TASK_WORKTREE>`.
- Task Artifact Folder: `<TASK_WORKTREE>/tickets/in-progress/remove-memory-tags-reference`.
- Current Branch: `codex/remove-memory-tags-reference`.
- Current Worktree / Working Directory: `<TASK_WORKTREE>`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch origin --prune` succeeded during bootstrap and again during continuation on 2026-05-01.
- Task Branch: `codex/remove-memory-tags-reference`.
- Expected Base Branch (if known): `origin/personal`.
- Expected Finalization Target (if known): `personal`.
- Current Worktree Commit: `2919e6d2`.
- Current Tracked Base Observation: `origin/personal` was `2919e6d2` during continuation verification and later observed at `5995fd8f`; ticket branch is behind tracked base and must be refreshed during final integration.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Ticket artifacts intentionally use `<TASK_WORKTREE>` / `<SHARED_CHECKOUT>` placeholders in durable prose to avoid machine/operator-specific path leakage. Handoff messages still include absolute artifact paths per team visibility rules.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-01 | Command | `git status --short --branch`; `git rev-parse --short HEAD`; `git rev-parse --short origin/personal` | Pre-handoff base observation | Worktree remains at `2919e6d2`; tracked `origin/personal` is `5995fd8f`, so branch is behind by four commits. Record for downstream integration; no design rework was indicated by this observation. | No |
| 2026-05-01 | Command | `git status --short --branch`; `git remote -v`; `git rev-parse --short HEAD`; `git rev-parse --short origin/personal` | Establish starting environment in shared checkout | Shared checkout on `personal` at `2919e6d2`, tracking `origin/personal`; unrelated untracked `docs/future-features/` exists | No |
| 2026-05-01 | Spec | `solution-designer/design-principles.md` | Required shared design reference | Applied spine-first ownership, authoritative boundary, reusable owned structure, and no-backward-compatibility rules to this design | No |
| 2026-05-01 | Spec | `solution-designer/references/design-examples.md` | Concrete shape guidance for runtime/schema design | Used examples to shape primary/event/bounded-local spines and avoid helper/compatibility anti-patterns | No |
| 2026-05-01 | Command | `git fetch origin --prune` | Refresh tracked remote base before worktree creation | Fetch succeeded | No |
| 2026-05-01 | Command | `git worktree add -b codex/remove-memory-tags-reference <TASK_WORKTREE> origin/personal` | Create mandatory dedicated ticket worktree/branch | Worktree created at `2919e6d2` and branch tracks `origin/personal` | No |
| 2026-05-01 | Command | `git status --short --branch`; `pwd`; `git rev-parse --show-toplevel`; `git fetch origin --prune`; `git worktree list --porcelain` | Continuation bootstrap verification | Current worktree is the dedicated ticket worktree on `codex/remove-memory-tags-reference`; at verification time `HEAD` and `origin/personal` were both `2919e6d2`; ticket artifacts are untracked | No |
| 2026-05-01 | Command | `rg -n "\\b(reference|tags|toolResultRef|tool_result_ref)\\b" autobyteus-ts/src/memory autobyteus-server-ts/src/agent-memory autobyteus-ts/tests/unit/memory autobyteus-ts/tests/integration/agent/memory-compaction* autobyteus-server-ts/tests/unit/agent-memory autobyteus-ts/docs/agent_memory_design*.md autobyteus-server-ts/docs/modules/agent_memory.md -S` | Identify in-scope metadata references | Remaining memory-domain references are localized to memory models, compaction normalizer/compactor/snapshot/digest code, native/server recorder writes, focused tests, and memory docs | Implementation should update this exact surface |
| 2026-05-01 | Command | `rg -n "MemoryTraceEvent|rawTraces \\{|rawTraces\\?|sourceEvent|correlationId|tags" autobyteus-server-ts/src/api/graphql autobyteus-web/types autobyteus-web/graphql autobyteus-web/components/memory autobyteus-server-ts/src/run-history -S` | Check API/frontend/run-history consumers | GraphQL raw trace DTO exposes `id`, `traceType`, `sourceEvent`, content/tool/media/turn/seq/ts fields; frontend queries/types currently omit `id`/`sourceEvent` and do not expose `tags`; run-history fallback projection consumes trace type/tool fields, not tags | No tag consumer found |
| 2026-05-01 | Command | `pnpm --filter autobyteus-ts exec vitest run ... --runInBand` | Attempt focused memory tests for baseline | Failed before running tests: `Command "vitest" not found` because ticket worktree dependencies are not installed | Implementation/API-E2E should run tests in a prepared dependency environment |
| 2026-05-01 | Code | `autobyteus-ts/src/memory/models/semantic-item.ts` | Inspect semantic model | `reference`/`tags` are part of options, instance state, `toDict`, `isSerializedDict`, and `fromDict`; validation currently accepts them | Remove fields; tighten `isSerializedDict`; schema-gate stale records |
| 2026-05-01 | Code | `autobyteus-ts/src/memory/models/episodic-item.ts` | Inspect episodic model | `tags` are part of options/state/serialization/deserialization; no other current consumer found | Remove field and related tests/docs |
| 2026-05-01 | Code | `autobyteus-ts/src/memory/models/raw-trace-item.ts` | Inspect raw trace model | `tags` and `toolResultRef` are part of options/state/serialization/deserialization | Remove fields; keep explicit provenance/tool fields |
| 2026-05-01 | Code | `autobyteus-ts/src/memory/compaction/compaction-response-parser.ts` | Confirm compactor-facing parser contract | Parser reads only `fact` from each semantic entry and intentionally ignores stale `reference`/`tags` from model output | Preserve facts-only parser behavior |
| 2026-05-01 | Code | `autobyteus-ts/src/memory/compaction/compaction-result-normalizer.ts` | Inspect normalized compaction result shape | Normalizer emits `reference: null` and `tags: []` even though compactor result is facts-only | Remove redundant normalized fields |
| 2026-05-01 | Code | `autobyteus-ts/src/memory/compaction/compactor.ts` | Inspect persistence of compaction output | Compactor writes episodic `tags: []` and passes semantic `reference`/`tags` into `SemanticItem` | Remove pass-through and construct simplified items |
| 2026-05-01 | Code | `autobyteus-ts/src/memory/compaction-snapshot-builder.ts` | Inspect LLM snapshot rendering | Semantic line renderer appends `(ref: ...)` when `SemanticItem.reference` exists | Remove reference rendering; fact line only |
| 2026-05-01 | Code | `autobyteus-ts/src/memory/retrieval/retriever.ts`; `autobyteus-ts/src/memory/retrieval/memory-bundle.ts` | Check retrieval consumers | Retrieval uses episodic/semantic arrays and sorts semantic by `salience` then `ts`; no tag/reference consumer | Confirms removal does not affect retrieval logic |
| 2026-05-01 | Code | `autobyteus-ts/src/memory/restore/compacted-memory-schema-gate.ts`; `autobyteus-ts/src/memory/store/compacted-memory-manifest.ts`; `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` | Check stale semantic handling owner | Schema gate already resets stale semantic memory and invalidates snapshots when `SemanticItem.isSerializedDict` fails; version currently `2` | Bump version and make removed semantic metadata fail current schema validation |
| 2026-05-01 | Code | `autobyteus-ts/src/memory/memory-manager.ts` | Inspect native recorder writes | Native writes raw tags `processed`, `boundary`, `final`; these map to `traceType`/`sourceEvent` already | Remove tag writes |
| 2026-05-01 | Code | `autobyteus-server-ts/src/agent-memory/domain/memory-recording-models.ts`; `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts` | Inspect server runtime-memory write boundary | `RuntimeMemoryTraceInput` accepts `tags` and `toolResultRef`; writer passes them to `RawTraceItem` | Remove input fields and pass-through |
| 2026-05-01 | Code | `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts`; `autobyteus-server-ts/src/agent-memory/services/provider-compaction-boundary-recorder.ts` | Inspect external runtime recorder/providery boundary writes | Accumulator writes `accepted`/`final` tags; provider recorder writes provider/boundary tags. Provider boundary rotation uses `correlationId` and archive boundary input, not tags | Remove tag arrays; preserve explicit fields/toolResult payload |
| 2026-05-01 | Code | `autobyteus-ts/src/memory/store/run-memory-file-store.ts`; `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | Inspect archive and rotation ownership | Archive segment identity/metadata live in manifest fields: `boundary_type`, `boundary_key`, `boundary_trace_id`, `runtime_kind`, `source_event`; active marker lookup uses `correlation_id` and `trace_type` | Raw trace tags are redundant for archive behavior |
| 2026-05-01 | Code | `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts`; `autobyteus-server-ts/src/api/graphql/types/memory-view.ts`; `autobyteus-server-ts/src/api/graphql/converters/memory-view-converter.ts` | Inspect memory inspection DTO | Domain/GraphQL raw trace view does not include `tags` or `correlationId`; includes `id` and `sourceEvent`; converter maps explicit fields | No API tag consumer |
| 2026-05-01 | Code | `autobyteus-web/types/memory.ts`; `autobyteus-web/graphql/queries/*Memory*`; `autobyteus-web/components/memory/RawTracesTab.vue` | Inspect frontend memory UI | Frontend raw trace view displays trace type/content/tool/media only; no `tags`, `reference`, or `tool_result_ref` | No frontend consumer |
| 2026-05-01 | Code | `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Inspect local-memory run-history projection | Projection uses trace type, content, media, tool fields, ts; provider-boundary markers are ignored by type; no tags | Run-history unaffected by tag removal |
| 2026-05-01 | Code | `autobyteus-ts/src/memory/compaction/tool-result-digest-builder.ts`; `autobyteus-ts/src/memory/compaction/tool-result-digest.ts`; `autobyteus-ts/src/memory/compaction/compaction-task-prompt-builder.ts` | Resolve `toolResultRef` question | Digest exposes `reference` only from `trace.toolResultRef`; prompt includes optional `ref=...`; no current writer populates `toolResultRef` | Include `toolResultRef` in removal |
| 2026-05-01 | Doc | `autobyteus-ts/docs/agent_memory_design.md`; `autobyteus-ts/docs/agent_memory_design_nodejs.md`; `autobyteus-server-ts/docs/modules/agent_memory.md` | Inspect current docs | Docs still list raw `tags`, `tool_result_ref`, episodic tags, semantic reference/tags, and tag-bearing examples | Update docs with simplified schema |

## Current Behavior / Current Flow

### Native semantic/episodic compaction flow

1. Runtime code records raw traces through `MemoryManager` into `RawTraceItem` and `MemoryStore`.
2. `PendingCompactionExecutor` / request assembly asks `Compactor` to compact eligible blocks.
3. `CompactionResponseParser` returns a `CompactionResult` whose semantic entries contain only `fact`.
4. `CompactionResultNormalizer` currently adds category, fact, `reference: null`, `tags: []`, salience, id, and ts.
5. `Compactor` currently writes an `EpisodicItem` with `tags: []` and `SemanticItem`s with `reference`/`tags` pass-through.
6. `Retriever` later returns episodic/semantic items; `CompactionSnapshotBuilder` renders semantic fact lines and currently appends `(ref: ...)` if a stale/current `reference` exists.

### Runtime-memory recording flow for non-native runtimes

1. `AgentRunMemoryRecorder` attaches `RuntimeMemoryEventAccumulator` to Codex/Claude runs with a memory directory.
2. `RuntimeMemoryEventAccumulator` maps accepted commands and normalized run events to `RuntimeMemoryTraceInput`s plus optional working-context snapshot updates.
3. `RunMemoryWriter` creates `RawTraceItem`s and appends them via `RunMemoryFileStore`.
4. Provider compaction status events go through `ProviderCompactionBoundaryRecorder`; rotation uses marker trace id plus archive boundary input.
5. `AgentMemoryService`, GraphQL, frontend memory UI, and run-history fallback projections read the explicit raw-trace fields.

### Restore/bootstrap flow

1. `WorkingContextSnapshotBootstrapper` resolves store/snapshot store and invokes `CompactedMemorySchemaGate` when supported.
2. `CompactedMemorySchemaGate` uses `SemanticItem.isSerializedDict` plus `COMPACTED_MEMORY_SCHEMA_VERSION` to decide whether semantic memory is current.
3. On stale semantic data, the gate clears semantic memory, writes the manifest, invalidates the snapshot, and bootstrap rebuilds from canonical sources.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/memory/models/semantic-item.ts` | Typed compacted semantic memory item | Still owns `reference` and `tags`; schema validation accepts them | Remove fields and make their presence stale for current semantic schema |
| `autobyteus-ts/src/memory/models/episodic-item.ts` | Compacted episodic memory item | Still owns `tags`; no consumer found | Remove field; ignore old extra JSON by omission from projection |
| `autobyteus-ts/src/memory/models/raw-trace-item.ts` | Raw trace memory item | Still owns `tags` and `toolResultRef`; behavior uses explicit fields | Remove fields and serialization |
| `autobyteus-ts/src/memory/compaction/compaction-result-normalizer.ts` | Normalizes facts into semantic candidates | Adds redundant null/empty metadata | Output only category/fact/salience/id/ts |
| `autobyteus-ts/src/memory/compaction/compactor.ts` | Commits compaction output to memory store | Persists empty episodic tags and semantic metadata pass-through | Construct simplified memory items |
| `autobyteus-ts/src/memory/compaction-snapshot-builder.ts` | Renders compacted memory for next prompt | Renders semantic reference if present | Render facts only |
| `autobyteus-ts/src/memory/compaction/tool-result-digest*.ts` | Condenses tool results for compaction prompt | Carries reference from `toolResultRef`; no writer populates it | Remove digest reference and prompt `ref=` suffix |
| `autobyteus-ts/src/memory/restore/compacted-memory-schema-gate.ts` | Current compacted semantic schema owner | Existing stale-reset mechanism fits semantic metadata removal | Extend via stricter validation + version bump |
| `autobyteus-ts/src/memory/store/compacted-memory-manifest.ts` | Semantic-memory schema version constant | Version is `2` | Bump to next version for metadata removal |
| `autobyteus-ts/src/memory/memory-manager.ts` | Native raw trace recorder | Writes raw trace tags that duplicate trace type/source event | Remove tag writes |
| `autobyteus-server-ts/src/agent-memory/domain/memory-recording-models.ts` | Server-side runtime-memory input contract | Allows `tags`/`toolResultRef` | Remove input fields |
| `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts` | Server storage-only writer adapter | Passes tags/toolResultRef to `RawTraceItem` | Remove pass-through |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` | Maps run events to raw traces/snapshots | Emits `accepted` and `final` tags | Remove tags; preserve trace type/source event and snapshot updates |
| `autobyteus-server-ts/src/agent-memory/services/provider-compaction-boundary-recorder.ts` | Normalizes provider compaction boundaries and rotates archive | Emits provider/boundary tags; behavior uses correlation id + manifest | Remove tags; preserve toolResult metadata and archive rotation |
| `autobyteus-ts/docs/agent_memory_design*.md`; `autobyteus-server-ts/docs/modules/agent_memory.md` | Memory design docs | Still document removed fields/examples | Update docs after code change |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-01 | Setup | Dedicated worktree creation command above | Clean ticket workspace created | Ready for continuation work |
| 2026-05-01 | Probe | `git fetch origin --prune`; `git status --short --branch`; `git rev-parse --short HEAD`; `git rev-parse --short origin/personal`; `git worktree list --porcelain` | Dedicated worktree verified, current branch `codex/remove-memory-tags-reference`; at probe time worktree/base were both `2919e6d2`; later pre-handoff observation recorded base advancement to `5995fd8f` | Bootstrap remains valid; final integration must refresh. |
| 2026-05-01 | Probe | Focused `rg` metadata search across memory code/tests/docs | Only memory-domain models, writers, compaction/digest/rendering, tests, docs retain targeted fields | Scope is bounded |
| 2026-05-01 | Probe | API/frontend/run-history raw trace exposure search | No tag/reference consumer in GraphQL raw trace DTO, frontend memory UI, or run-history fallback projection | Removal should not require frontend contract changes |
| 2026-05-01 | Test Attempt | `pnpm --filter autobyteus-ts exec vitest run tests/unit/memory/... --runInBand` | Failed with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found` | Dependencies missing in this worktree; no baseline tests executed |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: Not applicable.
- Relevant contract, behavior, or constraint learned: Not applicable.
- Why it matters: This is an internal schema/refactor ticket.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for solution-design investigation.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation and continuation remote refresh noted above.
- Cleanup notes for temporary investigation-only setup: None.
- Dependency state: The ticket worktree does not have installed package dependencies; focused tests could not run until dependencies are installed/prepared.

## Findings From Code / Docs / Data / Logs

1. Compactor-facing prompts/parser are already facts-only; retaining internal semantic `reference`/`tags` now creates a mixed contract.
2. Semantic `reference` is only rendered by `CompactionSnapshotBuilder` if present; it is not used by retrieval or the current compactor.
3. Semantic `tags` and episodic `tags` have no current retrieval/rendering/runtime consumer.
4. Raw trace tags are not exposed by the server/domain GraphQL memory view and are not read by frontend memory UI or run-history fallback projection.
5. Provider-boundary rotation depends on `trace_type`, `correlation_id`, marker trace id, and raw-trace archive manifest boundary fields. Provider tags are redundant.
6. `tool_result_ref` has no current writer. The digest/prompt path can carry it only hypothetically, so it should not remain as a generic reference-style field.
7. The compacted semantic schema gate is the correct owner for stale semantic records; it can be tightened without adding a new migration layer.
8. Docs lag behind the current compactor contract and still show tag-bearing raw trace examples.
9. Architecture review identified that current raw trace archive/prune code copies raw dicts during rewrites. A sanitizer would close that gap, but the clarified architecture policy explicitly rejects migration/compatibility code; therefore the revised design does not add raw/episodic stale-file scrubbers and instead scopes cleanup to current schemas/writers/projections.

## Constraints / Dependencies / Compatibility Facts

- Existing persisted semantic records may contain `reference`/`tags`; target behavior should schema-gate/reset them under the new compacted-memory version rather than preserve old metadata.
- Existing raw/episodic JSONL records may contain removed extra fields. Current model projections and serializers must not expose/write those fields, but implementation must not add raw/episodic migration, scrubber, or compatibility rewrite code to mutate historical files.
- No backward-compatibility wrappers or dual-path old-metadata behavior should be added.
- The memory model types are exported from `autobyteus-ts`; removing fields is a source-level contract change for external TypeScript consumers.
- The implementation work must avoid unrelated `tags`/`reference` references outside the memory domain.

## Open Unknowns / Risks

- External package consumers outside this repository may reference removed model fields; this is a contract cleanup risk, not an internal runtime blocker.
- Local dependencies were unavailable in the ticket worktree, so no live test baseline was established during solution-design investigation.
- If future artifact-source pointers become necessary, this removal means they must be reintroduced as a deliberately owned, deterministic feature rather than by reviving generic optional metadata.
- Raw trace rewrite sanitization/scrubbing for stale files is explicitly out of scope after architecture clarification; implementation should focus on current schemas and current writers only.

## Notes For Architect Reviewer

- The target design intentionally includes `toolResultRef` removal because investigation found no producer/current owner.
- The target design intentionally uses a compacted semantic-memory schema version bump for stale semantic data rather than silent compatibility loading.
- The target design does not require frontend GraphQL schema changes for tags/reference because those fields are not currently exposed there.

## Architecture Review Rework

- 2026-05-01 round 1 review result: `Fail / Design Impact` due to `AR-001`.
- Initial response considered adding raw trace rewrite sanitization in `RunMemoryFileStore`, but this is now superseded by explicit architecture clarification: do not add migration, scrubber, sanitizer, or compatibility code.
- Final resolution direction: current writes and current model projections remove `tags`/`tool_result_ref`; raw/episodic stale historical files are not migrated, scrubbed, or compatibility-loaded by this ticket.
- Semantic compacted memory remains different because an existing schema gate already owns stale compacted semantic rejection/reset; this is not a compatibility loader or migration of old fields.
- Required validation now focuses on current writes/projections and absence of removed fields in current schemas/writers/docs. Do not add stale old-shape raw fixtures to prove migration/scrubbing behavior.
