# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the initial implementation baseline.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer / `design-review-report.md` / ARCH-REV-002 pass | N/A | `Initial Baseline` | SR-002 (requirements), SR-004 (design), ARCH-REV-002 | Implementation complete; routed to source review |
| IR-002 | code_reviewer / `code-review-report.md` / CRR-001 (Fail) | CR-001, CR-002 | `Local Fix` | SR-004, ARCH-REV-002, CRR-001 | Size split and dead-code removal done; handoff corrected. Code review Pass (CRR-002, round 2); the reviewer forwarded the package to API/E2E |
| IR-003 | architecture_reviewer ARCH-REV-004 (SR-006 pass, rebase required) + code_reviewer CRR-003 (AE-001 Local Fix) | ARCH-19/R-9, AR-004, AR-005, CR-003 | `Local Fix` (rebase + reviewed design deltas) | SR-006, ARCH-REV-004, CRR-003, API-REV-001 | Rebased onto `origin/personal@8f57d16d1`; AR-004 frozen legacy module + ordering + skip-version fixture; AR-005 single liveness predicate; CR-003 Org rows; code review Pass (CRR-004, round 4, rebased basis `8f57d16d1`); the reviewer forwarded the package to API/E2E |
| IR-004 | architecture_reviewer / `design-review-report.md` round 5 / ARCH-REV-005 (Pass on SR-007, supersedes ARCH-REV-004) | SR-007 (DEC-008, REQ-018, AC-020, AC-021), R-12, R-13, R-14 | `Design Delta` (reviewed SR-007 on the same rebased basis) | SR-007, ARCH-REV-005, CRR-004, API-REV-001 | Delegator migration removed; trees read tolerantly and written exactly with no version field; optional delegator; DTO tree version literals removed (R-13); released migrations keep the frozen strict module; code review Pass (CRR-005, round 5, no findings); the reviewer forwarded the package to API/E2E |

## Revision Entries

### IR-001 — Delegated executions become resources: pure spawn, idle shutdown, wake-on-message, delegator in the tree

- Triggering role, report path, and round: architecture_reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/design-review-report.md`, ARCH-REV-002 (pass).
- Triggering finding IDs: N/A. Non-blocking reviewer notes R-5, R-6 and R-7 were applied (see handoff).
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: All in-scope behavior (BEH-001 to BEH-012) is implemented. Local unit, integration, e2e and web suites match or beat their baselines. Typecheck shows no new errors.
- Related solution revision IDs: SR-002 (requirements), SR-004 (design)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: initial implementation handoff baseline.
- Approved behavior or requirement IDs affected: REQ-001 to REQ-017; BEH-001 to BEH-012; AC-001 to AC-019.
- Implementation delta:
  - The root-neutral `RootTaskExecutionLifecycle` replaces the task engine and status machine. It owns the FIFO queue, idle schedule and live leases.
  - Team and Org adapters implement the lifecycle port.
  - `delegate_task` is a pure spawn; submit/review, task records, task APIs and task UI are deleted.
  - The Team tree goes v2 to v3 and the Org tree v1 to v2 (`delegatorAgentRunId`, no `settledAt`), via the new startup migration `20261001_task_execution_delegator_tree`.
  - Released migrations read frozen released schemas.
  - The web shows a Messages-only collaboration panel; the members tree shows the standard status (shut down = `offline`) plus a "Started by" line.
- Changed files or areas: about 357 files across `autobyteus-server-ts`, `autobyteus-web`, `autobyteus-team-stream-contracts` and `autobyteus-collaboration-stream-contracts` (3.6k insertions, 13.4k deletions). The handoff's Key Files section lists the main ones.
- Local validation and result: server source typecheck clean. Server unit + architecture: 0 regressions (30 baseline failures remain). Integration and e2e: 0 regressions vs baseline. Web: 490/495 files pass, the 5 failures are baseline, and the typecheck adds no new errors. Rendered browser probes (peer sidebar, monitor visibility) pass. Details are in the handoff.
- Next recipient or routing: source review, per `get_handoff_rules` (Large / High).
- Remaining limitations or risks: per-runtime tool-approval (AC-006) and real-provider restore (AC-007, AC-013) still need live runtime validation. The real-LLM e2e `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` still targets the removed submit/review tools and must be rewritten by API/E2E. The branch is behind `origin/personal`. See the handoff's Known Risks.

### IR-002 — CRR-001 Local Fix: split `RootTeamRun` platform-binding commit; remove dead code

- Triggering role, report path, and round: code_reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/code-review-report.md`, CRR-001 (round 1, Fail).
- Triggering finding IDs: CR-001 (Medium), CR-002 (Low), plus the non-blocking handoff wording correction.
- Classification: `Local Fix`
- Prior authoritative result: IR-001. `root-team-run.ts` had 514 effective lines, four dead symbols remained, and the handoff misstated the source-size and delegate error-path behavior.
- Current authoritative result: `root-team-run.ts` is 465 effective lines, the dead symbols are removed, and the handoff is corrected. There is no behavior change.
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: implementation-owned Local Fix requested by the code reviewer.
- Approved behavior or requirement IDs affected: none (structure and cleanup only; BEH-001 wording in the handoff corrected).
- Implementation delta:
  - CR-001: `commitAgentPlatformBindingChange` logic moved verbatim into the new Team-owned `TeamAgentPlatformBindingCommitter`. `RootTeamRun` builds it with `persistence`, `getTree`, `assertAdmitting`, `replaceTree` and `enterLifecycleFailStop`, and delegates to it; callers still depend only on `RootTeamRun`. The live commit uses `RootTeamRun.replaceTree`, which performs the same tree, index and correlation update as before.
  - CR-002: deleted `ServerMessageType.TASK_DELEGATION_EVENT`, `sameTaskExecutionBinding`, `taskErrorMessage` (and their now-unused type imports), `isAgentTaskExecutionReference` and `TaskExecutionIdleShutdownSchedule.isArmed`. `findTaskConfigNode` and `requirePreparedTaskTeamNode` are kept.
  - Handoff: corrected the size statement (a full scan was rerun) and the BEH-001 error-path wording (input and admission failures are thrown as tool errors; post-preparation spawn failures return `{target_agent_run_id: null, message}`).
