# Implementation Handoff — projects-tree-one-place (autobyteus-353)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review not selected (Medium / Low → direct implementation, per the Solution Designer's handoff `handoff-implementation.md`). Next: direct API/E2E validation (handoff rules, Medium / Low).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-tree-one-place/tickets/in-progress/projects-tree-one-place/requirements-doc.md` (Approved, SR-002; § Release Decision)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-tree-one-place/tickets/in-progress/projects-tree-one-place/investigation-notes.md` (E-001…E-007)
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-tree-one-place/tickets/in-progress/projects-tree-one-place/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-tree-one-place/tickets/in-progress/projects-tree-one-place/design-spec.md` (SR-002)
- Supplemental task artifacts: the 347 Product spec stays normative for look and states except the parts DEC-001 removes (requirements § Removed From 347); intake screenshots in `evidence/intake/`.
- Design review report: `N/A — not applicable` (independent architecture review not selected)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A (initial implementation).

## Release Decision (carry to delivery)

The user asked for a **beta release** once this ticket is finished (2026-10-31: "i would like to release a beta for this when its finished thanks"). After finalization on `origin/personal`, delivery releases a beta per `RELEASE.md`. Source: `requirements-doc.md` § Release Decision, `handoff-implementation.md` § Release decision.

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-tree-one-place/tickets/in-progress/projects-tree-one-place/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-002
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-tree-one-place`, `codex/projects-tree-one-place` (base `origin/personal` `f7f331d96b`). Code commits: `60fc6161d2` (server and web) and part of `724bc349ff` — that Solution Designer documents commit was made while my staged removals were in the shared index, so it also carries the removal of `utils/collaboration/taskExecutionScope.ts` (+ spec), `WorkspaceAgentOrgScopedRows.spec.ts`, `tests/unit/projects/task-execution-run-links.test.ts`, and the scope props of `AgentRunTaskRows.vue`, `WorkspaceTeamExecutionTree.vue`, `WorkspaceAgentOrgHistoryCollection.vue` (back to their released `8faae96899` content). Content is as intended; the history was not rewritten. Review the full change as `git diff f7f331d96b..60fc6161d2 -- autobyteus-server-ts autobyteus-web`. Documents and evidence: the commit after `60fc6161d2`.

**Server.** `ProjectRunHistoryService.read(P)` reads `ProjectRunLinks.startedRunsOf(P)` (the `project_runs.json` entries; unknown Project → `PROJECT_NOT_FOUND`) and lists the matching non-archived Agent rows through `AgentRunHistoryService.listAgentGroupsOf({ includes }, 6)` (6 newest per agent group, as in Workspaces) and the matching Team runs (uncapped) grouped by definition. GraphQL `projectRunHistory` returns `{ projectId, agentDefinitions, teamDefinitions }`; `scopes`, `agentOrgRuns` and their object types are gone. `ProjectRunLinks` has only `startedRunsOf`; `TaskExecutionResourceService.runLinksOf`, `TaskRunLinks` and the `damagedProjectIds` bookkeeping that only served it are removed; `composeProjectRunLinks({ projectsLayout })` binds `startedRunsOf`, `recordStart` and `contextOfRun` as before. `listAgentGroupsOf` lost `pinned`.

