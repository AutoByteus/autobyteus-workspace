# Implementation Revision Record — autobyteus-638 A restart keeps a person's runs running

The current code and [implementation-handoff.md](implementation-handoff.md) are authoritative. This record indexes
the implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, [design-review-report.md](design-review-report.md), round 2 (Pass) | AR-002 (non-blocking, fixed) | `Initial Baseline` | SR-003, ARCH-REV-002, CRR-001 | Implemented; code review CRR-001 Pass (9.5/10, no findings), sent on to API/E2E |

## Revision Entries

### IR-001 — Running-run record, recorder and restorer; Team root `ensureAgentReady`

- Triggering role, report path, and round: architecture reviewer, `design-review-report.md`, ARCH-REV-002 Pass
  (round 2), 2026-11-24.
- Triggering finding IDs: AR-002 (non-blocking): the recorder's last-written set starts as unknown (`null`), so its
  first check always writes or removes the file; covered by a test.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implementation complete (see the handoff).
- Related solution revision IDs: SR-003.
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002.
- Related code-review revision IDs: CRR-001 (Pass, 9.5/10, no findings, [code-review-report.md](code-review-report.md); informational: FU-001 agreed as a follow-up; residual: `root-team-run.ts` at 495 of 500 non-empty lines).
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the initial implementation of the reviewed design.
- Approved behavior or requirement IDs affected: REQ-001…REQ-005, AC-001…AC-006, BEH-001…BEH-003.
- Implementation delta:
  - C-2: `RootTeamRun.ensureAgentReady(agentRunId)` → `TeamRun.ensureDirectAgentReady` →
    `TeamRunBackend`/`FlatTeamRunBackend.ensureDirectAgentReady` → `FlatTeamExecutionManager.ensureDirectAgentReady` →
    the member handle's `getOrCreateAgentRun()`, in the root's materialization gate; an unknown member throws
    `RUN_NOT_FOUND`.
  - C-1: `restart-resume/running-run-record.ts` (path, tolerant reader, sorted atomic writer, remove).
  - `RunningRunRecorder` (only writer; `running ∪ pending`; first check always reconciles; Orgs skipped; `error`
    recorded; final write awaits in-flight reads ≤ 1 s).
  - `RunningRunRestorer` (`take()` reads without removing; `pending()`; `restore()` at most 3 at a time, skips, failure
    isolation, history re-read after the restore, pending shrinks per outcome).
  - `restart-resume/concurrency-limiter.ts`: the resumer's limiter extracted verbatim (the design allowed it) and used
    by both.
  - Composition (restorer first, then the recorder with its `pending`), `build-studio-server.ts` (passes `running` and a
    `RunOwnAgentsReader`), `server-runtime.ts` (take after the busy take, both recorders start, both final writes before
    the close, restore after the wake).
  - Docs: `restart_resume.md` (Running runs come back), `collaboration_model.md` §1 Running agent.
- Changed files or areas: see the handoff's Key Files.
- Local validation and result: IMP-01…IMP-07 Pass, except RR-10 of the existing restart-reminder E2E, which fails the same way on the base (IMP-08, FU-001); see the handoff.
- Next recipient or routing: `/code_reviewer` (architectural risk High).
- Remaining limitations or risks: see the handoff's Known Risks.
