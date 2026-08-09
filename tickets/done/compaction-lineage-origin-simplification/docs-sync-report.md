# Docs Sync Report

## Scope

- Ticket: `compaction-lineage-origin-simplification`
- Trigger: `CRR-002` proportional durable-test review Pass following `API-REV-001` Pass.
- Bootstrap base reference: `origin/personal` at `647b1119a9dc3ba2ba301243e1b5e752943454db`.
- Integrated base reference used for docs sync: refreshed `origin/personal` at `647b1119a9dc3ba2ba301243e1b5e752943454db`; ticket checkpoint `bc6e09abcbb36086ec73089ac7e799813deab7c5` is three commits ahead and zero behind.
- Post-integration verification reference: base refresh found no new commits to integrate, so no executable rerun was required. Delivery documentation checks are recorded under `delivery-evidence/`.

## Why Docs Were Updated

- Summary: Four long-lived memory documents still described compaction lineage as an output-to-raw-archive origin graph and named removed resolver/service owners. They now describe the reviewed clean-cut contract: a complete accepted lineage record, independent exact raw archival, lineage-tail-only current output loading, ignored historic JSON supersets, and no direct/recursive origin service.
- Why this should live in long-lived project docs: These files are the durable architecture and module references for native memory persistence, compaction commit ordering, current projection, raw archive ownership, and server composition. Leaving the removed contract in place would direct future work toward nonexistent production APIs.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/agent_memory_design.md` | Canonical native memory design and owner map | `Updated` | Removed obsolete lineage-to-archive/origin semantics and promoted independent archive/current-output contracts. |
| `autobyteus-ts/docs/agent_memory_design_nodejs.md` | Node.js/TypeScript mirror of the native design | `Updated` | Kept content aligned with the canonical design; title remains its only intentional difference. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Server memory layout, runtime ownership, archive behavior, and service boundary | `Updated` | Removed `AgentMemoryOriginService` contract; clarified complete candidate, current loader, historical field treatment, and stable selected-ID archive identity. |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Cross-module native compaction composition | `Updated` | Replaced origin-service architecture with lineage-tail projection and raw-archive independence. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/agent_memory_design.md` | Architecture contract | Lineage now owns output membership, predecessor continuity, and audit metadata; raw archiving is a sibling commit effect whose descriptor/filename remain archive-owned. The removed resolver/service paths are absent from the source-owner map. | Match `REQ-001` through `REQ-006` and production source commit `9bcac525850d8e65d1ac4c792401b77c7ee0d396`. |
| `autobyteus-ts/docs/agent_memory_design_nodejs.md` | Architecture contract | Same durable contract as the canonical design. | Prevent the language-specific mirror from preserving stale APIs. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Module/runtime contract | Documents current lineage membership, independent exact archive command, canonical selection boundary key, direct use of stored supersets, current-loader integrity behavior, and absence of a server origin API. | Match final core/server ownership and retained raw-trace behavior. |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Cross-module composition | Documents the complete accepted candidate and effect order without archive-result feedback; removes the obsolete backend origin composition. | Keep the high-level server architecture consistent with the implemented call graph. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Accepted compaction | The candidate contains one complete lineage record before commit; commit order remains archive, outputs, lineage, context, snapshot, pending clear. | `requirements.md`, `design-spec.md`, `implementation-handoff.md` | Both core memory design docs; server module; server architecture |
| Independent raw archive | `archiveExactRawTraces(...)` is command-style. The store derives `native_compaction_selection:<sha256>` from the JSON encoding of sorted selected IDs; the archive manager owns descriptor/filename/completion. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | Both core memory design docs; server module; server architecture |
| Current output authority | The lineage tail names exact episode/semantic membership. Missing/misordered output is an integrity error, and current projection does not read raw archives. | `requirements.md`, `design-spec.md`, `api-e2e-test-review-report.md` | Both core memory design docs; server module; server architecture |
| Persisted-data treatment | Existing schema-v1 JSON supersets with `rawTraceArchiveFile` remain directly readable through recognized-field projection; new rows omit it; no rewrite or migration is required. | `persisted-lineage-inventory.md`, `design-review-report.md`, `code-review-report.md` | All four reviewed docs |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `CompactionLineageResolver`, origin DTO/error types, and origin-only store queries | No substitute origin API; current output loading and independent raw evidence remain | Both core memory design docs, section 9 |
| `AgentMemoryOriginService` | No server/GraphQL origin service; existing memory inspection and evidence projection remain separate | Server module `Runtime Ownership`; server `ARCHITECTURE.md` native compaction section |
| `rawTraceArchiveFile` on new lineage rows | Archive-manager-owned descriptor/filename; lineage retains only current output/predecessor/audit fields | All four reviewed docs |
| Lineage-to-archive current authority | Lineage tail selects exact current output; raw archive manifest and segments remain separately enumerable evidence | Both core design docs and server memory module |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: Present the integrated delivery handoff and wait for explicit user verification before ticket archival, final commit/push, merge to `personal`, or any release action.
- Notes: Documentation-only delivery changes do not alter the reviewed executable state. No release notes were required because no release/publication request or versioning method is in scope at this hold point.
