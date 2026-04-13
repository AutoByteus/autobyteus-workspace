# Docs Sync

Use this as the canonical Stage 9 artifact.

## Scope

- Ticket: `agent-run-id-sanitization`
- Trigger Stage: `9`
- Workflow state source: `tickets/done/agent-run-id-sanitization/workflow-state.md`

## Why Docs Were Updated

- Summary:
  - Promoted the standalone AutoByteus readable run-id contract and optional archive-file behavior into the long-lived run-history module documentation.
- Why this change matters to long-lived project understanding:
  - The ticket changed durable runtime behavior for newly generated standalone run ids and clarified that `raw_traces_archive.jsonl` is optional. Future engineers should not need to reconstruct those truths from ticket-local artifacts or old logs.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/run_history.md` | This is the server-side canonical doc for persisted run identity and storage layout. | Updated | Added the shared readable-id normalization contract, forward-only restore note, and optional archive file note. |
| `autobyteus-ts/docs/agent_memory_design.md` | It already documents file-backed memory layout and whether archive files are optional. | No change | Existing wording already says `raw_traces_archive.jsonl` is optional. |
| `autobyteus-ts/docs/agent_memory_design_nodejs.md` | Node.js memory design doc mirrors the file-backed memory layout. | No change | Existing wording already says `raw_traces_archive.jsonl` is optional. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Search hit because it discusses domain run ids and team-member identity. | No change | It does not define standalone AutoByteus readable-id formatting rules. |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/run_history.md` | Clarification of identity and storage contract | Added the shared normalized standalone readable-id rule, deduped identical name/role stem rule, forward-only restore note, and explicit optional archive file entry. | These are now part of the durable run-history/runtime-storage contract. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Standalone readable run-id ownership | Standalone AutoByteus run ids now reuse the shared readable-id formatter in `autobyteus-ts` instead of a duplicated server-local formatter. | `tickets/done/agent-run-id-sanitization/implementation.md`, `tickets/done/agent-run-id-sanitization/future-state-runtime-call-stack.md` | `autobyteus-server-ts/docs/modules/run_history.md` |
| Forward-only normalized readable-id behavior | New readable run ids normalize whitespace/punctuation and dedupe identical normalized `name`/`role` stems, while historical stored ids remain restorable as-is. | `tickets/done/agent-run-id-sanitization/requirements.md`, `tickets/done/agent-run-id-sanitization/code-review.md` | `autobyteus-server-ts/docs/modules/run_history.md` |
| Optional archive-memory file behavior | `raw_traces_archive.jsonl` is optional and only exists after pruning/compaction. | `tickets/done/agent-run-id-sanitization/investigation-notes.md`, `tickets/done/agent-run-id-sanitization/api-e2e-testing.md` | `autobyteus-server-ts/docs/modules/run_history.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Server-local duplicated standalone readable-id formatter in `autobyteus-server-ts/src/run-history/utils/agent-run-id-utils.ts` | Shared readable-id formatter ownership in `autobyteus-ts/src/agent/factory/agent-id.ts` | `autobyteus-server-ts/docs/modules/run_history.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A`
- Rationale: `N/A`
- Why existing long-lived docs already remain accurate: `N/A`

## Final Result

- Result: `Updated`
- If `Blocked` because earlier-stage work is required, classification: `N/A`
- Required return path or unblock condition: `N/A`
- Follow-up needed: `No`
