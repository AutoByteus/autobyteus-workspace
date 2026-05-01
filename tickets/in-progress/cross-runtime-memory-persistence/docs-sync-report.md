# Docs Sync Report

## Scope

- Ticket: `cross-runtime-memory-persistence`
- Trigger: `code_reviewer` Round 9 CR-004 cleanup re-review passed and routed to delivery after repository-resident durable validation was re-reviewed.
- Bootstrap base reference: `origin/personal` at `b7a4e1465b6c0ff684d9cfcefdc26d0b58753835` (task branch bootstrap reference recorded in investigation notes).
- Integrated base reference used for docs sync: `origin/personal` at `9068aa22e7d0f796087d49635c44c26d4ec25b6e`; already merged into `codex/cross-runtime-memory-persistence` at `5cfe2d6dde4cf7c1c42804e76cc34f5049392823`.
- Post-integration verification reference: initial delivery rerun `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts tests/integration/run-history/memory-layout-and-projection.integration.test.ts tests/e2e/memory/memory-view-graphql.e2e.test.ts` passed (`3` files, `16` tests). Round 9 refresh confirmed `origin/personal` is still `9068aa22e7d0f796087d49635c44c26d4ec25b6e`; no additional base integration was needed. Delivery hygiene checks passed: `git diff --check`; `autobyteus-server-ts/workspaces.json` absent; `git check-ignore -v autobyteus-server-ts/workspaces.json` resolves to `autobyteus-server-ts/.gitignore:25:/workspaces.json`; status grep shows no visible `workspaces.json` artifact.

## Why Docs Were Updated

