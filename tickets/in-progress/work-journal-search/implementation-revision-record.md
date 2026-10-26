# Implementation Revision Record — work-journal-search (`autobyteus-185`)

The current code and `implementation-handoff.md` are authoritative. This record holds the initial baseline and, later, one entry per implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` ARCH-REV-002 Pass (round 2) | N/A | `Initial Baseline` | SR-001, SR-003, ARCH-REV-002 | Stage 1 (server) and Stage 2 (web) implemented; handed to code review |

## Revision Entries

### IR-001 — Memory search over Work Journals: server, `search_memory`, Memory page

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/work-journal-search/design-review-report.md`, ARCH-REV-002 (Pass), with the Solution Designer's clarifications of R-5, R-6 and R-7.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: branch `codex/work-journal-search` from `ddd6fdcdf6`; commits `02ea886678` … `c66708b44b` (source) plus the ticket-folder commit named in the handoff.
- Related solution revision IDs: SR-001 (requirements), SR-003 (design)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the approved package.
- Approved behavior or requirement IDs affected: R-001 to R-016; AC-001 to AC-013; DS-001 to DS-006; VIS-001 to VIS-024.
- Implementation delta (Change Sequence steps 1–9, Staged Plan Stages 1–2):
  - journal service reads, change notification, nullable runtime, entry reader; `EmbeddingIndex.nearest`;
  - `src/memory-search/` (pipeline, discovery, text and meaning index, search, facade, setting, evaluation);
  - `search_memory` (native and MCP), the `memory` tool unit, the default-limit setting;
  - GraphQL search, status, actions and Work Journal reads; `TaskTeamRootMemorySource`; removal of the per-run episodic/semantic/working-context server path and availability flags;
  - module docs and the `GLOSSARY.md` Memory section; the evaluation command;
  - the Memory page per the approved UI/UX spec, the Work Journal run detail, and the removal of the old tabs and strings.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result: see `implementation-handoff.md` § Checks Run (IMP-01 … IMP-12).
- Next recipient or routing: Code Reviewer (Large, High risk).
- Remaining limitations or risks: see `implementation-handoff.md` § Known Risks (the question file's authoring run; word-share strength on off-topic cues; latency measured under load).