- Changed files or areas:
  - `autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/team-agent-platform-binding-committer.ts` (new)
  - `autobyteus-server-ts/src/services/agent-streaming/models.ts`
  - `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-execution-resolution.ts`
  - `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-reference.ts`
  - `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.ts`
  - `implementation-handoff.md`
- Local validation and result:
  - Server source typecheck is clean.
  - The affected Team, collaboration and binding suites (42 files) pass, except the baseline-identical `team-run-model-selection-save` (11 failures, same as baseline).
  - The full server unit + architecture run gives 514 passed / 30 failed files, all baseline, with 0 regressions.
- Next recipient or routing: `/code_reviewer` for the focused CR-001 / CR-002 recheck (the package stays Large / High).
- Remaining limitations or risks: unchanged from IR-001.

### IR-003 — Rebase onto `origin/personal`, SR-006 deltas (AR-004, AR-005) and CR-003 Org rows

- Triggering role, report path, and round:
  - architecture_reviewer, `design-review-report.md` round 4, ARCH-REV-004 (Pass on SR-006; ARCH-19 / R-9 require a rebase and re-running the downstream gates);
  - code_reviewer, `code-review-report.md`, CRR-003 (failure origin for API/E2E AE-001, API-REV-001).
- Triggering finding IDs: ARCH-19 / R-9, AR-004, AR-005, CR-003. Non-blocking R-5, R-6, R-7 unchanged; R-10 not applied (see handoff); R-11 noted.
- Classification: `Local Fix` for CR-003, plus implementation of the reviewed SR-006 design deltas on the rebased basis.
- Prior authoritative result: IR-002 on base `8bffda045` (code review passed; API/E2E found AE-001).
- Current authoritative result: the same behavior on base `origin/personal@8f57d16d1` (≥ `f2924a2b0`), with AR-004, AR-005 and CR-003 implemented.
- Related solution revision IDs: SR-006 (design), SR-002 (requirements, unchanged)
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review revision IDs: CRR-003
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the design basis changed (SR-006) and the branch had to be rebased; earlier passes cover only the pre-rebase basis.
- Approved behavior or requirement IDs affected:
  - BEH-004, BEH-005 (AR-005 liveness and wake);
  - BEH-009 (CR-003, REQ-013 / AC-017 via REQ-017);
  - BEH-010 / migration (AR-004, checklist item 8g).
