# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / ARCH-REV-004 Pass on design-spec SR-008 / round 1 | N/A (DI-001 resolved before code) | `Initial Baseline` | SR-008, ARCH-REV-004 | Adoption implemented; ready for Code Review |
| IR-002 | Code Reviewer / code-review-report.md / CRR-001 round 1 | CR-001, CR-002, CR-003 | `Local Fix` | SR-008, ARCH-REV-004, CRR-001 | Today's refusal kept for runs that are no run the user started; refusal e2e run; unused declarations removed; doc step wording |
| IR-003 | Code Reviewer / code-review-report.md / CRR-003 failure-origin review of API-REV-001 | F-001, F-003 (F-002 held) | `Local Fix` | SR-008, ARCH-REV-004, CRR-003, API-REV-001 | Live token summary claims the observation's current root; adoption-specific Task message |
| IR-004 | Architecture Reviewer / ARCH-REV-005 Pass of SR-009 (after CRR-005, API-REV-002 F-002) | F-002 | `Design Revision Implementation` | SR-009, ARCH-REV-005, CRR-005, API-REV-002 | Renderer retires an adopted run's own-group row: at once on `task_execution_started`, else at the next history read |
| IR-005 | Solution Designer / handoff-implementation-withdraw.md (SR-018) | N/A | `Removal` | SR-018 (the cancelled full-adoption round SR-010..SR-017 produced no IR) | Adoption withdrawn: merge `4e738acc66` reverted on product paths; three general fixes kept |
| IR-006 | Delivery Engineer / delivery-revision-record.md DR-004 (integration blocker) | N/A | `Local Fix` | SR-018, CRR-009, API-REV-005, DR-004 | `origin/personal` (project-task-semantic-search) merged; its adoption hooks removed, its search cleanup kept |

## Revision Entries

### IR-001 — Adoption of runs the user started (initial implementation)

- Triggering role, report path, and round: Architecture Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/design-review-report.md` (ARCH-REV-004 Pass, SR-008), round 1. DI-001 (`implementation-design-impact.md`) was raised before any code and resolved in SR-008.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: `delegate_task` existing-run mode adopts an idle agent / team run the user started in the delegator's workspace (standalone agent delegators only); steps 1–4 recognized from the files and resumable; undo on Task close / delete and Project delete; texts and docs updated.
- Related solution revision IDs: SR-008
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the first complete implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..BEH-003; REQ-001..REQ-005, REQ-007; DEC-104, DEC-108, DEC-109; AC-001..AC-004, AC-006.
- Implementation delta: see `implementation-handoff.md` (Key Files Or Areas; trace table). Two size-driven extractions with no behaviour change (agent catalog state; existing-run assignments).
- Changed files or areas: server `src` (agent-collaboration task, standalone root, run-history stores and catalogs, projects services, compositions), tests (4 new files, 2 pinned-text updates, 1 shared fixture), docs (`projects.md`, `collaboration_model.md`).
- Local validation and result: build typecheck clean; unit 723 files green after the planned hash update; integration green apart from the 2 known agent-status failures.
- Next recipient or routing: Code Reviewer (Large / High).
- Remaining limitations or risks: three implementation decisions where SR-008 was silent (undo discriminator, recognition after the link, closing a reverted entry on Task delete); the sidebar's own-group row leaves on its next history read (no server push); the real-app check (AC-001..003) and the beta / user check (AC-007) are downstream.

### IR-002 — CRR-001 local fixes (today's refusal kept, refusal e2e, unused declarations, doc wording)

- Triggering role, report path, and round: Code Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/code-review-report.md`, CRR-001 (Fail — Local Fix, 9.0/10).
- Triggering finding IDs: CR-001, CR-002, CR-003
- Classification: `Local Fix`
- Prior authoritative result: IR-001.
- Current authoritative result: IR-001 with the refusal boundary restored (AC-006 / Preserved Behavior Boundary) and the cleanup; classification unchanged (Large / High).
- Related solution revision IDs: SR-008
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the reviewer's Local Fix findings.
- Approved behavior or requirement IDs affected: none changed; REQ-005 refusals now limited to runs the user started, AC-006 preserved.
- Implementation delta:
  - CR-002: `HandStartedRunLookup` not-found = `refusal: string | null`; `null` (no run the user started) → `notACopyOfThisRun` (also for a non-host delegator); the team-member hint only for admitted team runs; the "agent run's id" hint only for an agent run the user started (G1 + history row); organization runs keep their refusal; the generic "not a run the user started" text removed.
  - CR-001: unused import and parameter properties removed (arguments kept).
  - CR-003: `projects.md` step wording.
