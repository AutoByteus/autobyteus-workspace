# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, ARCH-REV-004 pass of SR-008 (the pause of 2026-11-19 ended) | N/A (review notes N-8…N-11 applied) | `Initial Baseline` | SR-008, ARCH-REV-004 | Implemented design steps 1–7 and the AC-012 measurement; ready for code review |

## Revision Entries

### IR-001 — Semantic memory for every agent, global semantic memory, the Memory page by owner

- Triggering role, report path, and round: architecture reviewer (`/architecture_reviewer`), `design-review-report.md`, ARCH-REV-004 (`Pass`, SR-008)
- Triggering finding IDs: N/A (review notes N-8, N-9, N-10, N-11 applied; N-4 from ARCH-REV-002 applied)
- Classification: `Initial Baseline`
- Prior authoritative result: none committed. Work on SR-002 stopped on 2026-11-19 at the founder's request
  (`implementation-progress.md`, still in this folder as the record of the pause); its uncommitted state was kept as
  `wip-uncommitted.patch`. SR-008's step 1 took from it the unconditional gate, the server field removal and the core
  tests, and dropped `AgentSemanticMemoryBrowser`, its GraphQL queries and its tests. The patch file is removed: it
  holds only code that SR-008 replaced or that IR-001 now carries.
- Current authoritative result: implemented; checks in `implementation-handoff.md` § Checks Run
- Related solution revision IDs: SR-008 (requirements and design); the UI/UX spec `semantic-memory-view-554` (Approved 2026-11-20)
- Related architecture-review revision IDs: ARCH-REV-004 (and ARCH-REV-002 for N-4)
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the first committed implementation of the approved package
- Approved behavior or requirement IDs affected: BEH-001…BEH-005; REQ-001…REQ-012
- Implementation delta: see `implementation-handoff.md` § Reviewed Behavior Implementation Trace and § Key Files Or Areas
- Commits: `56b02294d0` (code, tests, docs), `a9ca3c48c6` (member-only owner loading state; rendered probe), `cff2a6596a` (link rows sort with the files), then the evidence and this record
