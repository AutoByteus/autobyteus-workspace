# API/E2E Execution Coverage Report — task-part-of

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `tickets/in-progress/task-part-of/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/task-part-of/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/task-part-of/api-e2e-test-progress.md`
- Round and trigger: round 1; implementation review Pass (CRR-001) from `/software_engineering_team/code_reviewer`.
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - API-07 found two intermittent failures in the existing `project-manager-ux` probe (PMU-002, PMU-021). Their cause is in the probe (it asserts transient UI states), not in this change; fixed in the probe as a separate baseline-fix commit (TESTING.md Rule 9) and rerun. See API-07.
  - J7 (the tab) in the desktop instance: the right panel's tabs need a selected agent run, and the instance has no runtime that can start one without the user's provider or CLI login (its server gets a baseline-only environment, so the scripted AGY CLI cannot be injected). The tab was proven in API-08 on the same renderer with a real run.
- Test code commits: `f1902e8a7b` (server E2E: added and updated coverage), `ca37919cdf` (baseline fix of the project-manager-ux probe). The test files run were byte-identical to these commits (`git diff` empty after committing).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of/tickets/in-progress/task-part-of/evidence/` (files `API-*`); the handoff message gives the commit.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | Code `179ddb9f77` (HEAD `399303d039`, ticket docs only after it) + this round's test edits (committed with this report) | macOS darwin arm64 | Node, corepack pnpm 10.28.2; vitest in-process Studio server (`startStudioE2eRuntimeServer`) | `env -i PATH HOME=<resolved temp> TMPDIR`; test-owned temp data roots |
| ENV-2 | Same as ENV-1 | macOS | ENV-1 + `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (scripted AGY, real runtime processes, no provider) | `AGY_FAKE_CASE=linked_skills` set by the suites |
| ENV-3 | Code `179ddb9f77`; `autobyteus-server-ts/dist` built from it | macOS | Probe-owned stack: `dist/app.js` backend with scripted AGY + `nuxi dev` + headless Chrome (playwright-core) | Free ports, own data root under the OS temp dir, en-US, 1440×1000 |
| ENV-4 | Code `179ddb9f77`; `pnpm -C autobyteus-web build:electron:mac` → `electron-dist/mac-arm64/AutoByteus.app` (1.5.6-beta.8 worktree build) | macOS | Isolated desktop instance (`isolated-app start --from-worktree --data-root /tmp/pof-e2e/desktop-root`), CDP attach to its own control port | 1440×900 (760 for J10); en and zh-CN through the app's Language setting |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | — | Server E2E baseline | Ungated: `pnpm exec vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts tests/e2e/projects/projects-graphql.e2e.test.ts tests/e2e/projects/project-task-search.e2e.test.ts --no-watch`; gated: six live suites (header of the log) | ENV-1, ENV-2 | Pass (baseline recorded) | `evidence/API-00-baseline-ungated.log` (+ `.full.log.gz`), `evidence/API-00-baseline-gated.log` (+ `.full.log.gz`) | `Tests  6 failed \| 20 passed (26)`; failures at `project-task-boundaries.e2e.test.ts:173`, `:482`, `:690`, `:760`, `projects-graphql.e2e.test.ts:540`, `project-task-search.e2e.test.ts:94`; gated: `project-change-feed` `feed equals snapshot` timeouts (snapshot query lacked `partOfTaskId`), `task-existing-copy-assignment.e2e.test.ts:833` | Every failure was an additive shape pin. The baseline missed `project-task-search` and `project-change-feed`, which the handoff did not list. |
| REUSE-IMP-01 | — | Server typecheck | IMP-01 | — | Pass | — | — | `git diff --name-only 179ddb9f77 399303d039` lists only `tickets/in-progress/task-part-of/**`; no `src` changed since. |
| REUSE-IMP-02 | AC-001–008, 014–016, 018 (unit) | Server unit | IMP-02 | — | Pass | — | — | Same diff argument. |
| REUSE-IMP-03 | — | Server integration | IMP-03 | — | Pass | — | — | Same. |
| REUSE-IMP-04 | AC-001, 002, 009–013, 019, 020 (unit) | Web unit / component | IMP-04 | — | Pass | — | — | Same. |
| REUSE-IMP-05 | AC-013 | Web guards | IMP-05 | — | Pass | — | — | Same; the three guards also passed again inside the Electron build (ENV-4 build log). |
| API-01 | REQ-013, REQ-014, REQ-015 (old calls otherwise identical) | HTTP / MCP / GraphQL / feed shape pins | Updated pins (see Durable Coverage), rerun in API-06 | ENV-1, ENV-2 | Pass | `evidence/API-06-projects-folder-gated.log`, `evidence/API-06-head-context-files.log` | `✓ tests/e2e/projects/project-task-boundaries.e2e.test.ts (14 tests)`, `✓ ... projects-graphql.e2e.test.ts (12 tests)`, `✓ ... project-task-search.e2e.test.ts (3 tests)`, `✓ ... project-change-feed.e2e.test.ts (7 tests)`; HEAD version of context-files: `AssertionError: expected { task: { …(6) } } to deeply equal { task: { …(5) } }` at `:160` | Old calls return exactly the old shape plus `partOf: null` (and `parts: []` in list / search). The HEAD-version run proves the gated baseline's pass of `project-task-context-files-delegation` was my mid-run edit being loaded, not a hollow test. |
| API-02 | AC-001, 002, 003, 004, 005, 007, 016; REQ-002 | GraphQL resolver → service → real store (in-process schema) | `vitest run tests/e2e/projects/projects-graphql.e2e.test.ts` (API-011); final run in API-06 | ENV-1 | Pass | `evidence/API-01-04-ungated-run1.log`, `evidence/API-02-graphql-rerun.log`, `evidence/API-06-projects-folder-gated.log` | `✓ API-011: part of: set at create, omitted keeps, null clears, an ID replaces; ...` | Run 1 failed on my own test step (a parent depending on its part while the part depends on the parent is a dependency loop, correctly refused: `This Task cannot depend on parts-3 ...`); the step now sets one direction at a time. Proves: nullable `String` on the type and both inputs; omitted (variable and inline literal) keeps; `null` (variable and literal) clears; an ID replaces and bumps `updatedAt`; re-saving the same parent succeeds; five refusal kinds with exact messages and a byte-identical Projects folder; rejected creates spend no key; concurrent X⇄Y: exactly one succeeds; deleting a parent keeps the part (`updatedAt` kept, parent and the dependency on it dropped); written key set includes `partOfTaskId`; a step-1 `task.json` reads `partOfTaskId: null`, is not rewritten by another Task's save, and its own save writes `"partOfTaskId": null`. |
| API-03 | AC-003, 004, 006, 014, 015, 018 (tool level) | Real Studio HTTP + scoped MCP host + native tools | `vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts` (POF-API-001); final run in API-06 | ENV-1 | Pass | `evidence/API-01-04-ungated-run1.log`, `evidence/API-06-projects-folder-gated.log` | `✓ POF-API-001: part_of by key / any case / long ID, "" clears, omitted keeps; ...` | Proves: schemas (`part_of` optional string, descriptions); `part_of` by key in upper case, by long ID, trimmed mixed case; results name the parent by key; `""` clears, omitted keeps, `part_of`-only patch is a change; refusals (self, unknown, other Project, parent is a part, has parts) = `TASK_PARENT_INVALID`, MCP equals native, nothing written; `create_task part_of=""` / `"  "` and non-string `part_of` = `PROJECT_TOOL_ARGUMENT_INVALID`; `parts` numeric order (`-2, -3, -10`); a part's DONE leaves its parent; parent CANCELLED → `closedParts: ["parts-tools-3","parts-tools-10"]`, the IN_PROGRESS part's open run entry closed, DONE / CANCELLED parts' files byte-identical; same-status repeat and reopen → no `closedParts`; DONE on the reopened parent closes only the new open part; DONE→CANCELLED with nothing open closes nothing; a part created under / attached to a closed parent stays TODO; reader reconstruction; parent delete. |
| API-04 | AC-015 (search) | GraphQL + MCP `search_project_tasks` (fake embedding model) | `vitest run tests/e2e/projects/project-task-search.e2e.test.ts` (POF-SEARCH-001); final run in API-06 | ENV-1 | Pass | `evidence/API-06-projects-folder-gated.log` | `✓ POF-SEARCH-001: search_project_tasks shows partOf and parts by key, parts in numeric key order, no long Task ID` | `search-parts-1` → `parts: ["search-parts-2","search-parts-11"]`; parts → `partOf: "search-parts-1"`. |
| API-05 | AC-018 (CANCELLED and DONE, really running task agents), AC-008 (feed: create, re-parent, cascade, delete cleanup), AC-007 live, AC-006, AC-003 / AC-014 (Temp tasks) | Real Studio HTTP / WS, Manager's scoped MCP session, live delegated workers (scripted AGY processes), `/ws/projects` | New gated `tests/e2e/projects/project-task-parts-live.e2e.test.ts` (POF-LIVE-001..003), alone and again in API-06 | ENV-2 | Pass | `evidence/API-05-live-run.log`, `evidence/API-05-project-task-parts-live.json`, `evidence/API-06-project-task-parts-live.json` | `Tests  3 passed (3)`; JSON `cancel.cancelled.task.closedParts: ["parts-live-…-2","parts-live-…-3"]`, `cancel.fenced.code: "TASK_AGENT_RESOURCE_CLOSED"`, `done.done.task.closedParts`, `temp.onTemp.error.code: "TASK_PARENT_INVALID"` | Asserts inside the test: live `task_executions_closed` naming the part's worker; its `agent_run_resources.json` entry closed; its AGY process gone (`lsof` cwd); Done / Cancelled parts' files byte-identical; feed `task_upserted` CANCELLED / DONE for parent and open parts with `partOfTaskId`, none for the untouched parts; reopen → no part frame; re-parent frame; delete → `task_removed` + parts republished with `partOfTaskId: null` and the same `updatedAt`; Temp task: `part_of` on it and naming it are refused with nothing written; every frame passes the strict `ProjectChangeMessageSchema`. |
| API-06 | Preserved behavior (closure, assignment, reactivation, feed, delegation, migrations) | Whole `tests/e2e/projects` + `tests/e2e/app-data-migrations`, gated | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects tests/e2e/app-data-migrations --no-watch` | ENV-2 | Pass | `evidence/API-06-projects-folder-gated.log` (+ `.full.log.gz`) | `Test Files  29 passed (29)`, `Tests  118 passed \| 4 skipped (122)`, `exit=0` | The 4 skips are the suites' own optional gates (live Claude and similar) in `task-existing-copy-assignment` (2), `task-reactivation-root-visibility` (1), `delegated-team-lazy-member-activation` (1); not part-of behavior. |
| API-07 | Preserved Projects UI journeys | Existing browser probes on probe-owned stacks | `pnpm -C autobyteus-web test:e2e:projects --skip-server-build --output-dir=<fresh>`; `node autobyteus-web/tests/e2e/project-manager-ux-probe.mjs --output-dir <fresh>` (full, then `--cases PMU-002,PMU-021` reruns) | ENV-3 | Pass | `evidence/API-07-projects-probe/result.json`, `run.log`; `evidence/API-07-pmu-probe/runs-summary.json`, `PMU-002-failure-before-fix.png` | Projects probe `"result":"Pass"`, 17 × `Pass` incl. `PT-E2E-017` (dependencies); PMU `full-run-2 (after fix)`: 25 × `Pass` | First PMU run: 23/25. PMU-002 `live started root is an openable button` (`openable: "false"`, `tag: "DIV"`, state idle) and PMU-021 `center view and tree selection unchanged` (center diff `Running` → `Idle`). Cause: the probe asserted transient states: `openable` needs the hosting run listed in the left panel (`taskRootPresentation.ts` `hostListed`), which loads on its own; and the "settled" center read could still show the Manager's `Running` header. `ProjectTaskWorkers.vue` and the center view are untouched by this ticket. Before the fix, PMU-002 failed 1 of 2 reruns; after it, 3/3 reruns and the full run passed. Fix committed separately as a baseline fix. |
| API-08 | AC-018 (boards update live), AC-008 (web), AC-009, AC-010 (incl. tab), AC-011 | Browser: Nuxt dev + `dist/app.js` with scripted AGY + headless Chrome | `node tickets/in-progress/task-part-of/evidence/API-08-probe/parts-live-probe.mjs --output-dir <fresh>` | ENV-3 | Pass | `evidence/API-08-probe/README.md`, `run1/evidence.json`, `run1/API-08-*-before.png`, `run1/API-08-*-after.png` | `"result": "Pass"`; `before.parentSummary: "1 of 3 done · 1 cancelled"` → `after.parentSummary: "1 of 1 done · 3 cancelled"`; `after.lanes` P / A / B `project-task-column-CANCELLED`, C `…-DONE`, plain `…-TODO`; `after.tabStatus: "Cancelled"`; `after.tabPartOfRow: "autobyteus-1 Cancelled Cross-node collaboration"`; `boardGraphqlRequestsDuringCascade: 0`; `browserErrors: []` | Temporary probe (ticket-owned): a durable package probe for one ticket's journey is out of proportion; the durable server-side proof is API-05. The Manager's own `update_task` cancels the parent while board, parent page, part page and the tab are open; nothing is reloaded; the worker process stops; tab rows open in the tab, no New part there. |
| API-09 | AC-017 (board, Task pages, New part, editor, delete note, zh-CN, long keys, Cancelled lane, narrow board), AC-016 (instance with test data), AC-009–012, 019, 020 | Isolated Electron instance of this worktree's build | `pnpm -C autobyteus-web build:electron:mac`; `pnpm --silent isolated-app start --from-worktree --data-root <own>`; `seed-desktop.mjs phase1`; `isolated-app stop`; `seed-desktop.mjs phase2`; `start` again; `desktop-journey.mjs <controlPort> <graphqlUrl> <seed.json> <outDir>`; `isolated-app stop`; `isolated-app list` | ENV-4 | Pass | `evidence/API-09-desktop/README.md`, `final/result.json`, `final/J*.png`, `final/step1-unchanged.txt`, `final/start-*.json`, `final/stop-*.json`, `final/isolated-app-list-after.json` | `final/result.json`: 11 × `"Pass"`, `"errors": []`; J1 `"p": "2 of 4 done"`, `"pTitle": "2 of 4 done · 1 cancelled"`, `"docsTitle": "Part of autobyteus-1: Cross-node collaboration (In Progress)"`; J6 `"note": "Its part stays as a separate Task."`, `"many": "Its 6 parts stay as separate Tasks."`; J8 `"summary": "5 个中已完成 2 个 · 1 个已取消"`, `"newPart": "新建子任务"`, `"deleteNote": "它的 6 个子任务将保留为独立任务。"`; J9 screenshot `enterprise-customer-onboarding-expe…-1`; `step1-unchanged.txt` "bytes unchanged" | J7 (tab) returns `reachable: false` in the instance (see Round deviations); proven in API-08. Earlier runs 1–4 (`earlier-runs/`) failed only on the journey script's own navigation, fixed; the final run is on fresh data. The instance was stopped (`wasRunning: true`, both ports released), `list` shows no instance, the data root was removed. |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-02, API-03, API-09 (J4, J5), REUSE-IMP-02/04 | Proven | — |
| AC-002 | Yes | API-02, API-03, API-09 (J5), API-05 (re-parent live) | Proven | — |
| AC-003 | Yes | API-02, API-03, API-05 (Temp tasks) | Proven | — |
| AC-004 | Yes | API-02 (incl. concurrent), API-03, REUSE-IMP-02 | Proven | — |
| AC-005 | No | API-02, API-09 (J1: "Blocked by" badge beside "Part of") | Proven | — |
| AC-006 | Yes | API-03, API-05 | Proven | — |
| AC-007 | Yes | API-02, API-03, API-05 (live), API-09 (J6) | Proven | — |
| AC-008 | Yes | API-05 (feed frames), API-08 (pages update with no GraphQL request), REUSE-IMP-04 | Proven | — |
| AC-009 | Yes | API-08, API-09 (J1, J2) | Proven | — |
| AC-010 | Yes | API-08 (page and tab), API-09 (J3) | Proven | — |
| AC-011 | Yes | API-08 (lanes), API-09 (J1, Cancelled lane) | Proven | — |
| AC-012 | Yes | API-09 (J5: search, greyed parts, not itself, clear, has-parts), REUSE-IMP-04 | Proven | — |
| AC-013 | No | REUSE-IMP-04, REUSE-IMP-05, API-09 (J8 rendered zh-CN) | Proven | — |
| AC-014 | Yes | API-03, API-05 | Proven | — |
| AC-015 | Yes | API-03 (list), API-04 (search), API-05 | Proven | — |
| AC-016 | Yes | API-02, API-09 (J11), API-01 (old calls unchanged), REUSE-IMP-02 | Proven | — |
| AC-017 | Yes | API-09 (J1–J6, J8–J11), API-08 (tab, web-equivalent renderer) | Proven | — |
| AC-018 | Yes | API-05 (CANCELLED and DONE with really running task agents), API-03, API-08 (live boards), REUSE-IMP-02 | Proven | — |
| AC-019 | No | API-09 (J4), REUSE-IMP-04 | Proven | — |
| AC-020 | No | API-09 (J2 hint, J6 notes), API-08 (no hint on a Cancelled parent) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 97% | API-01–API-06; then API-08, API-09 | Repository round left the live UI (AC-017, live boards) unproven; after broader validation, only the partial-failure path of the cascade remains unit-only (accepted) | — |
| Changed-boundary execution directness | 92% | 97% | Real HTTP / MCP / WS / store (API-02–05); real renderer (API-08), real desktop app (API-09) | The tab was not exercised inside Electron | A desktop instance with a runtime the user signs in to |
| Cross-boundary integration realism and mock gap | 90% | 96% | Scripted AGY runs the real runtime process and real tools (API-05, API-08); only the embedding model in API-04 is a stand-in | No provider inference (irrelevant to the cascade) | — |
| Environment, configuration, identity, and fixture fidelity | 92% | 96% | Clean env, test-owned roots; desktop data created through the instance's GraphQL and the product's `update_task` code | Statuses in the desktop package were written with the instance stopped (no GraphQL status mutation exists) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | 95% | Refusals, concurrency, reopen / repeat / attach-to-closed, delete cleanup, Temp tasks, process stop (API-02, 03, 05) | `TASK_PART_CLOSE_FAILED` path (damaged run data) unit-only, accepted in ARCH-REV-001 | — |
| User-surface, browser, and desktop-shell confidence | 70% | 95% | API-08, API-09, API-07 | Tab in Electron (renderer-only, no shell code changed) | As above |
| Durable regression coverage quality and relevance | 95% | 95% | 4 new durable cases + updated pins; 2 probe races fixed | Browser journeys stay temporary (ticket-owned probe) | A package probe if Projects UI churns again |

- Overall post-repository confidence: 89% (average 90, 92, 90, 92, 93, 70, 95 = 88.9)
- Overall final confidence: 96% (average 97, 97, 96, 96, 95, 95, 95 = 95.9)
- Calculation method: simple average of the seven categories.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: a part that fails to close during a cascade is only logged (accepted); the tab's Electron rendering is inferred from the same renderer in the browser.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (API-08) and `Project Desktop Validation` (API-09); plus `Lifecycle` through the gated live server suite (API-05).
- Confidence gap it addresses: post-repository user-surface confidence was 70% (no tab, zh-CN, long keys, Cancelled lane or live cascade rendered; AC-017 needs the desktop app). Expected gain: direct proof of AC-017 and of AC-018's "boards update live".
- Browser validation needed: yes, for the live cascade with a running agent, which the desktop instance cannot host without the user's provider.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: worktree Electron build, isolated instance with an own data root, test data package (GraphQL, then the product's tool code while stopped), CDP-driven journeys J1–J11; plus the browser probe for the live-agent journey.
- Web-equivalent behavior: API-08, API-09 (all changed behavior is renderer / client–server). Shell-specific behavior: none changed.
- Effect on any already-running desktop application: `None` (own ports, own process group; only the instance's control port was attached; the user's app and `~/.autobyteus` untouched).
- Behavior not directly proven and its consequence: the tab inside Electron (proven in the browser on the same renderer); no confidence category below 95%.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: synthesized step-1 `task.json` (every current key except `partOfTaskId`) in a test-owned root (API-02) and in the desktop data package (API-09 J11).
- Approved transition followed without an unnecessary migration: `Yes`
- Cases: API-02 (read as no parent; not rewritten by another Task's save; own save writes `"partOfTaskId": null`), API-09 J11 (renders with no relation; bytes unchanged after all journeys).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/project-task-parts-live.e2e.test.ts` (POF-LIVE-001..003, gated) | Added | API-05 | — |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` (POF-API-001; `partOf: null` in 19 exact acks; `part_of` in the CTX-E2E-001 schema key lists) | Added + Updated | API-03, API-01 | — |
| `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` (API-011; `partOfTaskId` in the API-007 input field list) | Added + Updated | API-02, API-01 | — |
| `autobyteus-server-ts/tests/e2e/projects/project-task-search.e2e.test.ts` (POF-SEARCH-001; `partOf`, `parts` in the exact result) | Added + Updated | API-04, API-01 | — |
| `autobyteus-server-ts/tests/e2e/projects/project-change-feed.e2e.test.ts` (`partOfTaskId` in the snapshot query) | Updated | API-01, API-06 | — |
| `autobyteus-server-ts/tests/e2e/projects/project-task-context-files-delegation.e2e.test.ts` (`partOf: null` in 3 acks) | Updated | API-01, API-06 | — |
| `autobyteus-server-ts/tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` (`partOf: null` in 3 acks) | Updated | API-01, API-06 | — |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` (PMU-002 waits for the openable root), `autobyteus-web/tests/e2e/project-manager-ux-task-locator-cases.mjs` (PMU-021 settled center excludes `Running`) | Updated (baseline fix, own commit) | API-07 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A (none removed)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Agent runtime CLI (AGY) | Repository's scripted CLI `tests/fixtures/agy-failure-cli.mjs` (real runtime process, real tool calls) | No provider spend; TESTING.md's documented no-model runtime | No model inference (not part of this behavior) |
| Embedding model (API-04) | `tests/helpers/fake-embedding-model.ts` | The suite's own design | Meaning-match quality not in scope |
| Run managers in `projects-graphql.e2e` | The suite's existing "no active runs" emulation | Suite design (in-process schema) | None for part-of |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Server E2E data roots | Yes | Suites' `afterAll` | Removed (`dataRemoved: true` in the live JSON) |
| Temporary copy of the HEAD context-files suite (`zz-head-context-files.e2e.test.ts`) | Yes | Deleted right after the run | Removed |
| API-08 probe stack (backend, Nuxt, Chrome, data root) | Yes | Probe `finally` | `frontend`/`backend` `terminated`, `dataRootRemoved: true`, `liveAgyOfThisRun: 0` |
| API-07 probe stacks | Yes | Probes' own cleanup | `tempRootRemoved: true` / `dataRootRemoved: true` |
| Isolated instances `iso-63047-873a`, `iso-63156-f2ef`, `iso-64577-8e95`, `iso-64678-9a42` and `/tmp/pof-e2e/desktop-root` | Yes | `isolated-app stop` each; data root deleted | `list` → `{"instances":[]}`; root removed |
| `autobyteus-web/electron-dist/`, rebuilt `autobyteus-server-ts/dist/` | Yes (build outputs) | Left in place (untracked build outputs, not staged) | — |
| `/tmp/pof-e2e` scratch logs and homes | Yes | Kept until delivery; evidence copied into the ticket | — |

## Preliminary Classification (On `Fail`)

N/A — Pass.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: see the handoff (proportional test-code review by the code reviewer).
- Notes: two findings outside this ticket's behavior were fixed as a baseline fix in the existing PMU probe (API-07). Not part of this ticket's scope and left as follow-up candidates already listed by implementation: `drainRuntimeReleases()` test-only seam; stale `generated/graphql.ts`; `TaskDependencyPicker` initial active option.