**Web.** `projectRunsProjection` builds each Project's node from its snapshot as in 347 (live context overlay, retired runs, Workspaces builders keyed by Project) with no Org groups (DEC-004) and one ancestry per run (`runAncestryById`, `teamAncestryById`: `Record<string, ProjectRunAncestry>`). Rows under a listed run are the Workspaces rows, unscoped. `projectRunsStore` reads every Project when the mode is shown and re-reads on `connected`, on a Project added / renamed (`project_upserted`) or removed (`project_removed`, dropped), after a start from this window (`noteRunStarted`), and after the web archives, deletes or stops an Agent or Team run; Task events read nothing. `useProjectsTreeState` reveals the open Agent or Team run in its one Project.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: design spec § Task Size And Architectural Risk.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: removal within existing owners only: 26 files under `autobyteus-server-ts` and `autobyteus-web` (+209 / −915 from `f7f331d96b` to `60fc6161d2`, of which 7 files in `724bc349ff`); no new owner, file, contract or stored data; the GraphQL shape narrows between web and server of one release; no escalation trigger hit (run records, Task records, `project_runs.json` and Workspaces behavior untouched).
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`

### Lightweight self-review

- Removal plan, item by item: all nine rows of the design's Removal / Decommission Plan done; a grep for `runLinksOf`, `TaskRunLinks`, `ProjectRunLinkSet`, `scopes`/`agentOrgRuns` in Projects code, `noteUnscoped`, `executionScope`, `taskExecutionScope`, `agentOrgAncestryById` (Projects), `pinned` finds only Workspaces code, negative test assertions, the docs (delivery) and the API/E2E-owned e2e suite.
- `taskExecutionScope.ts`: no unscoped caller used any of its exports, so the whole file went.
- The three row components are byte-identical to the released base `8faae96899` (only 347 had touched them), so Workspaces rendering is the released one.
- Dead code found in touched files and removed: the `agentOrgDefinitions.length === 0` term of the Project empty-state condition (always `[]` now); the `useRoute` / `orgRunId` open-run lookup in `ProjectsRunsTree.vue`; Org expansion overrides in `useProjectsTreeState`; the Org-run Stop and Org archive hooks in `projectRunsStore`.
- Boundaries: run history still reaches Projects only through `ProjectRunLinks.startedRunsOf`; the architecture guard passes (in IMP-01).
- Size: largest touched source `RunDefinitionGroups.vue` 409 effective lines; every touched file shrank.
- Web code has no local identifier named `actions` (the Nuxt auto-import collision met in 347).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | A Project lists only runs started under it (`project_runs.json`); recording unchanged | `project-run-history-service.ts` (`startedRunsOf` → `listAgentGroupsOf({includes})` + Team runs), `project-run-links.ts`, `project-run-links-composition.ts`, GraphQL `project-run-history.ts`; web `projectRunHistoryQueries.ts`, `projectRunsStore.ts`, `projectRunsProjection.ts` | Implemented; IMP-01 unit (user's case lists nowhere), IMP-06 AC-001 in the app: P, Q, R show "No runs yet" |
| BEH-002 | Under a run, delegated rows exactly as in Workspaces | Scope props removed from `RunDefinitionGroups.vue`; `AgentRunTaskRows.vue`, `WorkspaceTeamExecutionTree.vue`, `WorkspaceAgentOrgHistoryCollection.vue` back to the released content; `ProjectHistorySection.vue`, `workspaceHistorySectionContracts.ts` | Implemented; IMP-06 AC-002: a P worker and a Q worker both nested under the run in P |
| BEH-003 | 6 newest per agent group, as Workspaces | `AgentRunHistoryService.listAgentGroupsOf(select, limitPerAgent = 6)` (`pinned` removed) | Implemented; IMP-01 unit (cap 6 with archived / hidden / orphan entries) |
| BEH-004 | Re-read on `connected` and web start/archive/delete/Stop only; live status overlay kept | `projectRunsStore.applyChange` (Task events ignored), `noteRunStarted`, `rereadAfter` on run history removals and Agent / Team stops | Implemented; `projectRunsStore.spec.ts` (IMP-04, IMP-08); IMP-06 AC-002 run listed live in the open page |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Server: `src/run-history/services/project-run-history-service.ts` (rewritten, 72 lines), `src/run-history/domain/project-run-links.ts`, `src/run-history/services/agent-run-history-service.ts`, `src/projects/services/task-execution-resource-service.ts`, `src/compositions/project-run-links-composition.ts` (+ caller `project-task-execution-resource-composition.ts`), `src/api/graphql/types/project-run-history.ts`; test `tests/unit/run-history/services/project-run-history-service.test.ts` (rewritten); `tests/unit/projects/task-execution-run-links.test.ts` removed.
- Web: `stores/projectRunsStore.ts`, `stores/projectRunsProjection.ts`, `composables/useProjectsTreeState.ts`, `graphql/queries/projectRunHistoryQueries.ts`, `components/workspace/history/{RunDefinitionGroups,ProjectHistorySection,ProjectsRunsTree,AgentRunTaskRows,WorkspaceTeamExecutionTree,WorkspaceAgentOrgHistoryCollection}.vue`, `workspaceHistorySectionContracts.ts`; specs `projectRunsStore.spec.ts`, `projectRunsProjection.spec.ts` (rewritten), `ProjectsRunsTree.spec.ts`; removed `utils/collaboration/taskExecutionScope.ts` + spec, `WorkspaceAgentOrgScopedRows.spec.ts`.
- `generated/graphql.ts` does not include `projectRunHistory` (the query is hand-typed in the store), so no regeneration was needed.

## Important Assumptions

1. **Project list changes still re-read.** The design's off-spine note keeps the `/ws/projects` feed "only for `connected`". I kept `project_upserted` (read that Project) and `project_removed` (drop its snapshot) as well: they are 347 REQ-011's Project-list handling, preserved behavior, not the Task-event triggers 1, 2 and 5 that DS-002 removes. Without them a Project created or deleted elsewhere would not appear or leave until reconnect.
2. **Org runs in Projects mode.** With no Org rows (DEC-004), the Org Stop and Org archive re-read hooks were removed with them.
3. **Orphan and archived entries.** Unchanged from 347: a `project_runs.json` entry without a catalog row lists nothing, archived rows are not listed.

## Known Risks

- **API/E2E-owned suites assert the removed behavior and will fail as written** (not edited here; E2E authoring is API/E2E's):
  - `autobyteus-server-ts/tests/e2e/projects/project-run-history.e2e.test.ts`: its shared query (line 50) selects `agentOrgRuns` and `scopes`, which no longer exist, so every PRH case fails on GraphQL validation. Beyond that, PRH-04, 05, 06, 07, 08 and 10 assert scopes, multi-Project listing, the cap pinning and Org rows (all removed by DEC-001…004); PRH-01, 02, 03, 09 remain valid behavior once the query drops the two fields.
  - `autobyteus-web/tests/e2e/projects-left-navigation-probe.mjs`: PLN-01 (run listed under 3 Projects), PLN-05 (P/Q scopes, multi-Project copy), PLN-07 (beyond the cap) and the parts of PLN-06/08/09 that rely on a Workspaces-started run under a Project; its `projectRead` helper selects `scopes`.
- **Existing managers started in a workspace leave the Projects tree** — the user's decision (design § Key Tradeoffs).
- `IMP-06` ran before the self-review edit to the empty-state condition; the removed term was always true (`agentOrgDefinitions` is `[]`), and IMP-08 reran the history component and store specs and the typecheck after it.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change (user-requested), mostly removal.
- Reviewed root-cause classification: No Design Issue Found in the code; the requirement changed (DEC-001).
- Reviewed refactor decision: `Refactor Needed Now` (removal in this change).
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the design's guidance was followed — `project-run-history-service.test.ts` was rewritten first for the user's case (a run hosting Tasks of 3 Projects lists under none).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no unused `scopes` field kept, per the rejection log)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (see self-review)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`ProjectRunHistory`, `ProjectRunsSnapshot`, `ProjectSectionScope` each lost fields)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` (all shrank; largest 409)
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes` — no reader or writer of run records, Task records or `project_runs.json` changed (`ProjectRunService` / `ProjectRunStore` untouched).
- Direct-use evidence: IMP-06 reads freshly written data through the unchanged readers; Projects without `project_runs.json` list nothing (AC-001 `projectRunsJson` empty for P, Q, R).
- Deviation: `None`

## Environment Or Dependency Notes

- Dependencies as installed in the worktree; untracked build outputs `autobyteus-application-*/dist/` were not staged.
- IMP-06 is a ticket-owned script (`evidence/implementation/one-place-proof.mjs`, not durable test code) reusing the 347 probe's owned-stack approach: free ports, a private data root under the system temp folder (removed afterwards), a disposable `HOME`, `autobyteus-server-ts/dist/app.js`, Nuxt dev, headless Chrome, and the scripted AGY CLI (`tests/fixtures/agy-failure-cli.mjs`, `AGY_FAKE_CASE=linked_skills`) so `CALL_TOOL:{…}` performs a real `delegate_task`. Run under `env -i` (no provider keys, no user data).

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-tree-one-place/tickets/in-progress/projects-tree-one-place/evidence/implementation/`. "IR-001 tree" = the content of `60fc6161d2` minus the IMP-08 edits for IMP-01…07 (see each log header).

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts test:unit` | IR-001 tree (server identical to `60fc6161d2`) | macOS, Node 22 | whole server unit suite incl. the rewritten `project-run-history-service.test.ts` and the Projects boundary guard | REQ-001, 005; AC-001, 003, 005 (server read) | Pass | `IMP-01-server-test-unit.full.log` | `Test Files  900 passed \| 5 skipped (905)`, `Tests  7647 passed \| 9 skipped (7656)` |
| IMP-02 | `pnpm -C autobyteus-server-ts typecheck` | same | macOS, Node 22 | server `src` | — | Pass | `IMP-02-server-typecheck.log` | no `error TS` lines; exit 0 |
| IMP-03 | `pnpm -C autobyteus-web typecheck` | IR-001 tree before IMP-08 edits | macOS, Node 22 | web app, Electron main, build scripts | — | Pass | `IMP-03-web-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 298 in 139 files (baseline 298 in 139 files)`, `[typecheck] PASS` |
| IMP-04 | `pnpm -C autobyteus-web test:nuxt --run` | same | macOS, Node 22 | whole web suite | REQ-001…004; AC-004 (store) | Pass | `IMP-04-web-test-nuxt.full.log` | `Test Files  678 passed (678)`, `Tests  4917 passed \| 2 skipped (4919)` |
| IMP-05 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | same | macOS | web boundaries, catalogs | — | Pass | `IMP-05-web-guards.log` | `[guard:web-boundary] Passed.`, `[guard:localization-boundary] Passed.` |
| IMP-06 | `env -i PATH HOME TMPDIR USER LOGNAME node <ev>/one-place-proof.mjs --output-dir <ev>/IMP-06-proof` | IR-001 tree before IMP-08 edits; server dist from it (IMP-07) | macOS, Chrome 156 headless, script-owned stack | Projects mode end to end with real `delegate_task`: `projectRunHistory`, store, projection, tree, Workspaces rows | AC-001, AC-002, REQ-001, 002, 004; AC-004 (start listed live) | Pass | `IMP-06-in-app-proof.log`, `IMP-06-proof/evidence.json`, `IMP-06-proof/*.png` | `AC-001: Pass`, `AC-002: Pass`; in `evidence.json`: AC-001 `projectRunHistory` `{"P": [], "Q": [], "R": []}` and each `hint` "No runs yet. Use + to run an agent or team for this Project."; AC-002 `nestedUnderAInP` = [P worker, Q worker], `rowsOfAInProjectsMode: 1`, `qShows.runRows: []`; cleanup `dataRootRemoved: true` |
| IMP-07 | `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` | IR-001 tree | macOS, Node 22 | server dist for IMP-06 | — | Pass | `IMP-07-server-build.log` | `Built-in agents bootstrap smoke check passed.` |
| IMP-08 | `pnpm -C autobyteus-web exec vitest run stores/__tests__/projectRunsStore.spec.ts stores/__tests__/projectRunsProjection.spec.ts components/workspace/history --run`; `pnpm -C autobyteus-web typecheck` | `60fc6161d2` content (after the self-review edits) | macOS, Node 22 | Projects store / projection, every history component | REQ-001…004 | Pass | `IMP-08-web-after-self-review.log` | `Test Files  24 passed (24)`, `Tests  258 passed (258)`; `[typecheck] PASS` |

- Not run, and why: the server e2e suite `tests/e2e/projects/project-run-history.e2e.test.ts` and the 347 browser probe (both assert the removed behavior; API/E2E-owned, see Known Risks); AC-003 Team under P in a browser (server unit test covers the read); AC-004 archive / delete / Stop / reconnect in a browser (store tests only; start-listed-live is in IMP-06); the isolated desktop build.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: the Projects tree in the left panel (Project rows, empty hint, agent group, run row, delegated rows), Workspaces tree (unchanged).
- References: requirements REQ-001…004, AC-001, AC-002; 347 Product spec VIS-004 (empty hint) and the workspace-styled rows.
- Design system and adjacent surfaces reviewed: the Workspaces section rows the Projects tree shares (`RunDefinitionGroups`), delegated rows with Task lines.
- Rendered surface: the script-owned stack of IMP-06 (Nuxt dev + built server, Chrome headless 1440×900), per TESTING.md's owned-stack rule.
- States, layouts, viewports, and interactions inspected: Projects mode with three Projects and no runs started under them (all show the hint); switch to Workspaces, open the folder and the run, its three delegated workers with Task lines; back to Projects (still empty); "+" on P → choose the manager → AGY model → send; the run listed under P in the same page, opened, both delegated workers (P's and Q's Task) nested with their Task lines; Q and R show the hint; reload keeps it. Screenshots inspected directly.
- Visual or interaction issues found and corrected: a first screenshot caught the chevron mid-rotation (the disclosure's `transition-transform`), a capture-timing artifact, not a product defect; the script waits 500 ms before shots. No product issue found.
- Remaining unverified: narrow layout, zh-CN, keyboard (unchanged components; 347 verified them), Team runs under a Project in a browser.

## Downstream Coverage Hints / Suggested Scenarios

- Update the PRH e2e suite to the new shape: drop `agentOrgRuns` / `scopes` from its query; replace PRH-04…08 and PRH-10 with: a root started under P delegating Tasks of P and Q (listed only under P; Q empty); a Workspaces-started root hosting Tasks of 3 Projects (listed nowhere); more than 6 runs of one agent under P (only the 6 newest, no pinning); an Org root hosting P's Task (not listed).
- Update the 347 probe's PLN cases that assert multi-Project listing and scopes (PLN-01, PLN-05, PLN-07, and the dependent parts of PLN-06/08/09), or retire them in favour of AC-001/AC-002 journeys like IMP-06.
- AC-003 in a browser: a Team started under P listed once under P's TEAMS group.
- AC-004 in a browser: archive, delete and Stop a run under P, and a backend restart / reconnect, with Projects mode shown.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Everything in "Not run" above; the durable PRH and PLN coverage changes; then delivery syncs the docs (server `docs/modules/run_history.md` § Project Run History and `docs/modules/projects.md` § Project run links; web `docs/projects.md` § Projects Mode In The Left Panel still describe scopes, hosts and Task-event re-reads) and releases a **beta** after finalization (the user's release decision).
