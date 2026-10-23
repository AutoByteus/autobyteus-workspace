# API/E2E Execution Coverage Report — task-comments

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `tickets/in-progress/task-comments/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/task-comments/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/task-comments/api-e2e-test-progress.md`
- Round and trigger: round 1; implementation review Pass (CRR-001) from `/software_engineering_team/code_reviewer`.
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - The tab was reachable in the desktop instance after all (the Chat page's "Show tools" opens the right panel without a run), so AC-013's tab journey, including adding from the tab, ran in the real desktop app (J5) as well as in the browser (API-08).
  - Two failures outside this ticket were found and recorded as follow-ups instead of fixed here: FU-003 (the gated `delegated-launch-config-defaults` suite is stale since autobyteus-197) and FU-004 (the file explorer logs its own close of a CONNECTING socket as an error, which made PMU-021 fail once). Causes are in Cases API-00 and API-07.
- Test code commit: `e9e4fba0b4` (the test files run are the ones committed).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments/tickets/in-progress/task-comments/evidence/` (files `API-*`); the handoff message gives the commit.

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | Code `e014c349b8` (HEAD `1b83434652`, ticket docs only after it) + this round's test edits | macOS darwin arm64 | Node, corepack pnpm 10.28.2; vitest in-process Studio server | `env -i PATH HOME=<resolved temp> TMPDIR`; test-owned temp roots |
| ENV-2 | Same | macOS | ENV-1 + `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (real runtime processes, no provider) | `AGY_FAKE_CASE=linked_skills` |
| ENV-3 | Code `e014c349b8`; `autobyteus-server-ts/dist` built from it | macOS | Probe-owned stack: `dist/app.js` + scripted AGY + `nuxi dev` + headless Chrome | Free ports, own data root, en-US, 1440 px |
| ENV-4 | Code `e014c349b8`; `pnpm -C autobyteus-web build:electron:mac` → `electron-dist/mac-arm64/AutoByteus.app` (1.5.8-beta.4 worktree build) | macOS | Isolated desktop instance (`isolated-app start --from-worktree --data-root /tmp/tc-e2e/desktop-root`), CDP attach to its own control port | 1440×900 (760 for J7); en and zh-CN through the Language setting |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | — | Whole `tests/e2e/projects` + `app-data-migrations`, gated, before any test edit | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects tests/e2e/app-data-migrations --no-watch` | ENV-2 | Pass (baseline recorded) | `evidence/API-00-baseline-folder.log` (+ `.full.log.gz`), `evidence/API-00-dlc-receipt-excerpt.json` | `Tests  9 failed \| 126 passed \| 4 skipped (139)`; failures: `CTX-E2E-001` (`"add_comment"` in the schema keys), `API-007` (`"addProjectTaskComment"`), `API-011` (`"comments"` in the task.json key set), `project-change-feed` ×4 (feed has `"comments":[]`, snapshot query lacked it), `delegated-launch-config-defaults` ×2 | 7 failures are additive pins this change approves. The two `delegated-launch-config-defaults` failures are not caused by this change: commit `65ae647bc9` (autobyteus-197) makes Team-copy members record their complete launch, while the suite expects `launch: null` (receipt: `lead` has `launchConfiguration {… "gemini-3.8-flash-low" …}`) and its DLC-008 restores a pre-change tree that the own-file migration replaced. Established by `Read` (that commit) and `Measured` (the receipt). Follow-up FU-003. |
| REUSE-IMP-01..05 | AC-001, 002, 005, 008–012 (unit), AC-012 (guards) | typecheck, server unit / integration, web unit, guards | IMP-01..IMP-05 | — | Pass | — | — | `git diff --name-only e014c349b8 1b83434652` outside `tickets/` is empty. AC-002 (concurrent comments) stays unit-proven (QR-001). |
| API-01 | Additive pins | Server E2E | Edits in `project-task-boundaries`, `projects-graphql` (2), `project-change-feed`; rerun in API-07 | ENV-1, ENV-2 | Pass | `evidence/API-07-projects-folder-gated.log` | `✓ tests/e2e/projects/project-change-feed.e2e.test.ts (7 tests)`, `✓ … project-task-boundaries.e2e.test.ts (16 tests)`, `✓ … projects-graphql.e2e.test.ts (13 tests)` | Old tool / GraphQL shapes are unchanged except the approved additions (empty fields absent). |
| API-02 | AC-001, AC-005 (list), AC-008, REQ-010 | Real Studio HTTP + scoped MCP + native tools | `vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts` (CMT-API-001); final run in API-07 | ENV-1 | Pass | `evidence/API-01-05-ungated.log`, `evidence/API-07-projects-folder-gated.log` | `✓ CMT-API-001: update_task add_comment by key / any case / long ID appends numbered comments, never the description; DONE + comment is one write; …` | Proves: tools/list unchanged except `add_comment` on `update_task` (string, optional; not on `create_task`); key in upper case, long ID, mixed case natively → comments 1, 2, 3 (trimmed text, server times in order); result exactly `{projectId, taskId, status, dependsOn, partOf}`; description unchanged, `updatedAt` = the last comment's time; DONE + comment → both saved and the open run closed; refusals with a byte-identical Projects folder and B's open run still open: `""` / whitespace (`TASK_COMMENT_INVALID`, "Comment text is required."), `7` / `null` / array / object (`PROJECT_TOOL_ARGUMENT_INVALID`), unknown key (`TASK_NOT_FOUND`), `create_task add_comment` (argument error); `add_comment` alone is a change; `list_project_tasks` gives texts oldest first, no field when none, MCP equals native, also after reader reconstruction. |
| API-03 | AC-001 (app side), AC-003 (server), AC-011 | GraphQL resolver → service → real store | `vitest run tests/e2e/projects/projects-graphql.e2e.test.ts` (API-012); final run in API-07 | ENV-1 | Pass | `evidence/API-01-05-ungated.log`, `evidence/API-07-projects-folder-gated.log` | `Tests  33 passed (33)` (ungated run); folder run `✓ … projects-graphql.e2e.test.ts (13 tests)` | Proves: `ProjectTaskComment {id: Int!, createdAt: String!, text: String!}`, `ProjectTask.comments: [ProjectTaskComment!]!`, input `{projectId, taskId, text}`, update input unchanged; two adds → ids 1, 2 with trimmed text, description unchanged, `updatedAt` bumped; list carries the same thread; blank (3 forms) → `TASK_COMMENT_INVALID`, unknown / other Project's Task → `TASK_NOT_FOUND`, unknown Project → `PROJECT_NOT_FOUND`, all with a byte-identical folder; a description edit keeps the thread; a `task.json` without `comments` reads as `[]`, is not rewritten by another Task's write, and its own first comment writes the file with `comments` and nothing else changed. |
| API-04 | AC-005 (search), AC-016 (server rule) | GraphQL `searchProjectTasks` (the board's query) + MCP `search_project_tasks` | `vitest run tests/e2e/projects/project-task-search.e2e.test.ts` (CMT-SEARCH-001); final run in API-07 | ENV-1 | Pass | `evidence/API-01-05-ungated.log`, `evidence/API-07-projects-folder-gated.log` | `✓ tests/e2e/projects/project-task-search.e2e.test.ts (4 tests)` | `quokka` / `QUOKKA mascot` → exact matches for the Task whose comment has it and the Task whose description has it (case-insensitive, before meaning search is ready); a phrase only in a second comment → that Task; the tool's exact result has `commentCount: 2`; the description-match Task has no `commentCount`; no comment text in results. |
| API-05 | AC-009 | Real tools over MCP; a part whose `agent_run_resources.json` is unparsable (DESIGN.md rule 7) | `vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts` (CMT-API-002); final run in API-07 | ENV-1 | Pass | `evidence/API-01-05-ungated.log`, `evidence/API-07-projects-folder-gated.log` | `✓ … project-task-boundaries.e2e.test.ts (16 tests)` (CMT-API-002 in it) | Parent CANCELLED → exactly `{…, closedParts: [ok, last], partsNotClosed: [damaged]}`; the damaged part stays TODO and its file is untouched; a second parent whose parts all close → exactly `{…, closedParts: [p1, p2]}` (no `partsNotClosed`). Real failure cause, not a mocked store. |
| API-06 | AC-010 (new and existing task agent), AC-001 (one write; Temp task), REQ-007 wire | Real Studio HTTP / WS, Manager's scoped MCP, live task agents (scripted AGY), `/ws/projects` | new gated `tests/e2e/projects/project-task-comments-live.e2e.test.ts` (CMT-LIVE-001..004), alone and in API-07 | ENV-2 | Pass | `evidence/API-06-live-run.log`, `evidence/API-06-project-task-comments-live.json`, `evidence/API-07-project-task-comments-live.json` | `Tests  4 passed (4)`; JSON `newAgent.workA` ends `Description:\nWrite the release notes\n\nComments:\n- Dispatched with this direction.\n- User decided: ship on Friday.`; `newAgent.workB` has no `Comments:`; `existingAgent.workC` = `New Task assigned to you: … Comments:\n- Use the beta channel.\n- Keep it under 200 words.`; `existingAgent.doneViews` `[{TODO,2},{DONE,3}]`; `temp.refused.error.code` `TASK_COMMENT_INVALID` | Also asserted: the feed's `comments` equal the GraphQL thread; no IDs or times in the work text; no published view has DONE without the comment or the comment without DONE (one write); Temp task: `add_comment` and DONE + `add_comment` refused, its `task.json` byte-identical and not DONE; every frame passes the strict `ProjectChangeMessageSchema` and every Project Task view has `comments`. |
| API-07 | Preserved behavior | Whole projects folder gated after edits; browser probes | As API-00; `pnpm -C autobyteus-web test:e2e:projects --skip-server-build --output-dir=<fresh>`; `node autobyteus-web/tests/e2e/project-manager-ux-probe.mjs --output-dir <fresh>` (then `--cases PMU-021` ×3) | ENV-2, ENV-3 | Pass (in-scope) | `evidence/API-07-projects-folder-gated.log` (+ `.full.log.gz`), `evidence/API-07-projects-probe/result.json`, `run.log`, `evidence/API-07-pmu-probe/runs-summary.json`, `ws-close-while-connecting-repro.mjs` | Folder: `Test Files  1 failed \| 34 passed (35)`, `Tests  2 failed \| 141 passed \| 4 skipped (147)`, the 2 failures = `delegated-launch-config-defaults` (FU-003, identical to API-00); Projects probe `"result":"Pass"`, 17 × Pass; PMU full run 24 Pass, PMU-021 `"browser errors"` `["[FileExplorerStreaming] WebSocket error: Event"]`, reruns 1–3 PMU-021 `Pass` | PMU-021 cause: leaving the Files tab releases its last consumer and `FileExplorerStreamingService.disconnect()` closes a socket that may still be CONNECTING; Chrome then fires `error`, which the service logs with `console.error`. `Measured` with the reproduction against a real WebSocket server: `closedWhileConnecting: ["error","close 1006"]`, `closedAfterOpen: ["open","close 1000"]`. File explorer code is untouched by this ticket. Follow-up FU-004. The 4 skips are the suites' own optional gates. |
| API-08 | AC-003, AC-004 (page and tab), AC-016, REQ-007 live, REQ-006 | Browser: Nuxt dev + `dist/app.js` with scripted AGY + headless Chrome | `node tickets/in-progress/task-comments/evidence/API-08-probe/comments-live-probe.mjs --output-dir <fresh>` | ENV-3 | Pass | `evidence/API-08-probe/README.md`, `run1/evidence.json`, `run1/API-08-*.png` | `"result": "Pass"`; `before.page` texts `Dispatched with this direction: keep it short.`, `User decided: mention the quokka mascot.\nSecond line of the same comment.`; `before.emptyState: "No comments yet."`; `before.order: ["task-comments","task-parts","task-dependencies"]`; `after.page` ids `task-comment-1`..`5`; `after.blankDisabled: true`, `tabBoxCleared: true`; `boardSearch.searched` 1 of 3, `restored: 3`; `browserErrors: []` | Temporary probe (ticket-owned): one ticket's journey; the durable server-side proof is API-02..06. Tab add arrives live in the Task page, page add in the tab, the Manager's comment in both; the stored thread has ids 1–5 and the description unchanged. |
| API-09 | AC-013, AC-011, AC-012 (rendered), AC-003, AC-004, AC-016 | Isolated Electron instance of this worktree's build | `pnpm -C autobyteus-web build:electron:mac`; `isolated-app start --from-worktree --data-root <own>`; `seed-desktop.mjs phase1`; `stop`; `seed-desktop.mjs phase2`; `start`; `desktop-journey.mjs <controlPort> <graphqlUrl> <seed.json> <outDir>`; `stop`; `list` | ENV-4 | Pass | `evidence/API-09-desktop/README.md`, `final/result.json`, `final/J*.png`, `final/old-unchanged.txt`, `final/start-*.json`, `final/stop-*.json`, `final/isolated-app-list-after.json` | `final/result.json`: 8 × `"Pass"`, `"errors": []`; J1 four texts oldest first (two app, two agent) with `#n ·` and ISO `datetime`; J2 `#5` stored, description unchanged; J3 `"No comments yet."`; J4 search `quokka` → only `autobyteus-1`; J5 tab `before: 5, after: 6`, `"Added from the tab in the desktop app."` stored; J6 `"title": "评论"`, `"placeholder": "添加评论"`, `"add": "添加评论"`, `"none": "暂无评论。"`; J7 no overflow at 760 px; J8 `"No comments yet."`, `comments: []`; `old-unchanged.txt` "bytes unchanged" | Earlier runs failed only on the journey script (Settings location; finding the tab without a run), fixed; final run on fresh data. The instance was stopped (`wasRunning: true`, ports released) and its root removed; `list` shows only two stopped records of another worktree, not touched. |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-02, API-03, API-06, API-09 (J1 agent comments), REUSE-IMP-02 | Proven | — |
| AC-002 | No | REUSE-IMP-02 (QR-001 unit) | Proven | — |
| AC-003 | Yes | API-03, API-08, API-09 (J2, J5) | Proven | — |
| AC-004 | Yes | API-08 (page and tab), API-09 (J1, J3, J5) | Proven | — |
| AC-005 | Yes | API-02 (list), API-04 (search) | Proven | — |
| AC-006 | — | Withdrawn (SR-002) | N/A | — |
| AC-008 | No | API-02 (no new tool, only `update_task` gains `add_comment`), REUSE-IMP-02 | Proven | — |
| AC-009 | Yes | API-05 (real damaged run data), REUSE-IMP-02 | Proven | — |
| AC-010 | Yes | API-06 (new and existing task agent; no block without comments) | Proven | — |
| AC-011 | Yes | API-03, API-09 (J8, file bytes unchanged) | Proven | — |
| AC-012 | No | REUSE-IMP-04, REUSE-IMP-05, API-09 (J6 rendered zh-CN) | Proven | — |
| AC-013 | Yes | API-09 (J1–J8, incl. the tab) | Proven | — |
| AC-016 | Yes | API-04 (server rule), API-08, API-09 (J4) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 97% | API-02..07; then API-08, API-09 | Before broader validation: page / tab / zh-CN / desktop unrendered. After: AC-002 concurrency is unit-only (QR-001) | — |
| Changed-boundary execution directness | 95% | 97% | Real MCP host, GraphQL, store, feed, live delegation (API-02..06); real renderer and desktop app (API-08, API-09) | — | — |
| Cross-boundary integration realism and mock gap | 93% | 96% | Scripted AGY runs real runtime processes and tools; damaged run data is a real unreadable file; only API-04's embedding model is a stand-in | No provider inference (irrelevant) | — |
| Environment, configuration, identity, and fixture fidelity | 92% | 96% | Clean env, test-owned roots; desktop data through the instance's GraphQL and the product's `update_task` | Desktop agent comments written with the instance stopped (no agent runtime in the instance) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 96% | Refusals with byte-identical folders, combined-call atomicity, Temp tasks, damaged run data, existing data | — | — |
| User-surface, browser, and desktop-shell confidence | 70% | 96% | API-08, API-09, API-07 probes | — | — |
| Durable regression coverage quality and relevance | 95% | 95% | 5 new durable cases + 1 gated live suite + additive pin updates | Browser / desktop journeys stay ticket-owned scripts | — |

- Overall post-repository confidence: 90% (90, 95, 93, 92, 95, 70, 95 → 90.0)
- Overall final confidence: 96% (97, 97, 96, 96, 96, 96, 95 → 96.1)
- Calculation method: simple average of the seven categories.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: none material for this ticket. FU-003 (a stale gated suite of autobyteus-197) and FU-004 (file-explorer error logging) are outside it.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (API-08), `Project Desktop Validation` (API-09), `Lifecycle` (API-06 live delegation).
- Confidence gap it addresses: post-repository user-surface confidence 70% (tab and zh-CN never rendered; AC-013 needs the desktop app). Expected gain: direct proof of AC-003, AC-004, AC-013, AC-016 in the real renderer and app.
- Browser validation needed: yes, for live updates across open views with a running Manager.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: worktree Electron build; isolated instance on an own data root; data package (GraphQL, then the product's tool code while stopped); CDP-driven journeys J1–J8; the browser probe for live updates with a running agent.
- Web-equivalent behavior: API-08, API-09. Shell-specific behavior: none changed.
- Effect on any already-running desktop application: `None` (own ports, process group and data root; only the instance's control port attached).
- Behavior not directly proven: none material.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: a synthesized `task.json` with every current key except `comments`, in test-owned roots (API-03) and in the desktop data package (API-09 J8).
- Approved transition followed without an unnecessary migration: `Yes`
- Cases: API-03 (reads as none; not rewritten by other writes; own save writes `comments`), API-09 J8 (renders "No comments yet."; bytes unchanged).
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
| `autobyteus-server-ts/tests/e2e/projects/project-task-comments-live.e2e.test.ts` (CMT-LIVE-001..004, gated) | Added | API-06 | — |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` (CMT-API-001, CMT-API-002; `add_comment` in the CTX-E2E-001 key list) | Added + Updated | API-02, API-05, API-01 | — |
| `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` (API-012; `addProjectTaskComment` in API-007's mutation list; `comments` in API-011's key set) | Added + Updated | API-03, API-01 | — |
| `autobyteus-server-ts/tests/e2e/projects/project-task-search.e2e.test.ts` (CMT-SEARCH-001) | Added | API-04 | — |
| `autobyteus-server-ts/tests/e2e/projects/project-change-feed.e2e.test.ts` (`comments` in the snapshot query) | Updated | API-01 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A (none removed)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Agent runtime CLI (AGY) | Scripted CLI `tests/fixtures/agy-failure-cli.mjs` (real runtime process, real tool calls) | No provider spend; TESTING.md's documented no-model runtime | No inference (not part of this behavior) |
| Embedding model (API-04) | `tests/helpers/fake-embedding-model.ts` | The suite's design | Meaning search is unchanged by this ticket |
| Run managers in `projects-graphql.e2e` | The suite's existing "no active runs" emulation | Suite design | None for comments |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Server E2E data roots | Yes | Suites' `afterAll` | Removed (`dataRemoved: true` in the live JSON) |
| API-08 probe stack | Yes | Probe `finally` | Frontend / backend terminated, `dataRootRemoved: true`, `liveAgyOfThisRun: 0` |
| API-07 probe stacks | Yes | Probes' own cleanup | `tempRootRemoved: true` / `dataRootRemoved: true` |
| Isolated instances `iso-64492-81b6`, `iso-64637-1568`, `iso-65430-1a20` (+ the instance of the first desktop package) and `/tmp/tc-e2e/desktop-root` | Yes | `isolated-app stop` each; root deleted | None of mine in `list`; root removed |
| `/tmp/tc-e2e/ws-repro` (FU-004 reproduction), `/tmp/tc-e2e/desktop/inspect*.mjs` (selector inspection, read-only) | Yes | Not committed except the reproduction copy in the evidence | — |
| `autobyteus-web/electron-dist/`, rebuilt `autobyteus-server-ts/dist/` | Yes (build outputs) | Left in place, not staged | — |

## Preliminary Classification (On `Fail`)

N/A — Pass.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: proportional test-code review (code reviewer).
- Notes: follow-ups added to `follow-ups.md`: FU-003 (stale gated `delegated-launch-config-defaults` suite, autobyteus-197) and FU-004 (file explorer logs its own CONNECTING close as an error).
