# Implementation Handoff — delegated-copy-model-change

**Current round: IR-002 (local fix of code review CRR-001: CR-001, CR-002, CR-003; `Large` / `High` unchanged).**
IR-001 was the initial baseline. Worktree
`/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change`, branch
`codex/delegated-copy-model-change` (base `origin/personal` @ `a609de982a`). Commits: see "Commits" at the end.

## IR-002 — CRR-001 local fixes

Basis: `code-review-report.md` CRR-001 (`Fail`, `Local Fix`). Requirements and design are unchanged; no new design
impact (the publication follows the existing live tree-mutation model).

| Finding | Fix | Evidence |
| --- | --- | --- |
| CR-001 web copy-member selectors returned started launches | `autobyteus-web/services/collaborators/agentSourceSelectors.ts`: the address selectors stay the *started* source of an address (shared by every instance there; Settings rows apply the rule themselves). What one instance runs with is applied once per casing with the contract rule: `teamAgentSourceAt(tree, address, agentRunId)` (Team) and `collaborationInstanceSource(instances, agentRunId, source)` (Org/Agent) find the instance's record and apply `teamCopyAgentLaunch` / `collaborationCopyAgentLaunch` with the server's follower rule (recorded member: no own launch; copy of a configured Team: launch equals the configured Team default, AR-003; nested Team member: never; collaborator Agent / agent copy: own choice only). Callers pass the run ID: Team context factory, Team run/member hydration, Team view workspace lookup, Org view index (`instances()` incl. configured Team defaults), Agent collaboration index. | `agentSourceSelectors.spec.ts` (snake: agent copy per instance vs another copy and the collaborator, collaborator Team follower / non-follower, catalog Team copy follower / non-follower, configured member unchanged, no run ID → started; member context shows the chosen model; camel: collaborator follower / non-follower / own choice, agent copy at a collaborator address, configured-placement follower by equality and non-follower); `agentOrgClosure.spec.ts` and `agentRunCollaborationClosure.spec.ts` (indexes give copies the chosen model; configured member unchanged) |
| CR-002 live views not updated; `savedByRoot` client copy | Server: the command publishes after the durable commit (`DelegatedLaunchRootPort.publishSelectionsChanged`, called in `afterDurability` after the collaborator swap, only when committed) the records as now recorded (`recordedDelegatedLaunchSelections`: an equal choice keeps its earlier `selectedAt`). Team: `TeamRunEventSourceType.DELEGATED_LAUNCH_SELECTIONS` → stream `DELEGATED_LAUNCH_SELECTIONS_CHANGED {change_sequence, selections: [{agent_run_id|team_run_id, selection}]}`; Org/Agent: `{kind: "delegated_launch_selections_changed", selections: [{agentRunId|teamRunId, selection}]}` (one shared contract schema). Web: the Team view records the choices in place (`recordDelegatedLaunchSelections`, unknown run → rejected → recovery) and refreshes member contexts' model (`refreshTeamAgentLaunches`); Org and Agent contexts validate the run IDs and reload through their existing checkpoint path (as for `task_execution_started`), so the rebuilt index/contexts read the choice (CR-001). `savedByRoot`, the `saved` getter and `DelegatedRowControl.savedOf` are removed; Settings rows read the run (Team/Org: the reload after Save; Agent: the live collaboration view). | Server: `delegated-launch-selection.test.ts` (recorded read-back), Team and Org root tests (one event after `UPDATED` with the recorded selection; none after `UNCHANGED`), `launch-selection-dto-projection.test.ts` (Team stream message, Org/Agent event parse). Contracts: team 16/16, collaboration 27/27 (new schema tests). Web: `agentSourceSelectors.spec.ts` (live Team view: tree records, follower and collaborator contexts take the model, configured member unchanged, unknown run rejected), Org/Agent closure specs (`checkpoint_required`, unknown run → reopen required), `delegatedLaunchDraftStore.spec.ts` (no client copy) |
| CR-003 three files over 500 effective lines | No behavior change. `root-task-execution-lifecycle.ts` 521 → 488: stopping marks, leases and the lease drain move to the owned collaborator `execution/task/task-execution-live-holds.ts` (`TaskExecutionLiveHolds`: `lease`, `isLeased`, `isStopping`, `assertNotStopping`, `beginStop` → `{drained, end}`); the queue steps stay. `configured-agent-execution-handle.ts` 516 → 484: the activation fence moves to `AgentActivationFence` in `backends/configured-agent-execution-support.ts` (with the moved `describeActivationFailure` and `completedLocalTermination`). `agent-team-run-manager.ts` 530 → 436: the stopped Save's plan (configured targets + delegated plan, one `validateMany`, interpretation, apply) and the options read move to `services/team-run-delegated-launch-plan.ts` (`planStoppedTeamLaunchSave`, `teamDelegatedLaunchModelOptions`); the manager keeps the gates and the one tree write. Web: `teamExecutionViewState.ts` stays at 486 by moving its pure tree walk (`teamTreeWalk`, `teamTreeRunKeys`) to `teamExecutionTreeSelectors.ts`. | Lifecycle 30, handle 36, `team-run-model-selection-save.test.ts` and the Team/Org/Agent suites unchanged and passing |

