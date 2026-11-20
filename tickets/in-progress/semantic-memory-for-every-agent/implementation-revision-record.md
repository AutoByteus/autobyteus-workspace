# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, ARCH-REV-004 pass of SR-008 (the pause of 2026-11-19 ended) | N/A (review notes N-8…N-11 applied) | `Initial Baseline` | SR-008, ARCH-REV-004 | Implemented design steps 1–7 and the AC-012 measurement; ready for code review |
| IR-002 | Code reviewer, `code-review-report.md`, CRR-001 (`Fail`, `Local Fix`) | CR-001 | `Local Fix` | IR-001, CRR-001 | The folder view's workspace lives exactly as long as the view; ready for targeted code review |

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

### IR-002 — CR-001: the folder view releases its workspace when left during the first listing

- Triggering role, report path, and round: code reviewer (`/code_reviewer`), `code-review-report.md`, CRR-001 (`Fail`, `Local Fix`)
- Triggering finding IDs: CR-001
- Classification: `Local Fix`
- Prior authoritative result: IR-001 (`56b02294d0` … `ecbb4741ca`)
- Current authoritative result: implemented in `cd26f4d913`; checks IMP-14…IMP-16 in `implementation-handoff.md` § Checks Run
- Related solution revision IDs: SR-008 (REQ-007; the reviewer's SCN-LEAVE)
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this revision exists: `SemanticMemoryFolder.vue` registered the folder's workspace and kept its id only after the first `fetchFolderChildren` returned, so leaving the view while it loaded (Episodic tab, Back, another page) left a `semantic_memory` entry in the web store, which `ChatWorkspaceMenu` offers until reload; a late listing also set the id on the unmounted view.
- Approved behavior or requirement IDs affected: REQ-007 (never in any workspace list or picker); no behavior change otherwise
- Implementation delta: the component keeps `registeredId` from the moment of registration, and `release()` (also on unmount) unregisters it and starts a new generation; a listing that completes in an older generation is ignored (no `workspaceId`, no error shown); a failed listing in the current generation releases and shows the error. Two component specs on the real workspace store: unmount during a pending listing leaves no `semantic_` entry and no `semantic_memory` metadata, also after the late listing; an agent change during a pending listing keeps only the current folder's workspace and shows only it. Both fail on the reviewed component (negative control, IMP-14).
- Not changed: FU-003 (the menus listing transient workspaces; `SkillWorkspaceLoader`'s same pattern) stays a follow-up, as the reviewer recorded it.
- Commits: `cd26f4d913` (fix and specs), then the evidence and these records
