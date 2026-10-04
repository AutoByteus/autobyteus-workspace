# Architecture Design Complete — standalone-agent-run-root (SR-006 root shutdown fence; previously SR-005 base refresh)

## SR-006 round (2026-10-04) — current
- Result: `Architecture Design Complete`, revision **SR-006** (requirements basis SR-002 unchanged; no renewed approval
  needed). Classification: **Large / High** (unchanged).
- Trigger: the code reviewer's CRR-005 failure-origin review of API/E2E F-02 (Design Impact). A busy Org root on Codex
  cannot be stopped: branch 3 of 10, base 0 of 12. The cause is the shared `AgentRunRootShutdownFence`, which latches
  a rejected "no active turn" interrupt permanently while the turn's completion is still being dispatched.
- Decision: fixed in this ticket (AC-001 and AC-010 are approved and need it; an AC-001 exception is rejected).
- Design: `design-spec.md` § 11.
  - F-1: a rejected interrupt keeps the attempt open until quiescence.
  - F-2: bounded wait (5000 ms), then the original result.
  - F-3: only acceptance is irreversible; a failed attempt is retryable, matching `createFrozenRootTerminationScope`.
  - F-4: diagnostics (run ID, local active turn, interrupt result).
  - No runtime error-text parsing.
  - Deterministic unit tests are listed; live: LE-O1 on Codex ≥10 runs, AC-001 suites on Claude and Codex.
- Evidence: `investigation-notes.md` E-22. Revision: `solution-revision-record.md` SR-006.
- Review focus:
  - F-3 retryability versus the original "irreversible latch" intent;
  - the 5 s bound;
  - whether quiescence-only success (no error-text recognition) is sufficient on all runtimes.
- Code-review and API/E2E artifacts (in this ticket folder): `code-review-report.md`, `code-review-revision-record.md`,
  `api-e2e-execution-coverage-report.md`, `api-e2e-coverage-investigation.md`, `api-e2e-revision-record.md`,
  `api-e2e-test-case-ledger.md`, `api-e2e-evidence/`. Implementation: `implementation-handoff.md`,
  `implementation-revision-record.md`.
- Branch `codex/standalone-agent-run-root` @ `f2c32a2cc` + review docs; base `origin/personal` @ `b37d7a934`.

---
# Earlier round: SR-005 base refresh

- Result: `Architecture Design Complete`. Package `standalone-agent-run-root`, current revision **SR-005** (requirements
  basis SR-002, unchanged).
- task_size: **Large**; architectural_risk: **High** (unchanged from SR-003/SR-004).
- From `/solution_designer`, 2026-10-04.
- Approval: requirements Approved (SR-002). The user said "no splitting. i think do it in this ticket. lets do it".
  Q-1–Q-4 accepted as recommended. SR-005 changes no intended behavior, so no renewed approval is needed.
- Supplement: the predecessor UI/UX spec VIS-001–015
  (`/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md`).
  Unchanged.

## Original request and this round's trigger
- Origin (2026-10-02): the code reviewer's follow-up request, with user-agreed scope and naming (`StandaloneAgentRunRoot`).
  The user then said "continue please with the improvement".
- This round (2026-10-04): the user asked to update this worktree branch onto the latest `origin/personal`, revise the
  design as needed, and hand the work on toward code review.

## What changed in SR-005
- **Rebase.**
  - Before the rebase, the in-progress implementation and the ticket folder were committed as one checkpoint.
  - It was rebased from `2d3b66005` onto `origin/personal` @ `b37d7a934` (181 upstream commits). Head is now 1 ahead,
    0 behind.
  - Three conflicts were resolved (location service `containsRunId`; native root fixture; relocated
    fixture-cleanup test). See E-15.
  - Backups: `/Users/normy/autobyteus_org/solution-designer-reports/standalone-agent-run-root-backup-20261004/` and
    branch `backup/standalone-agent-run-root-pre-rebase-20261004`.
