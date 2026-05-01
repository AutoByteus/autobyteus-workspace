# Docs Sync Report

## Scope

- Ticket: `remove-memory-tags-reference`
- Trigger: Delivery handoff after API/E2E validation pass with no repository-resident durable validation added during API/E2E.
- Bootstrap base reference: `origin/personal` / `personal` at `2919e6d2c9203804caee4a10b21309d0fddbde47`.
- Integrated base reference used for docs sync: latest fetched `origin/personal` at `5995fd8f4e6b6b8c4015e7e474998a47e099e089` on 2026-05-01. The delivery stage created checkpoint commit `2a47f87f6e42df7558333e9ad8ea022ecceed3d6`, then merged `origin/personal` with merge commit `e48e896f4e9781438925594b0e6237fb824c69eb` before any delivery-owned docs edits.
- Post-integration verification reference: ticket branch `codex/remove-memory-tags-reference` at integrated HEAD `e48e896f4e9781438925594b0e6237fb824c69eb` plus delivery docs-only edits; deterministic post-merge checks passed before docs sync, and docs-specific searches passed after docs sync.

## Why Docs Were Updated

- Summary: Long-lived memory docs now describe the simplified current memory schema after removing semantic `reference`, semantic/episodic/raw `tags`, and raw `tool_result_ref` / `toolResultRef` from active models and writers. Delivery also corrected stale compacted-memory manifest examples from schema version `2` to the implemented schema version `3`.
- Why this should live in long-lived project docs: Future memory model, compaction, provider-boundary, GraphQL memory-view, and run-history work must not rediscover the ticket artifacts to know the current schema. The docs need to make clear that current behavior is carried by explicit fields (`trace_type`, `source_event`, `correlation_id`, tool payload fields, archive manifest metadata) and by the schema-3 semantic gate rather than removed generic metadata.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/docs/agent_memory_design.md` | Canonical native memory design, persisted schema examples, compaction flow, schema-gate behavior, and archive ownership. | `Updated` | Implementation removed current-schema metadata from examples and text; delivery corrected the compacted-memory manifest example to `schema_version: 3`. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/docs/agent_memory_design_nodejs.md` | Node.js-flavored copy of the canonical native memory design and persisted schema examples. | `Updated` | Kept in lockstep with `agent_memory_design.md`, including the delivery correction to `schema_version: 3`. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/docs/modules/agent_memory.md` | Canonical server-side agent-memory recorder/provider-boundary and GraphQL memory-view module doc. | `Updated` | Current trace shape now lists explicit provenance fields without raw tags or tool-result references. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/memory.md` | Frontend memory page GraphQL contract and raw-trace inspector behavior. | `No change` | Existing GraphQL trace contract already exposes explicit fields only (`traceType`, `sourceEvent`, ordering/timestamps, tool payloads) and does not document removed metadata. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/settings.md` | Compactor-agent settings doc that mentions the model-facing compaction contract. | `No change` | Existing text already says the compactor-facing semantic contract is facts-only and does not ask for optional `reference` strings or free-form `tags`; this remains accurate. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/docs/agent_memory_design.md` | Memory schema and lifecycle doc update | Removed current persisted-schema references to semantic `reference`, semantic/episodic/raw `tags`, and raw `tool_result_ref`; documented facts-only semantic entries and schema-3 semantic reset behavior; corrected the compacted-memory manifest example to `schema_version: 3`. | Keeps the canonical native memory design aligned with the implemented current schema and schema gate. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/docs/agent_memory_design_nodejs.md` | Node.js memory schema and lifecycle doc update | Mirrored the canonical native memory doc updates, including facts-only semantic entries, removed metadata, and `schema_version: 3` manifest example. | Prevents the Node.js design doc copy from teaching stale schema shape. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/docs/modules/agent_memory.md` | Server runtime-memory / GraphQL view doc update | Updated the raw trace shape to explicit provenance and tool fields without raw trace tags or tool-result references. | Keeps server memory-view and provider-boundary documentation aligned with active writer/API behavior. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Simplified persisted memory schema | Current semantic records are `id`, `ts`, `category`, `fact`, `salience`; episodic records are `id`, `ts`, `turn_ids`, `summary`, `salience`; raw traces use explicit provenance/tool fields and not generic tags or references. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `validation-report.md` | `autobyteus-ts/docs/agent_memory_design.md`; `autobyteus-ts/docs/agent_memory_design_nodejs.md`; `autobyteus-server-ts/docs/modules/agent_memory.md` |
| Facts-only compaction output | The agent-based compactor output remains facts-only; metadata-like fields in model output are tolerated only at parser input and are not normalized into persisted current semantic records. | `requirements.md`, `design-spec.md`, `validation-report.md` | `autobyteus-ts/docs/agent_memory_design.md`; `autobyteus-ts/docs/agent_memory_design_nodejs.md`; existing `autobyteus-web/docs/settings.md` |
| Semantic stale-record handling | Persisted semantic records with removed metadata are rejected/reset by the compacted-memory schema gate under schema version `3`; this is not a multi-schema compatibility layer. | `design-impact-resolution-no-migration-policy.md`, `design-spec.md`, `validation-report.md` | `autobyteus-ts/docs/agent_memory_design.md`; `autobyteus-ts/docs/agent_memory_design_nodejs.md` |
| Runtime/provider-boundary provenance | Runtime and provider-boundary behavior is preserved through `trace_type`, `source_event`, `correlation_id`, tool payload fields, and archive manifest data rather than raw trace tags. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `validation-report.md` | `autobyteus-server-ts/docs/modules/agent_memory.md`; `autobyteus-ts/docs/agent_memory_design.md`; `autobyteus-ts/docs/agent_memory_design_nodejs.md` |
| No raw/episodic migration policy | Historical raw/episodic bytes with removed extra JSON fields are not migrated, scrubbed, or compatibility-loaded by this ticket; current writers simply stop producing them. | `design-impact-resolution-no-migration-policy.md`, `design-review-report.md`, `validation-report.md` | `autobyteus-ts/docs/agent_memory_design.md`; `autobyteus-ts/docs/agent_memory_design_nodejs.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `SemanticItem.reference` and `SemanticItem.tags` as current semantic metadata. | Facts-only semantic records with category and salience; stale semantic records rejected/reset under compacted-memory schema version `3`. | `autobyteus-ts/docs/agent_memory_design.md`; `autobyteus-ts/docs/agent_memory_design_nodejs.md` |
| `EpisodicItem.tags` as current episodic metadata. | Episodic records containing turn ids, summary, and salience only. | `autobyteus-ts/docs/agent_memory_design.md`; `autobyteus-ts/docs/agent_memory_design_nodejs.md` |
| `RawTraceItem.tags` / `RuntimeMemoryTraceInput.tags` and provider-boundary tag labels. | Explicit `trace_type`, `source_event`, `correlation_id`, tool fields, and segmented archive manifest metadata. | `autobyteus-server-ts/docs/modules/agent_memory.md`; `autobyteus-ts/docs/agent_memory_design.md`; `autobyteus-ts/docs/agent_memory_design_nodejs.md` |
| `RawTraceItem.toolResultRef` / persisted `tool_result_ref` and prompt digest `ref=...` rendering. | Tool-result digests render tool call id/name/result/error payloads without an unowned artifact-reference field. | `autobyteus-ts/docs/agent_memory_design.md`; `autobyteus-ts/docs/agent_memory_design_nodejs.md` |
| Compacted-memory manifest examples showing `schema_version: 2`. | Manifest examples now show `schema_version: 3`, matching `COMPACTED_MEMORY_SCHEMA_VERSION`. | `autobyteus-ts/docs/agent_memory_design.md`; `autobyteus-ts/docs/agent_memory_design_nodejs.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

N/A — docs were updated.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed against latest fetched `origin/personal@5995fd8f4e6b6b8c4015e7e474998a47e099e089`. Post-sync searches found no removed metadata terms in the long-lived memory schema docs and no stale `schema_version: 2` examples in the reviewed memory docs. Repository finalization remains held until explicit user verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

N/A.