- Summary: Long-lived docs now describe final reviewed behavior for storage-only Codex/Claude memory persistence, shared `autobyteus-ts` memory/archive primitives, segmented raw-trace archives, provider-boundary marker/rotation behavior, team member memory directory parity, local-memory run-history fallback over complete archive segments plus active records, GraphQL raw trace `id` / `sourceEvent`, and explicit no-compatibility/no-retention boundaries.
- Why this should live in long-lived project docs: Future runtime, memory, run-history, GraphQL, frontend, and release work must not rediscover archive segmentation, provider-boundary rotation, or no-compatibility decisions from ticket artifacts.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Needed canonical server memory/archive module page. | Updated | New doc reflects segmented archives and provider-boundary rotation. |
| `autobyteus-server-ts/docs/modules/README.md` | Module index must include new canonical memory doc. | Updated | Added Agent Memory entry. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Projection and persistence rules changed. | Updated | Documents complete archive segments plus active records and no monolithic archive compatibility. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex memory and compaction-boundary stance changed. | Updated | Documents storage-only memory and provider-boundary marker/rotation. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Raw Codex event mapping is the durable guardrail for converter ownership. | Updated | Added Codex provider compaction boundary rows and guardrails. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Run manager now owns external-runtime memory recorder sidecar. | Updated | Documents accepted-message observer and websocket-independent sidecar. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Claude/Codex team member memory directory parity changed. | Updated | Documents create/restore member `memoryDir` behavior. |
| `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` | Project domain area list should include server-owned memory recording. | Updated | Added domain-area bullet. |
| `autobyteus-ts/docs/agent_memory_design.md` | Shared memory/archive primitive contract changed. | Updated | Added `RunMemoryFileStore`, `RawTraceArchiveManager`, segmented archive layout, and external-runtime boundary rotation section. |
| `autobyteus-ts/docs/agent_memory_design_nodejs.md` | Node.js/TypeScript memory design must mirror shared primitive contract. | Updated | Same durable memory/archive-store updates as sibling doc. |
| `autobyteus-web/docs/memory.md` | Memory page docs need API-visible trace fields and archive expectations. | Updated | Documents active plus complete segmented archive traces and provider-boundary markers. |
| `README.md` | Release/finalization process might be affected. | No change | Existing release helper guidance remains accurate. |
| `.github/release-notes/release-notes.md` | Curated release notes destination reviewed. | No change | Final release helper should update it from the ticket release notes after user verification. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | New canonical module doc | Described storage layout, runtime ownership, provider boundaries, GraphQL trace shape, segmented archives, no-compat/no-retention boundaries, and run-history relationship. | Centralizes memory/archive behavior that crosses server, runtime, GraphQL, and future analyzer work. |
| `autobyteus-server-ts/docs/modules/README.md` | Index update | Added Agent Memory module entry. | Makes the new canonical doc discoverable. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Behavior update | Replaced monolithic archive wording with segmented archive manifest/directory, complete-corpus reads, provider marker ignore behavior, and retention boundaries. | Prevents stale assumptions about archive layout and local projection inputs. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Runtime/module update | Added server-owned durable memory, provider compaction boundary normalization/rotation, and Codex non-semantic-compaction guardrails. | Codex runtime docs are the primary place future converter changes will consult. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Guardrail update | Added provider compaction boundary guardrail and rows for `thread/compacted` / raw `type=compaction`. | Prevents raw Codex protocol evidence from being misused as semantic compaction or trace-loss authority. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Lifecycle update | Documented `AgentRunManager` sidecar, accepted-command observer, and websocket independence. | Recorder attachment is an execution lifecycle responsibility. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Persistence update | Documented Codex/Claude member `memoryDir` parity on create/restore. | Team persistence readers need this durable contract. |
| `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` | Overview update | Added server-owned memory inspection/storage-only recording to domain areas. | Keeps high-level project map truthful. |
| `autobyteus-ts/docs/agent_memory_design.md` | Shared-store update | Added `RunMemoryFileStore`, `RawTraceArchiveManager`, segmented file layout, and external-runtime provider-boundary rotation behavior. | Shared memory/archive primitives are now intentionally consumed by native memory and server recorder paths. |
| `autobyteus-ts/docs/agent_memory_design_nodejs.md` | Shared-store update | Same as sibling memory design doc. | Keeps TypeScript-specific memory design aligned. |
| `autobyteus-web/docs/memory.md` | API/frontend docs update | Documented complete segmented archive plus active raw traces, provider-boundary markers, and GraphQL provenance fields. | Memory page consumers need to understand raw trace `id`, `sourceEvent`, and archive-visible rows. |
| `tickets/in-progress/cross-runtime-memory-persistence/release-notes.md` | Release notes | Updated functional release notes for segmented archives and provider-boundary behavior. | Required input for the project release helper after user verification/finalization. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Storage-only Codex/Claude memory | External-runtime memory is persisted for inspection/fallback/future analysis only; it is not runtime memory management or prompt injection. | Requirements, design spec, implementation handoff, validation report | `agent_memory.md`, `codex_integration.md`, `agent_memory_design*.md` |
| Shared memory/archive primitives | Server recorder and native memory use `RunMemoryFileStore`; segmented archive internals are owned only by `RawTraceArchiveManager`. | Requirements, design spec, implementation handoff | `agent_memory.md`, `agent_memory_design*.md` |
| Segmented raw-trace archives | `raw_traces_archive_manifest.json` plus `raw_traces_archive/*.jsonl` replace active source/test use of monolithic archive files. | Requirements, implementation handoff, validation report, review report | `agent_memory.md`, `run_history.md`, `agent_memory_design*.md` |
| Provider compaction-boundary rotation | Codex/Claude provider boundaries are provenance and safe active-file rotation boundaries, not semantic compaction. | Requirements, implementation handoff, validation report, review report | `agent_memory.md`, `codex_integration.md`, `codex_raw_event_mapping.md` |
| GraphQL trace provenance | `MemoryTraceEvent` exposes `id` and `sourceEvent` for active and complete archived raw traces. | Validation report, review report | `agent_memory.md`, `autobyteus-web/docs/memory.md` |
| Run-history local-memory fallback | Runtime-specific Codex/Claude history remains primary, but local memory can produce replay bundles from complete archive segments plus active records using explicit `memoryDir` basename identity. | Design spec, implementation handoff, validation report | `run_history.md`, `codex_integration.md`, `agent_memory.md` |
| Team member memory parity | Codex and Claude team members receive member memory directories on create/restore. | Requirements, implementation handoff, validation report | `agent_team_execution.md`, `run_history.md`, `autobyteus-web/docs/memory.md` |
| No compatibility/retention boundary | Historical monolithic `raw_traces_archive.jsonl` files are intentionally unread; segmented archives do not add compression, total retention, or snapshot windowing. | Requirements, validation report, review report | `agent_memory.md`, `run_history.md`, `agent_memory_design*.md`, `autobyteus-web/docs/memory.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `autobyteus-run-view-projection-provider.ts` as an AutoByteus-named local projection fallback | `local-memory-run-view-projection-provider.ts` as runtime-neutral local-memory fallback | `autobyteus-server-ts/docs/modules/run_history.md` |
| Active source/test use of monolithic `raw_traces_archive.jsonl` | Segmented archive manifest plus segment files owned by `RawTraceArchiveManager` | `autobyteus-server-ts/docs/modules/agent_memory.md`, `autobyteus-ts/docs/agent_memory_design*.md` |
| Documentation statement that Codex projection is reconstructed only from Codex thread history | Codex thread history remains primary; local complete raw-trace corpus is available for inspector and fallback replay | `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Implicit memory-view raw trace provenance without documented `id` / `sourceEvent` | Explicit GraphQL `MemoryTraceEvent.id` and `MemoryTraceEvent.sourceEvent` contract | `autobyteus-server-ts/docs/modules/agent_memory.md`, `autobyteus-web/docs/memory.md` |
| Ambiguous external-runtime compaction handling | Provider compaction metadata is storage-only provenance plus eligible segmented archive rotation, never semantic compaction or trace loss | `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-server-ts/docs/modules/agent_memory.md` |

## Related Non-Doc Runtime Hygiene

- CR-004 cleanup added `/workspaces.json` to `autobyteus-server-ts/.gitignore` so generated server-root workspace registry state remains local and invisible to repository status.
- Delivery verified `autobyteus-server-ts/workspaces.json` is absent, ignored if regenerated, and not visible in `git status --short --untracked-files=all`.

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

N/A — docs impact was confirmed and long-lived docs were updated. CR-004 itself did not require additional product documentation beyond the `.gitignore` runtime-state hygiene update.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is current on the integrated branch state after Round 9 CR-004 cleanup re-review. Proceed to handoff-summary and delivery report update, then hold for explicit user verification before ticket archive/finalization/release.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

N/A.
