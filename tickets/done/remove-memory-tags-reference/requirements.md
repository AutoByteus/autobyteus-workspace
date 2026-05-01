# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — refined after codebase investigation on 2026-05-01. No blocking clarification remains for architecture review.

## Goal / Problem Statement

Simplify the AutoByteus memory schema by removing low-value `tags` and `reference`-style metadata from current memory-domain contracts where no concrete consumer owns or uses it. The agent-based compaction work already made the compactor-facing output contract facts-only because weaker/local LLMs behave better with simple, natural memory output. This follow-up cleans up the remaining internal model, persistence, runtime-recording, tests, and documentation paths so current memory artifacts do not preserve unused metadata fields.

## Investigation Findings

- The compactor-facing output contract is already facts-only: `CompactionResponseParser` parses only `{ fact }` entries and drops stale `reference`/`tags` fields from model output.
- `SemanticItem.reference` and `SemanticItem.tags` remain in the persisted semantic model, but current compaction always sets them to `null`/`[]`; retrieval only sorts by `salience`/`ts`; snapshot rendering is the only code path that displays `reference` if present.
- `EpisodicItem.tags` remains in the persisted episodic model, but no retrieval, snapshot, API, or runtime behavior consumes it.
- `RawTraceItem.tags` and `RuntimeMemoryTraceInput.tags` are written by native/runtime recorders (`processed`, `boundary`, `final`, `accepted`, provider-boundary labels), but current behavior is carried by explicit fields: `trace_type`, `source_event`, `correlation_id`, `tool_*`, and raw-trace archive manifest boundary metadata. GraphQL memory views, frontend raw trace views, and run-history fallback projections do not expose or consume raw trace tags.
- `RawTraceItem.toolResultRef` / `tool_result_ref` is unpopulated by current writers. Its only downstream effect is an optional `ref=...` suffix in compaction task prompt tool-result digests if some caller populated it. It has no current owner and should be removed with the reference-style metadata cleanup.
- Provider-owned compaction boundary rotation uses `trace_type = provider_compaction_boundary`, `correlation_id = boundary_key`, and segmented archive manifest fields, not raw-trace tags.
- Existing persisted semantic records with removed fields should be rejected/reset through the existing compacted-memory schema gate, not migrated or compatibility-loaded. Existing raw/episodic JSONL bytes with removed extra fields are not a migration target for this ticket: current model objects and current writers must not expose or write those fields, but implementation must not add raw/episodic migration, scrubber, or old-shape rewrite code just to mutate historical files.
- Local test execution was not available in the ticket worktree because dependencies are not installed there (`vitest` binary missing); downstream implementation should run focused tests after code changes in a prepared dependency environment.

## Recommendations

- Treat this as a memory-schema refactor, not a compactor-agent behavior change.
- Make the current semantic schema facts/category/salience only: remove `SemanticItem.reference`, `SemanticItem.tags`, normalizer metadata output, compactor pass-through, snapshot `(ref: ...)` rendering, and related tests/docs.
- Remove `EpisodicItem.tags`; episodic memory should be `id`, `ts`, `turn_ids`, `summary`, and `salience`.
- Remove `RawTraceItem.tags`, `RuntimeMemoryTraceInput.tags`, and runtime writer tag emissions; preserve behavior through explicit trace fields and archive manifest fields.
- Include `toolResultRef` / `tool_result_ref` in this cleanup because investigation found no producer or current consumer owner. If artifact pointers are needed later, add a deterministic, owned artifact-reference feature with visible consumers.
- Bump the compacted-memory schema version and tighten semantic schema validation so semantic records containing removed `reference`/`tags` fields are schema-gated/reset rather than silently retained.
- Do not add migration wrappers, dual-path reads, compatibility projection, scrubbers, sanitizers, or stale-file cleanup code for removed metadata.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: Native memory compaction stores semantic facts without `reference`/`tags` metadata and rebuilds prompts without rendering semantic references.
- UC-002: Episodic memory persists and reloads summaries without `tags` metadata.
- UC-003: Runtime memory recording preserves runtime role, reasoning, tool, and provider-boundary behavior without raw trace tags or tool-result references.
- UC-004: Provider-owned compaction boundary markers still dedupe, rotate active raw traces into segmented archives, and expose complete raw-trace corpus after cleanup.
- UC-005: Restore/bootstrap handles existing compacted semantic records containing removed metadata by schema-gating stale semantic memory and rebuilding/clearing dependent snapshots.
- UC-006: Documentation and tests describe the simplified current memory schema consistently.

