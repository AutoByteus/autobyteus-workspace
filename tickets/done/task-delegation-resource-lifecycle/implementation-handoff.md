# Implementation Handoff

Ticket: `task-delegation-resource-lifecycle`
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle`, branch `codex/task-delegation-resource-lifecycle`.
Base: `origin/personal@8f57d16d1` (≥ `f2924a2b0`, as ARCH-19 / R-9 require). IR-003 rebased the work from the old `8bffda045` basis; IR-004 stays on the same basis (`origin/personal` has since moved to `8c474e37a`; Delivery integrates). Nothing is committed yet. A full pre-rebase backup is at `/tmp/tdrl-prerebase-backup/` and in the stash `tdrl-pre-rebase-IR-002`.

## Upstream Artifact Package

All artifacts live in `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/`.

- Upstream review applicability and handoff-rule result: independent architecture review was selected and passed (ARCH-REV-005, SR-007, superseding ARCH-REV-004 on SR-006). Large / High routes to source review.
- Requirements doc: `requirements-doc.md` (SR-002 + the user-approved SR-007 delta, DEC-008)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-007; authoritative section "SR-007 Tolerant Tree Reading — No Migration", which supersedes the Migration Plan and the SR-005/SR-006 migration parts)
- Supplemental task artifacts: `solution-handoff.md`. No UI/UX supplement exists (the design lists none).
- Design review report: `design-review-report.md` (round 5, ARCH-REV-005 pass; non-blocking R-5, R-6, R-7, R-11, R-12, R-13, R-14; R-10 obsolete)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering report: ARCH-REV-005 (SR-007 design delta).
- Earlier downstream records (context; their results predate SR-007): `code-review-report.md` / `code-review-revision-record.md` (CRR-004 Pass on IR-003), `api-e2e-execution-coverage-report.md` / `api-e2e-revision-record.md` / `api-e2e-test-case-ledger.md` / `api-e2e-coverage-investigation.md` (API-REV-001).

## Current Implementation Summary

- Implementation cycle: `Rework`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-004` (after `IR-001` to `IR-003`)
- Related solution revision IDs: SR-002, SR-007
- Related architecture-review revision IDs: ARCH-REV-005
- Related code-review revision IDs: CRR-004 (Pass on IR-003; earlier CRR-001 to CRR-003)
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Triggering finding IDs: SR-007 (REQ-018, AC-020, AC-021), R-12, R-13, R-14

