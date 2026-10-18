# Handoff — Architecture Design Complete (delegated-copies-slow-open)

- Result: `Architecture Design Complete`
- Package identifier: `delegated-copies-slow-open`
- Current solution revision: `SR-004` (revision for ARCH-REV-001; SR-003 was reviewed in round 1)
- Classification: `task_size=Medium`, `architectural_risk=High` (rationale in `design-spec.md` → Task Size And Architectural Risk)
- Round 2 (2026-10-18): revised for ARCH-REV-001.
  - AR-001: D-2/D-4/D-5/DS-005 now define a load bound to one published context, which ends `superseded` (no retry, no commit) once that context is no longer published. The store is the single dedupe owner, keyed by (published context, child). Test (b) adds the republish-during-load case.
  - AR-002: the submission guard is dropped.
  - R-A: the probe line was added.
  - R-B: noted in the docs scope.
  - R-C: accepted in D-4 / R-004.
  - Requirements unchanged.
- Route applied: handoff rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer` (2026-10-18). No other rule matched.

## Original Request

Project Task e6985045, sent by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). Bug (long-standing): after app start, a run with many delegated team copies (the Project Task Manager) shows its copies in the sidebar only after a long time, and opening it is slow. Update 2026-10-18: re-measure after the memory refactor (Task 8641c0ac) and continue.

- Goals:
  - Find where the time goes, with timings.
  - Make the run and its copy rows show fast, independent of the number of copies, and load details lazily.
  - Keep status, Task summaries and history correct.
- Constraints:
  - Fix it within the current storage.
  - Do not mix with the memory refactor.
  - Coordinate with autobyteus-114 (append-only message logs).
- Done when:
  - The cause is identified with timings.
  - The run and its copies show fast after app start, and opening is fast.
  - There is a regression check with a realistic large run.
  - The fix is released and the user checks it in the app.

## Cause (measured, `investigation-notes.md` → Runtime findings)

On a test-owned copy of the PM hub (56 copies = 286 child agents), measured read-only in-process:

- **The client publishes the copy rows only after loading every child's full conversation and artifacts.** That is 572 requests and a 257 MB projection payload per publication. It is repeated after every new delegation while the hub is open.
- **Each artifact request (`getRunFileChanges(memberRunId)`) scans every stored team, org and hub tree.** That costs 1.95–2.38 s each, about 10 minutes of server CPU for one hub.
- The hub's own view costs about 0.45 s, and its own conversation 13 ms.
- **Not the memory layout.** This is the follow-up the memory refactor itself named (contract H2 / V-17).

## Approval Basis

- Requirements: `requirements-doc.md` at SR-002, `Approved` by the Solution Designer within the Task's direction, user informed in the Solution Designer conversation on 2026-10-18.
- No `Needs user` decision. Behavior-defining supplements: none.

## Design Summary (`design-spec.md`)

- **D-1:** build the collaboration context from the hub's view alone; no per-child requests.
- **D-2:** hydrate one child on demand, following the team-member precedent: dedupe, a revision guard with 3 retries, live tool-state reconciliation, and a pending-submission guard.
- **D-3:** new additive GraphQL query `agentRunCollaborationMemberFileChanges(hostRunId, memberAddress, agentRunId)`. It uses the existing hub-scoped location and a method extracted from `RunFileChangeProjectionService` (`getLocatedCollaborationMemberProjection`).
- **D-4:** on republication, carry over the displayed content of opened children and refresh only the selected child.
- **D-5:** load at `selectChild` and after every publication.
- **No persistence change.** No collaboration stream DTO change. `StandaloneRootPackageStore` and the message-log stores (autobyteus-114) are not touched.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open`, branch `codex/delegated-copies-slow-open`.
- Base: `origin/personal` @ `5ceb43039a`. Finalization target: `origin/personal` (RELEASE.md).
- Ticket artifacts are uncommitted in the worktree (no commit requested).

## Open Risks And Uncertainty

- U-001 / ASM-001: perceived wall time in the app is not yet measured; validation measures baseline vs fix on a synthesized large hub.
- R-001: on-demand hydration races with live events and submissions (D-2 guards).
- R-002: the hub message log in the view (FU-2).
- Follow-ups FU-1..FU-4 are in `design-spec.md` → Change Scope.

## Expected Next Action

Independent architecture review of the cumulative package. On Pass, follow the review's own handoff rule to implementation.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open/solution-revision-record.md`
- Probe and baseline output (evidence): `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open/probes/open-cost-probe.test.ts`, `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open/probes/probe-run1.txt`
- Prior review artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open/design-review-report.md` (round 1, reviewed SR-003), `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open/architecture-review-revision-record.md`
