# Proposed Design

## Context

Installed Electron profiles can persist run index + manifest entries for a run, but single-agent conversation traces are being written to memory root files (`memory/raw_traces.jsonl`, `memory/working_context_snapshot.json`) instead of run-scoped path (`memory/agents/<runId>/...`). Run projection reads run-scoped files by run id, resulting in empty history on reopen.

## Design Goals

- Ensure all new single-agent runs persist memory in run-scoped layout.
- Preserve team-member explicit memory directory behavior.
- Keep projection API contract unchanged.

## Solution Overview

### 1. Forward Fix: AgentRunManager Memory Wiring

- In `AgentRunManager.buildAgentConfig`, stop injecting app-level memory root into `AgentConfig.memoryDir` for normal single-agent runs.
- In `AgentRunManager.restoreAgentRun`, stop forcing explicit memoryDir override when calling `agentFactory.restoreAgent`.
- Result: `AgentFactory.createRuntimeWithId` uses default memory base resolution (`AUTOBYTEUS_MEMORY_DIR`) with `agentRootSubdir='agents'`, restoring canonical `memory/agents/<runId>` layout.

### 2. Test Strategy

- Integration: `AgentRunManager` verifies create/restore paths do not force explicit memoryDir for single-agent runs.
- E2E: run-history GraphQL tests verify projection behavior for canonical run-scoped memory layout after stop/reopen flow.

## Non-Goals

- Backfill migration or compatibility fallback for historical root-level traces.
- Changes to run-history index schema.

## Risks & Mitigations

- Risk: team member memory path regression.
  - Mitigation: change limited to single-agent manager wiring only; no team config path changes.
