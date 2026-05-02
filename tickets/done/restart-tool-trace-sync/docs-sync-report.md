# Docs Sync Report

## Scope

- Ticket: `restart-tool-trace-sync`
- Trigger: Delivery-stage docs synchronization after code review and API/E2E validation passed for Codex MCP/dynamic tool trace argument persistence and restart/reopen transcript + Activity synchronization.
- Bootstrap base reference: `origin/personal` at `b16a5f879c5b2efbd1a111f4adf4b069a2ca4ccb`
- Integrated base reference used for docs sync: `origin/personal` at `b16a5f879c5b2efbd1a111f4adf4b069a2ca4ccb` (`Already current`; no merge/rebase needed)
- Post-integration verification reference: `git diff --check` passed on 2026-05-02 after delivery docs/artifact sync. No executable post-integration rerun was required because the tracked base did not advance beyond the reviewed/validated branch state.

## Why Docs Were Updated

- Summary: The implementation changes durable Codex MCP tool-call normalization and frontend reopen projection ownership. Long-lived docs now record that `mcpToolCall` starts emit both transcript and lifecycle events with arguments, MCP completion is enriched from pending call state before persistence, and run reopen must apply projected conversation + Activity together instead of creating Activity-only rows while preserving a different live transcript.
- Why this should live in long-lived project docs: Future Codex event, memory, and run-history work must preserve the restart/history invariant: transcript tool cards and right-side Activity entries come from the same canonical invocation facts. Without this documentation, future changes could reintroduce terminal-only MCP persistence, memory-layer Codex parsing, or frontend Activity-only hydration.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Canonical Codex raw-event audit table and ownership rules. | `Updated` | Added MCP tool lifecycle spine, audit rows, and operational rule for pending-argument terminal enrichment. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-server-ts/docs/modules/codex_integration.md` | Codex module-level event-normalization and projection rules. | `Updated` | Added MCP split-surface contract, projection bundle application invariant, and storage-only memory note. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-server-ts/docs/modules/run_history.md` | Run-history projection and frontend restore contract. | `Updated` | Clarified that conversation and Activity hydration must be applied together or both preserved live. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-web/docs/agent_execution_architecture.md` | Frontend execution/open coordinator architecture. | `Updated` | Added run reopen projection hydration contract for single-agent and team reopen flows. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime-neutral segment/lifecycle tool-lane contract. | `No change` | Existing segment/lifecycle ownership text already remains accurate; this ticket specializes Codex MCP persistence and reopen projection sync. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-server-ts/docs/modules/agent_memory.md` | Server-owned memory and raw trace ownership. | `No change` | Existing doc states memory stores normalized events and run-history owns replay DTOs; no memory API/storage shape changed. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-server-ts/README.md` | Backend operator/testing docs. | `No change` | No user-facing command, setting, or E2E invocation changed. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/README.md` | Repository overview. | `No change` | No top-level workflow or product-facing README content changed. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Internal architecture/audit documentation | Added `MCP Tool Lifecycle Spine`, `mcpToolCall` start/completion and `codex/local/mcpToolExecutionCompleted` audit rows, and an operational rule for argument-preserving MCP lifecycle projection. | The audit table is the durable contract for Codex raw-event interpretation; future converter work needs to know MCP start + enriched local completion are lifecycle authority. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-server-ts/docs/modules/codex_integration.md` | Module architecture documentation | Documented native Codex MCP split surface, pending-call enrichment, projection bundle application, and no backfill of already-empty historical rows. | Future Codex maintainers need the module-level invariant without reading the ticket artifacts. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-server-ts/docs/modules/run_history.md` | Run-history architecture documentation | Clarified that frontend restore must apply projected `conversation` and `activities` from the same bundle, or preserve both live surfaces; Activity-only projection hydration is invalid. | The bug crossed backend persistence and frontend reopen; run-history docs are the long-lived place for replay bundle consumption rules. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-tool-trace-sync/autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture documentation | Added `Run Reopen Projection Hydration` section for single-agent and team open coordinators. | Frontend future work must not reintroduce Activity-only rows when live conversation is preserved after restart. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Codex MCP lifecycle persistence | Raw `mcpToolCall` start is the authoritative source for invocation id, turn id, tool name, and arguments; it must emit both display segment and lifecycle start. | Requirements doc, design spec, implementation handoff, validation report | `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` |
| MCP terminal argument preservation | Completion must be enriched from pending MCP call state before pending deletion so terminal lifecycle and raw `tool_result` traces retain the original args. | Design spec, implementation handoff, review report, real Codex `speak` evidence | `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Restart/history projection invariant | Historical/restarted views must rebuild middle transcript and right Activity from the same replay bundle and invocation identity, not independently hydrate Activity-only rows. | Requirements doc, design spec, validation report | `autobyteus-server-ts/docs/modules/run_history.md`, `autobyteus-web/docs/agent_execution_architecture.md` |
| No historical backfill | Existing raw trace rows already persisted with empty `{}` tool args remain accepted residual risk; this ticket fixes new/future canonical traces. | Requirements doc, design spec, validation report | `autobyteus-server-ts/docs/modules/codex_integration.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| MCP start as display-only `SEGMENT_START` with tool persistence synthesized later from terminal completion. | MCP start now emits `SEGMENT_START(tool_call)` plus canonical `TOOL_EXECUTION_STARTED` with args. | `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Terminal MCP lifecycle payloads without pending call args/tool name/turn id. | `codex/local/mcpToolExecutionCompleted` is enriched from `CodexThread` pending call state before deletion. | `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` |
| Frontend Activity hydration independently applied while preserving an existing live transcript. | Projection conversation and Activity are applied together, or both live surfaces are preserved; team reopen hydrates projected Activity only for newly materialized member projections. | `autobyteus-server-ts/docs/modules/run_history.md`, `autobyteus-web/docs/agent_execution_architecture.md` |
| Memory-layer or frontend guessing/backfill of Codex MCP arguments. | Codex converter/notification seam provides normalized lifecycle facts; old `{}` rows are not backfilled in this ticket. | `autobyteus-server-ts/docs/modules/codex_integration.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A; docs were updated.
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed against the latest tracked base state and the reviewed/validated implementation. User verification has been received; repository finalization is in progress.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
