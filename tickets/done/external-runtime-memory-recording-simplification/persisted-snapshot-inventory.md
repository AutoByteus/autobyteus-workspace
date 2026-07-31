# Persisted Snapshot Inventory

## Artifact Status

- Purpose: Retained, aggregate-only evidence for the persisted-data decision in this ticket.
- Scope: Local AutoByteus memory root at `/Users/normy/.autobyteus/server-data/memory` on 2026-07-31.
- Status: Complete for solution-design evidence; implementation must not hard-code these observed counts.
- Approval Applicability: `N/A` — this artifact records observed data and does not define intended product behavior.
- Privacy Posture: The probe read JSON metadata needed for runtime classification and file statistics needed for sizing. It did not print or retain conversation, reasoning, tool, or other user-content payloads.

## Probe Method

The inventory used repository-owned run/team metadata and the current on-disk layout to classify snapshot-bearing locations. It aggregated:

- `working_context_snapshot.json` count and byte size;
- runtime kind from standalone run metadata or current recursive team-member metadata;
- presence and size of active raw traces, complete raw-trace archive segments, and archive manifests;
- snapshot schema version and message count, without retaining message content.

Classification did **not** infer runtime ownership from a filename or directory name. Locations without an authoritative current runtime identity were reported as unclassified.

## Aggregate Snapshot Inventory

| Classification | Snapshot Files | Snapshot Bytes (Approx.) | Cleanup Classification |
| --- | ---: | ---: | --- |
| Standalone Codex | 104 | 70.17 MiB | Verified external runtime |
| Team-member Codex | 1,599 | 3.11 GiB | Verified external runtime |
| Standalone Claude | 13 | 413.34 KiB | Verified external runtime |
| Team-member Claude | 17 | 2.22 MiB | Verified external runtime |
| Standalone AutoByteus | 231 | 14.58 MiB | Native; preserve |
| Team-member AutoByteus | 116 | 16.42 MiB | Native; preserve |
| Standalone unknown | 150 | 664.27 KiB | Unclassified; preserve |
| Team unclassified | 18 | 372.79 KiB | Unclassified; preserve |
| Imported corpus | 86 | 138.40 MiB | Read-only imported history; preserve |

The complete probed root contained 2,334 snapshot files and approximately 3.35 GiB of snapshot data.

## Verified External Duplicate Evidence

| Runtime | Snapshot Files | Snapshot Size | Active + Archived Raw Size | Snapshot Messages | Raw-Trace Lines | Active Raw Present |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Codex | 1,703 | 3.18 GiB | 3.47 GiB | 465,244 | 604,757 | 1,703 / 1,703 |
| Claude | 30 | 2.63 MiB | 3.21 MiB | 1,088 | 1,088 | 30 / 30 |

Additional aggregate observations:

- Every metadata-classified external snapshot location had an active raw-trace corpus.
- The classified Codex snapshot corpus was approximately 91.8% of the size of its active-plus-archived raw corpus; the Claude ratio was approximately 81.8%.
- All classified external snapshots decoded successfully. Observed schema versions were Codex `3` (571), `4` (1,131), `5` (1), and Claude `3` (4), `4` (26).
- The snapshot copy is therefore material storage duplication, not a negligible cache.

## Safety Findings And Design Implications

1. The classified external corpus is large enough to justify one-time disposal rather than merely stopping future writes.
2. Native AutoByteus snapshots share the same filename but are authoritative continuation state; filename-based global deletion is unsafe.
3. Current standalone run metadata and recursive team-member metadata can identify a large, exact external-runtime cleanup set.
4. Historical locations with missing or unmatched metadata cannot be safely classified. They must remain untouched rather than guessed from path shape.
5. Imported memory is a separately managed, read-only historical corpus with sync manifests. It is excluded from this cleanup because deleting a file there would change imported-history semantics and require manifest coordination.
6. Historical task-agent directories do not have a stable persisted runtime-identity map sufficient for broad cleanup. They are excluded unless exact current metadata identifies them through the supported team-member layout.
7. The cleanup can delete only the classified external `working_context_snapshot.json` file. Raw traces, archive segments/manifests, metadata, provider session identifiers, and artifacts remain unchanged.

## Decision Supported

The evidence supports `Discard or Rebuild` for exact metadata-classified Codex and Claude snapshots. It does not support deleting native, imported, missing-metadata, unmatched, or otherwise unclassified snapshot files.

