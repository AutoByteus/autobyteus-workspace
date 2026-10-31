# Implementation Handoff — projects-left-navigation

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large / High); ARCH-REV-003 `Pass` of SR-009 (after ARCH-REV-002 passed SR-008). Next: code review (handoff rules, Large / High).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/requirements-doc.md` (R4; REQ-008 / DEC-013 / AC-007 refined in SR-008)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/investigation-notes.md` (E-001…E-040)
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/solution-revision-record.md` (SR-001…SR-008)
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/design-spec.md` (SR-009)
- Supplemental task artifacts: Product `ui-ux-spec.md` and VIS-001…VIS-025, `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/projects-left-navigation/` (normative, AC-017); `follow-ups.md` (FU-001…FU-005; FU-006 withdrawn).
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/architecture-review-revision-record.md`
- Triggering rework report: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/code-review-report.md` (CRR-001: CR-001 answered by SR-009, CR-002 Local Fix); revision record `code-review-revision-record.md` in the same folder.

## Current Implementation Summary

- Implementation cycle: `Rework`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/implementation-revision-record.md`
- Current implementation revision ID: `IR-003` (deltas from IR-001 in the revision record: IR-002 record move, IR-003 Stop re-read)
- Related solution revision IDs: SR-008, SR-009
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003
- Related code-review revision IDs: CRR-001, CRR-002, CRR-003; API/E2E: API-REV-001; delivery: N/A
- Triggering finding IDs: CR-001, CR-002 (IR-002); CR-003 (IR-003)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation`, `codex/projects-left-navigation`. Code commits: IR-001 `97706524b1` (refactor, `RunDefinitionGroups.vue`, no behavior change), `2f3cb2f411` (server), `dacdceed36` (web), `73d598c008` (documents, guard); IR-002 `467cff24c0` (SR-009 record move, CR-002), documents `e1d9a58a13`; IR-003 `60499aa479` (CR-003) and `c9972a1581` (parameter rename after a Nuxt auto-import collision, see the revision record), documents and evidence in the commit after it.

