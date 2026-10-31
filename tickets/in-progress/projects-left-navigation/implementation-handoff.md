# Implementation Handoff — projects-left-navigation

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large / High); ARCH-REV-002 `Pass` of SR-008. Next: code review (handoff rules, Large / High).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/requirements-doc.md` (R4; REQ-008 / DEC-013 / AC-007 refined in SR-008)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/investigation-notes.md` (E-001…E-040)
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/solution-revision-record.md` (SR-001…SR-008)
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/design-spec.md` (SR-008)
- Supplemental task artifacts: Product `ui-ux-spec.md` and VIS-001…VIS-025, `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/projects-left-navigation/` (normative, AC-017); `follow-ups.md` (FU-001…FU-005; FU-006 withdrawn).
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial implementation).

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-008
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review / API-E2E / delivery revision IDs: N/A
- Triggering finding IDs: N/A
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation`, `codex/projects-left-navigation`. Code commits on top of `0ae78c9b91`: `97706524b1` (refactor, `RunDefinitionGroups.vue`, no behavior change), `2f3cb2f411` (server), `dacdceed36` (web); ticket documents and evidence in the commit that adds this file.

**Server.** Runs record an optional `projectId` (Agent run metadata, Agent and Team index rows, Team tree), written once at creation; `prepareAgentRun` / `createAgentRun` and `createAgentTeamRun` take `projectId` and refuse an unknown Project with `PROJECT_NOT_FOUND` before anything is recorded. `TaskExecutionResourceService.runLinksOf(projectId | null)` answers, from memory, a Project's host roots (with "hosts open work") and the copies that belong to it (open entry in one of its Tasks; with no open entry, the Project of its latest Task). `ProjectRunHistoryService` (GraphQL `projectRunHistory(projectId)`) lists the runs started under the Project plus hosts of its Tasks, grouped like a workspace (agent groups 6 newest + open-work hosts; Teams and Orgs uncapped), with per-root `scopes` = Project copies ∪ (started under P ? Temp-task copies : ∅). Ports `ProjectRunLinks` and `RunProjectContextReader` are bound in `compositions/project-run-links-composition.ts`. `AgentRunConfig.project` feeds a `## Project` section in the shared Carpenter composition on all five runtime paths, on start, restore and for Team members.

**Web.** The run section header shows a flat `Workspaces | Projects` switch (remembered per node); "+" adds a workspace or opens New Project. Projects mode (`ProjectsRunsTree` → `ProjectHistorySection` → shared `RunDefinitionGroups`) lists Projects with workspace-styled rows (chevron opens, name selects the board and opens, "+" starts under the Project), and the loading / empty / error / refresh-error states. `projectRunsStore` reads every Project when the mode is shown and re-reads on the DS-004 triggers; `projectRunsProjection` builds the nodes with the Workspaces builders keyed by Project and adds ancestry for the open-run reveal. Delegated rows (Agent, Team, Org) are filtered by the server scope. New chat's chip has `Workspaces | Projects` tabs (when the node has a Project), "No project", "Project · folder", the "Project folder" mark; the draft's choice and folder rule live in `chatDraftProjectChoice.ts`. Briefcase for Projects; en / zh-CN labels.

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
| BEH-002 | Start under a Project ("+" on Project / group, chip); recorded; told its Project; existing runs via Task records | Web: `chatDraftProjectChoice.ts`, `chatDraftStore.ts` (field + calls), `useRunStart.newChatInProject`, `ChatWorkspaceMenu.vue` + `ChatProjectOptions.vue`, `chatLaunchService.ts`, `agentRunStore` / `agentTeamRunStore` inputs. Server: `agent-run-provisioning-service.ts`, `team-run-service.ts`, `agent-team-run-manager.ts`, metadata / index / tree stores, `agent-run-history-row-projector.ts`, `team-run-history-index-row-projector.ts`; DS-005: `run-project-context.ts`, `agent-run-config.ts`, `carpenter-prompt-*.ts`, five backends, `standalone-agent-run-lifecycle-service.ts`, Team member callbacks → `configured-agent-execution-handle.ts` | Implemented; dev-stack check IMP-08 shows `projectId` in metadata and index rows |
| BEH-003 | Delegated rows scoped to the Project, live | Server `task-execution-resource-service.ts` `runLinksOf`, `project-run-history-service.ts`; web `taskExecutionScope.ts`, `AgentRunTaskRows.vue`, `WorkspaceTeamExecutionTree.vue`, `WorkspaceAgentOrgHistoryCollection.vue`, `projectRunsStore.ts` | Implemented; rule unit-tested (IMP-06, IMP-07); real delegation is API/E2E's (AC-006) |
| BEH-004 | Closure removes work as today | Unchanged closure path; closed copies stay in a scope only through their latest Task and are hidden by the existing closed-subtree rule; `task_upserted` re-reads | Preserved; live closure is API/E2E's (AC-008) |
| BEH-005 | First linked folder, else temp; kept if the user picked one; changeable | `chatDraftProjectChoice.chooseDraftProject` / `chooseDraftFolder`, `projectFolderOf` | Implemented; IMP-07 and IMP-09 (chip "AutoByteus · Temp workspace") |
| BEH-006 | Every listed run opens, beyond the Workspaces cap | Server cap rule (6 + open-work hosts) in `AgentRunHistoryService.listAgentGroupsOf`; opening is the existing open-by-id (`selectTreeRunFromHistory` → `openRun(runId)`) | Implemented; cap rule unit-tested; opening beyond the cap in a browser is API/E2E's (AC-009) |
| BEH-007 | Archive / Delete as in Workspaces; Project group archive scoped | Same section actions; `useWorkspaceHistoryGroupArchive.onArchiveListedAgentGroup` (kind `agent_runs`, per listed run); `projectRunsStore` re-reads after web removals (`$onAction` on the run history store) | Implemented; IMP-07, IMP-09 dialog "Project Task Manager · 2 runs will be hidden from history." |
| BEH-008 | Live and correct after reconnect; last good tree on failure | `projectRunsStore` (feed delivery in `projectChangeFeed.ts`, `connected` → re-read all, coalesced reads, `refreshFailed`) | Implemented; IMP-07 |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- New server: `run-history/services/agent-run-history-row-projector.ts`, `run-history/domain/project-run-links.ts`, `run-history/services/project-run-history-service.ts`, `agent-execution/domain/run-project-context.ts`, `compositions/project-run-links-composition.ts`, `api/graphql/types/project-run-history.ts`.
- New web: `components/workspace/history/{RunDefinitionGroups,RunSectionSwitch,ProjectsRunsTree,ProjectHistorySection}.vue`, `components/chat/ChatProjectOptions.vue`, `stores/{runSectionModeStore,projectRunsStore,projectRunsProjection,chatDraftProjectChoice}.ts`, `composables/useProjectsTreeState.ts`, `utils/collaboration/taskExecutionScope.ts`, `graphql/queries/projectRunHistoryQueries.ts`.
- Size-limited files (effective lines, before → after): `chatDraftStore.ts` 500 → 495; `WorkspaceAgentRunsTreePanel.vue` 495 → 491; `WorkspaceHistoryWorkspaceSection.vue` 445 → 93 (`RunDefinitionGroups.vue` 412); `autobyteus-agent-run-backend-factory.ts` 499 → 481; `agent-run-history-catalog-service.ts` 499 → 486; `configured-agent-execution-handle.ts` 487 → 491; `agentTeamRunStore.ts` 488 → 488; `runHistoryStore.ts` 498 untouched.

