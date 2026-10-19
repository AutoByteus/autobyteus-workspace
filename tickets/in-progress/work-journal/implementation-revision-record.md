# Implementation Revision Record — work-journal

The current code and `implementation-handoff.md` remain authoritative. This record lists the initial baseline and later implementation deltas.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer / design-review-report.md / ARCH-REV-001, -002, -003 | N/A (non-blocking notes N1–N7 applied) | `Initial Baseline` | SR-010, SR-012, SR-014; ARCH-REV-001, ARCH-REV-002, ARCH-REV-003; CRR N/A; API-REV N/A; DR N/A | Implemented; routed to Code Review |
| IR-002 | code_reviewer / code-review-report.md / CRR-001, round 1 | F-001 | `Local Fix` | SR-014; ARCH-REV-003; CRR-001; API-REV N/A; DR N/A | Fixed; routed to Code Review (Targeted Delta Review) |

## Revision Entries

### IR-001 — Work Journal replaces the work-trace export

- Triggering role, report path, and round:
  - `/architecture_reviewer`, `tickets/in-progress/work-journal/design-review-report.md`;
  - ARCH-REV-001 Pass on SR-010, ARCH-REV-002 (collaboration_model.md §3 row) on SR-012, ARCH-REV-003 Pass on SR-014 (content scope D5, received during implementation).
- Triggering finding IDs: `N/A`. The non-blocking notes N1–N7 were applied.
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result:
  - **Work Journal subsystem:** `autobyteus-server-ts/src/agent-work-journal/`, covering the renderer with five runtime translations, the store, `WorkJournalService` and `WorkJournalRunUpdater`.
  - **Integration:** the updater is wired after the memory recorder in both composition roots, and skill improvement is switched to the journal package.
  - **Removals:** the work-trace export and its replay options are removed, and a startup migration deletes the old folders.
  - **Templates and docs:** updated.
- Related solution revision IDs: `SR-010`, `SR-012`, `SR-014`
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`, `ARCH-REV-003`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-W1–W6; REQ-W1–W9; AC-W1–W9; DEC-W1–W11.
- Implementation delta: everything (initial). Commits `d98c213afc` (implementation), `b19714658c` (baseline fix of two stale skill-improvement tests, TESTING.md Rule 9) and `ea867f9708` (SR-014 D5: system-instruction, compaction and recovery records omitted; interruption wording).
- How the notes were applied:
  - **N1:** attached after the recorder, with a comment. The test uses a real AgentRun and recorder: the assistant segment is flushed only on TURN_COMPLETED, and it appears in the journal. `waitForIdle` is called inside the listener's call stack.
  - **N2:** measured on a 5.2 MB and a 28 MB open file, with the threshold stated before measuring. See Known Risks for the one cold-sample breach.
  - **N3:** the evidence hash comes from the manifest's `content_sha256`, so closed files are not read. A test asserts that the only file read is the manifest.
  - **N4:** `source_record_count` comes from the raw manifest's `record_count`.
  - **N5:** the runtime comes from the live AgentRun; `WorkJournalTarget.runtimeKind: RuntimeKind`.
  - **N6:** the web test title is renamed.
  - **N7:** the migration walks `getMemoryDir()` and never descends into a recognized folder; a test asserts this.
- Changed files or areas: see `implementation-handoff.md` Key Files Or Areas.
- Local validation and result: IMP-01–IMP-11 in `implementation-handoff.md` Checks Run. The full suite at the base and after the change shows no new failure; every base failure has a stated cause.
- Next recipient or routing: Code Review (Large/High), per `get_handoff_rules`.
- Remaining limitations or risks:
  - one N2 cold first-update sample over the p90 threshold;
  - AutoByteus native write ordering, AC-W6 on live runs and the live runtime groups are left to API/E2E;
  - the architecture guard `tests/architecture/application-framework-boundaries.test.ts` fails at the base and is reported as a follow-up.

### IR-002 — In-hunk `--- `/`+++ ` lines kept in patches (F-001)

- Triggering role, report path, and round: `/code_reviewer`, `tickets/in-progress/work-journal/code-review-report.md`, CRR-001 Implementation Review round 1 (Full Review), Fail — Local Fix.
- Triggering finding IDs: `F-001`. NB-1 and NB-2 are non-blocking and need no action.
- Classification: `Local Fix`
- Prior authoritative result: IR-001. `readPatch` skipped every line starting with `--- ` or `+++ `, including in-hunk lines that remove `-- x` or add `++ x`; those lines were lost from the diff and from the `+/−` counts.
- Current authoritative result: those lines are skipped only before the first `@@` hunk header (file headers). Inside a hunk they are diff lines and are counted.
- Related solution revision IDs: `SR-014`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this implementation revision is recorded: the code reviewer's Local Fix F-001.
- Approved behavior or requirement IDs affected: BEH-W1 / REQ-W1 (Edit file diff and `+added −removed`, contract §2/§4) for Codex and AutoByteus `edit_file`.
- Implementation delta: one condition in `readPatch` (`hunks === 0 &&` before the header skip), with a comment.
- Changed files or areas:
  - `autobyteus-server-ts/src/agent-work-journal/rendering/text-diff.ts`;
  - `autobyteus-server-ts/tests/agent-work-journal/rendering/rendering-building-blocks.test.ts` (new case: the reviewer's SQL probe plus an in-hunk `+++ x` in a second hunk).
- Commit: `8f5bb563b1`.
- Local validation and result:
  - The new case failed before the fix, which reproduced F-001.
  - After the fix, IMP-02 passes (`Tests  76 passed | 2 skipped (78)`) and IMP-01 (typecheck) passes, both at `8f5bb563b1`.
  - The Codex no-hunk path (a new file written from the raw patch) doesn't use `readPatch`'s lines, so it is unaffected.
- Next recipient or routing: Code Review, Targeted Delta Review.
- Remaining limitations or risks: unchanged from IR-001. NB-1 (cut only the kept lines in the shorteners) is not taken in this fix.