## Out of Scope

- Redesigning memory compaction to output Markdown instead of JSON.
- Adding new retrieval/indexing semantics for tags, facets, source pointers, or artifact references.
- Changing agent-based compactor selection, visible compactor runs, or server settings behavior.
- Changing provider-owned compaction boundary semantics beyond removing unused tag metadata from marker records.
- Removing unrelated repository concepts named `tags`, `reference`, or references (for example Git tags, XML tags, skill reference folders, GraphQL references, docs references outside the memory schema).

## Functional Requirements

- REQ-001 `remove_semantic_reference_tags`: Remove `reference` and `tags` from the current `SemanticItem` type, constructor options, serialization, deserialization projection, compaction normalization output, compactor persistence path, snapshot rendering, and current docs/tests.
- REQ-002 `remove_episodic_tags`: Remove `tags` from the current `EpisodicItem` type, constructor options, serialization, deserialization projection, and current docs/tests.
- REQ-003 `remove_raw_trace_tags`: Remove `tags` from the current `RawTraceItem` type, constructor options, serialization, deserialization projection, native `MemoryManager` writes, server `RuntimeMemoryTraceInput`, `RunMemoryWriter`, `RuntimeMemoryEventAccumulator`, `ProviderCompactionBoundaryRecorder`, and current docs/tests.
- REQ-004 `remove_tool_result_reference`: Remove `toolResultRef` / `tool_result_ref` from the current raw-trace model, server runtime-memory input/writer path, `ToolResultDigest`, `ToolResultDigestBuilder`, compaction task prompt rendering, and current docs/tests.
- REQ-005 `preserve_runtime_boundaries`: Preserve native compaction, raw-trace prune/archive, provider-boundary dedupe/rotation, active-plus-archive corpus reads, working-context snapshot writes, restore/bootstrap rebuilds, and run-history local-memory projection after metadata removal.
- REQ-006 `semantic_schema_gate`: Bump compacted semantic-memory schema version and make semantic schema validation reject removed semantic metadata fields so stale semantic records containing `reference`/`tags` are reset by the existing schema-gate path.
- REQ-007 `no_raw_episodic_migration`: Existing raw/episodic records that contain removed extra JSON fields are not migrated, scrubbed, compatibility-loaded, or specially rewritten by this ticket. Current model objects must not expose removed fields, and current append/serialization paths must not write removed fields. Do not add raw/episodic migration code, compatibility wrappers, or stale-record cleanup guards.
- REQ-008 `docs_tests_alignment`: Update unit/integration tests and memory docs so no removed metadata field is presented as part of the current memory contract; tests should prove behavior now depends on explicit fields rather than tags/references.

## Acceptance Criteria