Docs: `autobyteus-web/docs/settings.md` (what Settings shows right after Save; live publication),
`autobyteus-server-ts/docs/modules/agent_communication.md` (the Save publishes the committed choices).

## Upstream basis

- Design: `design-spec.md` at `SR-007` (`Ready`); its Revision Notes (SR-005) AR-001..AR-005, (SR-006) AR-006 and
  (SR-007, DEC-010) are authoritative over the body (no `selection: null`/Reset, no "Your choice", no "nested copies
  first" in DS-002, no operation gate).
- Requirements: `requirements-doc.md` (approved SR-004; SR-005 REQ-006 clarification; SR-007 removed REQ-007/AC-008).
- Architecture review: `design-review-report.md` ARCH-REV-003 `Pass` (incl. the non-blocking `acquireAtHead` refusal).
- Investigation: `investigation-notes.md`; history: `solution-revision-record.md`, `architecture-review-revision-record.md`.
- Supplements / Product Design: N/A — not applicable.

## Routing classification

- Task size `Large`, architecture risk `High` — confirmed. Persisted record fields, two contract packages, new GraphQL
  commands, a user-forced shutdown in the task lifecycle of three root kinds, concurrency with wake/idle/restore/Save.
- Route: independent code review (per `get_handoff_rules`). New design impact: `None` (refinements below stay inside
  the design's boundaries and are listed for review).

## Behavior trace

| Behavior | REQ / AC | Production path (key files) | Evidence |
| --- | --- | --- | --- |
| BEH-003 one launch rule; records | REQ-005, REQ-006; AC-005, AC-007 | `run-history/domain/run-execution-tree-shared-records.ts` (`UserLaunchSelection`, optional `userLaunchSelection` / `userTeamLaunchSelection`, `memberFollowsTeam`, `effectiveCopyAgentLaunch`); readers `store/run-execution-tree-shared-record-schemas.ts`, `store/launch-configuration-source-schema.ts` (`parseOptionalUserLaunchSelection`); hosting/restore `collaborators/collaborator-source-projector.ts` (hosting applies choices; extra-copy and teammate sources use started values; `followerAddresses`; `configuredTeamFollowerAddresses`), `execution/task/task-team-node-restoration.ts` (`restoreTaskAgentNode`, `restoreTaskTeamNode` with followers); the three task adapters' `restoreChain`; the Team/Org task-source resolvers | `copy-launch-selection.test.ts` (rule, follower facts, AR-005, restore, AC-005 old record, key sets); Team-root test (later copy on started values); e2e DCM-003 reopen |
| BEH-002 per-copy Stop | REQ-009, REQ-004; AC-001, AC-002, AC-004 | `agent-collaboration/domain/delegated-stop-set.ts` (`delegatedStopSet`); `execution/task/root-task-execution-lifecycle.ts` (`stopForUser`: stopping marks, `TASK_EXECUTION_STOPPING` before any queue step and at `acquireAtHead`, drain of held leases outside the queue, non-waiting `stop` steps, idle shutdown skips stopping copies); adapters' `shutDownForUser`; task registries (`shutDownForUser`: agent = interrupt + `releaseRuntime(false)`, handle retained; Team = `freezeForRootTermination` → fence → finish, TeamRun dropped like idle shutdown) for Team (`flat-team-execution-manager`), Org and Agent roots (`root-agent-execution-registry`, `root-team-execution-directory`); collaborators under handle activation fences (`collaborators/delegated-launch-selection-command.ts`) | lifecycle tests (stop/already-stopped/resume, AR-006 drain with inner wake, refusal before queue and at head, idle skip, overlapping Stop); Org/Team root tests; e2e DCM-001/002/004; probe DCP-001 |
| BEH-001 Save on a live root | REQ-001, REQ-002, REQ-003; AC-001, AC-003, AC-006, AC-011 | `collaborators/delegated-launch-selection-command.ts` (`validateDelegatedLaunchChanges` → collaborators' fences (address order) → lifecycle `whileTaskExecutionsStopped` (`reconfigure` step) → re-resolve targets → `commitSelections` → `replaceModelChoice` on retained collaborator handles after durability; `COPY_RUNNING`); `domain/delegated-launch-selection.ts` (targets, current effective launch for the capacity rule, pure apply); per-root ports `team-run-delegated-launches.ts`, `root-hosted-delegated-launches.ts` (Org, Agent); roots' `stopDelegatedExecution` / `updateDelegatedLaunchSelections` | Org root tests (COPY_RUNNING, Stop, Save, UNCHANGED, resume on choice, woken during validation, refusals, Team copy followers, collaborator + its copy); Team root tests; e2e DCM-001/002/004 |
| BEH-005 Save on a stopped root (AR-004) | REQ-003; AC-006, AC-009 | `agent-team-run-manager.ts` `updateStoppedRunLaunchChanges`, `agent-org-run-manager.ts` `updateStoppedRunConfig` (+ `delegatedChanges`), `standalone-agent-run-root-manager.ts` `updateStoppedDelegatedLaunchSelections` (+ host model through its run service); one `validateMany` for configured + delegated (`planDelegatedLaunchValidation` / `interpretDelegatedLaunchValidation`) | Team/Org stopped-Save tests (one write; unavailable refuses all; configured member refused); e2e DCM-003 |
| API | — | `run-history/services/delegated-launch-selection-service.ts` (routing live/stopped; options); GraphQL `api/graphql/types/delegated-launch-selection.ts` | service tests; e2e |
| BEH-001/004 web | REQ-001, REQ-002, REQ-005, REQ-009; DEC-010 | contracts `teamCopyAgentLaunch` / `collaborationCopyAgentLaunch` + DTO fields; server DTO projection; web `utils/runSettings/delegatedLaunchRows.ts` (values via the contract rule, drafts applied, per-row `delegated` facts and locks, no source label once chosen), `stores/delegatedLaunchDraftStore.ts`, `ExistingRunConfigEditor.vue` (Save bar join, combined Save on a stopped run), `RunMemberRow.vue` (stop icon, per-row locks, hint), sidebar `DelegatedStopButton.vue` in `WorkspaceTransientExecutionRow.vue` (Team, Agent roots) and the Org rows | contract tests; projection test; web unit specs; probe DCP-001 |

- Scope guardrail kept: `Yes` (no definition editing, no runtime change, no single-member Stop of a live Team copy).

## Implementation notes and refinements (for review)

1. **Handle model swap.** The design's `replaceExecutionSpec(spec)` is `RetainedAgentExecutionControl.replaceModelChoice({llmModelIdentifier, llmConfig})`
   on `ConfiguredAgentExecutionHandle` and `FlatTeamAgentExecutionHandle`: it can only change the model part (runtime
   fixed) and throws unless the agent is stopped. The same interface carries `isStopped`, `withActivationFence` (taken by
   `ensureReady`/`getHandle`) and `releaseRuntimeForUserStop` (interrupt + release with input open).
2. **When retained handles take a new model.** Collaborator handles (activated by a message, no restore step) are
   swapped in `commitAfterDurability`. Retained **task-copy** agent handles take it at restore: the task registries'
   `restore` call `replaceModelChoice(sourceNode)` with the node built from the committed tree. Restore is serialized
   with the `reconfigure` step in the same queue, so the next activation always uses the committed choice; a Team copy
   is rebuilt from records anyway. This keeps one source (the tree) instead of two update points.
3. **Team copy Stop** reuses the root-stop mechanism for one subtree (`stopTaskTeamRunForUser`: freeze → fence/interrupt
   → finish); the registries then keep the same state as idle shutdown.
4. **Stop set.** Helpers record their requesting agent as delegator, so lineage by `delegatorAgentRunId` covers helper
   ownership; copies hosted by a stopped Team copy are included by structure. `notStoppedUnattributed` counts live copies
   without a recorded delegator outside the set.
5. **Outcomes.** Saves use the existing vocabulary (`UPDATED`, `UNCHANGED`, `VALIDATION_FAILED`, `MODEL_UNAVAILABLE`,
   `SCHEMA_UNAVAILABLE`, `PERSISTENCE_*`, `RUN_ACTIVE`, `NOT_FOUND`, `INTERNAL_ERROR`) plus `COPY_RUNNING` (instead of
   the spec's `SAVED`), so the existing Save bar handling applies. Responses carry no tree: Settings re-reads the run,
   and a live run publishes the committed choices to its views (IR-002, CR-002).
6. **Standalone stopped root.** The host's model lives in its run metadata and the copies in the collaboration tree
   (two files). Both are validated in one `validateMany`; the tree is written first, then the metadata; a metadata
   failure after a tree write is reported ("The copies' models were saved, but the agent's own model was not: …").
7. **Org workspace + copies.** The web disables Save when a placed-team workspace change and copies' choices are both
   pending (a workspace change is saved on its own); model changes of the run and copies' choices combine.
8. **Member run views** read only runtime, workspace and memory directory from their launch source; a choice never
   changes those, so they are unchanged.
9. **Contracts.** Selection fields are inlined in the DTO object types (an intersection form made TypeScript fail to
   relate the recursive task-execution types in the web).
10. **Web liveness.** `delegatedCopyLiveness.ts` reads the root's live view (any agent of the copy not offline); it
    tolerates views without contexts or an index (nothing shown as running).

## Local checks

**IR-002** (`implementation-evidence/ir-002-checks/`, `ir-002-probe/`):
- Server: `tsc -p tsconfig.build.json --noEmit` clean. `vitest run tests/unit/{agent-collaboration,agent-team-execution,agent-org-execution,standalone-agent-run-root,services/agent-streaming,run-history,api,agent-execution} tests/architecture`:
  309 files / 2604 tests passed, 6 skipped; 1 failure — `tests/architecture/application-framework-boundaries.test.ts`
  ("SR-011 host definition": `app-data-migrations/migrations/run-history-index-v2-migration.ts` lacks
  `DefinitionPersistenceProvider`). Neither that test nor that file differs from the base `a609de982a`, so it is not from this branch.
- Server e2e (scripted AGY): `delegated-copy-model-change.e2e.test.ts` DCM-001..004 and `delegated-launch-config-defaults.e2e.test.ts` 5/5 pass.
- Contracts: team 16/16, collaboration 27/27; `dist` rebuilt and included.
- Web: `pnpm test:nuxt --run` 615 files / 4291 tests passed, 5 skipped (2 files skipped); guards and localization audit pass;
  `vue-tsc`: no new errors in touched files (remaining ones are on unchanged lines: `teamExecutionViewState.ts` COLLABORATOR_ADDED
  `root_team` assignment, `WorkspaceAgentOrgHistoryCollection.vue`, and older spec fixture lines).
- Browser probe DCP-001 rerun on the rebuilt backend: Pass (the Agent-root Settings row shows the saved model without the
  removed client copy: the live view reloads on `delegated_launch_selections_changed`).

**IR-001:**

- Server: `tsc -p tsconfig.build.json --noEmit` clean. `vitest run tests/unit tests/integration/{agent-team-execution,run-history,agent-org-execution,standalone-agent-run-root}`:
  700 files / 5508 tests passed, 7 skipped (`implementation-evidence/ir-001-server/`).
- Server e2e (real HTTP/GraphQL/WS, scoped MCP tools, task lifecycle, catalog; scripted AGY):
  `tests/e2e/projects/delegated-copy-model-change.e2e.test.ts` DCM-001..004 pass — agent copy (COPY_RUNNING while
  running; Stop/ALREADY_STOPPED; options; MODEL_UNAVAILABLE; Save; resumes with AGY `--model` = choice), Team copy
  (Team choice → follower lead resumes on it), stopped Team run combined Save (all-or-nothing) + reopen → copy runs on its
  choice, Agent root. Previous ticket's `delegated-launch-config-defaults.e2e.test.ts` still passes (3/3).
- Contracts: team 15/15, collaboration 26/26 (`node --test`), dist rebuilt and included.
- Web: `pnpm test:nuxt --run` full suite (see the final line in "Commits"); `guard:web-boundary`,
  `guard:localization-boundary`, `audit:localization-literals` pass; `vue-tsc` shows no errors in touched files (other
  errors are the repository's existing `.vue`-import pattern; two pre-existing readonly-array errors in
  `WorkspaceAgentOrgHistoryCollection.vue` moved with the rows I wrapped).
- A bug found during review and fixed with a test: `withActivationFence` could spin on a failed, retained activation;
  it now awaits a pending activation once.

## Rendered result (browser probe)

- `pnpm -C autobyteus-web test:e2e:delegated-copy-model-change` (case DCP-001 in `tests/e2e/delegated-launch-defaults-probe.mjs`;
  real Nuxt dev, real backend `dist/app.js`, scripted AGY, headless Chrome): a Manager chat starts a Writer copy (on its
  default ALT) → Settings: the copy row has the red stop icon and its model is locked with "Stop this copy to change its
  model." → Stop from the copy's sidebar row (root keeps running) → the row's model is editable (runtime locked) → choose
  the other model → the run's Save bar → "Saved." → the row shows the new model with no source label; the stored record
  has the choice → a message to the copy resumes it on the chosen model (AGY `--model`). Pass, no browser errors,
  cleanup complete. Evidence: `implementation-evidence/ir-001-probe/` (JSON + 5 screenshots).
- Observed, not changed: after Save, Settings re-reads the run and the copy row is collapsed again; the reused Save bar
  says "they apply when this run resumes" also for a copy of a running run (DEC-010 reuse).

## Known risks / residuals

- Stop interrupts work in progress and terminates the copy's background processes (user's explicit action).
- Copies recorded before delegators were stored are not stopped with their starter (`notStoppedUnattributed`).
- A provider rejecting a resumed history on a smaller/other model shows the existing activation error (REQ-008); not
  separately exercised here.
- Another client with Settings of a Team or Org run open sees a choice saved elsewhere after Refresh (its open Settings
  reads the run's settings once, as for copies started meanwhile); its live views update (IR-002).
- Code-review residuals kept: the standalone stopped Save writes two files (note 6); `update` holds collaborator fences
  while waiting for the queue head (no queue step activates a collaborator handle); `root-team-run.ts` (481) and
  `general-process-run-supervisor.ts` (476) are near the size limit (not touched in IR-002).
- Real-runtime check (Codex/Claude switch) and the user's verification (AC-010) remain (design step 6).

## Downstream coverage hints

- Org root through the UI (sidebar Org rows' stop icon, Settings) and a Team root in the browser; a collaborator Team
  Stop from Settings; AutoByteus capacity refusal (AC-006) with a native catalog; restart (app process) persistence.

## Upstream Artifact Package

- Requirements doc: `tickets/in-progress/delegated-copy-model-change/requirements-doc.md`
- Investigation notes: `tickets/in-progress/delegated-copy-model-change/investigation-notes.md`
- Solution revision record: `tickets/in-progress/delegated-copy-model-change/solution-revision-record.md`
- Design spec: `tickets/in-progress/delegated-copy-model-change/design-spec.md` (SR-007, `Ready`)
- Supplemental task artifacts: N/A — not applicable
- Design review report: `tickets/in-progress/delegated-copy-model-change/design-review-report.md` (ARCH-REV-003, `Pass`)
- Architecture review revision record: `tickets/in-progress/delegated-copy-model-change/architecture-review-revision-record.md`
- Implementation revision record: `tickets/in-progress/delegated-copy-model-change/implementation-revision-record.md` (IR-001, IR-002)
- Code review: `tickets/in-progress/delegated-copy-model-change/code-review-report.md` (CRR-001), `code-review-revision-record.md`

## Commits

IR-002: `810742c628` server + contracts (src, rebuilt `dist`, tests, server doc); `0fb29b6d8c` web (selectors, views,
store, tests, Settings doc); the following ticket-artifacts commit (this handoff, revision record, CRR-001 files, evidence).

IR-001:

- `71d51a1608` server + contracts (src, rebuilt `dist`, tests) + server docs.
- `312653734c` web (Settings rows, store, sidebar stop icon, probe case DCP-001, docs, localization).
- `01ff6e8273` ticket artifacts (design package, this handoff, `implementation-revision-record.md`, evidence).
- Final web unit run on the committed code: `pnpm -C autobyteus-web test:nuxt --run` → 615 files / 4285 tests passed, 5 skipped.
- Untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` come from the
  workspace install (`pnpm install` build steps) and are not part of this change.
