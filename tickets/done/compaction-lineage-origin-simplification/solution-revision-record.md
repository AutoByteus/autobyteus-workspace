# Solution Revision Record

The latest `requirements.md`, `investigation-notes.md`, `design-spec.md`, and `persisted-lineage-inventory.md` remain authoritative. This file is the concise round/rationale index.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Solution designer / initial user-approved ticket baseline | N/A | Initial Baseline | Ready for architecture review |

## Revision Entries

### SR-001 — Remove unused compacted-output raw-origin coupling

- Triggering role, report path, and round: solution designer; initial solution round following the user's `2026-08-08` request to create a dedicated simplification ticket; no report path.
- Triggering finding IDs: `N/A`
- Prior authoritative result: `N/A`
- Current authoritative result: `Design-ready requirements and architecture-review-ready design`
- Why this baseline or revision entry is recorded: establish the initial clean-cut solution package before architecture review.
- Resolution: preserve current compaction head/output loading and independent raw evidence; remove `rawTraceArchiveFile`, archive-descriptor flow into compaction, direct/recursive origin resolver/types/queries/exports/server service, and origin-only tests/docs. Existing stored JSON supersets are directly usable without migration; future Work Evidence/hierarchical memory remains separate.
- Approved behavior or requirement IDs affected: BEH-001 through BEH-006; REQ-001 through REQ-007; AC-001 through AC-009.
- Canonical artifacts and sections updated: all sections of `requirements.md`, `investigation-notes.md`, and `design-spec.md` created/refined as the initial authority.
- Supplemental artifacts updated, added, or removed: added `persisted-lineage-inventory.md` as evidence-only persisted-data support.
- Downstream and architecture-review impact: architecture reviewer must validate the schema contraction, independent raw archive command boundary, full removal inventory, retained head/output invariants, and no-migration basis before implementation begins.
- Next recipient or routing: `architecture_reviewer`.
- Remaining gaps or risks: no requirement gap; implementation must avoid touching generic external/provider raw archive paths and must retain broad compaction integration coverage while removing only origin assertions.
