# API/E2E Execution Coverage Report — agent-tool-results-omit-empty (autobyteus-260)

## Round

- Coverage investigation (the plan; it lists the upstream documents): [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md)
- API/E2E revision record and current revision ID: [api-e2e-revision-record.md](api-e2e-revision-record.md), `API-REV-001`
- Test progress log: [api-e2e-test-progress.md](api-e2e-test-progress.md)
- Round and trigger: round 1, code review CRR-001 pass (Large / High)
- Prior round reviewed: `N/A`
- Deviations from the investigation's plan, and why:
  - API-04 (`remove-built-in-project-task-manager-startup`) needed no update: it passed unchanged in the baseline (API-00) and the regression (API-10).
  - API-09: the gated Codex routing case (`codex-standalone-send-message-global-routing`) cannot run on the base or this branch (stale client-manager API, FU-005); its refusal expectation was updated but stays unexecuted. The real external MCP client was proven through the matrix's Codex MCP-client lane and the scripted AGY's MCP SDK client instead.
  - API-11: four probes (`task-closure-tree`, `team-status-live`, `delegated-team-default-collapse`, `delegated-copies-large-hub`) and API-12 (isolated desktop) were not run this round: they render the Workspaces tree with Project-Task workers, which F-002 (API-11c) crashes; they run in the next round after the fix.
  - Out-of-scope failures found and recorded with base evidence: FU-002, FU-003, FU-004 (server E2E), FU-005 (Codex case), FU-006 (probe timing).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tool-results-omit-empty/tickets/in-progress/agent-tool-results-omit-empty/evidence/` (files `API-*`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (after the failures are resolved; this round ends `Fail`)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | source `17d631c704` (branch HEAD `45a0a7ea08`, then `180ad986ae`, both ticket-document-only) + this round's test edits | macOS 26 arm64 | Node 22.21, vitest 4.1.12; server `dist/` built from the worktree 08:05 | `env -i PATH HOME=<resolved temp> TMPDIR`; `RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`; each test owns its temp data root, database and ports |
| ENV-2 | base `fc06a7355d` (scratch worktree `/tmp/api-e2e-260/base-wt`, removed) | same | same toolchain, base `dist/` | same as ENV-1; used only to classify out-of-scope failures |
| ENV-3 | as ENV-1 | same | `codex-cli 0.164.0` (signed in), real `HOME`/`USER`/`LOGNAME` | throwaway `CODEX_HOME` holding only a symlink to the user's `auth.json` and an empty `config.toml` (removed); no model turn |
| ENV-4 | as ENV-1 (web unchanged since `24fee53dc9`) + probe edits | same | probe-owned stacks: `dist/app.js` backend(s), Nuxt dev frontend, headless Chrome (`/Applications/Google Chrome.app`) | each probe's own data root and ports, `--output-dir` fresh; probe cleanup receipts recorded |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | — (discovery) | all server E2E, before any test edit | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs> pnpm -C autobyteus-server-ts exec vitest run tests/e2e --no-watch` | ENV-1 | Pass (ran; 27 files failed as expected) | `API-00-baseline-e2e-failures.txt` | `Test Files  27 failed \| 118 passed \| 50 skipped (195)`; each failure listed with its first line (`Field "title" of required type "String!" was not provided.`, `expected {} to deeply equal { projects: [] }`, …) | Basis for the update list. 23 files failed on the changed shapes; 4 did not (API-00b). |
| API-00b | — | 3 failing files outside this ticket | same command per file, on ENV-1 and on the base | ENV-1, ENV-2 | Pass (classified) | `API-00b-out-of-scope-failures-base-comparison.txt` | `== BASE fc06a7355d: delegated-launch-config-defaults` … `AssertionError: expected [ …(3) ] to deeply equal []`; same for `agy-native-image-multi-artifact-preview`; SUN-E2E-003 cause read in code (`git-upload-pack`) | Same failures on the base → FU-002, FU-003, FU-004; a temporary diagnostic (removed) showed the member launch records. |
| API-R1 | AC-001–AC-007, AC-009, AC-011–AC-015 | unit, integration, typecheck, web unit, guards | Reused: IMP-01, IMP-03, IMP-04, IMP-05, IMP-06, IMP-07 | — | Pass | (implementation handoff Checks Run) | (implementation handoff) | Source unchanged since those runs (`git diff 17d631c704 180ad986ae` touches only `tickets/`); this round changed only E2E files and probes, which those checks do not run. |
| API-01 | AC-001, AC-003, AC-006, AC-007, AC-011, AC-012 | real Studio HTTP GraphQL + MCP `tools/call`, native tools | per file: `/tmp/api-e2e-260/run.sh <name> <file>` (clean env as API-00) for `project-task-boundaries`, `projects-graphql`, `project-change-feed`, `project-task-search`, `project-task-search-model-unavailable`, `embedding-settings`, `project-mutation-node-locality` | ENV-1 | Pass | `API-10-regression-e2e-summary.txt` | `project-task-boundaries.e2e.test.ts: {'passed': 18}` (incl. new TTL-API-001, GET-API-001), `projects-graphql …: {'passed': 13}`, `project-task-search …: {'passed': 4}` | Added: TTL-API-001 (title required/blank/non-string refused with nothing written, 5,000-character two-line title kept whole, `update_task title`, GraphQL blank/missing title), GET-API-001 (key/upper case/long ID equal, other Project and unknown `TASK_NOT_FOUND`, argument checks, read-only, MCP equals native, `contextFiles` path reads the saved file). |
| API-02 | AC-013, AC-015, AC-001 (preserved journeys) | real roots, scripted AGY, feed, delegation | per file as API-01: `project-task-comments-live`, `project-task-parts-live`, `project-task-context-files-delegation`, `ad-hoc-task-delegation`, `hand-started-run-refusal`, `collaboration-prompt-wording`, `task-existing-copy-assignment`, `task-reactivation-root-visibility`, `task-agent-several-tasks`, `task-closure-root-visibility`, `teammate-delivery-task-closure-race`, `delegated-team-lazy-member-activation` | ENV-1 | Pass | `API-10-regression-e2e-summary.txt` | `task-existing-copy-assignment …: {'passed': 7, 'skipped': 2}`, `project-task-context-files-delegation …: {'passed': 1}` | Context-files case now also asserts the Task line before `Description:` and that `get_project_task` paths equal the acks' paths. |
| API-03 | AC-004, QR-002 (preserved: an unkeyable Project hidden, others keep working) | built `dist/app.js` startup: keys-v1 then titles | `/tmp/api-e2e-260/run.sh startup-mig-1 tests/e2e/projects/projects-startup-migration.e2e.test.ts` | ENV-1 | **Fail** (1 of 6) | `API-03-startup-migration-keys-failed-titles-not-run.txt` | `TEMP-DIAG first start (keys FAILED for project_blocked) {"ledger":[{"migrationId":"20261017_project_task_keys_v1","status":"FAILED",…},{"migrationId":"20261025_project_task_titles","status":"NOT_RUN","attempts":0,…}],"mainTasks":[],…"taskKey":"autobyteus-2"}` | **F-001.** While keys-v1 is `FAILED` (one unkeyable Project), the titles migration never runs (runner prerequisite), so the keyed Tasks of every other Project have no title and are not listed until keys-v1 succeeds. The other 5 cases (incl. both entrypoints with titles) pass. Diagnostic removed after the run. |
| API-04 | REQ-001, REQ-004 (preserved) | `remove-built-in-project-task-manager-startup` | in API-00 and API-10 | ENV-1 | Pass | `API-00-baseline-e2e-failures.txt` (not listed), `API-10-regression-e2e-summary.txt` | file absent from both failure lists | No update needed. |
| API-05 | AC-004, QR-002, REQ-005 | built `dist/app.js` startup, ledger and log, GraphQL, built native `list_project_tasks`, second start | `/tmp/api-e2e-260/run.sh f-titles-startup tests/e2e/app-data-migrations/project-task-titles-startup.e2e.test.ts` | ENV-1 | Pass | `API-10-regression-e2e-summary.txt` | `passed TTL-E2E-001 Studio: every released shape is titled from its first line, nothing else changes, unconvertible files stay, a second start is a …` | New durable file. Four released shapes + a >200-char first line with an emoji at the cut (`198 + "…"`), CRLF first line, a released keyless Project (keys then titles), a whitespace-only description and an invalid file (left byte-identical, named in the log), Temp tasks untouched, ledger `Scanned 9; migrated 7; skipped 2; failed 0.`, second start: no byte changes, attempts 1. |
| API-06 | AC-012, AC-013, AC-014, AC-015, AC-001; AR-006; MP-003 | built `dist/app.js`, real Team root, MCP session authority (scripted AGY) and native resolver (emulated LM Studio), restart | `SCOPE_E2E_EVIDENCE_DIR=<dir> /tmp/api-e2e-260/run.sh f-scope tests/e2e/projects/get-project-task-worker-scope.e2e.test.ts` | ENV-1 | Pass | `API-06-get-project-task-worker-scope.log`, `API-06-get-project-task-worker-scope-receipt.json` | `"You work on scope-board-…-1; you can read only that Task."` (task agent), `-2` (task Team coordinator and the agent it delegated to), `-3` (native), `-4` (existing copy after Task D); `"Your Task has no Project; get_project_task reads Project Tasks."`; first messages `Task: scope-board-…-N in Project project_…`; `bare` tools without `get_project_task`; damaged: `TEAM_SEND_MESSAGE_REJECTED … TASK_AGENT_RESOURCES_UNAVAILABLE`, no model request for that copy | New durable file (6 cases). Only inference is emulated. Finding recorded in Notes of the scorecard: real damaged data blocks the copy's input before any tool call, so the tool's own fail-closed branch is reachable only by the unit test's injection (IMP-04). |
| API-07 | REQ-004, REQ-007, REQ-017 | two built servers, remote delegation | `/tmp/api-e2e-260/run.sh f-remote tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | ENV-1 | Pass | `API-10-regression-e2e-summary.txt` | `remote-delegation-two-server.e2e.test.ts: {'passed': 37}` | RC-09/10/23 create Tasks with titles. |
| API-08 | REQ-001, REQ-004 | MCP matrix, AGY lane | as API-01 for `runtime/mcp-runtime-tool-matrix` | ENV-1 | Pass | `API-10-regression-e2e-summary.txt` | `mcp-runtime-tool-matrix.e2e.test.ts: {'passed': 1, 'skipped': 5}` | Native/Claude/Codex/Grok model lanes need paid or local models; not needed (the result shapes are proven at the transport). |
| API-09 | REQ-001, REQ-002 (external MCP client) | real Codex 0.164 MCP client (no model turn) | `env -i PATH HOME USER LOGNAME TMPDIR CODEX_HOME=<throwaway> RUN_CODEX_MCP_E2E=1 … vitest run tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts -t "codex MCP client"` | ENV-3 | Pass | `API-09-codex-mcp-client.txt` | `"runtime": "codex-mcp-client", "taskStatus": "DONE"` | Plus the scripted AGY's `@modelcontextprotocol/client` 2.3.1 validates `structuredContent` against `outputSchema` for every non-error result in API-02/API-06. The gated Codex routing case cannot run (FU-005): `getClient is not a function`. |
| API-10 | regression | every server E2E (AGY gate) | as API-00 | ENV-1 | Pass (no failure caused by this ticket other than F-001) | `API-10-regression-e2e-summary.txt` | `Test Files  4 failed \| 143 passed \| 50 skipped (197)`; the 5 failing tests are API-03 (F-001) and FU-002/003/004 | |
| API-11a | AC-003, AC-005 | browser probe: projects board, New/Edit task, Task page (probe-owned stack) | `node autobyteus-web/tests/e2e/projects-feature-probe.mjs --skip-server-build --output-dir=<fresh>` | ENV-4 | Pass (run 2) | `API-11a-projects-feature-probe-result.json`, `API-11a-task-new-title-required.png`, `API-11a-run1-PT-E2E-013-meaning-matches.png` | `"PT-E2E-005": … "blankTitle": {"error": "Give the task a title.", "invalid": "true", "describedBy": "task-page-title-error", "focused": true}`, `"preview": "Full second line"`; 17/17 Pass; cleanup `tempRootRemoved: true` | Run 1: PT-E2E-014/017 failed on my probe edit (title not typed; fixed); PT-E2E-013 failed on meaning-search timing (FU-006). |
| API-11b | AC-003 (titles on create) | browser probe: embedding settings | `node autobyteus-web/tests/e2e/embedding-settings-probe.mjs --skip-server-build --output-dir=<fresh>` | ENV-4 | Pass | `API-11b-embedding-settings-probe-result.json` | `Result: Pass`, EMB-001…EMB-008 | |
| API-11c | AC-005 (Workspaces tree, Projects tab), AC-015 (rendered first message) | browser probe: project manager UX (real stack, scripted AGY) | `node autobyteus-web/tests/e2e/project-manager-ux-probe.mjs --output-dir <fresh>` | ENV-4 | **Fail** (13 of 25) | `API-11c-project-manager-ux-probe.txt`, `API-11c-PMU-002-error-500-task-worker-row.png`, `API-11c-project-manager-ux-probe-evidence.json` | `Error 500 — TypeError: Cannot read properties of undefined (reading 'length') at boundTaskText (utils/projects/taskText.ts:6:12) … taskWorkerTaskLabel … WorkspaceTransientExecutionRow.vue` | **F-002.** `stores/taskWorkerTaskStore.ts` flush (lines 60–64) drops `title`; the first render of a Project-Task worker's tree row crashes the app. All 13 failures show that page. PMU-015's new title/first-message assertions did not get to run. |
| API-11d | AC-005 | probes `task-closure-tree`, `team-status-live`, `delegated-team-default-collapse`, `delegated-copies-large-hub` | — | — | Not Tested | — | — | Updated (titles) but not run: they render Project-Task workers in the tree, which F-002 crashes. Next round. |
| API-12 | AC-003, AC-005 | isolated desktop instance | — | — | Not Tested | — | — | Next round after F-002 (the panel and live-worker tree surfaces are the ones F-002 breaks). |
| API-13 | AC-008, QR-001 | sizes for delivery | Reused IMP-09 + collation of `SD-measure-*` | — | Pass | `API-13-before-after-sizes-table.md` | `list_project_tasks, 155 synthesized open Tasks … 386,253 B → 33,002 B, −91.5%`; `QR-001 … 8.5%` | Source unchanged since IMP-09. |
| API-14 | AC-009 | code, wire, UI text, docs | `git grep -n -i summary -- <Task scope paths>` | — | Pass with a docs note | `API-14-ac009-summary-grep.txt` | product code, wire and i18n clean; residual wording in `autobyteus-web/docs/projects.md` lines 694, 696, 706 and web spec titles | Docs note for delivery's docs sync / implementation (non-blocking wording). |
| API-15 | AC-010 | Project Task Manager skill vs observed results | review of `82b7bae` against API-01/API-06 outputs | — | Pass | `API-15-ac010-skill-review.md` | every row `Yes` | |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-R1, API-01, API-02, API-06, API-09 | Proven | — |
| AC-002 | Yes | API-R1 (guard test) | Proven | — |
| AC-003 | Yes | API-01 (TTL-API-001), API-11a | Proven (server, GraphQL, web form); isolated desktop pending (API-12) | — |
| AC-004 | Yes | API-05; API-03 | **Not Proven**: titles at startup proven (API-05), but F-001 breaks the preserved "other Projects keep working" when keys-v1 fails | — |
| AC-005 | Yes | API-11a (board, Task page); API-11c | **Not Proven**: Workspaces tree and Projects tab crash (F-002) | — |
| AC-006 | Yes | API-01, API-02, API-06 | Proven | — |
| AC-007 | No | API-01 (search, search-model-unavailable) | Proven | — |
| AC-008 | No | API-13 | Proven (table for delivery) | Delivery shows it to the user (REQ-010) |
| AC-009 | No | API-14 | Proven, with a docs wording note | — |
| AC-010 | No | API-15 | Proven | — |
| AC-011 | Yes | API-01 (CTX-E2E-001, GET-API-001), API-02 | Proven | — |
| AC-012 | Yes | API-01 (GET-API-001), API-06 | Proven | — |
| AC-013 | Yes | API-06, API-R1 (IMP-05) | Proven | — |
| AC-014 | Yes | API-06 (SCP-E2E-004), API-R1 | Proven | — |
| AC-015 | Yes | API-06 (new copy ×3 runtimes, existing copy, described), API-02 | Proven (server); rendered view pending (API-11c) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 70% | API-01, API-05, API-06, API-13–15 | AC-004 and AC-005 not proven (F-001, F-002) | Fix both, rerun API-03, API-11c/d, API-12 |
| Changed-boundary execution directness | 95% | 95% | API-01 (real HTTP MCP/GraphQL), API-05 (built entrypoint), API-06 (real session authority and native resolver) | — | — |
| Cross-boundary integration realism and mock gap | 90% | 90% | API-06 (only inference emulated), API-09 (real Codex MCP client), API-07 (two servers) | Paid-model lanes not run (not needed); Codex routing case blocked (FU-005) | — |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | clean env, test-owned roots, synthesized released shapes (API-05), base comparison (API-00b) | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 75% | API-05 (second start, unconvertible files), API-06 (restart with damaged data), API-03 | F-001 is an unhandled lifecycle edge | Design decision on F-001 |
| User-surface, browser, and desktop-shell confidence | 70% | 45% | API-11a, API-11b pass; API-11c crashes | F-002 crashes the app; four probes and the desktop instance not run | Fix F-002, run API-11c/d and API-12 |
| Durable regression coverage quality and relevance | 95% | 95% | two new files, ~25 updated files and 7 probes; the failures they found are real | — | — |

- Overall post-repository confidence: 86%
- Overall final confidence: 81%
- Calculation method: simple average of the seven categories.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-004, AC-005)
- Any final applicable category below `90%`: `Yes` — requirement proof (70%), failure/lifecycle (75%), user surface (45%)
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-001, F-002; API-11d and API-12 not run.
- Note on MP-003 (worker scope, damaged run data): with real damaged data loaded at start, the copy whose Task file is unreadable is refused input (`TEAM_SEND_MESSAGE_REJECTED`, `TASK_AGENT_RESOURCES_UNAVAILABLE`) before it can call any tool, and callers outside a copy are told "any" without Task data; the `get_project_task` fail-closed branch itself is reached only by the unit test's injected error (IMP-04). No defect: the outcome is fail-closed either way.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed in part this round; the rest after the fixes)
- Execution mode: `Live API` (built servers), `Browser` (probes), `Other` (real Codex MCP client); `Project Desktop Validation` pending
- Confidence gap it addresses: the real session-bound scope, the startup migration on released data, and the renderer surfaces showing titles
- Browser validation needed: yes, the Workspaces tree and Projects tab render worker Tasks from the store — where F-002 was found
- If `Blocked`: `N/A`

## Desktop Application Validation (When Applicable)

- Approach executed: not this round (API-12 Not Tested); IMP-10 covered New/Edit, board and Task page on an isolated instance.
- Effect on any already-running desktop application: `None`
- Behavior not directly proven: the right-panel Projects tab and the Workspaces-tree Task line with a live worker (both reach F-002).

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: `Migration Required`
- Representative existing data used: synthesized released Task files of the four inventoried shapes, a released keyless Project, edge descriptions, an invalid file, Temp tasks (API-05); the existing released per-folder fixtures (API-03)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the migration outcome: API-05 (completion, nothing else changed, unconvertible files unchanged, second start no-op); migration unit tests (IMP-04) for per-Task failure and retry
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: F-001 (titles migration blocked while keys-v1 is `FAILED`)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/get-project-task-worker-scope.e2e.test.ts` | Added | API-06 | — |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/project-task-titles-startup.e2e.test.ts` | Added | API-05 | — |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` (+ TTL-API-001, GET-API-001) | Updated | API-01 | — |
| `autobyteus-server-ts/tests/e2e/projects/{projects-graphql,project-change-feed,project-task-search,project-task-search-model-unavailable,embedding-settings,project-mutation-node-locality}.e2e.test.ts` | Updated | API-01 | — |
| `autobyteus-server-ts/tests/e2e/projects/{project-task-comments-live,project-task-parts-live,project-task-context-files-delegation,ad-hoc-task-delegation,hand-started-run-refusal,collaboration-prompt-wording,task-existing-copy-assignment,task-reactivation-root-visibility,task-agent-several-tasks,task-closure-root-visibility,teammate-delivery-task-closure-race,delegated-team-lazy-member-activation}.e2e.test.ts` | Updated | API-02 | — |
| `autobyteus-server-ts/tests/e2e/projects/projects-startup-migration.e2e.test.ts` | Updated (titles); the keys-v1 FAILED assertion kept (it is F-001's signal) | API-03 | — |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated | API-07 | — |
| `autobyteus-server-ts/tests/e2e/runtime/{mcp-runtime-tool-matrix,codex-standalone-send-message-global-routing}.e2e.test.ts` | Updated | API-08, API-09 | — |
| `autobyteus-server-ts/tests/e2e/media/{server-owned-media-tools,gemini-speech-voice-tool}.e2e.test.ts` | Updated (native media tools return compact JSON text) | API-10 | — |
| `autobyteus-web/tests/e2e/{projects-feature,project-manager-ux,task-closure-tree,delegated-copies-large-hub,delegated-team-default-collapse,embedding-settings,team-status-live}-probe.mjs` | Updated (titles; Title field, card preview, Task page, panel title, rendered first-message line) | API-11a–d | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` this round (`Fail`); attached with the failure report for context.
- Diff or repository evidence supplied for removed paths: `N/A` (none removed)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI | `tests/fixtures/agy-failure-cli.mjs` (scripted; calls real tools over the real MCP SDK client) | no provider inference needed | model choice of tools not exercised (not this ticket's behavior) |
| LM Studio (native runtime inference) | in-test HTTP emulator returning OpenAI-style `tool_calls` (API-06) | deterministic tool calls on the native route | none for the tool path |
| GitHub, embedding model | as each existing test arranges | — | FU-004, FU-006 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Temporary diagnostics in `delegated-launch-config-defaults` and `projects-startup-migration` | Yes | restored the edited files from copies; `git diff` of the first is empty; `TEMP-DIAG` count 0 in the second | Removed |
| Base scratch worktree `/tmp/api-e2e-260/base-wt` | Yes | `git worktree remove --force` | Removed |
| Throwaway `CODEX_HOME` | Yes | `rm -rf` | Removed |
| Test data roots, servers, AGY processes, probe stacks | Yes | each test's/probe's own cleanup (probe receipts: `tempRootRemoved: true`, `dataRootRemoved: true`) | No leftover process found (`ps` for the worktree) |
| Scratch logs `/tmp/api-e2e-260/` | Yes | kept as scratch; committed copies and excerpts are in `evidence/API-*` | Kept |

## Preliminary Classification (On `Fail`)

- **F-001 (API-03), `Design Impact`.** The design makes `project-task-titles` a prerequisite-gated startup migration after keys-v1 (design spec "Migration Plan"), while stating "Startup and other Projects' work are never blocked; an unconverted Task is the only thing not listed". When keys-v1 is `FAILED` for one unkeyable Project (a supported, tested state), the titles migration stays `NOT_RUN` and every Project's Tasks are unlisted until keys-v1 succeeds. Simply dropping the prerequisite would leave Tasks keyed later without titles (the titles migration is terminal), so the fix needs a design decision. Recommended owner: Solution Designer.
- **F-002 (API-11c), `Local Fix`.** `autobyteus-web/stores/taskWorkerTaskStore.ts` (flush, lines 60–64) rebuilds each answer without `title`; `taskWorkerTaskLabel` (REQ-006) then crashes the app (Error 500) when the Workspaces tree shows a Project-Task worker. The query already reads `title`. Recommended owner: implementation engineer (keep `title` in the store's answer and add a store/component test with a Project-Task worker).

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check (IDs): AC-004 (F-001), AC-005 (F-002); AC-008 shown to the user by delivery
- Preliminary classification and recommended owner: F-001 `Design Impact` → Solution Designer; F-002 `Local Fix` → implementation engineer
- Next recipient from `get_handoff_rules`: code reviewer (failure-origin review)
- Notes: on rework, rerun API-03, API-11c, run API-11d and API-12, then the durable test-code review. Out-of-scope findings: FU-002 to FU-006 in `follow-ups.md`. AC-009 docs wording note (API-14) for delivery's docs sync.