- **Design deltas D-R1–D-R7.** These are in `design-spec.md` § "Base Refresh Deltas (SR-005)". The design substance
  reviewed in ARCH-REV-002 is unchanged. The deltas:
  - no `containsRunId` (upstream removed run-ID uniqueness scanning);
  - the moved standalone instruction keeps upstream's "Work Requests and Outcomes" section;
  - REQ-009/AC-009 now also covers two upstream guard drifts (the AFB-004 `AgentRunIdentityAllocator` injection
    inventory, and `registerProjectTaskTools` in the tool-registration list). These are fixed as deliberate guard
    maintenance with a recorded reason;
  - 26 base failures (identical on clean `origin/personal`) are out of scope;
  - General Agent terminology;
  - the `chat.md` reference moved to line 295;
  - fixture ownership.
- **Checks on the rebased branch.**
  - Typecheck is clean apart from the repository's existing TS6059 rootDir noise.
  - The ticket's root unit and integration suites pass.
  - REQ-009 suites: 14 failures on the base, 2 on the branch. Both remaining failures are upstream drift (D-R3).

## Review focus for this round (delta review)
- Is treating the AFB-004 allocator inventory and the `registerProjectTaskTools` list as REQ-009 guard maintenance
  sound, or is either a boundary question?
- Do D-R1 (no `containsRunId`) and E-16 (no package reads during identity allocation) change any SR-004 decision?
- Is the conflict resolution in the fixture (upstream's cleanup ownership plus the new manager API) consistent with the
  AC-001 gate?

## Implementation state (for the downstream implementation engineer; E-21)
- Implementation is **in progress**, not complete. No `implementation-handoff.md` exists yet, so code review cannot
  start yet.
- Present: the module move; root, manager, host handle and message delivery; the binding removed; ports; REQ-002;
  REQ-003 Org extraction; REQ-004; REQ-009 original scope.
- Remaining:
  - REQ-005, REQ-006, REQ-007 and REQ-008;
  - the REQ-003 size target (`standalone-agent-run-root.ts` 413 lines, `standalone-agent-run-lifecycle-service.ts` 450);
  - the D-R3 guard maintenance;
  - the model-save root-cause record;
  - the docs;
  - the live checks.
- When resuming, run `pnpm install --frozen-lockfile` at the worktree root, because upstream bumped dependencies.

## Artifacts
- /Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/investigation-notes.md (E-01–E-21)
- /Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/design-spec.md (SR-005)
- /Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/solution-revision-record.md (SR-001–SR-005)
- Prior independent review artifacts (they reviewed SR-004 on base `2d3b66005`):
  - /Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/design-review-report.md (ARCH-REV-002 Pass)
  - /Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/architecture-review-revision-record.md
- Intake: /Users/normy/autobyteus_org/solution-designer-reports/standalone-agent-run-root-intake.md
- Predecessors (read-only on `personal`): `tickets/done/agent-initiated-collaborators/`, `tickets/done/cross-scope-agent-mentions/`

## Workspace
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root`.
- Branch `codex/standalone-agent-run-root` (local only, not pushed).
- Base `origin/personal` @ `b37d7a934`. Target `personal`.
- Ticket files are committed on the branch.

## Risks for review
- The REQ-001 blast radius (General Agent and every eligible standalone run).
- Host readiness concurrency.
- Lock order (root gate → lifecycle lane).
- The delivery header across runtimes.
- Base drift: 26 base failures outside scope. Downstream must distinguish new failures from base ones (D-R4).

## Route
- History: SR-003 and SR-004 went to the architecture reviewer on 2026-10-02. ARCH-REV-002 passed SR-004, and the
  reviewer delivered the implementation handoff.
- SR-005: `get_handoff_rules` returned the rule "revised architecture package, Architecture Design Complete,
  Large/High" → `/architecture_reviewer`. No rule routes from Solution Designer to code review. Code review follows the
  implementation engineer's completed handoff.
- SR-005 delivered to /architecture_reviewer on 2026-10-04 (target run `architecture_reviewer_2e6d87408aa4462c992aae977449ef6a`).
- ARCH-REV-003 Pass on SR-005 recorded 2026-10-04; implementation handoff delivered by the reviewer to /implementation_engineer.