- Changed files or areas: `hand-started-runs.ts`, `hand-started-run-adoption.ts`, `active-collaboration-root-directory.ts`, both history catalogs, `projects.md`; tests `hand-started-run-adoption.test.ts`, `hand-started-run-adoption-root.test.ts`; handoff; evidence log.
- Local validation and result: build typecheck clean; unused-declaration check clean for touched files; affected unit folders 185 files green; the three refusal-pinning e2e files pass (24 / 3 skipped by gate).
- Next recipient or routing: Code Reviewer (Targeted Delta Review of CR-001..CR-003).
- Remaining limitations or risks: unchanged from IR-001.

### IR-003 — CRR-003 local fixes (adopted run's token usage under its current root; adoption Task message)

- Triggering role, report path, and round: Code Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/code-review-report.md`, CRR-003 (failure-origin review of API-REV-001, `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/api-e2e-execution-report.md`).
- Triggering finding IDs: F-001 (High), F-003 (Low). F-002 held by the reviewer; no action.
- Classification: `Local Fix`
- Prior authoritative result: IR-002 (CRR-002 Pass).
- Current authoritative result: IR-002 plus: an adopted run's live token usage is published under its current root, so the PM's Agent root keeps running (ADO-4); the Task message to an adopted run no longer says an earlier Task closed. Classification unchanged (Large / High).
- Related solution revision IDs: SR-008
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review revision IDs: CRR-003
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the reviewer's Local Fix findings.
- Approved behavior or requirement IDs affected: none changed; REQ-002 (the Task as the run's next work) and REQ-004 (earlier records left as they are) now hold for an adopted team's usage.
- Implementation delta:
  - F-001: `TokenUsageRunAccumulator.recordObservation` sets `run_summary_after_event.root_team_run_id` from the observation (the current execution context) instead of the run's stored record. The record is unchanged: its `rootTeamRunId` stays the run's earlier team (REQ-004). For a run that never changes root the two are equal, so nothing else changes.
  - F-003: `buildAdoptedRunTaskMessage` (first line `New Task assigned to you: <key>. This is the work to do now.`) next to `buildExistingCopyTaskMessage` (shared body); `deliverAssignedTask` picks it when the assignment is an adoption (also a resumed one).
- Changed files or areas: `src/token-usage/services/token-usage-run-accumulator.ts`, `src/agent-collaboration/execution/task/task-execution-input.ts`, `src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` (485 → 487 non-empty lines); tests `tests/unit/token-usage/services/token-usage-run-accumulator.test.ts` (new regression case), `tests/unit/standalone-agent-run-root/hand-started-run-adoption-root.test.ts` (message text asserted); handoff; evidence log.
- Local validation and result: build typecheck clean; the new accumulator case fails without the fix (`expected 'hand-started-team' to be null`) and passes with it; `vitest run tests/unit` 724 files / 5883 tests passed (4 files / 7 tests skipped); API/E2E's ADO file (uncommitted, theirs) in a clean env: 4/4 passed including ADO-4 (`evidence/implementation/IR-003-ADO-e2e.log`).
- Next recipient or routing: Code Reviewer (source-review delta of F-001 and F-003), then API/E2E reruns.
- Remaining limitations or risks: the token-meter observation in the handoff (Known Risks), reported, not decided; F-002 held.

### IR-004 — SR-009: the sidebar after adoption (F-002)

- Triggering role, report path, and round: Architecture Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/architecture-review-revision-record.md` (ARCH-REV-005 Pass of SR-009). SR-009 answers CRR-005 (`code-review-report.md`, Design Impact) for API-REV-002 F-002.
- Triggering finding IDs: F-002
- Classification: `Design Revision Implementation`
- Prior authoritative result: IR-003 (CRR-004 Pass). An adopted run the user opened this session stayed in its own sidebar group until restart.
- Current authoritative result: the renderer never shows a run that became a task agent as a top-level row. Rule 1: it is retired at once when the delegator's Agent-root stream reports `task_execution_started`. Rule 2: otherwise it is retired at the next history read that no longer lists it, provided that read would have listed it. The server is unchanged. Classification unchanged (Large / High).
- Related solution revision IDs: SR-009
- Related architecture-review revision IDs: ARCH-REV-005
- Related code-review revision IDs: CRR-005
- Related API/E2E revision IDs: API-REV-002
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the approved design revision.
- Approved behavior or requirement IDs affected: AC-001 ("not under TEAMS"), AC-003 ("removed from the sidebar on DONE") for a run opened this session; REQ-003.
- Implementation delta:
  - New `autobyteus-web/stores/runHistoryRetiredRuns.ts`:
    - the Pinia store `runHistoryRetiredRuns`, with task-execution ids (rule 1), departed ids (rule 2) and the runs reads have listed;
    - `reconcileHistoryRead(groups, limitPerAgent)`;
    - `withoutRetiredRuns(sources, retired)`.
  - `runHistoryNavigationStoreActions.ts`: the projection is built from `withoutRetiredRuns(...)`, covering history rows, agent contexts and team contexts.
  - `runHistoryLoadActions.ts`: each successful workspace history read calls `reconcileHistoryRead` with its `limitPerAgent`.
  - `agentRunCollaborationStreamingService.ts`: new `onTaskExecutionStarted` option, called after the stream's own handling (reload).
  - `agentRunCollaborationStore.ts`: the option retires the run and refreshes the navigation topology.
  - Docs:
    - web `agent_execution_architecture.md` (top-level rows);
    - server `projects.md` (Effect of an adoption in the sidebar).
