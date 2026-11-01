# Implementation Revision Record — restart-resume (autobyteus-285)

The current code and `implementation-handoff.md` are authoritative. This record indexes implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/software_engineering_team/architecture_reviewer`, `design-review-report.md` (ARCH-REV-002 Pass) | N/A | `Initial Baseline` | SR-004, ARCH-REV-002 | D1–D5 implemented with tests and docs; ready for code review |

## Revision Entries

### IR-001 — Record busy runs at shutdown; resume them after an update restart

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md` (ARCH-REV-002 `Pass`), 2026-11-01.
- Triggering finding IDs: N/A (N-7, N-8 and N-10 applied; N-2 left to validation).
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: design-spec § Change / Refactor Sequence steps 1–6 done; step 7 (validation) belongs to API/E2E.
- Related solution revision IDs: SR-004 (design), SR-002 (approval).
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001 to BEH-004; REQ-001 to REQ-006.
- Implementation delta:
  1. D1: `scripts/write-release-identity.mjs` (run by `build:full`), `src/restart-resume/release-identity.ts`.
  2. `placeOf` on `ActiveCollaborationRootDirectory`; `isDelegatedRun` on the boundary, `RootTaskExecutionLifecycle`, `TeamTaskExecutionService` and the three roots. D5: `src/compositions/collaboration-root-resolver.ts`, built in `build-studio-server.ts`; `RemoteRootDirectory.standalone/team/org` delegate to it.
  3. D2: `busy-run-record.ts`, `busy-run-recorder.ts`; `server-runtime.ts` cleanup = record, then `app.close()`.
  4. D4: `RESTART_RESUME_NOTICE_SENDER_ID`, recorded in memory; `restart-notice.ts`; the member presentation maps the restart notice's `member_input` to a system notice.
  5. D3: `restart-resumer.ts`; composed in `restart-resume-composition.ts`; started in the background after `recoverAfterListen`.
  6. Docs: new `restart_resume.md`, `agent_execution.md`, `remote_collaboration.md`, the module index.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas. Code commits `ab4ba6e7dc` (code), `b4d770d364` (tests, docs), `b50e2354ab` (size limit).
- Local validation and result: IMP-01 to IMP-06 pass; six rule mutations each fail their test (see `implementation-handoff.md` § Checks Run).
- Next recipient or routing: Code Reviewer (Large / High), per `get_handoff_rules`.
- Remaining limitations or risks: see the handoff's Known Risks (wave order reading, member memory, FU-001 to FU-003).
