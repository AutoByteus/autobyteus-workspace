# API/E2E Execution Coverage Report — projects-tree-one-place (autobyteus-353)

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-tree-one-place/tickets/in-progress/projects-tree-one-place/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; the implementation engineer's handoff for direct validation (IR-001; code `60fc6161d2` with part of `724bc349ff`; docs `5c9ed8d4cf`).
- Prior round reviewed: none for this ticket. The durable suites changed here come from 347's API/E2E round (`tickets/done/projects-left-navigation/`).
- Deviations from the investigation's plan: none.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-tree-one-place/tickets/in-progress/projects-tree-one-place/evidence/api-e2e/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `60fc6161d2` (HEAD `5c9ed8d4cf`, docs only after it) + this round's test updates | macOS 26 arm64, Node 22 | In-process Studio server (Vitest); scripted AGY CLI (`linked_skills`) | `env -i PATH HOME=<temp> TMPDIR`; `RUN_AGY_FAILURE_E2E=1` |
| ENV-2 | same; server `dist` rebuilt from this tree before the probe | macOS arm64 | Probe-owned stack: built server, Nuxt dev, headless Chrome 156; scripted AGY | `env -i PATH HOME TMPDIR USER LOGNAME`; no provider keys; en-US 1440×900, zh-CN, 600×800 |
| ENV-3 | same; packaged worktree build (`isolated-app start --build`) | macOS arm64 | Isolated desktop instance, own data root, scripted AGY through `server-data/.env` | AGY catalog must read `Gemini test` (the scripted CLI) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | REQ-001, 005; AC-001/003/005 (server read) | server unit | Reused IMP-01 | — | Pass | (implementation evidence) | `Tests  7647 passed \| 9 skipped (7656)` | `git diff --name-only 60fc6161d2 HEAD` outside `tickets/` is empty |
| API-R02 | — | server typecheck | Reused IMP-02 | — | Pass | — | exit 0 | same |
| API-R03 | REQ-001…004 (web) | web suite, typecheck, guards, touched specs | Reused IMP-03, IMP-04, IMP-05, IMP-08 | — | Pass | — | IMP-04 `Tests  4917 passed`; IMP-08 `Tests  258 passed (258)`, `[typecheck] PASS` | IMP-08 reran the touched stores, history components and typecheck after the self-review edits |
| API-R04 | AC-001, AC-002 | in-app proof | Reused IMP-06 (supporting) | — | Pass | `IMP-06-proof/evidence.json` | `AC-001: Pass`, `AC-002: Pass` | Proven again independently by API-02 and API-04 |
| API-01 | AC-001, 002, 003, 004 (archive, server), 005; RU-01…03; preserved 347 PRH-01/02/03/09 | Real GraphQL, scoped MCP, Projects files, AGY capsule | `env -i PATH HOME=<tmp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs PROJECT_RUN_HISTORY_E2E_EVIDENCE_DIR=<ev>/API-01 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-run-history.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-01-server-e2e.log`, `.full.log.gz`, `API-01/project-run-history.json` | `Tests  9 passed (9)`; JSON `prh05.reads` P/Q/R `agentDefinitions` without the Workspaces root; `prh04.Q`/`R` `{"agentDefinitions":[],"teamDefinitions":[]}`; `prh07.listed` = the 6 newer only | First run passed |
| API-02 | AC-001, 002, 003, 004; 347 preserved journeys | Browser on a real stack (real delegation) | `env -i PATH HOME TMPDIR USER LOGNAME pnpm -C autobyteus-web test:e2e:projects-left-navigation --output-dir <ev>/API-02-browser-probe` | ENV-2 | Pass | `API-02-browser-probe.log`, `API-02-browser-probe/evidence.json`, `API-02-browser-probe/PLN-*.png`, logs (`.gz`) | `PLN-01: Pass` … `PLN-10: Pass`; PLN-01 `hints` P/Q/R `"No runs yet. Use + to run an agent or team for this Project."`, `inProjects {"runRows":0,"copyRows":0,"orgGroups":0}`; PLN-05 `rowsOfAInProjectsMode: 1`, `aUnderQ: 0`, `copiesUnderQ: 0`, `qTaskLineUnderP: "Check the docs links"`; PLN-09 `projectsStopButtonsAfter5s: 0`, `teamStopShownAfter5s: 0`, `deleted` gone | Per-case detail below. First run passed |
| API-03 | Preserved: Workspaces history, closure, reactivation, follow-ups, Temp tasks, prompt views, Team creation | Gated server E2E folders | `env -i … RUN_AGY_FAILURE_E2E=1 … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects tests/e2e/run-history tests/e2e/agent-team-runs --no-watch` | ENV-1 | Pass | `API-03-server-e2e-regression.log`, `.full.log.gz` | `Test Files  39 passed (39)`, `Tests  179 passed \| 4 skipped (183)` | Includes the updated PRH suite. EXC-E2E-004 (347 FU-007 race) passed in this run |
| API-04 | AC-002 (and AC-001's empty Q) in the packaged app | Isolated desktop instance | `isolated-app start --build --data-root /tmp/353-iso-root` → stop → AGY lines added to `server-data/.env` → `start --from-worktree` → `node API-04-desktop-journey.mjs <controlPort> <backendUrl> <dataRoot> <out>` → `isolated-app stop iso-58711-02ce` | ENV-3 | Pass | `API-04-desktop-journey.mjs`, `API-04-desktop/API-04-desktop-journey.log`, `API-04-desktop/API-04-0*.png`, `API-04-instance-{start,stop}.json` | `AC-002: {"qWorker":"fact_checker_…","rowsOfRunInProjectsMode":1,"qHint":"No runs yet. Use + to run an agent or team for this Project.","qRunRows":0}`; `## Project section: …`; `Team row with Task line: "Review the launch checklist"`; `page errors: []`; `result: "Pass"` | AGY catalog read `Gemini test` (the scripted CLI). The first driver start failed loading `playwright-core` from the removed 347 worktree path; the driver now resolves it from this worktree |

### API-02 per-case results

| Probe case | Result | What it showed |
| --- | --- | --- |
| PLN-01 (353 AC-001, the user's case) | Pass | A Workspaces run handed out Tasks of P, Q, R (3 copies). Workspaces mode shows the run and its 3 delegated rows. Projects mode: P, Q, R each show "No runs yet…", with no run rows, no delegated rows and no ORGS group; `projectRunHistory` lists nothing for each. Switching modes keeps the open run, which is marked in Workspaces. Projects mode is remembered after reload |
| PLN-02 (347 AC-003) | Pass | "+" on P → manager → AGY → send. Listed under P at once; P's folder; `## Project` in the prompt; also under its folder in Workspaces |
| PLN-03 (347 AC-015/004) | Pass | Chip folder rules: first of two folders, temp for none, picked folder kept, "No project" plain; all runs on AGY |
| PLN-04 (353 AC-003, 347 AC-005) | Pass | Team started under P: recorded in 173 ms, listed in 489 ms, listed once in Projects mode. "+" on P's agent group → second run under P |
| PLN-05 (353 AC-002) | Pass | Typed `delegate_task` P1 → Team: row live under the run in P (801 ms), Task line "Review the launch checklist", members, coordinator opened. Q Task, Temp-task work and a P Task: all three nested under the run in P (the Q worker's line reads "Check the docs links"). The run is listed once in Projects mode, not under Q (`aUnderQ: 0`, `copiesUnderQ: 0`). The board follows P; a Task line locates its Task |
| PLN-06 (347 AC-008) | Pass | P1 DONE: Team rows leave live; the conversation is kept; reopen + message brings them back |
| PLN-07 (353 DEC-003) | Pass | 6 newer runs under P: P lists exactly those 6; the older run hosting P's open work is not listed (no pinning). After archiving 3 of them it is listed again; it opens, and so does its delegated member |
| PLN-08 (353 AC-004 reconnect) | Pass | Real backend restart: tree kept; a Project created after the restart appears live; post-restart work in the run's stored tree; current state after reload. Same-page run stream: `liveInSamePage: false` (347 FU-008, existing) |
| PLN-09 (353 AC-004) | Pass | A running run offers Stop, not Archive. Archive and **delete** of stopped runs in Projects mode: gone in both modes without a reload. Agent and Team Stop read stopped within 5 s. "Archive all" is blocked while a run runs, then archives only P's listed runs (the outsider stays). Deleting R removes it live; its runs stay in Workspaces |
| PLN-10 (347 AC-013/016/017) | Pass | Keyboard switch and open; zh-CN tabs; narrow drawer; briefcase; reference screenshots |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 PRH-05, API-02 PLN-01, API-R04 | Proven | The user's real data was not used (TESTING.md Rule 2); the fixture reproduces its shape: a workspace-started manager that handed out Tasks of several Projects |
| AC-002 | Yes | API-01 PRH-04, API-02 PLN-05, API-04 | Proven | — |
| AC-003 | Yes | API-01 PRH-03, API-02 PLN-04 | Proven | — |
| AC-004 | Yes | API-02 PLN-02 (start), PLN-09 (archive, delete, Stop), PLN-08 (reconnect); API-01 PRH-08 | Proven | — |
| AC-005 | Yes | API-01 PRH-01 (file shape, released run-record keys), PRH-05 (no file written for hosts), API-R01 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 97% | API-01, API-02, API-04 | — | — |
| Changed-boundary execution directness | 92% | 97% | real GraphQL/MCP (API-01), real UI on a real stack (API-02), packaged app (API-04) | — | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | real delegation, scripted CLI; no mocks of our code | Scripted runtime, not paid inference | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | owned stacks; isolated packaged build | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | unknown and deleted Project, archive, delete, Stop, restart, cap | FU-008 (existing) | — |
| User-surface, browser, and desktop-shell confidence | 85% | 96% | API-02, API-04 | — | — |
| Durable regression coverage quality and relevance | 92% | 95% | updated PRH suite and probe; API-03 | — | — |

- Overall post-repository confidence: 90%
- Overall final confidence: 95.7% (simple average)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  - 347 FU-008 (a page's run stream after a backend restart without a reload; existing, both modes).
  - Existing managers started in a workspace leave the Projects tree. This is the user's decision (DEC-001), not a defect.

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed.
- Execution mode: Browser (API-02), Project Desktop Validation (API-04), Live API (API-01/API-03).
- Gap addressed: the user-visible listing and nesting from real delegation, and the packaged build ahead of the requested beta.
- Browser validation needed: yes. This is renderer behavior over live feeds and streams.

## Desktop Application Validation

- Approach: as 347 API-05. An isolated instance of the worktree build, scripted AGY through its data root's `.env`, driven over CDP (`API-04-desktop-journey.mjs`, adapted from 347's driver with the Q Task step).
- Effect on any already-running desktop application: `None`.

## Persisted-Data Transition Checks

- Approved decision: `Not Affected`.
- Representative existing data: hosts of Tasks of 3 Projects, with no `project_runs.json` (PRH-05, PLN-01).
- Approved transition followed: `Yes`. Reads only; no file written for hosts (PRH-05 checks each Project's file).
- Version-specific branch or dual read/write observed: `No`.

## Compatibility / Legacy Scope Check

- Backward compatibility in upstream scope: `No`. In the implementation: `No` (no unused `scopes` field kept).
- Durable coverage for compatibility-only behavior: `No`. The suites assert the current shape; their old assertions were replaced or removed (below).

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/project-run-history.e2e.test.ts` | Updated: query without `agentOrgRuns`/`scopes`; PRH-04, 05, 07, 08, 10 replaced; PRH-03 also checks Q and R list no Team | API-01, API-03 | **PRH-06 removed.** It asserted that a copy holding P and Q Tasks is listed in both Projects' scopes, then only Q's. DEC-002 removes the scopes, so the rule has no output left. Closure and reopen stay covered by `task-closure-root-visibility`, `task-reactivation-root-visibility`, `task-existing-copy-assignment` (API-03) and probe PLN-06 |
| `autobyteus-web/tests/e2e/projects-left-navigation-probe.mjs` | Updated: `projectRead` without `scopes`; PLN-01, 05, 07 replaced; PLN-04 asserts listed once; PLN-08 checks the stored tree instead of scopes; PLN-09 adds permanent delete | API-02 | — |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentOrgScopedRows.spec.ts` | Removed (by IR-001 in `724bc349ff`; validated here) | — | It asserted Org rows filtered by a Project scope (347 REQ-008). DEC-002 and DEC-004 remove it, and the component is byte-identical to the released base. No replacement: unscoped Org rows are covered by the existing `WorkspaceAgentOrg*.spec.ts` (IMP-04) |

- Paths attached for proportional test-code review: `Not Applicable` (direct route).
- Removed paths: see `git show 724bc349ff --stat` and the PRH-06 hunk in this round's test commit.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model provider / AGY CLI | Scripted AGY CLI (`agy-failure-cli.mjs`) | TESTING.md: real delegation without provider calls | Not paid inference |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Server E2E temp data dirs and HOMEs | Yes | suite `afterAll` | Removed |
| Probe stack | Yes | probe `finally` | `dataRootRemoved: true`; processes terminated |
| Isolated instances `iso-58612-1a58`, `iso-58711-02ce` and the data root `/tmp/353-iso-root` | Yes | `isolated-app stop`; data root removed | `list` → `"instances":[]`; ports released. The user's own app was never signalled (`stop` targets only the instance's process group) |
| `autobyteus-web/electron-dist/` | Yes | Left (untracked build output) | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: none. AC-001 was proven on a fixture of the user's case, not on the user's own data (TESTING.md Rule 2).
- Next recipient from `get_handoff_rules`: the delivery engineer (direct low-risk route).
- Notes for delivery:
  - Durable test updates are in this round's test commit. Test-code review: `Not Required — direct low-risk route`.
  - Docs sync: server `docs/modules/run_history.md` and `docs/modules/projects.md`, web `docs/projects.md` (implementation handoff).
  - The user asked for a **beta release** after finalization (requirements § Release Decision).
  - Residual: 347 FU-008 (existing).
