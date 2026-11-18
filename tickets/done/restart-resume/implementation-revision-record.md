# Implementation Revision Record — restart-resume (autobyteus-285)

The current code and `implementation-handoff.md` are authoritative. This record indexes implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/software_engineering_team/architecture_reviewer`, `design-review-report.md` (ARCH-REV-002 Pass) | N/A | `Initial Baseline` | SR-004, ARCH-REV-002 | D1–D5 implemented with tests and docs; ready for code review |
| IR-002 | `/software_engineering_team/architecture_reviewer`, `design-review-report.md` (ARCH-REV-003 Pass on SR-005) | F-API-001, O-1 (CRR-002); N-11 to N-14 | `Design Impact` (implemented revised design) | SR-005, ARCH-REV-003, CRR-002, API-REV-001 | Restore → re-check → first-input-only notice; one notice display for every place; back to code review |

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

### IR-002 — Restore, re-check, post a first-input-only notice; one notice display (SR-005)

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md` (ARCH-REV-003 `Pass` on SR-005), 2026-11-01.
- Triggering finding IDs: F-API-001 and O-1 (API-REV-001 → CRR-002 Design Impact → SR-005); N-11 to N-14 (ARCH-REV-003).
- Classification: `Design Impact` (an upstream design revision, implemented here).
- Prior authoritative result: IR-001 (CRR-001 `Pass`; API-REV-001 `Fail`: a run that got input while its resume was restoring could still get the notice; a member's notice was not in its memory).
- Current authoritative result: SR-005 implemented; ready for code review.
- Related solution revision IDs: SR-005 (REQ-003 clarified: "already received new input" = any input reserved or admitted by the instance before the notice).
- Related architecture-review revision IDs: ARCH-REV-003.
- Related code-review revision IDs: CRR-001, CRR-002.
- Related API/E2E revision IDs: API-REV-001.
- Related delivery revision IDs: N/A.
- Why this revision is recorded: the guard against a duplicate turn moves from a check before the post to the run's own admission, and every place shows the notice as the run's own system notice.
- Approved behavior or requirement IDs affected: BEH-002, BEH-003, BEH-004 (REQ-003, REQ-004, REQ-006).
- Implementation delta:
  1. `AgentRunInputOptions.onlyAsFirstInput` and `AGENT_RUN_INPUT_NOT_FIRST`; decided in `AgentRunInputAdmissionState.reserve` (`nextSequence > 1`), passed by `AgentRun.postUserMessage`/`reserveUserMessage`.
  2. `post_message.postOptions` through the three handle switch sites, `FlatTeamAgentExecutionHandle` and `ConfiguredAgentExecutionHandle` (caller observer composed with the unsent-input observer; no `member_input` for a platform notice, decided before the post). `executeRemoteChildCommand` refuses a first-input-only post (N-13).
  3. `restartNoticeLifecycleObserver(runOf, text)` in `restart-notice.ts`; IR-001's member presentation mapping removed.
  4. `RestartResumer.resumeOne`: pre-filter → `resolveOrRestore` (+ `ensureHostReady` for a host) → re-check the root's row → post with `onlyAsFirstInput`; NOT_FIRST counted as skipped. The composition no longer passes a host command port.
  5. Tests: `agent-run.test.ts` (3), `configured-agent-execution-handle.test.ts` (3, incl. N-12 member and N-14), `standalone-agent-run-root.test.ts` (N-12 host and copy), `agent-org-execution-scope-builder.test.ts` (restored member options), `flat-team-execution-manager-routing.test.ts` (Team pass-through), `remote-child-commands.test.ts` (N-13), `restart-resumer.test.ts` (rewritten for SR-005), `restart-notice.test.ts` (observer).
  6. Docs: `restart_resume.md`, `agent_execution.md`.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas. Code commits `82932a8b48` and `7d9a305627` (a test asserting the old call shape).
- Local validation and result: IMP-07 to IMP-10 pass; five SR-005 mutations each fail their test (see `implementation-handoff.md` § Checks Run).
- Next recipient or routing: Code Reviewer (Large / High), per `get_handoff_rules`.
- Remaining limitations or risks: N-11 (kept as is); a notice that loses to earlier input leaves that run without the notice or list; FU-001 to FU-003.

