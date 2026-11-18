# API/E2E Coverage Investigation — projects-tree-one-place (autobyteus-353)

## Investigation Meta

- Requirements Doc: `…/requirements-doc.md` (Approved, SR-002; § Release Decision: beta after finalization)
- Investigation Notes: `…/investigation-notes.md` (E-001…E-007)
- Solution Revision Record: `…/solution-revision-record.md`
- Design Spec: `…/design-spec.md` (SR-002; Medium / Low)
- Supplemental Task Artifacts: the 347 Product spec (normative for look and states except the parts DEC-001 removes); 347's API/E2E package in `tickets/done/projects-left-navigation/` (the durable suites this ticket changes)
- Design Review Report: `N/A — not applicable` (architecture review not selected)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `…/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- API/E2E Revision Record: `…/api-e2e-revision-record.md` (created with the first result)
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: the implementation engineer's handoff for direct API/E2E validation (code `60fc6161d2`, with part of `724bc349ff`; docs `5c9ed8d4cf`)
- Prior Investigation Reviewed: none for this ticket
- Latest Authoritative Investigation: this round

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-tree-one-place/tickets/in-progress/projects-tree-one-place`.)

## Current Requirement And Design Basis

A Project in the Projects tree lists exactly the Agent and Team runs started under it (`project_runs.json`), not archived, 6 newest per agent group, Teams uncapped. No Org rows appear (REQ-001, DEC-004). Under a listed run, all its delegated work is shown exactly as in Workspaces (REQ-002). Projects mode re-reads on `connected` and after web start/archive/delete/Stop; Task events read nothing (REQ-003; the implementation also keeps `project_upserted` and `project_removed`, Important Assumption 1). An empty Project shows "No runs yet…" (REQ-004). No stored data changes (REQ-005). The GraphQL `projectRunHistory` loses `scopes` and `agentOrgRuns`. Removed 347 behavior: multi-Project listing of hosts, per-Project scoping, cap pinning, Task-event re-reads.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (the user's existing data), SCN-002 (work under a Project).
- Real-use scenarios added:
  - RU-01: a run started under P whose Task copy also holds a Q Task. Under P it is shown as in Workspaces; Q lists nothing for it.
  - RU-02: more than 6 runs under P, the oldest still hosting open work. Only the 6 newest are listed (no pinning).
  - RU-03: an Org run hosting P's Task. It is not listed under P.
  - RU-04: a Project created or deleted elsewhere while Projects mode is shown (kept `project_upserted` / `project_removed`).
- Contrived scenarios: none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 listing | Changed (narrowed) | REQ-001, DEC-001 | Server E2E and browser: hosts not listed, started runs listed once |
| BEH-002 delegated rows | Changed (unscoped) | REQ-002, DEC-002 | Browser: P and Q work nested under the run in P |
| BEH-003 cap | Changed (no pinning) | REQ-001, DEC-003 | Server E2E: 6 newest only |
| BEH-004 re-reads | Changed (fewer triggers) | REQ-003 | Browser: start, archive, delete, Stop, restart, Project delete live |
| GraphQL `projectRunHistory` | Changed (fields removed) | design § Interface | Durable suites' queries updated |
| Workspaces mode and row components | Preserved (back to released content) | IR-001 self-review | Browser Workspaces checks; gated regression folders |
| Recording runs started under a Project, `## Project` section, chip and folder rule | Preserved | Non-Goals | PRH-01/02/03/09 and PLN-02/03/04 kept |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `ProjectRunHistoryService`, `listAgentGroupsOf`, `runLinksOf` removed | IMP-01 | Real data from real delegation | Server E2E (gated) |
| API / transport / contract | Yes | `projectRunHistory` shape | IMP-01, IMP-02 | The real query against the real schema | Server E2E, browser |
| Frontend component / state | Yes | store, projection, tree, rows | IMP-04, IMP-08 | Real feed and streams | Browser probe |
| Browser integration / user journey | Yes | Projects mode | IMP-06 (AC-001, AC-002) | AC-003, AC-004 in a browser; Workspaces rows after the revert | Browser probe |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | same renderer | as above | — | Browser probe |
| Desktop shell / Electron-specific | No | — | — | Packaged build ahead of the beta release | Isolated desktop instance (journey) |
| Process / lifecycle | Yes (re-reads, restart) | `connected` re-read | store tests | Real restart | Browser probe (PLN-08) |
| Persisted-data transition | No (`Not Affected`) | readers untouched | IMP-01 | — | Server E2E file asserts (unchanged) |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-tree-one-place`, branch `codex/projects-tree-one-place` (base `origin/personal` `f7f331d96b`).
- Testing guideline: `TESTING.md` (root), as for 347. No closer guideline.
- Commands and harnesses: the same as 347's API/E2E round:
  - `RUN_AGY_FAILURE_E2E` with the scripted AGY CLI;
  - the probe `pnpm -C autobyteus-web test:e2e:projects-left-navigation`;
  - the isolated instance with scripted AGY through its data root's `server-data/.env`.
- Secrets: none; scripted runtime only.
- The user's running app is not touched.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global strategy | Rerun by impact; one heavy run at a time; owned stacks; `env -i` for E2E |
| `docs/isolated-app-instances.md` | Desktop instance | `isolated-app start --build --data-root`, `stop` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server E2E | `autobyteus-server-ts` | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs> pnpm exec vitest run <file>` | in-process server | suite setup | `afterAll` |
| Browser probe | `autobyteus-web` | `pnpm test:e2e:projects-left-navigation --output-dir <fresh>` | built server dist, Nuxt dev, Chrome | GraphQL, Nuxt 200 | probe `finally` |
| Isolated instance | repo root | `isolated-app start --build` | packaged worktree build | start JSON | `isolated-app stop` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Definitions, Projects, Tasks, runs | Public GraphQL and the UI | test-owned data roots | removed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- Evidence planned: PRH-01's exact `project_runs.json` shape and released run-record keys (kept); AC-001's user-like data with no `project_runs.json` (PRH-05, PLN-01). Reused IMP-01.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/e2e/projects/project-run-history.e2e.test.ts` shared query | Selects `agentOrgRuns`, `scopes` | GraphQL shape (design) | Needs Update | Fields removed | Drop the fields |
| PRH-01, PRH-02, PRH-03, PRH-09 | Start under P (record, prompt), refusals, Team under P, deleted Project | Preserved (Non-Goals); AC-003 | Still Valid (after the query update) | — | Keep |
| PRH-04 | P lists host with P/Temp scopes; Q lists the host with its Q copy | 347 REQ-003(b)/008 removed | Replace | DEC-001/002 | Root under P delegating P/Q/Temp: listed once under P; Q and R list nothing (AC-002) |
| PRH-05 | Workspaces root: its P copy under P | removed | Replace | DEC-001 | Workspaces root hosting Tasks of P, Q, R: listed under none; not recorded (AC-001) |
| PRH-06 | Multi-Project copy listed under P and Q; closure and reopen through scopes | removed (scoping) | Stale / Remove | DEC-002 | No replacement in this suite. With no per-Project scope the copy-to-Project rule has no observable output in `projectRunHistory`; closure and reopen remain covered by `task-closure-root-visibility`, `task-reactivation-root-visibility`, `task-existing-copy-assignment` and the browser probe's PLN-06 |
| PRH-07 | Older open-work host pinned beyond the 6 newest | 347 REQ-010 "plus hosts" removed | Replace | DEC-003 | 6 newest only, the open-work host not pinned (RU-02) |
| PRH-08 | Workspaces run listed once under each of 3 Projects; archived nowhere | removed (multi-listing); archive kept | Replace | DEC-001 | Archived run under P is no longer listed (AC-004 server part); the 3-Project host case moves into PRH-05 |
| PRH-10 | Org root under P's `agentOrgRuns` with P scope | removed (DEC-004) | Replace | DEC-004 | Org root hosting P's Task: P lists nothing for it (RU-03) |
| `tests/e2e/projects-left-navigation-probe.mjs` `projectRead` | Selects `scopes` | GraphQL shape | Needs Update | — | Drop `scopes` |
| PLN-01 | Host listed under 3 Projects; Q work only | removed | Replace | AC-001 | Every Project "No runs yet"; the run and its 3 delegated rows in Workspaces; no Org groups; switch keeps the open run; mode remembered |
| PLN-02, PLN-03, PLN-04, PLN-06, PLN-10 | Start under P / chip / Team / closure / a11y | Preserved; AC-003 | Still Valid | — | Keep (PLN-04: Team listed once) |
| PLN-05 | P/Q scopes, multi-Project copy | removed | Replace | AC-002 | P Team, P Agent, Q and Temp work all nested under the run in P live; the run not listed under Q; board coupling kept |
| PLN-07 | Run beyond the cap listed under P (pinned) | removed | Replace | DEC-003 | P lists the 6 newest only, the open-work host not listed; archiving 3 newer brings it back (archive read); it still opens from Workspaces after that |
| PLN-08 | Restart keeps the tree; Project created after restart live | Preserved (AC-004 reconnect) | Still Valid | — | Keep |
| PLN-09 | Archive, Stop, group archive, Project delete | AC-004 | Needs Update | It archived one of the 6 pinned-era runs | Archive and **delete** a stopped run under P in Projects mode; Stop of Agent and Team kept |
| `WorkspaceAgentOrgScopedRows.spec.ts` (347 API/E2E) | Org rows scoped to a Project | 347 REQ-008 scoping, removed | Stale / Remove (removed by IR-001 in `724bc349ff`) | The `executionScopeOf` prop is gone; the component is byte-identical to the released base | No replacement: the unscoped Org rows are covered by the existing `WorkspaceAgentOrg*.spec.ts` |
| Gated server E2E folders (`projects`, `run-history`, `agent-team-runs`) | Preserved behavior | REQ-005, Workspaces | Still Valid | — | Rerun as regression (run-history and Projects services changed) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | REQ-001, 005; AC-001/003/005 server read | server unit | Reused | IMP-01 | `git diff --name-only 60fc6161d2 HEAD` outside `tickets/` is empty |
| API-R02 | — | server typecheck | Reused | IMP-02 | same |
| API-R03 | REQ-001…004 web | web suite, typecheck, guards, store/component specs | Reused | IMP-03, IMP-04, IMP-05, IMP-08 | IMP-08 reran the touched stores and history components and the typecheck after the self-review edits; the full suite (IMP-04) predates them, but the edited files are imported only by the components IMP-08 ran |
| API-R04 | AC-001, AC-002 | in-app proof | Reused (supporting) | IMP-06 | Same approach as API-02 below; kept as supporting evidence |
| API-01 | AC-001, 002, 003, 004 (archive server), 005; RU-01…03; preserved PRH-01/02/03/09 | Real GraphQL, scoped MCP, Projects files | Durable (updated) | `env -i … RUN_AGY_FAILURE_E2E=1 … vitest run tests/e2e/projects/project-run-history.e2e.test.ts` | The new listing from real Task records |
| API-02 | AC-001…004; preserved 347 journeys | Browser on a real stack | Durable (updated) | `env -i … pnpm -C autobyteus-web test:e2e:projects-left-navigation --output-dir <ev>/API-02-browser-probe` | The user's case and the journeys in the UI |
| API-03 | Preserved Workspaces and collaboration behavior | Gated server E2E folders | Existing Test | `vitest run tests/e2e/projects tests/e2e/run-history tests/e2e/agent-team-runs` | Server services changed |
| API-04 | AC-002 in the packaged app ahead of the beta | Isolated desktop instance | Journey | `isolated-app start --build`, scripted AGY, the 347 desktop driver (adapted copy) | Release-bound build |

- Test progress log needed: Yes.

## Durable Coverage To Add

None as new files. The changes are updates (below).

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-01 | `autobyteus-server-ts/tests/e2e/projects/project-run-history.e2e.test.ts` | Query without `agentOrgRuns`/`scopes`; PRH-04/05/07/08/10 replaced; PRH-06 removed | See the inventory |
| API-02 | `autobyteus-web/tests/e2e/projects-left-navigation-probe.mjs` | `projectRead` without `scopes`; PLN-01/05/07 replaced; PLN-09 archive plus delete | See the inventory |

## Durable Coverage To Remove

| Existing Path / Test | Obsolete Assertion And Why | Requirement / AC / Design Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| PRH-06 in `project-run-history.e2e.test.ts` | A copy holding P and Q Tasks is listed in both Projects' scopes, then only Q's | DEC-002 removes scoping; `scopes` no longer exists | No replacement: no observable output remains; closure and reopen are covered elsewhere (inventory) |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentOrgScopedRows.spec.ts` (already removed by IR-001) | Org rows filtered by a Project scope | DEC-002, DEC-004 | No replacement: the component is back to the released base, covered by the existing Org specs |

## Desktop Application Validation Plan

- No shell change. The packaged journey (API-04) is run because the user asked for a beta right after this ticket.
- Same approach as 347 API-05: an own data root, scripted AGY in `server-data/.env`, CDP driver, stop.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| The user's real data (`~/.autobyteus`) | TESTING.md Rule 2: never the user's data; the fixture reproduces its shape (a workspace-started manager hosting Tasks of several Projects) | Low | No (the fixture reproduces it) | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (updated: API-01, API-02; removed: PRH-06)
- Reroute Required Before Validation Execution: `No`