- Implementation delta:
  - **Rebase:** fast-forwarded the branch to `origin/personal@8f57d16d1` (91 commits) and re-applied the uncommitted work. There were 7 conflicts:
    - 5 were rebuildable contract `dist` maps, rebuilt from source;
    - `agent-org-run.ts` keeps upstream's persistent `failStopped`, while `terminateOnce()` only drains the lifecycle queue (shutdown is runtime-only);
    - `20260926`'s transition keeps upstream's removal of the per-source audit.
    - I also installed upstream's new `@agentclientprotocol/sdk` dependency.
    - A full backup of the pre-rebase work is at `/tmp/tdrl-prerebase-backup/`.
  - **AR-004:**
    - New frozen module `src/app-data-migrations/legacy/released-run-package-shapes/`: 16 verbatim copies as of `f2924a2b0` (import paths remapped only), covering Team tree v2, Org tree v1, the v2 shared records and schemas, Team/Org records v1 (types, schemas, stores), the Org state-package v1 validator and the Org execution index v1.
    - Released migrations `20260814` (plus helpers), the state classifier, `20260824` and `20260901` (plus transitions) are restored to their released code, with only imports repointed.
    - `20260926` and `context-file-record-locators.ts` are byte-identical to released code.
    - `20260905` is adapted by 13 lines: it validates the current tree + messages, reads Org records through the frozen module, and treats absent records (post-change runs) as empty evidence.
    - The new migration now:
      - uses the frozen module (my own frozen files were removed);
      - is `STARTUP_ONLY` with prerequisites `[20260824, 20260901]`;
      - reads records only for trees with task executions (SR-005);
      - follows guideline §4 for the aggregate: preserved per-root failures give `SUCCEEDED_WITH_WARNINGS`, and only a write that did not establish its target gives `FAILED`.
    - Added the skip-version fixture test (8g).
  - **AR-005:**
    - A task Agent is live only when its handle's AgentRun is active (Team `TaskAgentExecutionRegistry.isLive`, Org `isTaskLive`).
    - Shutdown keeps the handle registered and only ends its run.
    - Non-live task Agents report `offline` and count no open work.
    - `approve_tool` / `interrupt` on a non-live task Agent return `RUN_NOT_ACTIVE` without calling the handle.
    - Wake (`restoreChain`) re-activates the run in `restore` mode inside the lease, creating the handle only when none exists (after reopen), so the chain is live before input.
  - **CR-003:**
    - Org history rows carry the delegator on direct task-Agent and task-Team rows. They render the plain name plus a "Started by <name>" line, which is also in the aria-label; the run ID is shown if the delegator can't be resolved.
    - Task-Team members show no starter line.
    - The `workspace.agentOrg.history.taskLabel` keys (en, zh-CN) and their catalog entry are removed.
  - **Tests adapted to upstream's new tests:** restore self-heal, termination retry and context-file containment.
- Changed files or areas:
  - `autobyteus-server-ts/src/app-data-migrations/legacy/released-run-package-shapes/*` (new)
  - `autobyteus-server-ts/src/app-data-migrations/migrations/{team-run-execution-tree-v1/*,team-run-execution-tree-v2-app-data-migration.ts,team-run-migration-state-classifier.ts,agent-org-flat-team-families-v1/*,agent-org-history-first-message-summary-v1/*,task-execution-delegator-tree-v1/*}`
  - `autobyteus-server-ts/src/context-files/services/context-file-record-locators.ts` (restored to released)
  - `autobyteus-server-ts/src/agent-team-execution/local/registries/task-agent-execution-registry.ts`, `flat-team-execution-manager.ts`, `flat-team-run-backend.ts`, `backends/team-run-backend.ts`, `domain/team-run.ts`, `task-delegation/team-task-execution-adapter.ts`
  - `autobyteus-server-ts/src/agent-org-execution/services/agent-org-root-agent-execution-registry.ts`, `agent-org-task-execution-adapter.ts`, `agent-org-agent-status-snapshot-projector.ts`, `domain/agent-org-run.ts`
  - `autobyteus-web/utils/agentOrgHistoryRows.ts`, `components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue`, localization en/zh-CN
  - Tests: new `task-execution-delegator-skip-version-upgrade.test.ts`, `task-agent-execution-registry-liveness.test.ts`, `WorkspaceAgentOrgDelegatedRows.spec.ts`; plus adapted suites.
