# Docs Sync Report

## Scope

- Ticket: `external-runtime-memory-recording-simplification`
- Trigger: Delivery-stage documentation synchronization after API/E2E `API-REV-001` passed at 98.1% confidence and proportional durable test review `CRR-004` passed with no findings.
- Bootstrap base reference: `origin/personal` at `ea6d6b011035d71dc9594d61ad035470985fca8e`.
- Integrated base reference used for docs sync: `origin/personal` at `ea6d6b011035d71dc9594d61ad035470985fca8e` after `git fetch origin --prune` on 2026-07-31. The tracked base had not advanced, so no merge or rebase was needed. Reviewed-package checkpoint: `1bfda2b017a0b6ed1e21b03a4b0358bbb9d27483`.
- Post-integration verification reference: no implementation/API/E2E rerun was required because no new base commit was integrated. Delivery static checks passed and are retained under `delivery-evidence/`: `git diff --check`, the durable-doc contract/obsolete snapshot-write scan, and the production/test `RunMemoryWriter` reference scan.

## Why Docs Were Updated

- Summary: Long-lived memory, run-history, Codex, execution, project-overview, and frontend docs still described the external recorder as writing a duplicate WorkingContext snapshot and referenced the removed `RunMemoryWriter`. They now describe the implemented raw-trace-only Codex/Claude contract, provider-owned continuation, explicit supported-runtime boundary, `ExternalRuntimeMemoryWriter`, exact metadata-classified startup cleanup, native/imported/unclassified preservation, retryable failure behavior, and intentionally runtime-agnostic stale inspection after a failed unlink.
- Why this should live in long-lived project docs: These are persisted-data, continuation-ownership, recorder, projection, and operational-recovery contracts. Future recorder, migration, Memory Inspector, run-history, or runtime-kind work must not reintroduce external snapshot writes, infer cleanup eligibility from paths, or hide an accurately reported retained stale file through a new UI/read compatibility policy.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` | Top-level server capability summary named the external recorder. | Updated | Replaced the broad storage-only wording with raw-trace-only Codex/Claude recording. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Active-run sidecar and normalized tool-lifecycle ownership feed the recorder. | Updated | References the external raw-trace-only recorder and keeps lifecycle events as durable tool trace authority. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Canonical server memory owner, storage layout, recorder, rotation, inspector, and migration contract. | Updated | Documents the removed snapshot path, explicit runtime-kind opt-in, new writer, cleanup boundary, retry/stale-inspection residual, and source path replacement. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex-specific durable memory and provider continuation behavior contained direct obsolete snapshot promises. | Updated | Codex now records raw traces only; the provider thread owns continuation and the startup cleanup owns old classified duplicates. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Persisted artifact and startup migration inventory must distinguish native snapshots from external raw traces. | Updated | Clarifies per-runtime artifacts and records the cleanup's safety, retry, and non-blocking startup behavior. |
| `autobyteus-ts/docs/agent_memory_design.md` | Canonical native memory design includes the external-runtime boundary. | Updated | External runtimes share raw/rotation primitives only; native `MemoryManager` snapshot behavior is unchanged. |
| `autobyteus-ts/docs/agent_memory_design_nodejs.md` | Node.js/TypeScript companion of the canonical native memory design. | Updated | Synchronized to the same external raw-trace-only and cleanup boundary. |
| `autobyteus-web/docs/memory.md` | Memory Inspector behavior and storage-source expectations were stale. | Updated | Successful cleanup yields no external WorkingContext; a failed unlink can remain generically visible while raw traces and provider continuation stay healthy. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Normalized Codex event ownership and raw trace boundary. | No change | Already describes storage-only boundary metadata/raw traces without claiming WorkingContext snapshot persistence; token-usage “snapshot” references are unrelated cumulative usage state. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` | Capability terminology | Changed external recording summary to raw-trace-only Codex/Claude recording. | Keep the top-level server map accurate. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Ownership terminology | Reframed sidecar/tool lifecycle persistence as external raw-trace recording. | Avoid implying an additional external memory/continuation owner. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Canonical module contract | Added raw-only writer, explicit external runtime set, native snapshot distinction, classified cleanup, retry behavior, accepted stale inspection, and removed-writer path replacement. | This is the principal durable source for implementation and operations. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Runtime contract | Removed snapshot write claims; documented Codex thread continuation and the bounded cleanup. | Preserve the direct runtime's correct authority split. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Persisted-data and migration contract | Distinguished all-runtime raw traces from native-only new snapshot writes and documented migration `20260731_remove_external_runtime_working_context_snapshots`. | Run-history owns metadata used to classify safe cleanup targets. |
| `autobyteus-ts/docs/agent_memory_design.md` | Cross-package memory boundary | Limited external sharing to raw trace/rotation primitives and recorded native snapshot non-impact. | Prevent native framework docs from promising an external snapshot path. |
| `autobyteus-ts/docs/agent_memory_design_nodejs.md` | Cross-package memory boundary | Same contract update as the canonical companion doc. | Keep duplicate maintained design references aligned. |
| `autobyteus-web/docs/memory.md` | Inspector/user-facing persistence behavior | Removed external snapshot expectation and documented absence after successful cleanup plus accepted retained stale visibility after failure. | Match the unchanged file-backed inspector truthfully. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| External continuation authority | Codex thread and Claude session state, not AutoByteus WorkingContext, own provider continuation. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `agent_memory.md`, `codex_integration.md`, both `agent_memory_design*.md` docs, `memory.md` |
| External raw-trace-only recording | User, assistant, reasoning, tool, and provider-boundary evidence persists as raw traces; reattachment restores sequence/tool lifecycle only from the raw corpus. | `requirements.md`, `design-spec.md`, `implementation-handoff.md` | `agent_memory.md`, `run_history.md`, `agent_execution.md`, `PROJECT_OVERVIEW.md` |
| Cleanup classification and exclusions | Delete only exact current-metadata-classified Codex/Claude standalone and recursive team-member snapshot copies; preserve native, imported, unclassified, invalid-metadata, and task-like locations and all non-snapshot evidence. | `requirements.md`, `persisted-snapshot-inventory.md`, `design-spec.md`, `api-e2e-execution-coverage-report.md` | `agent_memory.md`, `run_history.md`, `codex_integration.md`, `memory.md` |
| Retryable failure and stale inspection | Cleanup failure is reported and retryable, later startup work continues, and a retained old file may remain generically inspectable without affecting current raw traces or provider continuation. | `requirements.md` SR-004 behavior, `api-e2e-execution-coverage-report.md`, `api-e2e-test-review-report.md` | `agent_memory.md`, `run_history.md`, `codex_integration.md`, `memory.md` |
| Future runtime opt-in | Future runtime kinds must explicitly choose this contract; they do not inherit it through `runtimeKind !== AUTOBYTEUS`. | `requirements.md`, `design-spec.md`, `implementation-handoff.md` | `agent_memory.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `RunMemoryWriter` / `src/agent-memory/store/run-memory-writer.ts` | `ExternalRuntimeMemoryWriter` / `src/agent-memory/store/external-runtime-memory-writer.ts`, limited to raw traces and raw-corpus state. | `autobyteus-server-ts/docs/modules/agent_memory.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` |
| External `WorkingContext` accumulation, restore, and snapshot rewrite | Provider-owned continuation plus AutoByteus-owned raw trace recording/projection. | `agent_memory.md`, `run_history.md`, both `agent_memory_design*.md` docs, `memory.md` |
| Broad “non-native runtime” recorder admission | Explicit Codex App Server / Claude Agent SDK external-provider predicate. | `autobyteus-server-ts/docs/modules/agent_memory.md` |
| Permanent classified external snapshot copies | Idempotent required startup discard migration with conservative preservation and retry reporting. | `agent_memory.md`, `run_history.md`, `codex_integration.md`, `memory.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A — docs updated`
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: The user has verified the real migration result and authorized finalization/release. Archive the ticket, finalize into `personal`, publish `v1.4.34` through the documented helper, and record the release workflow outcome; no additional long-lived documentation change is required for that operational step.
- Notes: The tracked base was unchanged, so the upstream API/E2E execution was not rerun. Delivery-only static checks passed against the current worktree.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A; docs sync completed.