What changed, in short:
- **Pure spawn.** `delegate_task` returns `{target_agent_run_id}` on success, or `{target_agent_run_id: null, message}` when nothing started. It writes one execution-tree entry that records the delegator. No task record, status or result/review exists anymore.
- **Idle shutdown.** A delegated child that stays quiet for the grace period is shut down but stays in the tree, shown as `offline`. The grace period defaults to 10 minutes; the server setting `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS` accepts 60 000–86 400 000 ms.
- **Wake-on-message.** A message to a shut-down child's run ID from the same root restores it with its conversation, then delivers. This covers both `send_message_to` and operator input from the composer.
- **Removals.** submit/review tools, task records, the task status machine, the GraphQL and REST task APIs, and the task UI are gone.
- **Persistence (SR-007).** No data migration. Team and Org trees are read tolerantly (known fields required; unknown fields, `settledAt` and `schemaVersion` ignored) and written exactly (no version field, no `settledAt`). `delegatorAgentRunId` is optional: new children always record it, old children have none and show no starter. Old task-records files are left untouched on disk. Released migrations read a verbatim frozen strict legacy module (AR-004).
- **Wire DTOs (R-13).** The tree `schema_version` literals are removed from both contract packages, the projectors and the web.
- **Liveness (AR-005).** A task Agent is live only while its handle's AgentRun is active. Shutdown keeps the handle and only ends the run, and a wake re-activates it in restore mode.
- **Org members tree (CR-003).** Delegated rows show the plain name plus "Started by <name>"; the "Task:" labels are gone.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` › "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: implementation touched every subsystem the design listed:
  - lifecycle owner, adapters, registries, router, persistence/admission and tree validation policy (tolerant read / exact write; released migrations on frozen strict classifiers);
  - both stream-contract packages, GraphQL/REST, settings, the LLM contract and the web.
  The contract, persistence, concurrency, security-boundary and ownership risks all materialized as designed.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. Restore reuses the existing `restore` planner for task Agents, task Teams and external provider sessions (`restoreTaskTeamNode`, `prepareRestoredTaskTeam`, registry `restore`). SR-007 removed the data transformation; persistence risk is lower, and the remaining High drivers are the contract changes, lifecycle/concurrency, the root security boundary, ownership replacement and the cross-cutting tree-validation policy that released migrations depend on.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Same inputs. Result `{target_agent_run_id}` or failure. Tree records the delegator. | `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` (`delegate`), `task-delegation-command.ts`, `task-execution-input.ts` (work packet keeps the delegator address/run-ID lines); Team `agent-team-execution/task-delegation/team-task-execution-{adapter,service}.ts`; Org `agent-org-execution/services/agent-org-task-execution-adapter.ts`; single-write `commitTaskActivation` in the Team/Org persistence coordinators; `task-delegation-result-contract.ts` (strict union) | Implemented. Every new child records its delegator (`task-execution-tree-projection.ts`). Input and admission failures are thrown as tool errors before any preparation: `VALIDATION_ERROR` (`requireTaskString`), `INVALID_REFERENCE_FILE` (`validateTaskReferenceFiles`) and `ROOT_RUN_NOT_ACTIVE` (`assertAdmitting`). This split is unchanged from before. A spawn that fails after preparation starts returns `{target_agent_run_id: null, message}`. |
| BEH-002/003 | submit/review deleted (native + MCP) | `agent-tools/task-delegation/*` (contract, manifest, parsers, run-router, service, parameter schemas reduced to `delegate_task`); submit/review files deleted; `runtime-agent-tool-exposure.ts` exposes only `delegate_task` | Implemented. Legacy configured names are ignored. |
| BEH-004 | Quiet + grace → shutdown. Activity cancels. The next quiet moment re-arms. | `task-execution-idle-shutdown-schedule.ts` (injectable timers; grace read at arm time); lifecycle `onAgentStatus` (`idle`/`offline`/`error` arm, `initializing`/`running` cancel); a lease release arms the chain; shutdown at queue head skips leased or non-live executions; registries `tryShutDownIfQuiet` via handle `tryPrepareTerminationIfQuiescent`; `config/task-execution-idle-shutdown-setting.ts` + `services/server-settings-service.ts` | Implemented. R-5: one running-work predicate, `isRunningTaskExecutionStatus` (`task-execution-running-work.ts`), plus registry `hasRunningWork`. R-6: followed DS-005. AR-005 (IR-003): every check uses one liveness predicate, `adapter.isLive`. For Team it is `TaskAgentExecutionRegistry.isLive`; for Org it is `AgentOrgRootAgentExecutionRegistry.isTaskLive` or the Team host. A task Agent is live when its handle's run is active; a task Team is live when its TeamRun is registered. It applies to the schedule arm rule, the queue-head shutdown skip, `assertRestorableChain`, open work (live only), status snapshots (non-live → `offline`) and command gating. Shutdown keeps the handle registered and only ends its run. |
| BEH-005 | Same-root wake, then deliver. Clear rejection. No cross-root wake. | `agent-communication/services/global-agent-run-message-router.ts` (routes through the sender root when `hasAgentExecution(target)`); `active-collaboration-root-directory.ts` (the boundary requires `hasAgentExecution`); `RootTeamRun` / `AgentOrgRun` `withLiveLease` around `deliverExactAgentMessage` and operator `post_message`; adapter `assertRestorableChain` → `TASK_EXECUTION_CONTEXT_UNAVAILABLE`; restore failure → `TASK_EXECUTION_RESTORE_FAILED` | Implemented. Targets outside the sender's root use the live-only path, which returns `TARGET_AGENT_RUN_NOT_ACTIVE`. Non-post commands to a shut-down child return `RUN_NOT_ACTIVE`, and the registries also refuse `approve_tool` / `interrupt` on a non-live task Agent without calling the handle (AR-005). Wake (`restoreChain`, inside the lease) creates a `restore`-mode handle only when none exists (after reopen), then activates the run (`getOrCreateAgentRun`), so the chain is live before input is reserved and receiver admission passes under the same predicate. |
| BEH-006 | After a root reopen, children start shut down and can be woken | Team/Org loaders and materializers no longer read records or repair; restore materializes only configured members; task executions stay in the tree without live handles | Implemented. There is no reopen repair; liveness is runtime-only. |
| BEH-007 | Root stop stops every live execution; timers cancelled | `closeExternalAdmission` / `enterRootFailStop` dispose the schedule; root termination drains the lifecycle before persistence drain and local finish | Implemented. |
| BEH-008 | Open work = running work only | `RootTeamRun.hasOpenExecutionWork`, `AgentOrgRun.hasOpenExecutionWork` → registry `hasRunningWork` / `hasOpenExecutionWork` | Implemented. |
| BEH-009 | Messages-only panel; members tree uses standard status (shut down = `offline`) plus the delegator | Web `CollaborationOverviewPanel.vue`, `CollaborationMessagesSection.vue`, `TeamMembersPanel.vue`, `WorkspaceTransientExecutionRow.vue` ("Started by …"); `teamExecutionViewState.ts` / `teamExecutionTreeSelectors.ts` (all placements navigable); Org `agentOrgExecutionViewIndex.ts` / `agentOrgExecutionContext.ts`; the server fills `offline` for dormant agents (`RootTeamRun.getLeafAgentStatusSnapshots`, `agent-org-agent-status-snapshot-projector.ts`) | Implemented. CR-003 (IR-003): Org history rows (`utils/agentOrgHistoryRows.ts`, `WorkspaceAgentOrgHistoryCollection.vue`) show the plain name plus a "Started by <delegator>" line on direct task-Agent and task-Team rows, also in the aria-label. The name resolves through the tree, falling back to the run ID. Task-Team members show no starter line. R-14 (IR-004): children without a recorded delegator show no starter in the Team members tree and the Org rows; the Org view index keeps them as delegated executions with a null delegator. The `workspace.agentOrg.history.taskLabel` keys are removed. Rendered checks below. |
| BEH-010 | Tree + messages only; APIs deleted; old files untouched | Loaders/validators (`team-run-state-package-{loader,validator}.ts`, Org equivalents); `root-run-package-current-validator.ts` (records neither required nor removed); GraphQL `types/task-delegation.ts` and REST `task-delegation.ts` deleted and unregistered; Org task reference REST route removed; tree schemas in `run-history/store/` | Implemented. SR-007 (IR-004): no migration. Tolerant reading and exact writing in `run-history/store/{run-execution-tree-shared-record-schemas,team-run-execution-tree-schema,agent-org-run-execution-tree-schema}.ts` (`requireKeys` plus projecting `parse*` functions; stores write the projection). Released migrations use the frozen strict `app-data-migrations/legacy/released-run-package-shapes/` module (AR-004); `20260926` is unchanged and `20260905` is adapted in 13 lines. |
| BEH-011 | Spawn-then-message wording | `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` ("Delegated Agents" section, wake-on-message) | Implemented. Contract hashes re-pinned in the llm-contract test. |
| BEH-012 | Only the spawn packet is delivered; old notifications still render | No task notifications are produced; history rendering unchanged | Implemented. Old task tool calls still render as ordinary tool calls (web `teamMemberToolStateReconciliation` spec). |

## Key Files Or Areas

- **Lifecycle (root-neutral), in `autobyteus-server-ts/src/agent-collaboration/execution/task/`:**
  - `root-task-execution-lifecycle.ts`, `root-task-execution-adapter.ts`, `root-task-execution-command-queue.ts`
  - `task-execution-idle-shutdown-schedule.ts`, `task-execution-running-work.ts`, `task-execution-reference.ts`
  - `task-team-node-restoration.ts`, `task-execution-tree-projection.ts`, `task-delegation-command.ts`
- **Team:**
  - `agent-team-execution/task-delegation/team-task-execution-{adapter,service,service-contract}.ts`
  - `domain/root-team-run.ts`
  - `services/team-agent-platform-binding-committer.ts` (IR-002: provider platform-binding commit, delegated from `RootTeamRun`)
  - Registries `task-agent-` and `task-team-execution-registry.ts`
  - `flat-team-execution-manager.ts`
  - `services/team-run-persistence-coordinator.ts`
- **Org:**
  - `agent-org-execution/services/agent-org-task-execution-adapter.ts`
  - `agent-org-root-agent-execution-registry.ts`
  - `agent-org-team-execution-directory.ts`
  - `domain/agent-org-run.ts`
- **Router:** `agent-communication/services/global-agent-run-message-router.ts`
- **Schema (tolerant read / exact write):**
  - `run-history/domain/run-execution-tree-shared-records.ts` (optional `delegatorAgentRunId`)
  - `run-history/store/run-execution-tree-shared-record-schemas.ts` (`objectRecord`, `requireKeys`, `parse*`, `validateTaskExecutionDelegators`)
  - `run-history/store/team-run-execution-tree-schema.ts`, `agent-org-run-execution-tree-schema.ts`
  - Types `TeamRunExecutionTreeFile` / `AgentOrgRunExecutionTreeFile` (no version literal)
- **Released-migration support (no new migration):**
  - `app-data-migrations/legacy/released-run-package-shapes/` (16 verbatim frozen copies as of `f2924a2b0`, import paths remapped only; current runtime never imports it; README states the SR-007 rationale)
  - Registry byte-identical to released code
  - Released migrations restored to released code with imports repointed: `team-run-execution-tree-v1/*`, `team-run-migration-state-classifier.ts`, `team-run-execution-tree-v2-app-data-migration.ts`, `agent-org-flat-team-families-v1/*`
  - `agent-org-history-first-message-summary-v1/*` (13-line adaptation)
  - `context-file-record-locators.ts` and `team-context-file-execution-locators-v1/*` are byte-identical to released code
- **Contracts:**
  - `autobyteus-team-stream-contracts` (`TASK_EXECUTION_STARTED`, nullable `delegator_agent_run_id`, no `schema_version`, no `tasks` in the snapshot)
  - `autobyteus-collaboration-stream-contracts` (`task_execution_started`, optional `delegatorAgentRunId`, no tree `schemaVersion` / root `schema_version`, no `task_records`)
- **Web:** collaboration panel, members tree, transient rows, Org history rows (`utils/agentOrgHistoryRows.ts`, `WorkspaceAgentOrgHistoryCollection.vue`), view state, Org view index/context, hydration, GraphQL documents, localization (en / zh-CN).

## Important Assumptions

- A pending tool approval keeps an agent out of `idle`: the runtime reports `running` for the in-flight turn. The quiet-shutdown guard (`tryPrepareTerminationIfQuiescent`) is a second check. Both hold in unit tests; per-runtime confirmation is an API/E2E item (AC-006).
- "Same root" means the sender's collaboration root, looked up via `ActiveCollaborationRootDirectory`. Root-less senders (standalone agents) never wake children.

## Known Risks

- **Real-provider restore.** Restoring Codex, Claude or AutoByteus sessions after shutdown (AC-007, AC-013) is covered only with test doubles. It needs live runtime validation.
- **Wake vs. shutdown races.** Both queue behind one per-root FIFO with live leases. Unit tests cover lease-at-head skip and restore-failure re-arm; real timing is unvalidated.
- **Released migrations are verbatim (AR-004).** `context-file-record-locators.ts` is byte-identical to released code again (it still scans records files by filename, as released). On the rebased basis only migrations use it, so the IR-002 opt-in flag was removed.
- **Retry edge of pending released migrations (design: verbatim repoint).** If `20260824` or `20260901` is still pending or failed when a user upgrades, and new version-less trees exist before it retries, the frozen strict classifiers treat those new trees as unsupported, per root and preserved. On the inspected install both are terminal (`SUCCEEDED` / `SUCCEEDED_WITH_WARNINGS`, checked read-only), so the runner never re-runs them there.
- **Tolerant reading drops unknown fields on the next save.** An old tree loses `settledAt` / `schemaVersion` (and any unknown key) only when the runtime next saves that tree for its own reasons (a new delegation, a platform-binding change). This is the approved behavior (AC-018).
- **Handoff entries stay exact.** `normalizeCollaborationHandoffs` is the shared collaboration contract (also used for definitions), so handoffs inside a tree still require exactly `from`, `to`, `rules`. The design lists only nodes, members and launch configuration as tolerant.
- **Shared-schemas change size.** `run-execution-tree-shared-record-schemas.ts` changed +150 / −94 lines (281 effective lines): one cohesive validation-policy rewrite, kept in one file.
- **Wake activates inside the lease (AR-005, unchanged).** `restoreChain` now awaits run activation. A provider that is slow to restore holds the per-root queue for that time; restore failures surface as `TASK_EXECUTION_RESTORE_FAILED`.
- **Untracked build output.** Untracked `dist/` directories in `autobyteus-application-sdk-contracts` and `autobyteus-application-backend-sdk` are build output and not part of this change. Rebuilt `autobyteus-team-stream-contracts/dist/team-task-execution-message-dtos.*` is new tracked-package output and should be committed with the sources.
- **Probe hooks.** The transient Team history row and the Org task-Agent row carry a `data-agent-run-id` attribute so browser probes can target exact runs. There is no visual change.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change` + `Refactor`
- Reviewed root-cause classification: `Boundary Or Ownership Issue` (+ legacy duplicated state)
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`. The task engine was replaced by the resource-lifecycle owner, the tree is the single persisted authority, and records/APIs/UI are removed.
- If challenged, routed as `Design Impact`: N/A
- Evidence / notes: R-7 is applied: the Team adapter uses the root-neutral `task-execution-tree-projection.ts`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. Tolerant reading has no old-shape branch or version switch; it projects known fields and ignores the rest (SR-007). The only old-shape knowledge sits in the migration-owned frozen legacy module; current runtime never imports it (checked by grep).
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, files, unused helpers/tests/flags/adapters and dormant replaced paths removed: `Yes`. That covers:
  - the engine, records stores/schemas, settlement types, reopen repair, reference resolvers and projections;
  - the GraphQL/REST task APIs, the submit/review tools and task UI components;
  - obsolete specs and the task-conversation browser probe.
- Shared structures remain tight: `Yes`. `TaskAgentExecution` / `TaskTeamExecution` carry one optional field, `delegatorAgentRunId`, whose absence has a truthful meaning (starter not recorded), per DEC-008. No legacy field is kept.
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes` (corrected in IR-002). IR-001 wrongly claimed this: `domain/root-team-run.ts` had 514 effective lines (CR-001). IR-002 moved the platform-binding commit into the Team-owned collaborator `services/team-agent-platform-binding-committer.ts`, which `RootTeamRun` delegates to; callers still depend only on `RootTeamRun`. `root-team-run.ts` is now 465 effective lines. A full scan of changed hand-written source files finds only two above 450: `agent-org-run.ts` (474) and `root-team-run.ts` (465), both under 500. The IR-003 re-scan on the rebased basis is unchanged. The frozen legacy module holds verbatim copies of released files and is not new implementation. The largest new source is `root-task-execution-lifecycle.ts` at 196 lines. `autobyteus-web/generated/graphql.ts` is generated, with task types removed.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration` (SR-007, DEC-008). Task-records files: `Not Affected` on disk (never read, never written).
- Design-spec decision reference: `design-spec.md` › "SR-007 Tolerant Tree Reading — No Migration" (supersedes the Migration Plan and the SR-005/SR-006 migration parts).
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`. The in-progress `20261001_task_execution_delegator_tree` migration, its folder, registry entry, prerequisites and tests are deleted; the registry is byte-identical to released code.
- Version-agnostic reader behavior and invariants:
  - Required keys: Team `createdAt`, `archivedAt`, `applicationBinding`, `handoffs`, `rootTeam`; Org the same plus `subjectKind: "agent_org"`, `rootOrg`. Nodes, members and launch configuration keep their required fields. Task executions require `address`, run ID, `startedAt` (Agent: `platformAgentRunId`; Team: `members`, `taskExecutions`).
  - Ignored on read: `schemaVersion`, `settledAt`, any unknown key (they are not projected, so they never reach memory or a write).
  - Invariants unchanged (unique run IDs, canonical addresses, unique coordinator, handoff endpoints), plus: a present `delegatorAgentRunId` must resolve to an AgentRun in the same tree.
  - Structural recognition without a version: a preserved released V1 Team tree is still rejected (its root lacks current required fields, and every V1 launch configuration uses a retired `runtimeKind`), so V1 roots stay non-admitted.
  - Writing: stores serialize the projection, so the file is always the exact current shape (no `schemaVersion`, no `settledAt`, `delegatorAgentRunId` on new children).
- Released migrations: repointed to the frozen strict module (IR-003, unchanged here) wherever they use strict validators as classifiers or the deleted records code. `20260926` is unchanged; `20260905` uses current (tolerant) package validation without records plus the frozen records store.
- Focused tests:
  - `tests/unit/run-history/team-run-current-package-schema.test.ts`: tolerant read (unknown field, `settledAt`, with/without `schemaVersion`), missing required fields rejected, unresolvable/empty delegator rejected, task-Team member as delegator, exact write through the store (including stray caller fields), V1 rejection.
  - `tests/unit/run-history/agent-org-run-execution-tree-tolerance.test.ts`: the same for Org trees, including the released Org V1 shape.
  - `tests/unit/app-data-migrations/released-run-tree-skip-version-upgrade.test.ts` (SR-007 evidence item 3, unit level). The production registry runs with a ledger holding every migration released before `20260901` (by ID date). It checks that:
    1. `20260901`, `20260926` and `20260905` succeed as released, and earlier migrations are not re-run;
    2. the released Team tree keeps its bytes and the current reader loads it (the old child has no delegator);
    3. `20260901` produced a released-shape Org tree (V1) that the current reader loads;
    4. the locator was converted by `20260926`, and `20260905` produced the summary "Plan the release";
    5. the records file and the tree-less root are byte-identical; admission takes `team-a` and `org-a` and excludes the tree-less root (`ROOT_RUN_PACKAGE_MISSING_TREE`);
    6. a repeat startup changes nothing.
  - `tests/unit/app-data-migrations/definition-nonmutation-startup.test.ts`: the full production registry on a fresh pre-ticket root leaves a native released tree and its records byte-identical.
  - Released-migration suites (`20260814`, `20260824`, `20260901` including the candidate-plan classifier and its safety tests) run on released fixtures via `tests/fixtures/released-run-tree-fixtures.ts`.
- Deviation from the reviewed transition decision: `None`.

## Environment Or Dependency Notes

- Rebuild the stream-contract packages after contract edits: `pnpm -C autobyteus-team-stream-contracts build` and `pnpm -C autobyteus-collaboration-stream-contracts build`.
- Server tests share one SQLite DB per worktree; do not run two server vitest processes in the same worktree at once.
- Baselines:
  - Pre-rebase baselines at `8bffda045` (removed).
  - A rebased baseline worktree at `8f57d16d1` (`/tmp/tdrl-base2`) had a broken test environment: most suites failed on Prisma loader errors and missing Nuxt preparation. IR-003 therefore treats a failure as a regression only if it is absent from the pre-rebase baseline, which is the stricter comparison.
- Upstream added the dependency `@agentclientprotocol/sdk`; run `pnpm install` after checkout.

## Local Implementation Checks Run

Implementation-scoped only; not API/E2E sign-off.

- **IR-004 (SR-007, same rebased basis `8f57d16d1`, current):**
  - Server source typecheck: clean. Contracts rebuilt (both packages).
  - Server unit + architecture: 539 passed / 29 failed files, all 29 in the IR-003 baseline list (0 regressions). Two files that first failed in the run were adapted and pass: `definition-nonmutation-startup` (the native released tree stays byte-identical) and `team-run-execution-tree-v2-app-data-migration` (the recursive V2 tree is now rejected structurally instead of by version).
  - Server integration: 51 passed / 17 failed files, all in the baseline; `task-delegation-tool-lifecycle` (persisted tree has no `schemaVersion`) is adapted and passes 8/8.
  - Server e2e: 54 passed / 11 failed files, all in the baseline; `stopped-org-workspace-graphql` is adapted and passes. The version assertions in `hierarchical-team-run-config-graphql` (baseline-failing) and the real-LLM `mixed-task-delegation` (skipped without providers) were changed to "no `schemaVersion`".
  - Web unit: 500 passed / 5 failed files, the identical baseline set; the new R-14 and view-index specs pass.
  - Web vue-tsc: 108 errors, the identical set to IR-003; none new.
  - New or rewritten focused tests: the Team tolerant/exact/V1 schema tests (5), the Org tolerant/exact tests (3), the rewritten skip-version fixture (1), the Org view index (2), R-14 in the Team view state and Org rows specs.
- **IR-003 (rebased basis, historical):**
  - Server source typecheck: clean.
  - Server unit + architecture: 538 passed / 30 failed files. The only file outside the pre-rebase baseline was `context-file-access-containment.test.ts`, an upstream-changed fixture still in the old shape; it is fixed (9/9). The other 29 are pre-existing.
  - Server integration: 50 passed / 18 failed files, all in the pre-rebase baseline (23); 0 regressions.
  - Server e2e: 54 passed / 11 failed files, all in the pre-rebase baseline (15); 0 regressions.
  - Web unit: 500 passed / 5 failed files, exactly the known baseline set.
  - Web vue-tsc: 108 errors, unchanged; none new. The four `continuingAncestorDepths` readonly errors in `WorkspaceAgentOrgHistoryCollection.vue` pre-exist for every row kind.
  - New focused tests: skip-version fixture (8g), delegator migration (6 tests: SR-005 records-only-with-tasks, STARTUP_ONLY and prerequisites, aggregate semantics), Team registry AR-005 liveness (2), Org idle shutdown adapted to retained handles (6, including the downstream errored-child cases), and Org delegated rows web spec (3).
  - Upstream's new tests adapted to this change: restore self-heal (Team/Org), termination retry, context-file containment.
- Earlier rounds (pre-rebase basis `8bffda045`, historical):
- IR-002 recheck: server typecheck clean; the 42 affected Team/collaboration/binding suites pass except `team-run-model-selection-save`, whose 11 failures are identical to baseline. A full unit + architecture rerun gives the same 514/30 split with 0 regressions.
- Server unit + architecture (`pnpm exec vitest run tests/unit tests/architecture`): 514 passed / 30 failed files (3576 / 79 tests). All 30 failing files also fail at baseline (31 baseline failures); 0 regressions, 1 baseline failure fixed. The 43 files that newly failed after the change were fixed or rewritten.
- Server integration (`pnpm exec vitest run tests/integration`): no regressions vs baseline. The 6 files that newly failed after the change are fixed and pass (51/51). The rest are baseline failures (23 files at baseline).
- Server e2e (`pnpm exec vitest run tests/e2e`, hermetic parts): no regressions vs baseline. The 2 migrated-Org regressions are fixed (3/3 pass). Real-provider suites fail or skip exactly as at baseline.
- New or rewritten focused tests:
  - `root-task-execution-lifecycle.test.ts` (15)
  - `root-task-execution-command-queue.test.ts` (3)
  - `agent-org-task-idle-shutdown.test.ts`: real Org registries; Agent + Team spawn with one tree write; idle arm/cancel/re-arm; grace shutdown kept in the tree as offline; wake-on-message restore; `TASK_EXECUTION_CONTEXT_UNAVAILABLE`; timer disposal on terminate.
  - `agent-org-task-shutdown-event-retirement.test.ts`
  - `task-delegation-tool-lifecycle.integration.test.ts`: Team root pure spawn, delegator persisted as v3, idle shutdown + wake, context-unavailable, nested delegator, target validation, reference files.
  - Router same-root wake test in `global-agent-run-message-router.test.ts`.
  - `team-run-persistence-coordinator.test.ts`: single-write activation outcomes.
  - `team-run-current-package-schema.test.ts`: v3 required; delegator must resolve; `settledAt` rejected.
  - Readiness admits packages with retained records files without touching them.
- Web unit (`NUXT_TEST=true pnpm exec vitest run`): 490 passed / 5 failed files. The 5 failures are the pre-existing baseline set; no regressions.
- Web typecheck (vue-tsc 3 / TS 5.8 via a temporary tsconfig extending `.nuxt/tsconfig.json`, tests excluded; temp file removed): 108 errors, all present at baseline (baseline about 111); none new.

## Frontend Rendered-Result Check (When Applicable)

- **Affected surfaces / journeys:**
  - Workspace history sidebar Team rows: delegated Agent / Team rows with "Started by …", standard status, exact selection, retry.
  - TeamWorkspaceView monitor for a focused delegated Agent.
  - Collaboration panel (Messages only).
- **References:** REQ-013 / AC-017, BEH-009. No UI/UX supplement exists.
- **Design system and adjacent surfaces reviewed:** the existing `WorkspaceTransientExecutionRow`, `AgentStatusDisplay`, `TeamMembersPanel` and history hierarchy labels. The row keeps its existing visual language; only the task title/lifecycle line became "Started by <delegator>".
- **Rendered surface used:** the repository's Nuxt fixture-page browser probes (no `TESTING.md` exists). Both were run in real Chrome against a Nuxt dev server with the production history/selection/hydration code:
  - `autobyteus-web/tests/e2e/task-agent-peer-sidebar-probe.mjs`
  - `autobyteus-web/tests/e2e/task-agent-monitor-visibility-probe.mjs`
- **States inspected (both probes `Pass`):**
  - `PEER-001`: live peers render as delegated rows at peer depth, each with a "Started by Reviewer" line; mouse and keyboard select the exact conversation; delayed loading, failure alert and retry.
  - `PEER-002`: task-Team containment and ancestor auto-reveal; outer collapse and expand.
  - `PEER-003`: an inactive retained root renders delegated rows as `offline`; reload keeps the exact conversation; a Team with no delegations adds no rows; narrow (260 px) sidebar.
  - `API-E2E-TMV-001`: exact delegated-Agent selection hydrates its retained conversation and Activity before focus commits; no task lifecycle status is rendered.
  - `API-E2E-TMV-002`: a snapshot reconciles the focused delegated Agent; idle shutdown (an `offline` `AGENT_STATUS`) keeps the row visible and selected with the grey `Offline` status and its conversation, and issues no extra projection request.
- **Issues found and corrected:**
  - Task-title selectors no longer apply, so probes now target rows by the new `data-agent-run-id`.
  - The lifecycle label assertions became standard `offline` status checks. The label renders lowercase "offline"; the first probe run surfaced that case mismatch in the assertion, and it is fixed.
  - The monitor probe's configured and delegated Student rows share a display name; the delegated row is now selected by its accessible "Started by Teacher" name.
  - One screenshot showed a green dot next to "Offline". That was the 300 ms dot colour transition caught mid-fade, not a status mismatch: the text and colour come from the same visuals object. The probe now waits for the transition, and the settled render shows grey.
- **Evidence:** `/tmp/tdrl-probe-peer/evidence.json` and `/tmp/tdrl-probe-monitor/evidence.json` (screenshots in the same folders). The standalone collaboration panel is covered by component specs only, not by a probe.
- **IR-004 (R-14, old children without a delegator):** no template or styling changed. Only the data path changed: a child without a recorded delegator yields `delegatedBy: null`, and the existing `v-if` then omits the "Started by" line. This is verified by mounting the real components/state in the web unit suite: `WorkspaceAgentOrgDelegatedRows.spec.ts` (no line, no aria text, name still shown), `teamExecutionViewState.spec.ts` (Team members-tree row `delegatedBy: null`) and `agentOrgExecutionViewIndex.spec.ts`. It was not re-rendered in a browser this round, because the rendered markup for the with-delegator case is unchanged from the IR-003 browser check and the without-delegator case only removes an existing line.
- **IR-003 Org sidebar (CR-003):**
  - Rendered the real `WorkspaceAgentOrgHistoryCollection` with the delegating Org fixture in Chrome, through a temporary Nuxt page (removed afterwards), for a stopped run and an active run.
  - Observed "worker / Started by director" and "team / Started by director", task-Team members with no starter line, no "Task:" labels, and aria-labels carrying the status and "Started by …". There were no browser errors.
  - Screenshot: `/tmp/tdrl-org-check/org-rows.png`. The secondary line matches the Team-root "Started by" styling.
  - The peer/monitor probes were not re-run on the rebased basis: the web code under them is unchanged by IR-003, and the web unit suite passes.

## Downstream Coverage Hints / Suggested Scenarios

- **Real runtimes (AutoByteus, Codex, Claude):** delegate → child replies and goes quiet → shut down after the grace period (use a 60 s setting) → message by run ID restores with conversation → reply.
- **Tool approval:** a child waiting for approval beyond the grace period is not shut down (AC-006).
- **Task Team:** a quiet task Team shuts down whole; a message to the coordinator run ID restores it (AC-009). A grandchild wakes a shut-down child (AC-010).
- **Cross-root:** a message to a child's run ID from another root is rejected and nothing is restored (AC-012).
- **Reopen:** reopen a root, then message an earlier child (AC-013). Stop a root with live children (AC-014).
- **Upgrade (AC-018, SR-007 item 4):** on a stopped-writer copy of installed data (never the live profile), startup admits the same roots as before (tree-less roots stay excluded) and changes no tree or records file (hashes). Old children show no starter; a new delegation writes a version-less tree with `delegatorAgentRunId`; wake and shutdown work on the new child.
- **API surface:** GraphQL task query and task REST route absent (AC-019). The `delegate_task` MCP output schema is the new union (`anyOf`).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- **Rewrite `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`.** This real-LLM e2e still drives the removed `submit_task_result` / `review_task_result` tools and `TASK_DELEGATION_EVENT`. It fails or skips at baseline and was not rewritten here; it needs rewriting for spawn → converse → shutdown → wake per runtime.
- **Historical data only:** `tests/e2e/run-history/nested-team-history-restart.e2e.test.ts` uses `submit_task_result` as a historical tool name in trace fixtures, which is valid for rendering old history.
- **Confirm the offline label with Delivery (R-4).** Shut-down children display the standard `offline` status.
- **Re-run downstream gates for SR-007 (R-9)**: evidence items 1–5. The unit tests cover items 1–2 and item 3 through the production registry; item 3 through both real startup entrypoints and item 4 (installed-data copy with hashes) remain for API/E2E.
- **Re-run the Org UI check (AE-001)** on the real app for CR-003.
- **Per-runtime AC-006, AC-007, AC-009, AC-013 and AC-018 validation on real data**, as listed above.
