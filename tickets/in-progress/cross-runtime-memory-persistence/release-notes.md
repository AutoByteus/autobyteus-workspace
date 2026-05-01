# Release Notes: Cross-Runtime Memory Persistence

## Summary

Codex and Claude runs now persist server-owned memory artifacts in the same memory folders used by native AutoByteus runs. The Memory page, run-history fallback, and future offline analyzers can inspect normalized user, assistant, reasoning, tool, and provider-boundary traces for external-runtime runs.

## What Changed

- Standalone Codex and Claude runs write `raw_traces.jsonl` and `working_context_snapshot.json` under `memory/agents/<runId>/...`.
- Codex and Claude team members write the same artifacts under `memory/agent_teams/<teamRunId>/<memberRunId>/...`.
- Memory recording is attached by the run manager, so traces persist even when no browser is connected to the live run stream.
- The memory-view GraphQL raw trace shape exposes persisted trace `id` and `sourceEvent` provenance fields.
- Run-history projection can fall back to the local complete raw-trace corpus when runtime-native Codex or Claude history is unavailable.

## Segmented Raw-Trace Archives

Raw-trace archives now use segmented archive storage:

- archive manifest: `raw_traces_archive_manifest.json`
- archive segment directory: `raw_traces_archive/`

Native AutoByteus compaction archives compacted traces into `native_compaction` segments. Codex/Claude provider compaction boundaries can rotate settled active raw traces into `provider_compaction_boundary` segments while leaving the boundary marker active. Active raw traces plus complete archive segments remain the complete readable trace corpus.

The old monolithic `raw_traces_archive.jsonl` file is no longer a current read/write target. Existing historical monolithic archive files are intentionally not read under the approved no-compatibility policy.

## Provider Compaction Boundary Behavior

This remains storage-only persistence for Codex and Claude. AutoByteus does not use recorded files to retrieve memory for external runtimes, inject context into their prompts, replace their session state, or run semantic compaction inside the Codex/Claude execution path.

Codex `thread/compacted` / raw Responses `type = "compaction"` and Claude `compact_boundary` signals are recorded as provider-boundary provenance and safe active-file rotation points. Claude `status: "compacting"` is recorded as non-rotating provenance.

## Operational Notes

Segmented archives are not compression, total-storage retention, or snapshot-windowing. Long-running archive growth and working-context snapshot retention remain future storage-policy topics.

## Validation

Focused integrated-state validation passed after confirming the latest `origin/personal` base remained current:

`pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts tests/integration/run-history/memory-layout-and-projection.integration.test.ts tests/e2e/memory/memory-view-graphql.e2e.test.ts` (`3` files, `16` tests).

Additional reviewed validation passed before delivery: focused unit/E2E validation-code rerun (`5` files, `20` tests), Codex runtime speak live filtered E2E (`2` tests, `13` skipped), and live Codex memory persistence E2E (`1` file, `1` test). Round 9 delivery hygiene confirmed generated `autobyteus-server-ts/workspaces.json` is absent and ignored by `autobyteus-server-ts/.gitignore`.
