# Investigation Notes

## Status
- Completed for initial understanding pass

## Date
- 2026-03-03

## Scope Triage
- Final triage: `Medium`
- Rationale: bug spans runtime memory persistence layout, run-history projection behavior, and cross-layer regression tests (integration + unit + e2e).

## Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/src/agent/factory/agent-factory.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-projection-provider.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-memory-view/services/agent-memory-view-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/tests/e2e/run-history/run-history-graphql.e2e.test.ts`
- User-provided installed profile path: `/Users/normy/.autobyteus/server-data`
- User-provided screenshots (history row present, activity/conversation empty after restart)

## Reproduction Evidence (Installed Electron Profile)
- Run-history index entry exists for run id:
  - `software architect_Senior Software Engineer_7693`
  - file: `/Users/normy/.autobyteus/server-data/memory/run_history_index.json`
- Matching run manifest exists under expected per-run path:
  - `/Users/normy/.autobyteus/server-data/memory/agents/software architect_Senior Software Engineer_7693/run_manifest.json`
- But run-scoped memory traces are missing in that run folder (no `raw_traces*.jsonl`, no `working_context_snapshot.json`).
- Root-level memory files contain this run's actual conversation:
  - `/Users/normy/.autobyteus/server-data/memory/raw_traces.jsonl`
  - `/Users/normy/.autobyteus/server-data/memory/working_context_snapshot.json`
  - root snapshot has `agent_id = software architect_Senior Software Engineer_7693`
- Server log confirms turn executed and completed for the same run id, ruling out "never processed" as root cause.

## Root Cause
1. `AgentRunManager.buildAgentConfig()` always sets `AgentConfig.memoryDir = appConfig.getMemoryDir()` for single-agent runs.
2. In `AgentFactory.createRuntimeWithId()`, any explicit memory dir triggers layout option `{ agentRootSubdir: '' }`.
3. This causes memory writes to go to memory root (`<memory>/raw_traces.jsonl`, `<memory>/working_context_snapshot.json`) instead of run-scoped path (`<memory>/agents/<runId>/...`).
4. Run-history projection for autobyteus runtime reads per-run files from `agents/<runId>`, so reopen after restart cannot find conversation and appears empty.

## Why It Looks Electron-Specific
- Installed Electron profile mainly exercised `autobyteus` runtime with single-agent runs, where projection depends on local run-scoped memory layout.
- Dev workflows often use codex runtime projection path (`thread/read`) or previously-created correctly-laid-out data, so issue is less visible.

## Constraints / Risks
- Team member runs intentionally use explicit member memory dirs; fix must not break team member layout.
- Existing affected installed data already written to root files will remain unreadable in run-history projection by design (explicit user direction: no legacy fallback).

## Implementation Implications
- Fix forward path for new single-agent runs by removing explicit memory root injection in `AgentRunManager` create/restore flows.
- Do not add projection fallback or migration for root-level historical traces.
- Add regression tests across integration + e2e for canonical run-scoped layout, plus targeted team-memory path regression to guard against unintended side effects.