- AC-001: Code search limited to memory-domain files shows `SemanticItem.reference`, `SemanticItem.tags`, `EpisodicItem.tags`, `RawTraceItem.tags`, `RuntimeMemoryTraceInput.tags`, `toolResultRef`, and `tool_result_ref` are absent from current active schemas and writer paths.
- AC-002: Compaction parser, normalizer, compactor, snapshot builder, retriever, and memory store tests pass with semantic entries containing only `id`, `ts`, `category`, `fact`, and `salience`.
- AC-003: Runtime memory recorder and provider-boundary tests pass while asserting behavior through `traceType`, `sourceEvent`, `correlationId`, tool fields, and archive manifest data, not raw trace tags.
- AC-004: Schema-gate tests prove semantic records containing stale `reference`/`tags` are treated as stale compacted memory and reset under the new schema version.
- AC-005: Current raw/episodic constructors, model objects, `toDict()` methods, and current writer append paths do not expose or write removed metadata fields. No tests should add a migration/compatibility fixture whose purpose is to support or scrub stale raw/episodic files.
- AC-006: Documentation in `autobyteus-ts` and `autobyteus-server-ts` describes the simplified schema and no examples show memory-domain `tags`, semantic `reference`, or `tool_result_ref` as current fields.
- AC-007: Focused implementation validation covers at least the memory unit tests, server agent-memory recorder/provider-boundary tests, and memory compaction integration tests identified in the investigation notes.

## Constraints / Dependencies

- Ticket worktree was bootstrapped from `origin/personal` at commit `2919e6d2`; tracked `origin/personal` later advanced to `5995fd8f`, so downstream final integration must refresh before delivery.
- The recently merged compactor schema is facts-only; this refactor must not reintroduce compactor-generated metadata.
- Existing persisted data may contain old fields, but the target design must avoid compatibility wrappers, dual-path old/new behavior, raw/episodic migrations, and stale-file scrubbers.
- Semantic compacted memory already has a schema-gate and manifest; use that owner for stale semantic cleanup.
- Raw traces and episodic memory do not currently have equivalent metadata-specific schema gates; do not create one only to preserve or migrate removed optional metadata.
- Avoid broad searches/replacements that affect unrelated `tags`/`reference` concepts outside memory-domain models/docs/tests.

## Assumptions

- LLM-facing memory quality benefits more from concise synthesized facts and summaries than from generic optional source labels.
- Current raw-trace provenance fields (`trace_type`, `source_event`, `correlation_id`, tool identity/result fields, archive manifest metadata) are sufficient for current recording, inspection, and archive behavior.
- External package consumers may import memory model types, but this repository targets a clean current contract and does not preserve backward-compatible type fields for removed metadata.

## Risks / Open Questions

- RISK-001: Some external consumer outside this repository could compile against exported memory model fields; this is accepted as a clean contract change rather than a reason to retain compatibility wrappers.
- RISK-002: Broad `tags`/`reference` terminology exists across the repository; implementation must scope edits narrowly to memory-domain current contracts.
- RISK-003: If `tool_result_ref` was planned for future artifact digests, removing it means future artifact references must be reintroduced through a properly owned feature, not recovered from this generic field.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-005, UC-006 |
| REQ-002 | UC-002, UC-006 |
| REQ-003 | UC-003, UC-004, UC-006 |
| REQ-004 | UC-001, UC-003, UC-006 |
| REQ-005 | UC-001, UC-003, UC-004, UC-005 |
| REQ-006 | UC-001, UC-005 |
| REQ-007 | UC-002, UC-003, UC-006 |
| REQ-008 | UC-006 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Confirms removed metadata no longer belongs to active memory schemas/writers. |
| AC-002 | Confirms native compaction and LLM snapshot behavior survive the simplified semantic contract. |
| AC-003 | Confirms runtime recording and provider-boundary behavior do not rely on raw trace tags. |
| AC-004 | Confirms stale semantic metadata is handled by schema ownership, not compatibility retention. |
| AC-005 | Confirms current raw/episodic writes and projections use only the current schema, with no raw/episodic migration, compatibility loading, scrubber, sanitizer, or stale-file cleanup behavior added. |
| AC-006 | Confirms docs/examples no longer teach removed fields. |
| AC-007 | Confirms validation scope covers both native memory and server-side external-runtime memory. |

## Approval Status

Ready for architecture review. The current request authorized continuing from the bootstrapped ticket; downstream should reroute only if implementation discovers a concrete metadata consumer not found during this investigation.
