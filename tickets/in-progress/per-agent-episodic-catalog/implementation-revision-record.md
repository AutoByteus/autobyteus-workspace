# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, ARCH-REV-002 pass and ARCH-REV-004 (contract addendum) | N/A | `Initial Baseline` | SR-002, ARCH-REV-002, ARCH-REV-004 | Implemented design steps 1–6 and the AC-010 measurement of step 7; ready for code review |

## Revision Entries

### IR-001 — Episodic catalog per agent definition (initial implementation)

- Triggering role, report path, and round: architecture reviewer (`/architecture_reviewer`), `design-review-report.md`, ARCH-REV-002 (`Pass`) and ARCH-REV-004 (`Pass`, contract addendum)
- Triggering finding IDs: N/A (review notes N-1, N-2 applied)
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implemented; implementation-scoped checks recorded in `implementation-handoff.md` § Checks Run
- Related solution revision IDs: SR-002 (with the contract addendum)
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-004
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the first implementation of the approved package
- Approved behavior or requirement IDs affected: BEH-001…BEH-006; REQ-001…REQ-013
- Implementation delta: see `implementation-handoff.md` § Reviewed Behavior Implementation Trace and § Key Files Or Areas
- Commits: `1bb4a44e83`, `00bb99fe77`, `0be36462ef`
- Changed files or areas: `src/agent-episodic-catalog/` (new); `src/agent-memory/` (layout, moved run-folder discovery, `DiscoveredRun`); `src/agent-work-journal/` (spans); `src/memory-search/` (mapping, imports); `src/api/graphql/types/memory-search.ts` (import); run services' delete (three files); `ProjectTaskService.taskTitleOf`; supervisor input and `composeCollaboration`; both composition roots; docs and `GLOSSARY.md`; tests
- Local validation and result: `implementation-handoff.md` § Checks Run. The AC-010 probe on the founder's memory clone (IMP-07) found that older journal manifests left most runs "no journal yet"; fixed in the same round (`0be36462ef`, `readManifestJournalFileNames`), then measured again: first start 9.9 s, second 3.4 s, nothing rewritten, nothing changed outside `episodic/`
- Next recipient or routing: Code Reviewer (Large / High route), by `get_handoff_rules`
- Remaining limitations or risks: `implementation-handoff.md` § Known Risks