**Server.** The Project records the runs started under it in `projects/<projectId>/project_runs.json` (`ProjectRunService`, the only writer; view loaded in the Task resources' composition step). `prepareAgentRun` / `createAgentRun` allocate the run id, then record the start (an unknown Project is refused with `PROJECT_NOT_FOUND` before any run record), then write metadata and the index row; `createAgentTeamRun` records the start in `AgentTeamRunManager.createTeamRun` before the Team tree. Run metadata, index rows and Team trees are unchanged from the released base (SR-009, CR-001). `TaskExecutionResourceService.runLinksOf(projectId | null)` answers, from memory, a Project's host roots (with "hosts open work") and the copies that belong to it (open entry in one of its Tasks; with no open entry, the Project of its latest Task). `ProjectRunHistoryService` (GraphQL `projectRunHistory(projectId)`) lists the runs started under the Project (`startedRunsOf(P)` joined with the catalog rows) plus hosts of its Tasks, grouped like a workspace (agent groups 6 newest + open-work hosts; Teams and Orgs uncapped), with per-root `scopes` = Project copies ∪ (started under P ? Temp-task copies : ∅). Ports `ProjectRunLinks` (`runLinksOf`, `startedRunsOf`), `RunProjectStarts` and `RunProjectContextReader` (`contextOfRun(root)`) are bound in `compositions/project-run-links-composition.ts`. `AgentRunConfig.project` (read by the run's root identity; a Team's members by the team run id) feeds a `## Project` section in the shared Carpenter composition on all five runtime paths, on start, restore and for Team members.

**Web.** The run section header shows a flat `Workspaces | Projects` switch (remembered per node); "+" adds a workspace or opens New Project. Projects mode (`ProjectsRunsTree` → `ProjectHistorySection` → shared `RunDefinitionGroups`) lists Projects with workspace-styled rows (chevron opens, name selects the board and opens, "+" starts under the Project), and the loading / empty / error / refresh-error states. `projectRunsStore` reads every Project when the mode is shown and re-reads on the DS-004 triggers (IR-003: trigger 4, web actions on a listed root, covers Stop of Agent, Team and Org runs as well as archive and delete); `projectRunsProjection` builds the nodes with the Workspaces builders keyed by Project and adds ancestry for the open-run reveal. Delegated rows (Agent, Team, Org) are filtered by the server scope. New chat's chip has `Workspaces | Projects` tabs (when the node has a Project), "No project", "Project · folder", the "Project folder" mark; the draft's choice and folder rule live in `chatDraftProjectChoice.ts`. Briefcase for Projects; en / zh-CN labels.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design spec § Task Size And Architectural Risk.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the implementation spans both subsystems (93 source/test files under `autobyteus-server-ts/src` and `autobyteus-web`, +3026 / −530), adds a stored field, a GraphQL query and inputs, a prompt section on every runtime and a cross-subsystem port, exactly as classified.
- Selected route: `Code Review`
- Lightweight self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` (implementation deviations within the design's ownership are listed under Important Assumptions).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Workspaces / Projects switch; Projects tree like a workspace's; Workspaces unchanged | `RunSectionSwitch.vue`, `runSectionModeStore.ts`, `WorkspaceAgentRunsTreePanel.vue` (heading → switch, body by mode), `ProjectsRunsTree.vue`, `ProjectHistorySection.vue`, `RunDefinitionGroups.vue`, `LeftSidebarStrip.vue` (label by mode) | Implemented; Workspaces suites unchanged and green |
| BEH-002 | Start under a Project ("+" on Project / group, chip); recorded; told its Project; existing runs via Task records | Web: `chatDraftProjectChoice.ts`, `chatDraftStore.ts` (field + calls), `useRunStart.newChatInProject`, `ChatWorkspaceMenu.vue` + `ChatProjectOptions.vue`, `chatLaunchService.ts`, `agentRunStore` / `agentTeamRunStore` inputs. Server (IR-002): `agent-run-provisioning-service.ts` (id → `recordRunProjectStart` → records), `team-run-service.ts`, `agent-team-run-manager.ts` (record before the tree), `projects/{domain/project-runs,stores/project-run-store,services/project-run-service}.ts`, `projects-layout.ts`; DS-005: `run-project-context.ts` (`contextOfRun`), `agent-run-config.ts`, `carpenter-prompt-*.ts`, five backends, `standalone-agent-run-lifecycle-service.ts`, Team member callbacks (`projectRunRoot`) → `configured-agent-execution-handle.ts` | Implemented; IMP-11 shows `project_runs.json` and unchanged run records on the dev stack |
| BEH-003 | Delegated rows scoped to the Project, live | Server `task-execution-resource-service.ts` `runLinksOf`, `project-run-history-service.ts`; web `taskExecutionScope.ts`, `AgentRunTaskRows.vue`, `WorkspaceTeamExecutionTree.vue`, `WorkspaceAgentOrgHistoryCollection.vue`, `projectRunsStore.ts` | Implemented; rule unit-tested (IMP-06, IMP-07); real delegation is API/E2E's (AC-006) |
| BEH-004 | Closure removes work as today | Unchanged closure path; closed copies stay in a scope only through their latest Task and are hidden by the existing closed-subtree rule; `task_upserted` re-reads | Preserved; live closure is API/E2E's (AC-008) |
| BEH-005 | First linked folder, else temp; kept if the user picked one; changeable | `chatDraftProjectChoice.chooseDraftProject` / `chooseDraftFolder`, `projectFolderOf` | Implemented; IMP-07 and IMP-09 (chip "AutoByteus · Temp workspace") |
| BEH-006 | Every listed run opens, beyond the Workspaces cap | Server cap rule (6 + open-work hosts) in `AgentRunHistoryService.listAgentGroupsOf`; opening is the existing open-by-id (`selectTreeRunFromHistory` → `openRun(runId)`) | Implemented; cap rule unit-tested; opening beyond the cap in a browser is API/E2E's (AC-009) |
| BEH-007 | Archive / Delete as in Workspaces; Project group archive scoped | Same section actions; `useWorkspaceHistoryGroupArchive.onArchiveListedAgentGroup` (kind `agent_runs`, per listed run); `projectRunsStore` re-reads after web removals (`$onAction` on the run history store) | Implemented; IMP-07, IMP-09 dialog "Project Task Manager · 2 runs will be hidden from history." |
| BEH-008 | Live and correct after reconnect; last good tree on failure | `projectRunsStore` (feed delivery in `projectChangeFeed.ts`, `connected` → re-read all, coalesced reads, `refreshFailed`) | Implemented; IMP-07 |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- New server: `projects/domain/project-runs.ts`, `projects/stores/project-run-store.ts`, `projects/services/project-run-service.ts` (IR-002), `run-history/services/agent-run-history-row-projector.ts` (size extraction, released keys), `run-history/domain/project-run-links.ts`, `run-history/services/project-run-history-service.ts`, `agent-execution/domain/run-project-context.ts`, `compositions/project-run-links-composition.ts`, `api/graphql/types/project-run-history.ts`.
- New web: `components/workspace/history/{RunDefinitionGroups,RunSectionSwitch,ProjectsRunsTree,ProjectHistorySection}.vue`, `components/chat/ChatProjectOptions.vue`, `stores/{runSectionModeStore,projectRunsStore,projectRunsProjection,chatDraftProjectChoice}.ts`, `composables/useProjectsTreeState.ts`, `utils/collaboration/taskExecutionScope.ts`, `graphql/queries/projectRunHistoryQueries.ts`.
- Size-limited files (effective lines, before → after): `chatDraftStore.ts` 500 → 495; `WorkspaceAgentRunsTreePanel.vue` 495 → 491; `WorkspaceHistoryWorkspaceSection.vue` 445 → 93 (`RunDefinitionGroups.vue` 412); `autobyteus-agent-run-backend-factory.ts` 499 → 481; `agent-run-history-catalog-service.ts` 499 → 486; `configured-agent-execution-handle.ts` 487 → 491; `agentTeamRunStore.ts` 488 → 488; `runHistoryStore.ts` 498 untouched.

## Important Assumptions

Implementation choices within the design's ownership, for the reviewer's judgement:

1. **Native backend factory.** The design allowed one `project` line, else extracting the prompt block. Its two `AgentRunConfig` rebuilds (field-by-field copies that would drop `project`) are replaced by `AgentRunConfig.withMemoryDir()`, so the file shrank (499 → 481) and every config keeps `project`.
2. **Draft store at 500.** As the design permits, the start-settings assembly `chatStartSettingsOf` moved with the new logic into `chatDraftProjectChoice.ts` (its only caller `useRunStart` imports it there).
3. **Panel.** `WorkspaceAgentRunsTreePanel.vue` keeps owning the run section (header, dialogs, bindings) and renders `ProjectsRunsTree` as its body in Projects mode; to stay ≤ 495 it moved its workspace-removal confirmation text into `useWorkspaceHistoryWorkspaceRemoval` (the owner of that dialog's state). `AppLeftPanel.vue` needed no change.
4. **Project existence check (IR-002).** `ProjectRunService.recordStart` refuses an unknown Project; Agent provisioning calls it after the id is allocated and before metadata, the Team manager before the tree. `TeamRunService` only trims and passes `projectId`. `startedRunsOf` also refuses an unknown Project, which `projectRunHistory` maps to `PROJECT_NOT_FOUND`.
5. **Expansion of Projects and groups** is owned by `useProjectsTreeState` (own keys); run-level expansion (Team runs, members, Org runs) stays the shared tree state.
6. **Web-action re-reads (DS-004 trigger 4).** `projectRunsStore` observes, with Pinia `$onAction`, the run history store's archive / delete actions and (IR-003, CR-003) the stop actions `agentRunStore.terminateRun`, `agentTeamRunStore.terminateTeamRun`, `agentOrgRunStore.terminate`, and re-reads the Projects listing that run. None of those stores grew. DS-004's "status changes need no re-read" holds only for runs with a live context in this window; a stopped run without one needs this re-read (design text and docs to follow at delivery).
7. **Org grouping.** The Org definition grouping in `runTreeProjection.ts` became `buildAgentOrgDefinitionGroups`, used by both the Workspaces and the Projects projections (no copy).
8. **Projects boundary guard.** `tests/architecture/projects-boundaries.test.ts` allowed one composition to import Projects; it now also names the design's `compositions/project-run-links-composition.ts` (the only other file binding both sides). No other boundary changed.
9. **Local Team runs.** A Team run started under a Project appears after the immediate re-read triggered by its launch (`noteRunStarted`), not from its context before that read; Agent runs are placed from their context at once.

## Known Risks

Answers to the review's Residual Risks first:

- **Builders keyed by Project (RR 1).** `projectRunsProjection` gives `buildRunHistoryTreeNodes` (→ `buildRunTreeProjection` + `mergeRunTreeWithLiveContexts`) one descriptor `project:<id>` and places the Project's contexts under that key; `buildTeamNodes` gets a context resolver returning the key while members keep their real folders. The builders are unchanged; Workspaces tests green.
- **File sizes (RR 2).** See Key Files; no touched file passes 500 or grows while at the limit.
- **Composer paths (RR 3).** The `## Project` section is asserted on Codex (create and restore), Claude, Antigravity, ACP / `grok_build` and native (Team member) paths (IMP-06).
- **Multi-Project copy (RR 4).** `runLinksOf` lists a copy holding open Tasks of P and Q under both, after P closes only under Q (IMP-06). Its Task line shows its current Task (possibly Q's) under P, as the review notes; the browser reading in AC-007 is API/E2E's (no real delegation was run here).
- **Load all (RR 5).** Implemented per DS-003: every Project is read when the mode is shown.
- **Damaged Task files (RR 6).** Left out of `runLinksOf` with one `TASK_AGENT_RESOURCES_UNAVAILABLE` warning per read (IMP-06).
- **Downgrade reading (CR-001, resolved in IR-002).** No run-record file gains a key: the metadata, index and Team tree readers and writers are byte-identical to the released base `8faae96899` (IMP-10). `project_runs.json` is a new file older builds never open.
- **Orphan entries (ARCH-REV-003 check 2).** A creation that fails after `recordStart`, a prepared run that expires, or a deleted run leaves an entry; `projectRunHistory` joins entries with the catalog rows, so it lists nothing (unit test in IMP-06). Entries are never cleaned up, by design.
- **Load order (check 1).** `ProjectRunService.load()` runs inside `composeProjectTaskExecutionResources`, which both hosts await before the run supervisor is created, so restores and first activations find the record. `recordStart` and `contextOfRun` also await the same load.
- **Org members and task copies** get no `Project` section (only an Agent root and a Team root's members are started under a Project), as designed.
- **Stale scope keys.** `noteUnscoped` re-reads a Project once per unknown copy key; copies of other Projects are re-read once each per session (small, by design).
- **No live delegation exercised here.** Delegated rows were checked with unit/component tests only; the real-delegation journeys (AC-006, AC-008, AC-014) are API/E2E's.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Larger Requirement (feature).
- Reviewed root-cause classification: File Placement Or Responsibility Drift (touched web files); otherwise No Design Issue Found.
- Reviewed refactor decision: `Refactor Needed Now` (the two extractions).
- Implementation matched the reviewed assessment: `Yes` — `RunDefinitionGroups.vue` extracted first in its own commit (`97706524b1`, no behavior change, history tests green); `agent-run-history-row-projector.ts` extracted and used by `recordPreparedRun` (no agent index repair path exists in current code to share it with); `chatDraftProjectChoice.ts` holds the new draft logic.
- If challenged, routed as `Design Impact`: `N/A`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No` (static "Workspaces" heading replaced; groups markup moved; Project folder icon replaced by the briefcase)
- Dead code in the touched files and modules removed: `Yes` (none found beyond what the change replaced)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`
- Notes: `ProjectRunLinkSet` (run-history port) and `TaskRunLinks` (projects service return type) have the same shape on purpose: the consumer owns its port and Projects does not import run history; the composition binds them.

## Persisted Data Transition Check (When Applicable)

- Approved decision (SR-009): `Not Affected` for existing data; a new additive file per Project.
- Design-spec decision reference: § Persisted Data / State Transition Decision (SR-009)
- Implementation follows the decision: `Yes`. No existing file changes; `project_runs.json` is read tolerantly (invalid entry skipped with `PROJECT_RUN_ENTRY_IGNORED`; unreadable file lists nothing with `PROJECT_RUNS_UNAVAILABLE` and is not rewritten) and written exactly under the per-file lock with an atomic replace.
- Evidence: IMP-06 (`project-run-service.test.ts`), IMP-10 (run records identical to the base; rollback-shape test), IMP-11 (dev stack file and unchanged records).
- Deviation: `None`.

## Environment Or Dependency Notes

- Dependencies installed in the worktree (`pnpm install --frozen-lockfile`, server `prebuild`, `nuxt prepare`). Untracked build outputs (`autobyteus-application-*/dist/`) were not staged.
- The rendered check used `pnpm dev` (worktree development state under `.autobyteus/development/`, ports 8000 / 3000) and headless Chrome via the repository's `playwright-core`; the stack was stopped afterwards and the ports were free.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts test:unit` | `467cff24c0` | macOS, Node 22 | whole server unit suite | all server | Pass | `IMP-01-server-test-unit.full.log` | `Test Files  889 passed \| 5 skipped (894)`, `Tests  7558 passed \| 9 skipped (7567)` |
| IMP-01b | (IR-001) Projects boundary guard rerun after naming `project-run-links-composition.ts` | `73d598c008` | macOS | the Projects boundary guard | Dependency Rules | Pass; included again in IMP-01 and IMP-06 at `467cff24c0` | `IMP-01b-server-architecture-guard.log` | `Tests  4 passed (4)` |
| IMP-02 | `pnpm -C autobyteus-server-ts typecheck` | IR-002 tree = `467cff24c0` | macOS, Node 22 | server production `src` | — | Pass | `IMP-02-server-typecheck.log` | `exit=0` |
| IMP-03 | `pnpm -C autobyteus-web typecheck` | see the log header | macOS, Node 22 | web app, Electron main, build scripts | — | Pass | `IMP-03-web-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 298 in 139 files (baseline 298 in 139 files)` and `[typecheck] PASS` |
| IMP-04 | `pnpm -C autobyteus-web test:nuxt --run` | `dacdceed36` | macOS, Node 22 | whole web unit/component suite | all web | Pass | `IMP-04-web-test-nuxt.full.log` | `Test Files  678 passed (678)`, `Tests  4914 passed \| 2 skipped (4916)` |
| IMP-05 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | see the log header | macOS | web boundaries, en / zh-CN catalogs | REQ-015 | Pass | `IMP-05-web-guards.log` | `Passed.`, `Passed with zero unresolved findings.` |
| IMP-06 | `pnpm -C autobyteus-server-ts exec vitest run` on the new and updated server tests (list in the log) | `467cff24c0` | macOS | `ProjectRunService` / store (exact write, tolerant read, unknown Project, one Project per run, deleted Project), `runLinksOf`, `ProjectRunHistoryService` (join, orphan entries, cap, scopes), Agent provisioning order, Team manager record-before-tree, rollback key shape, five composer paths, Projects boundary guard | REQ-003, 004, 006, 008, 010, 013; AC-002, 003, 007, 009; QR-001; ARCH-REV-003 checks 2–4 | Pass | `IMP-06-server-new-tests.log` | `Test Files  13 passed (13)`, `Tests  132 passed (132)` |
| IMP-07 | `pnpm -C autobyteus-web exec vitest run` on the new web tests (list in the log) | see the log header | macOS | `projectRunsStore`, `projectRunsProjection`, scope filter, draft folder rule, mode store, switch, Projects tree, chip menu | REQ-001, 002, 004, 005, 008, 011, 014; AC-001, 004, 007, 010, 011, 012, 015 | Pass | `IMP-07-web-new-tests.log` | the `Tests` summary line |
| IMP-08 | Dev stack: `createProject`, `prepareAgentRun` with / without a valid `projectId`, `projectRunHistory`, stored files | `dacdceed36` | `pnpm dev`, worktree dev data | GraphQL inputs, provisioning, stores, `projectRunHistory` | AC-002, AC-003 (record part) | Superseded by IMP-11 (IR-001 stored `projectId` on run records) | `IMP-08-dev-stack-api.log` | `"code":"PROJECT_NOT_FOUND"`, `index rows: [(…, 'project_d4e82a7a-…')…]`, `metadata … projectId= project_d4e82a7a-…` |
| IMP-09 | Rendered journey in headless Chrome (drivers `IMP-09-shoot.mjs`, `IMP-09-extra.mjs`) | `dacdceed36` | `pnpm dev`, Chrome headless, 1440×900 and 600×800 | switch, Projects tree, row targets, hover / focus, group archive, "+" → New chat, chip tabs and labels, agent picker, reload, strip, drawer, zh-CN | UXJ-001…009; AC-001, 010, 013, 015, 016, 017 (partial) | Pass | `IMP-09-rendered-journey.log`, `rendered/IMP-09-*.png` | `page errors: []`; `chip after folder picked then project: "AutoByteus · Temp workspace"`; `zh tabs: [ '工作区', '项目' ]` |
| IMP-10 | `git diff --stat 8faae96899 --` the run-record readers/writers (list in the log); `run-records-rollback-shape.test.ts` | IR-002 tree = `467cff24c0` | macOS | metadata, Agent and Team index stores and record types, Team tree type/schema/builder, Team row projector, Agent row projector keys | Data Continuity constraint; CR-001; ARCH-REV-003 check 3 | Pass | `IMP-10-rollback-shape.log` | an empty diff between `## git diff --stat 8faae96899 (empty = identical):` and `## end of diff`; `Tests  2 passed (2)` |
| IMP-11 | Dev stack on fresh data: create a Project, `prepareAgentRun` under it and with an unknown Project, `projectRunHistory`, stored files; restart; read again (script `IMP-11-dev-stack-record.sh`) | `467cff24c0` | `pnpm dev`, worktree dev data | provisioning sequence, `project_runs.json`, `startedRunsOf` join, reload at composition | AC-002, AC-003 (record and restart) | Pass | `IMP-11-dev-stack-record.log` | `project_runs.json: {"projectId": "project_9f959ce2-…", "runs": [{"root": {"kind": "agent", …` ; `index row keys:` without `projectId`; the run listed in `projectRunHistory (after-restart)` |
| IMP-12 | The API/E2E browser probe, all cases: `env -i PATH HOME TMPDIR USER LOGNAME pnpm -C autobyteus-web test:e2e:projects-left-navigation --output-dir <ev>/IMP-12-probe` | `c9972a1581` (server dist from `467cff24c0`, server source unchanged) | macOS, Chrome headless, probe-owned stack | Projects mode end to end incl. Stop in Projects mode (PLN-09) | AC-001…017 as the probe maps them; CR-003 | Pass | `IMP-12-probe.log`, `IMP-12-probe/evidence.json` | `PLN-01: Pass` … `PLN-10: Pass`; `PLN-09` `stopDiag` = `{"serverActiveAfterStop":[false],"projectsStopButtonsAfter5s":0,…}` (API-04 at `467cff24c0` had `1`) |
| IMP-13 | `pnpm -C autobyteus-web typecheck`; `vitest run stores components/workspace/history --run` | `c9972a1581` | macOS, Node 22 | `projectRunsStore` stop re-reads (Agent, Team, Org) and the surrounding stores and history components | REQ-011, REQ-014; AC-012; CR-003 | Pass | `IMP-13-web-ir003.log` | `[typecheck] PASS`; `Test Files  134 passed (134)`, `Tests  1350 passed (1350)` |

- Still valid from IR-001 (IR-002 changed no web source except a moved doc comment in `utils/runTreeProjection.ts`, CR-002): IMP-03, IMP-04, IMP-05, IMP-07, IMP-09. IR-003 changed only `stores/projectRunsStore.ts` (and its spec): IMP-12 and IMP-13 cover it; server checks IMP-01, 02, 06, 10, 11 are unaffected (no server change). The web reads `projectRunHistory`, whose shape is unchanged.
- Not run, and why: a restore or Team-member start that shows the `Project` section in a real run's instructions (the config builders are typechecked and the five composer paths unit-tested; a live run needs a model); real delegation, Task closure and reactivation journeys (AC-006, AC-008, AC-014), opening a run beyond the cap in a browser (AC-009), a sent first message listed and marked open (VIS-015, needs a usable model), the isolated desktop instance, server E2E and integration suites: API/E2E's. The Org scope filter is covered by the shared filter's unit tests and typecheck, not by a dedicated Org component test.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: run-section header and Projects tree (UIS-001/002), New chat chip and menu (UIS-003/004), strip and drawer (UIS-005), Project icons on pages and right strip.
- References: `ui-ux-spec.md` and VIS-001…VIS-025; compared side by side with VIS-002 (Projects mode), VIS-012 (chip menu, Projects tab), VIS-025 (narrow drawer).
- Design system and adjacent surfaces reviewed: workspace section rows and groups (now shared), chip menu, run target switcher, strip; Tailwind tokens and heroicons as in the spec.
- Rendered surface: `pnpm dev` (README § Local full-stack development) with headless Chrome.
- States, layouts and interactions inspected: Workspaces and Projects modes; Project collapsed / expanded / no runs; name vs chevron; hover "+" and keyboard focus ring; agent group "Archive all" confirmation; "+" → New chat under the Project (default agent, chip "AutoByteus"); chip Projects tab ("No project", Projects with folders), Workspaces tab with "Project folder" mark, Project without a folder, folder picked then Project ("AutoByteus · Temp workspace"); agent picker "Search agents and teams"; reload keeps Projects mode; strip label `Workspaces` / `Projects`; 600×800 drawer with always-visible "+"; zh-CN labels. Loading, first-read error, refresh error and empty states: component tests (IMP-07), not rendered on the dev stack.
- Visual or interaction issues found and corrected: none found in these states.
- Remaining unverified: delegated rows with Task lines in a browser, the run listed and marked open after a sent message (VIS-015), Team runs under a Project in a browser, Org rows under a Project.

## Downstream Coverage Hints / Suggested Scenarios

- AC-007 with real `delegate_task`: one manager run started under P dispatching a Task of P (Team), a Task of Q and a description-only delegation; check P shows the P Team and the Temp-task copy, Q only its copy; then a follow-up Task of Q to the P copy (listed under both; after P's Task closes only under Q) and how its Task line reads under P.
- AC-006 / trigger (5): a copy appearing in the stream before its Task link is read should appear after one re-read.
- AC-008: Task DONE removes the rows live in Projects mode; reopen + assigner's message brings them back.
- AC-009: more than 6 runs of one agent with an older one hosting open P work: listed and opens.
- AC-003 runtime check: the `## Project` text in a real run's system instructions (any runtime), and after a restart (restore).
- AC-012: archive a listed run in Projects mode (gone in both modes), group archive touches only the Project's runs, delete a Project with runs (gone from Projects mode, runs stay in Workspaces).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Everything in "Not run" above, plus the integrated desktop journey AC-014 on an isolated instance and the comparison of the remaining VIS references (AC-017) in the built app.