- Local validation and result: see the handoff's "Local Implementation Checks Run" (IR-003).
- Next recipient or routing: `/code_reviewer` (Large / High; downstream gates re-run on the rebased basis per R-9).
- Remaining limitations or risks: see the handoff's Known Risks.

### IR-004 — SR-007: tolerant tree reading, exact writing, no migration

- Triggering role, report path, and round: architecture_reviewer, `design-review-report.md` round 5, ARCH-REV-005 (Pass on SR-007; supersedes the ARCH-REV-004 pass on SR-006). The user approved the SR-007 delta (DEC-008).
- Triggering finding IDs: SR-007 (REQ-018, AC-018, AC-020, AC-021), non-blocking R-12 (stale earlier design lines; SR-007 followed), R-13 (DTO `schema_version` decision), R-14 (old children show no starter). R-5, R-6, R-7, R-11 unchanged; R-10 obsolete.
- Classification: implementation of a reviewed design delta. It is not a code-review finding.
- Prior authoritative result: IR-003 (code review Pass CRR-004 on `8f57d16d1`), which had a startup migration `20261001_task_execution_delegator_tree` plus Team tree v3 / Org tree v2 version bumps.
- Current authoritative result: no data migration. Team and Org trees are read tolerantly and written exactly, with no version field; `delegatorAgentRunId` is optional. All other IR-003 behavior (lifecycle, wake, lease, AR-005 liveness, CR-003 rows, frozen module) is unchanged.
- Related solution revision IDs: SR-007 (requirements delta and design), SR-002 (requirements)
- Related architecture-review revision IDs: ARCH-REV-005
- Related code-review revision IDs: CRR-004 (prior pass, superseded by this delta)
- Related API/E2E revision IDs: API-REV-001 (pre-SR-007; must re-run)
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the persisted-data decision changed from `Migration Required` to `Directly Usable — No Migration` (DEC-008).
- Approved behavior or requirement IDs affected: BEH-010 (REQ-014, REQ-018), BEH-009 (REQ-013 starter display for old children), BEH-001 (the delegator is written for every new child).
- Implementation delta:
  - **Migration removed:**
    - Deleted `app-data-migrations/migrations/task-execution-delegator-tree-v1/` and its tests.
    - The registry is byte-identical to released code again.
  - **Tolerant reading and exact writing (REQ-018):**
    - `run-execution-tree-shared-record-schemas.ts` replaces `exactRecord` / `assertExactKeys` with `objectRecord` / `requireKeys` plus `parse*` functions that return projections holding only the known fields. Unknown fields, `settledAt` and `schemaVersion` never reach memory or a later write.
    - `team-run-execution-tree-schema.ts` and `agent-org-run-execution-tree-schema.ts` build the tree from those projections. Required keys: Team `createdAt`, `archivedAt`, `applicationBinding`, `handoffs`, `rootTeam`; Org the same plus `subjectKind: "agent_org"` and `rootOrg`. The invariants are unchanged.
    - `delegatorAgentRunId` is optional; when present it must be non-empty and resolve to an AgentRun in the same tree.
    - Stores write the projection, so the write is always the exact current shape.
    - Handoffs keep the shared `normalizeCollaborationHandoffs` contract unchanged.
  - **Types:**
    - `TeamRunExecutionTreeFileV3` becomes `TeamRunExecutionTreeFile`, and `AgentOrgRunExecutionTreeFileV2` becomes `AgentOrgRunExecutionTreeFile`; both lose the `schemaVersion` literal.
    - `TaskAgentExecution` / `TaskTeamExecution` have `delegatorAgentRunId?: string`.
    - The builder and planner no longer write `schemaVersion`.
    - New children always get the delegator (unchanged `task-execution-tree-projection.ts`).
  - **R-13 (decided: removed consistently):**
    - `schema_version` is removed from the Team tree DTO and both root view DTOs, and `schemaVersion` from the Org execution tree DTO.
    - The projectors no longer emit it.
    - The Team DTO `delegator_agent_run_id` is `string | null`; the tree-shaped Org DTO `delegatorAgentRunId` is optional.
    - The Org communication-messages DTO keeps its `schemaVersion` (that file is out of scope, per the requirements).
  - **Web (R-14):**
    - `teamExecutionTreeSelectors.ts`, `agentOrgHistoryRows.ts` and `agentOrgExecutionViewIndex.ts` treat an absent delegator as "no starter": the delegation binding stays, with a null delegator.
    - A live `TASK_EXECUTION_STARTED` event must still carry a delegator (`agentOrgExecutionContext.ts`).
    - The fixtures drop the tree version fields.
  - **Released migrations:**
    - The frozen strict module and repoints from IR-003 stay.
    - Re-verified that the `20260901` candidate-plan classifier, `20260824` and `20260814` use the frozen strict validators.
    - Only `20260905` uses current (tolerant) package validation, and `20260926` uses current admission; both are unchanged from IR-003.
    - The frozen module README now states the SR-007 rationale.
  - **Tests:**
    - `team-run-current-package-schema.test.ts` (tolerant, exact and V1 rejection), and the new `agent-org-run-execution-tree-tolerance.test.ts`.
    - The skip-version fixture is renamed `released-run-tree-skip-version-upgrade.test.ts` and rewritten for SR-007. The ledger now holds every migration released before `20260901` by ID date, and the test checks no tree rewrite, tolerant reads, admission and repeat-idle startup.
    - `definition-nonmutation-startup.test.ts`: the native released tree stays byte-identical.
    - Three released-migration tests that ran the removed migration are restored to their released form.
    - Web: `agentOrgExecutionViewIndex.spec.ts` (new), plus R-14 cases in `teamExecutionViewState.spec.ts` and `WorkspaceAgentOrgDelegatedRows.spec.ts`.
    - Version assertions changed to "no `schemaVersion`" in `team-run-execution-tree-v2-app-data-migration.test.ts`, `task-delegation-tool-lifecycle.integration.test.ts`, `stopped-org-workspace-graphql.e2e.test.ts`, `hierarchical-team-run-config-graphql.e2e.test.ts`, `mixed-task-delegation.e2e.test.ts`, `team-run-v1-production-upgrade.e2e.test.ts` and the web `existing-run-model-config-probe.mjs`.