## Important Assumptions

Implementation choices within the design's ownership, for the reviewer's judgement:

1. **Native backend factory.** The design allowed one `project` line, else extracting the prompt block. Its two `AgentRunConfig` rebuilds (field-by-field copies that would drop `project`) are replaced by `AgentRunConfig.withMemoryDir()`, so the file shrank (499 → 481) and every config keeps `project`.
2. **Draft store at 500.** As the design permits, the start-settings assembly `chatStartSettingsOf` moved with the new logic into `chatDraftProjectChoice.ts` (its only caller `useRunStart` imports it there).
3. **Panel.** `WorkspaceAgentRunsTreePanel.vue` keeps owning the run section (header, dialogs, bindings) and renders `ProjectsRunsTree` as its body in Projects mode; to stay ≤ 495 it moved its workspace-removal confirmation text into `useWorkspaceHistoryWorkspaceRemoval` (the owner of that dialog's state). `AppLeftPanel.vue` needed no change.
4. **Project existence check.** Done once in `AgentRunProvisioningService.validateAndPrepareRunInput` (both `createAgentRun` and `prepareAgentRun` go through it) rather than in `AgentRunService`.
5. **Expansion of Projects and groups** is owned by `useProjectsTreeState` (own keys); run-level expansion (Team runs, members, Org runs) stays the shared tree state.
6. **Removal re-reads.** `projectRunsStore` observes the run history store's archive / delete actions with Pinia `$onAction` (no line added to the 498-line store) and re-reads the Projects listing the removed run.
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
- **Downgrade reading.** The Agent and Team index stores reject an index whose rows carry an unknown key; an older build reading an index this build wrote (rows with `projectId`) treats it as invalid, as with the earlier `hasCollaboration` addition. The requirements' "older builds keep reading data written by this build" is therefore not met for the index files; DESIGN rule 9 puts running an older build out of scope. Flagged for the Solution Designer's judgement; no code change made.
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

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: § Persisted Data / State Transition Decision
- Implementation follows the decision: `Yes`. Readers project the field tolerantly; writers emit it only when present; a non-string or blank `projectId` in metadata or a Team tree is dropped with `RUN_PROJECT_ID_IGNORED` naming the run and the file is left unchanged; index rows accept it in their allow-list.
- Direct-use evidence: IMP-06 record tests (absent stays absent; round-trips; invalid dropped and logged); IMP-08 stored files on the dev stack.
- Deviation: `None` (see the downgrade note under Known Risks).

## Environment Or Dependency Notes

- Dependencies installed in the worktree (`pnpm install --frozen-lockfile`, server `prebuild`, `nuxt prepare`). Untracked build outputs (`autobyteus-application-*/dist/`) were not staged.
- The rendered check used `pnpm dev` (worktree development state under `.autobyteus/development/`, ports 8000 / 3000) and headless Chrome via the repository's `playwright-core`; the stack was stopped afterwards and the ports were free.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts test:unit` | `dacdceed36` | macOS, Node 22 | whole server unit suite | all server | Pass after IMP-01b (one guard failure, cause below) | `IMP-01-server-test-unit.full.log` | `Tests  1 failed \| 7552 passed \| 9 skipped (7562)`; the failure is `tests/architecture/projects-boundaries.test.ts` expecting only `compositions/project-task-execution-resource-composition.ts` to import Projects |
| IMP-01b | `pnpm -C autobyteus-server-ts exec vitest run tests/architecture/projects-boundaries.test.ts --no-watch` after naming the design's `compositions/project-run-links-composition.ts` in the guard | ticket-documents commit | macOS, Node 22 | the Projects boundary guard | Dependency Rules | Pass | `IMP-01b-server-architecture-guard.log` | `Tests  4 passed (4)` |
| IMP-02 | `pnpm -C autobyteus-server-ts typecheck` | see the log header | macOS, Node 22 | server production `src` | — | Pass | `IMP-02-server-typecheck.log` | exit 0, no `error TS` |
| IMP-03 | `pnpm -C autobyteus-web typecheck` | see the log header | macOS, Node 22 | web app, Electron main, build scripts | — | Pass | `IMP-03-web-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 298 in 139 files (baseline 298 in 139 files)` and `[typecheck] PASS` |
| IMP-04 | `pnpm -C autobyteus-web test:nuxt --run` | `dacdceed36` | macOS, Node 22 | whole web unit/component suite | all web | Pass | `IMP-04-web-test-nuxt.full.log` | `Test Files  678 passed (678)`, `Tests  4914 passed \| 2 skipped (4916)` |
| IMP-05 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | see the log header | macOS | web boundaries, en / zh-CN catalogs | REQ-015 | Pass | `IMP-05-web-guards.log` | `Passed.`, `Passed with zero unresolved findings.` |
| IMP-06 | `pnpm -C autobyteus-server-ts exec vitest run` on the new and extended server tests (list in the log) | see the log header | macOS | `runLinksOf`, `ProjectRunHistoryService` + cap, record readers/writers, creation checks, five composer paths | REQ-003, 004, 006, 008, 010; AC-002, 003, 007, 009; QR-001 | Pass | `IMP-06-server-new-tests.log` | the `Tests` summary line |
| IMP-07 | `pnpm -C autobyteus-web exec vitest run` on the new web tests (list in the log) | see the log header | macOS | `projectRunsStore`, `projectRunsProjection`, scope filter, draft folder rule, mode store, switch, Projects tree, chip menu | REQ-001, 002, 004, 005, 008, 011, 014; AC-001, 004, 007, 010, 011, 012, 015 | Pass | `IMP-07-web-new-tests.log` | the `Tests` summary line |
| IMP-08 | Dev stack: `createProject`, `prepareAgentRun` with / without a valid `projectId`, `projectRunHistory`, stored files | `dacdceed36` | `pnpm dev`, worktree dev data | GraphQL inputs, provisioning, stores, `projectRunHistory` | AC-002, AC-003 (record part) | Pass | `IMP-08-dev-stack-api.log` | `"code":"PROJECT_NOT_FOUND"`, `index rows: [(…, 'project_d4e82a7a-…')…]`, `metadata … projectId= project_d4e82a7a-…` |
| IMP-09 | Rendered journey in headless Chrome (drivers `IMP-09-shoot.mjs`, `IMP-09-extra.mjs`) | `dacdceed36` | `pnpm dev`, Chrome headless, 1440×900 and 600×800 | switch, Projects tree, row targets, hover / focus, group archive, "+" → New chat, chip tabs and labels, agent picker, reload, strip, drawer, zh-CN | UXJ-001…009; AC-001, 010, 013, 015, 016, 017 (partial) | Pass | `IMP-09-rendered-journey.log`, `rendered/IMP-09-*.png` | `page errors: []`; `chip after folder picked then project: "AutoByteus · Temp workspace"`; `zh tabs: [ '工作区', '项目' ]` |

- Not run, and why: real delegation, Task closure and reactivation journeys (AC-006, AC-008, AC-014), opening a run beyond the cap in a browser (AC-009), a sent first message listed and marked open (VIS-015, needs a usable model), the isolated desktop instance, server E2E and integration suites: API/E2E's. The Org scope filter is covered by the shared filter's unit tests and typecheck, not by a dedicated Org component test.

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
