# Verified Tool Names On Tool-Result Traces

> Archived delivery notes only. The user requested repository finalization without a new release/version, so these notes will not be published.

## Highlights

- Newly persisted native AutoByteus, Codex, and Claude `tool_result` raw traces now carry the matched call's canonical `tool_name`.
- Invocation arguments remain exclusively on `tool_call`; result rows continue to carry physically present result/error fields, including explicit `null` values.
- Result-only inspection and partial projections can identify the tool without inferring a name from an adjacent record.

## Integrity And Recovery

- Compound `(turn_id, tool_call_id)` identity remains the lifecycle, deduplication, and reconstruction key.
- A supplied non-empty terminal tool name must match the canonical lifecycle name. Conflicts are rejected/skipped and diagnosed without writing the result or completing the lifecycle.
- Name-omitting terminal, denial, failure, and controlled-interruption events remain recordable when a matched call supplies the canonical name.
- Unmatched results remain unrecordable; no orphan result or fabricated name is written.

## Compatibility And Data

- Existing historical results without `tool_name` remain directly readable.
- Historical result-side name/argument supersets remain readable through the normal read-only projection.
- No schema version, migration, backfill, historical rewrite, compatibility writer, or Memory Sync change is required.

## Validation

- API/E2E execution passed at `97.2%` confidence.
- Broader affected coverage passed: 130/130 native memory tests and 212/212 server memory/run-history/API/work-trace tests.
- Six existing durable test files were updated and passed proportional test-code review with no findings; no test file was added or removed.