- Changed files or areas:
  - `autobyteus-server-ts/src/run-history/store/{run-execution-tree-shared-record-schemas,team-run-execution-tree-schema,agent-org-run-execution-tree-schema,team-run-execution-tree-store,agent-org-run-execution-tree-store}.ts`
  - `autobyteus-server-ts/src/run-history/domain/run-execution-tree-shared-records.ts`, `agent-team-execution/domain/team-run-execution-tree.ts`, `agent-org-execution/domain/agent-org-run-execution-tree.ts` (+ the renamed type's users)
  - `autobyteus-server-ts/src/agent-team-execution/services/team-run-execution-tree-builder.ts`, `agent-org-execution/services/agent-org-run-planner.ts`, `services/agent-streaming/{team,agent-org}-execution-view-projector.ts`
  - `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` (restored), `migrations/task-execution-delegator-tree-v1/` (deleted), `legacy/released-run-package-shapes/README.md`
  - `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts`, `autobyteus-collaboration-stream-contracts/src/{agent-org-execution-dtos,root-execution-view-dtos}.ts`
  - `autobyteus-web/services/teamExecution/teamExecutionTreeSelectors.ts`, `services/agentOrgExecution/{agentOrgExecutionViewIndex,agentOrgExecutionContext}.ts`, `utils/agentOrgHistoryRows.ts`, and web fixtures
- Local validation and result: see the handoff's "Local Implementation Checks Run" (IR-004).
- Next recipient or routing: `/code_reviewer` (Large / High).
- Remaining limitations or risks: see the handoff's Known Risks.
