# Docs Sync Report

## Scope

- Ticket: `llm-runtime-real-compaction`
- Trigger: `Code review pass remained authoritative after the 2026-04-12 current-schema-only semantic-memory reset/rebuild refresh; docs needed to cover the reviewed schema-gate reset behavior, destructive reset-on-mismatch semantics, stale-snapshot invalidation, and the retained compaction/runtime/operator behavior.`

## Why Docs Were Updated

- Summary: The final reviewed implementation no longer migrates stale semantic memory forward. Startup/restore now enforces a current-schema-only contract: if persisted semantic records are stale, the runtime clears `semantic.jsonl`, writes manifest v2 reset metadata, invalidates cached snapshots, and then rebuilds from canonical sources or starts clean.
- Why this should live in long-lived project docs: These behaviors define durable persisted-state policy, startup/restore expectations, destructive reset semantics, and operator-facing recovery expectations for every future maintainer, not just this ticket.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/agent_memory_design.md` | Canonical runtime memory/compaction behavior doc | `Updated` | Refreshed for current-schema-only semantic-memory reset/rebuild behavior and removal of the old upgrader path. |
| `autobyteus-ts/docs/agent_memory_design_nodejs.md` | TypeScript-specific companion memory design doc | `Updated` | Synced the same current-schema-only reset/rebuild and manifest reset semantics. |
| `autobyteus-web/docs/settings.md` | Canonical operator-facing settings surface doc | `No change` | Earlier real-compaction/operator-setting docs still accurately describe the reviewed settings surface. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Canonical web event/state propagation doc | `No change` | Existing compaction status/banner documentation still matches the reviewed runtime behavior. |
| `autobyteus-server-ts/docker/README.md` | Canonical server operator/runtime-env doc | `No change` | Existing env/operator guidance still matches the reviewed implementation. |
| `autobyteus-ts/docs/llm_module_design.md` | Canonical LLM/provider runtime contract doc | `No change` | Existing LM Studio/Ollama timeout-hardening notes remained accurate for this refresh. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/agent_memory_design.md` | Runtime design sync | Replaced migration/upgrader wording with the reviewed `CompactedMemorySchemaGate` reset/rebuild contract, documented destructive reset-on-mismatch semantics, updated manifest metadata from `last_upgrade_ts` to `last_reset_ts`, and updated the restore owner map/file layout. | This is the primary durable memory/compaction reference for the runtime. |
| `autobyteus-ts/docs/agent_memory_design_nodejs.md` | Runtime design sync | Applied the same schema-gate/reset-rebuild updates to the Node.js companion doc. | The TypeScript/Node.js companion doc must stay aligned with the shipped code paths and persisted-state contract. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Current-schema-only semantic-memory policy | Startup/restore no longer migrates prior on-disk semantic formats. If persisted semantic records fail current-schema validation, the runtime clears them and proceeds via rebuild or clean start. | `proposed-design.md`, `implementation-handoff.md`, `api-e2e-validation-report.md`, `review-report.md` | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md` |
| Schema-gate-first restore ordering | `WorkingContextSnapshotBootstrapper` runs `CompactedMemorySchemaGate` before any snapshot validation or restore attempt; stale snapshots are invalidated before reuse when the gate resets state. | `implementation-handoff.md`, `api-e2e-validation-report.md`, `review-report.md` | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md` |
| Manifest v2 reset metadata | Persisted compacted-memory manifest v2 now records `last_reset_ts`, reflecting destructive reset semantics rather than migration metadata. | `implementation-handoff.md`, `review-report.md` | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md` |
| Retained runtime behavior outside the reset slice | Typed semantic-memory rendering, planner/frontier/store compaction, settings/status propagation, and LM Studio/Ollama timeout hardening remain accurate from prior rounds and were not changed by this refresh. | `requirements.md`, `implementation-handoff.md`, `api-e2e-validation-report.md`, `review-report.md` | `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-server-ts/docker/README.md`, `autobyteus-ts/docs/llm_module_design.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `CompactedMemorySchemaUpgrader` legacy migration path | `CompactedMemorySchemaGate` current-schema-only reset/rebuild enforcement | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md` |
| Migration-forward handling of stale semantic memory | Destructive reset-on-mismatch plus rebuild from canonical sources or clean start | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md` |
| Manifest `last_upgrade_ts` semantics | Manifest `last_reset_ts` semantics | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: `Docs sync was refreshed for the current-schema-only semantic-memory reset/rebuild correction. Ticket-local handoff summary and release notes were updated next, and the workflow remains at the required user-verification hold.`
