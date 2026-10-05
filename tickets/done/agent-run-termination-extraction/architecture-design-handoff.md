# Architecture Design Complete — agent-run-termination-extraction (SR-004)

- Result: `Architecture Design Complete`. Package `agent-run-termination-extraction`, revision SR-004. Requirements are
  Approved in SR-003 (the user said "you decide. you have the design princples to follow. lets go. approve"; basis
  SR-002, DEC-003 as recommended).
- Classification: **task_size=Medium, architectural_risk=High.**
  - Medium: one new file, one modified file, one additive test, docs; no caller, contract or persistence change.
  - High: termination and the root-shutdown fence sit on every Stop, delete, archive and shutdown for every root and
    runtime. They depend on dispatch-lane order, microtask evaluation and promise identity. F-02 showed the
    sensitivity.
- From `/solution_designer`, 2026-10-05.

## Origin and scope
- Origin: `/code_reviewer`'s 2026-10-04 request (from the review of `standalone-agent-run-root`), directed by the user.
- Narrowed by the user on 2026-10-05 to Part A only: extract termination and the root-shutdown fence from `AgentRun`
  with no behavior change.
- Part B (shared root delivery core) is deferred as a follow-up candidate that first validates the behavior:
  `/Users/normy/autobyteus_org/solution-designer-reports/root-delivery-core-followup-candidate.md`. It is out of scope
  here.

## Design summary
- New `AgentRunTermination` (`src/agent-execution/domain/agent-run-termination.ts`): AgentRun's internal owner of the
  termination lifecycle (prepare/cancel/commit/finish with coalescing) and fence attempt selection and scheduling
  (F-1–F-4 preserved).
- Options port onto AgentRun state, following the `AgentRunInterruptState` pattern. No `AgentRun` import, so no cycle.
- `AgentRun` keeps its 4 public methods as plain delegations; the internal triggers call
  `scheduleRootShutdownEvaluation()`.
- The fence and prepared-termination files are unchanged; all importers are unchanged.
- One additive coalescing test. `agent-run.ts` ≈ 365 lines (≤ 400).
- Gates:
  - the Part A suites pass unchanged (zero assertion edits expected);
  - LE-O1 on Codex ×10;
  - live mention and agent-initiated suites on Claude and Codex;
  - no new failures against `evidence/baseline-server-failures.txt` (by test name and message).

## Review focus
- Is the options port minimal and correct?
  - `interrupt` routes through `AgentRun.interrupt`;
  - detach is lazy;
  - only the uncertain-dispatch `claim` is exposed.
- Are the shape rules sufficient against ordering drift: non-async delegation, current-attempt microtask, verbatim
  bodies?
- Is the Medium/High classification right?

## Artifacts
- /Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction/evidence/baseline-server-failures.txt
- Predecessor (read-only): `origin/personal:tickets/done/standalone-agent-run-root/` (design-spec § 11).
- Prior independent review artifacts: N/A (first review for this package).

## Workspace
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction`.
- Branch `codex/agent-run-termination-extraction` (local, not pushed).
- Base `origin/personal` @ `03d5db06b`. Target `personal`.
- The worktree has dependencies installed, shared packages built and Prisma generated.

## Route
- Medium/High → `/architecture_reviewer` (rule: "architectural_risk=High"). Delivered 2026-10-05 (target run `architecture_reviewer_2e6d87408aa4462c992aae977449ef6a`).
- ARCH-REV-001 Pass on SR-004 recorded 2026-10-05; implementation handoff delivered by the reviewer to /implementation_engineer.
