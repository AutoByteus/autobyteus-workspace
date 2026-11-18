# Architecture Review Revision Record — atomic-agent-run-creation (autobyteus-349)

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial review of SR-003 | SR-002, SR-003 | N/A | Fail (Design Impact) | AR-001, AR-002 |
| ARCH-REV-002 | Round 2 / re-review of SR-004 | SR-002, SR-004 | Fail (Design Impact) | Pass | AR-001, AR-002 resolved |

## Revision Entries

### ARCH-REV-001 — Initial baseline: D1 and D2 are right; add the health assessment and a fail-safe content walk

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/atomic-agent-run-creation/tickets/in-progress/atomic-agent-run-creation/design-review-report.md`
- Review round and trigger: Round 1. `/software_engineering_team/solution_designer` sent SR-003 as `Architecture Design Complete` (Small/High), with user approval of the design `Obtained`.
- Triggering role, report path, and finding IDs: Solution Designer; `architecture-design-handoff.md`; N/A.
- Relevant solution revision IDs: SR-002 (approval), SR-003 (design).
- Prior authoritative decision: N/A.
- Current authoritative decision: Fail (Design Impact).
- Baseline established (code at `b9703e2b37` / `e87e6bb2b1`):
  - `createAgentRun` has no rollback.
  - `cancelPreparedRun` refuses started and active runs, then removes recursively.
  - `cleanupStalePreparedRuns` is dead and judges by its marks only.
  - Run content (context files, work journal, traces, collaboration children) lives inside `memory/agents/<runId>`.
  - The process `AgentRunService` is bound during `buildStudioServer`. The startup stage slot lies between it and `prepareBeforeListen`.

#### Prior Finding Resolution

None (first round).

- New or remaining finding IDs:
  - AR-001 (Low, blocking by rule): add the Task Design Health Assessment and the behavior-to-spine map.
  - AR-002 (Medium, blocking): the content walk does not follow symlinks; any non-directory entry other than `run_metadata.json` is content; **any walk error means keep and log**. Add tests for an unreadable subfolder and a symlink.
- Non-blocking notes:
  - N-1: the title is lost with an empty run (approved);
  - N-2: the May runs stay cancellable by `isPreparedIdentity` (a follow-up candidate);
  - N-3: a peer's delegation around a restart;
  - N-4: startup metadata reads;
  - N-5: FU-001 and FU-002.
- Material classification changes: none (Small/High).
- Recommended recipient: `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: none beyond the notes.

### ARCH-REV-002 — SR-004: health assessment and fail-safe content walk added; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/atomic-agent-run-creation/tickets/in-progress/atomic-agent-run-creation/design-review-report.md`
- Review round and trigger: Round 2. `/software_engineering_team/solution_designer` sent SR-004, the design revision for ARCH-REV-001.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` (SR-004); AR-001, AR-002.
- Relevant solution revision IDs: SR-002 (approval, unchanged), SR-004 (design).
- Prior authoritative decision: Fail (Design Impact).
- Current authoritative decision: Pass.
- What changed: SR-004 is docs only (head `25107fb04f`), so the round-1 code basis still applies. The changed spec sections and FU-004 were verified.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Low, blocking by rule) | Resolved | SR-004 | Changes in design-spec: the Relevant Behavior And Production-Path Map (BEH-001 → DS-001, BEH-002 → DS-002, BEH-003 preserved) and the Task Design Health Assessment (`Bug Fix`; `Missing Invariant` with F-01, F-05 and the read-only count; refactor `No` with the reason; residuals FU-001 to FU-004, N-1, N-3) |
| AR-002 | Open (Medium, blocking) | Resolved | SR-004 | Changes in design-spec: D2 step 3 uses `readdir(withFileTypes)` or `lstat` without following symlinks; only directories and the top-level regular `run_metadata.json` are allowed; any other entry is content; any walk error keeps the run and logs it, citing `fs.rm(…, { recursive: true, force: true })`. The Examples match. The provisioning tests list an unreadable subfolder or injected `readdir` failure, and a symlink |

- New or remaining finding IDs: none.
- Non-blocking notes: N-1, N-3, N-4 and N-5 carried; N-2 recorded as FU-004.
- Material classification changes: none (Small/High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`, with an informational notification to the Solution Designer.
- Remaining risks or uncertainty: none beyond the notes.