- Changed files or areas: the 5 web source files above. Tests:
  - `runHistoryStore.spec.ts` (5 new cases);
  - `agentRunCollaborationStoreClosure.spec.ts` (1 new case and its `runHistoryStore` mock);
  - `agentRunCollaborationStreamingService.spec.ts` (1 new case);
  - `agentRunCollaborationDisclosure.spec.ts` (its `runHistoryStore` mock gains `refreshRunNavigationTopology`).
  
  Also the 2 docs, the handoff and the evidence.
- Local validation and result:
  - Web unit suite: 632 files / 4480 tests passed.
  - The three new rule cases fail without the change; the two preserved-behavior cases pass both ways.
  - Web guards: all three pass.
  - Web typecheck: no new error (the same 7997 environmental errors with and without the change).
  - Rendered check on a real stack (Nuxt dev, built backend, headless Chrome, scripted AGY), `evidence/implementation/IR-004-adoption-sidebar-check/`: Pass.
- Next recipient or routing: Code Reviewer (source-review delta of SR-009), then API/E2E reruns the web tests, the guards and D-1.
- Remaining limitations or risks: rule 1 is wired for the Agent root only (see the handoff's Important Assumptions). The reviewer's archive premise did not hold: archive already drops the local context, so nothing changed there.

### IR-005 — SR-018: withdraw adoption

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/withdraw-adoption/tickets/in-progress/link-existing-run-to-task/handoff-implementation-withdraw.md` (SR-018), plus the user's rule passed on during the round: remove all adoption logic, keep any fix in the merge that is useful on its own, and ask only when unclear.
- Triggering finding IDs: N/A
- Classification: `Removal`
- Prior authoritative result: IR-004 (merged as `4e738acc66`, released in the beta). The full-adoption round (SR-010..SR-017, worktree `link-existing-run-to-task-full-adoption`) was cancelled before any handoff; it has no IR entry, and its worktree was left untouched.
- Current authoritative result: commit `ffeea43dac` on `codex/withdraw-adoption` (base `2b04a9971d`). Adoption is gone: `delegate_task` on a run that is not one of the delegator's delegated runs is refused as before ("`<id>` is not one of your task agents. …"). Later tickets' changes are intact, and three fixes from the merge that are useful without adoption are kept.
- Related solution revision IDs: SR-018
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the removal requested by SR-018 (RM-001..RM-004).
- Approved behavior or requirement IDs affected: RM-001 (adoption removed), RM-002 (later tickets kept), RM-003 (no migration).
- Implementation delta:
  - Applied the merge's reverse diff on product paths (`git diff 4e738acc66 4e738acc66^1 -- . ':!tickets' ':!TESTING.md' | git apply -3`): 50 product files, +178 / −2240.
  - Resolved three conflicts by removing only adoption lines:
    - `task-agent-own-files.ts` now equals the append-only-message-logs ticket's own version (`f6bf477c3f`);
    - `agentRunCollaborationStreamingService.ts` keeps autobyteus-139's `change_sequence_through` and the delegated-copies "settings Save" comment;
    - its spec keeps the autobyteus-139 content-batch test.
  - Removed one adoption assertion that a later ticket's test had picked up at merge time: `agentRunCollaborationLazyChildren.spec.ts` asserted the SR-009 rule-1 refresh. The ticket's own version (`291545c66f`) had no such assertion.
  - Kept, as useful without adoption, with their adoption-specific wording rewritten:
    - SR-009 sidebar rule 2 (`runHistoryRetiredRuns.ts` and its two calls); rule 1 removed;
    - the token-usage live root claim (`token-usage-run-accumulator.ts`), with its regression test rewritten to the mixed-root case;
    - the `TESTING.md` note.
  - The size-driven extractions (`agent-run-history-catalog-state.ts`, `existing-run-assignments.ts`) are reverted to the shipped structure, as the Solution Designer decided.
- Changed files or areas: see the commit (server: the adoption owner, run facts and wiring, Task-side assignment and revert, catalogs, own-file shape, texts, docs, tests, fixtures; web: rule 1 of the sidebar rule, docs, tests).
- Local validation and result:
  - Server: build typecheck 0 errors; unit 727 files / 5933 tests; integration 77 files / 415 tests; the refusal, existing-copy and reactivation e2e files 24 passed / 3 skipped.
  - Web: 636 files / 4508 tests; the guards pass; typecheck parity with base.
  - Adoption-identifier search: the hit set equals the pre-merge tree.
  - Evidence: `evidence/implementation/IMP-01`..`IMP-10`.
- Next recipient or routing: API/E2E (Medium / Low, direct route).
- Remaining limitations or risks: none known. The beta's release notes must say the adoption feature was withdrawn (RM-004, delivery).

### IR-006 — DR-004 Local Fix: merge project-task-semantic-search, removing the adoption hooks it carried

- Triggering role, report path, and round: Delivery Engineer, `/Users/normy/autobyteus_org/autobyteus-worktrees/withdraw-adoption/tickets/done/link-existing-run-to-task/delivery-revision-record.md` (DR-004, integration blocker).
- Triggering finding IDs: N/A (integration conflict)
- Classification: `Local Fix`
- Prior authoritative result: IR-005 (`ffeea43dac`; CRR-009 Pass; API-REV-005 Pass), blocked at final integration because `origin/personal` advanced with project-task-semantic-search, which was built on top of adoption.
- Current authoritative result: merge commit `a130f4a86f` (`origin/personal` `04ec416617` into `codex/withdraw-adoption`). Semantic search is kept; every adoption hook it carried is removed.
- Related solution revision IDs: SR-018
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-009
- Related API/E2E revision IDs: API-REV-005
- Related delivery revision IDs: DR-004
- Why this implementation revision is recorded: the delivery engineer's Local Fix (RM-001 and RM-002 on the new base).
- Approved behavior or requirement IDs affected: RM-001, RM-002.
- Implementation delta: two conflicts, resolved by hand.
  - `autobyteus-server-ts/src/projects/services/project-service.ts`:
    - kept: the `processProjectTaskSearchCleanup` import, the `searchCleanup` dependency and `forgetProject` after a delete;
    - removed: the `getProjectTaskService` import and the `afterDelete` → `afterProjectDeleted` call with its `TASK_ADOPTION_REVERT_FAILED` log;
    - `deleteProject` is now: delete, `projectRemoved`, `forgetProject`.
  - `autobyteus-server-ts/src/projects/services/project-task-service.ts`:
    - kept: `forgetTask` in `deleteTask`, and `searchCleanup` in the process-instance `Pick`;
    - removed: `revertUnfinishedAdoptionsOfDeleted` and `revertUnfinishedAdoption`.
  - No other file of the new base carries adoption. `project-task-execution-resource-composition.ts` merged without conflict and holds only search additions. The adoption-identifier search finds no new hit except API/E2E's withdrawal test (IMP-13).
- Changed files or areas: the two files above (in the merge commit).
- Local validation and result (on `a130f4a86f`, after `pnpm install` and `prebuild`, because the server `package.json` changed):
  - server: typecheck 0 errors; unit 733 files / 5973 tests; integration 77 files / 415 tests;
  - e2e: the refusal set, the withdrawal refusal (WDR-1) and semantic search's two e2e files, 29 passed / 3 skipped;
  - web: 636 files / 4516 tests; the guards pass;
  - evidence: IMP-11..IMP-15.
- Next recipient or routing: API/E2E. The rechecked classification stays Medium / Low; TESTING.md rule 4 applies (full rerun, because the base's `package.json` changed).
- Remaining limitations or risks: none known. `project-task-service.ts` is at 500 effective lines on the new base (semantic search's growth; the withdrawal adds none).
