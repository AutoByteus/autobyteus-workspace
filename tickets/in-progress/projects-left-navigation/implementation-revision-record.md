# Implementation Revision Record — projects-left-navigation

The current code and `implementation-handoff.md` are authoritative; this record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, ARCH-REV-002 (Pass) | N/A | `Initial Baseline` | SR-008, ARCH-REV-002; CRR / API-REV / DR: N/A | Implemented; local checks pass; to code review |
| IR-002 | Code reviewer CRR-001 (`code-review-report.md`) → SR-009, passed by ARCH-REV-003 | CR-001 (Design Impact, via SR-009), CR-002 (Local Fix) | `Design Impact` (applied as designed) + `Local Fix` | SR-009, ARCH-REV-003, CRR-001 | Record moved to `project_runs.json`; run records reverted; code review CRR-002 `Pass` (`code-review-report.md`), to API/E2E |
| IR-003 | Code reviewer failure-origin review CRR-003 of API-REV-001 (API-04 PLN-09) | CR-003 | `Local Fix` | CRR-003, API-REV-001; SR-009, ARCH-REV-003 unchanged | Stop now re-reads the Projects listing the run; back to code review |

## Revision Entries

### IR-001 — Projects mode, runs started under a Project, Project instruction section

- Triggering role, report path, and round: architecture reviewer, `tickets/in-progress/projects-left-navigation/design-review-report.md`, round 2 (ARCH-REV-002 Pass of SR-008).
- Triggering finding IDs: N/A (initial baseline). The report's Residual Risks are answered in the handoff's Known Risks.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implementation complete on `codex/projects-left-navigation`; server and web typechecks, guards and unit suites pass; rendered check done on the development stack (see the handoff's Checks Run and Frontend Rendered-Result Check).
- Related solution revision IDs: SR-008.
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation of the reviewed design (Change / Refactor Sequence steps 1–7; step 8, docs, is Delivery's).
- Approved behavior or requirement IDs affected: BEH-001…BEH-008; REQ-001…REQ-016.
- Implementation delta: see the handoff's Reviewed Behavior Implementation Trace and Key Files. Commits: `97706524b1` (refactor: `RunDefinitionGroups.vue` extraction, no behavior change), `2f3cb2f411` (server), `dacdceed36` (web), plus the ticket-documents commit named in the handoff.
- Changed files or areas: server run-history records and reads, run creation, Projects run links, ports and composition, GraphQL, prompt composition and five runtime paths; web left-panel run section, Projects tree and stores, delegated-row scope, New chat chip and draft, launch inputs, strip, icons, localization.
- Local validation and result: see the handoff's Checks Run (IMP-01…IMP-09).
- Next recipient or routing: code reviewer (Large / High).
- Remaining limitations or risks: the handoff's Known Risks and the "Not run" list.

### IR-002 — "Started under a Project" moves to `projects/<projectId>/project_runs.json` (SR-009); CR-002

- Triggering role, report path, and round: code reviewer, `tickets/in-progress/projects-left-navigation/code-review-report.md` (CRR-001: CR-001 Design Impact, CR-002 Local Fix); the Solution Designer's SR-009 answering CR-001, passed by the architecture reviewer as ARCH-REV-003 (`design-review-report.md`).
- Triggering finding IDs: CR-001, CR-002; ARCH-REV-003 checks 1–4.
- Classification: `Design Impact` applied as designed (SR-009) + `Local Fix` (CR-002).
- Prior authoritative result: IR-001 — `projectId` stored on Agent run metadata, Agent and Team index rows and the Team tree; released index readers would reject the rows after a rollback (CR-001).
- Current authoritative result: the record lives in a Projects-owned file older builds never read; every run-record reader and writer is identical to the released base `8faae96899`.
- Related solution revision IDs: SR-009.
- Related architecture-review revision IDs: ARCH-REV-003.
- Related code-review revision IDs: CRR-001.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this revision is recorded: SR-009 changes where the record is stored and the run-creation sequence; CR-002 is a misplaced comment.
- Approved behavior or requirement IDs affected: BEH-002, BEH-005 (storage only; observable behavior unchanged); REQ-004, REQ-006, REQ-013 and the Data Continuity constraint.
- Implementation delta:
  - Reverted (to `9f78941d0b`, identical to `8faae96899`): `agent-run-metadata-{types,store}.ts`, `agent-run-history-index-{record-types,store}.ts`, `team-run-history-index-{record-types,store}.ts`, `team-run-history-index-row-projector.ts`, `team-run-execution-tree.ts`, `team-run-execution-tree-schema.ts`; `agent-run-history-row-projector.ts` keeps the extraction without a new key.
  - New: `projects/domain/project-runs.ts`, `projects/stores/project-run-store.ts` (tolerant read; invalid entry skipped with `PROJECT_RUN_ENTRY_IGNORED`; exact write; `updateJsonFile` lock + atomic replace), `projects/services/project-run-service.ts` (view loaded once; `recordStart` refuses an unknown Project with `PROJECT_NOT_FOUND` and a run already under another Project; `startedRunsOf`; `contextOfRun`; an unreadable file is logged `PROJECT_RUNS_UNAVAILABLE` and lists nothing); `ProjectsLayout.projectRunsFile`.
  - Ports: `run-project-context.ts` now holds `RunProjectRoot`, `RunProjectStarts`, `RunProjectContextReader` (`contextOfRun`), `configureRunProjects`, `recordRunProjectStart`, `readRunProjectContext(root)`; `ProjectRunLinks.startedRunsOf`. `compositions/project-run-links-composition.ts` (now async) builds and loads `ProjectRunService` and binds all three, called from `composeProjectTaskExecutionResources` right after the Task resources load (check 1: before any run is admitted or restored).
  - Sequence: `AgentRunProvisioningService.prepareAgentRun` allocates the id → `recordRunProjectStart` → metadata → `recordPreparedRun`; `TeamRunService` passes the trimmed `projectId`; `AgentTeamRunManager.createTeamRun` calls `recordRunProjectStart({kind: agent_team, runId})` inside its root transition before `buildInitialTeamRunExecutionTree`.
  - Config: lifecycle `buildConfig` reads `{kind: agent, runId}`; Team members get `projectRunRoot = {kind: agent_team, teamRunId}` from the Team root's callbacks into `ConfiguredAgentExecutionHandle`.
  - `ProjectRunHistoryService` joins `startedRunsOf(P)` with the catalog rows (an orphan entry lists nothing, check 2) and maps the port's `PROJECT_NOT_FOUND`.
  - CR-002: the `projectWorkspaceHistoryByWorkspace` doc comment is back above its function.
- Changed files or areas: as above; tests `projects/project-run-service.test.ts`, `run-history/store/run-records-rollback-shape.test.ts`, `agent-team-execution/agent-team-run-manager-project-start.test.ts`, provisioning and Team service tests, `project-run-history-service.test.ts`; `run-project-id-records.test.ts` removed with the keys it tested.
- Local validation and result: handoff Checks Run IMP-01, IMP-02, IMP-06, IMP-10, IMP-11 (IR-002 rows).
- Next recipient or routing: code reviewer (Large / High).
- Remaining limitations or risks: handoff Known Risks.

### IR-003 — After Stop, Projects mode shows the run stopped (CR-003)

- Triggering role, report path, and round: code reviewer, failure-origin review CRR-003 (`code-review-report.md`) of API/E2E API-REV-001 (`api-e2e-execution-coverage-report.md`, API-04 PLN-09).
- Triggering finding IDs: CR-003.
- Classification: `Local Fix`.
- Prior authoritative result: IR-002 — after a Stop of a listed root with no live context in this window, Projects mode kept the snapshot's `isActive: true` (green, Stop shown, "Archive all" blocked) until the next re-read; DS-004 trigger (4) covered only archive and delete.
- Current authoritative result: trigger (4) covers Stop too. `projectRunsStore` observes `agentRunStore.terminateRun`, `agentTeamRunStore.terminateTeamRun` and `agentOrgRunStore.terminate` (the store that sends the Org stop; `executeSubjectAction('stop')` → `agentOrgContextsStore.stopAndInspect` → it) with the same rule as archive and delete: once the action settled, the Projects listing the run are read again.
- Related solution revision IDs: SR-009 (unchanged; DS-004's "status changes need no re-read" holds only for runs with a live context — design text and docs to follow at delivery, as CRR-003 notes).
- Related architecture-review revision IDs: ARCH-REV-003 (unchanged).
- Related code-review revision IDs: CRR-003.
- Related API/E2E revision IDs: API-REV-001.
- Related delivery revision IDs: N/A.
- Why this revision is recorded: an implementation defect in the existing owner of Projects-mode re-reads.
- Approved behavior or requirement IDs affected: REQ-011, REQ-014; AC-012.
- Implementation delta: `autobyteus-web/stores/projectRunsStore.ts` — one `rereadAfter(store, actions)` rule applied to the run history store (archive, delete) and the Agent, Team and Org run stores (stop); the hook takes a typed `$onAction` store. No server change.
- Changed files or areas: `stores/projectRunsStore.ts`, `stores/__tests__/projectRunsStore.spec.ts` (Agent stop; Team and Org stops). Commits `60499aa479` and `c9972a1581`. The second renames the new hook's parameter from `actions` to `actionNames`. The generated Nuxt auto-imports map the identifier `actions` to `stores/agentRunStore`, so the transform injected an import that does not exist and the app did not start in the browser. The unit tests do not run that transform and passed; the first full probe run on `60499aa479` timed out on every case, and a page load showed `The requested module '/_nuxt/stores/agentRunStore.ts' does not provide an export named 'actions'`. After the rename, the page loads with no errors.
- Local validation and result: handoff Checks Run IMP-12 (API/E2E browser probe on the fix) and IMP-13 (store tests, web typecheck).
- Next recipient or routing: code reviewer (targeted delta), then the API/E2E rerun.
- Remaining limitations or risks: a stop made in another window or client is still reflected only by the next re-read or a live context, as the design's triggers define.
