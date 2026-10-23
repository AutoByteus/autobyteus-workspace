# API/E2E Execution Coverage Report — task-agent-several-tasks

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `tickets/in-progress/task-agent-several-tasks/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/task-agent-several-tasks/api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `tickets/in-progress/task-agent-several-tasks/api-e2e-test-progress.md`
- Round and trigger: round 2; delta review Pass (CRR-004) of the SR-006 web fix `1fa3a1d87e` (CR-002 / API-F-001), from `/software_engineering_team/code_reviewer`. Round 1: implementation review Pass (CRR-002).
- Prior round reviewed: round 1 (API-REV-001, Fail on API-F-001).
- Rerun by impact: `git diff --name-only a522089382 fc2a7c84ac` outside `tickets/` = `autobyteus-web/localization/messages/{en,zh-CN}/projects.ts` and `autobyteus-web/localization/messages/__tests__/projectsCatalog.spec.ts`. No server code changed, so API-00..API-06 stay valid on their round-1 runs (they exercise only server behavior and texts; the web strings are not read by them). API-07 is rerun (the app's text changed); the web unit / guard check of the new strings is IMP-09 (reused).
- Deviations from the investigation's plan, and why: round 1's desktop journey (API-07) surfaced finding API-F-001 (below). Round 2 reran API-07 with the help line asserted exactly in en and zh-CN (J2, J3, J6).
- Test code commit: `386ce18b5f` (the test files run are the ones committed).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-several-tasks/tickets/in-progress/task-agent-several-tasks/evidence/` (files `API-*`); the handoff message gives the commit.

## Routing Classification

- Task size: `Small`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | Code `cd8c289b67` (HEAD `e421b2896d`, ticket docs only after it) + this round's test edits | macOS darwin arm64 | Node, corepack pnpm 10.28.2; vitest in-process Studio server; `RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (real runtime processes, no provider) | `env -i PATH HOME=<resolved temp> TMPDIR`; test-owned roots; `AGY_FAKE_CASE=linked_skills` |
| ENV-2 | Round 1: code `cd8c289b67`; round 2: `1fa3a1d87e` (HEAD `fc2a7c84ac`). `pnpm -C autobyteus-web build:electron:mac` → `electron-dist/mac-arm64/AutoByteus.app` | macOS | Isolated desktop instance on an own root (round 1 `/tmp/ast-e2e/desktop-root`, round 2 `/tmp/ast-e2e/r2/desktop-root`); data package by this worktree's `dist/app.js` with the scripted CLI | 1440×900, en and zh-CN |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | — | Whole `tests/e2e/projects` + `app-data-migrations`, gated, before any test edit | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects tests/e2e/app-data-migrations --no-watch` | ENV-1 | Pass (baseline recorded) | `evidence/API-00-baseline-folder.log` (+ `.full.log.gz`) | `Tests  9 failed \| 134 passed \| 4 skipped (147)`; `project-task-boundaries.e2e.test.ts:663:45`, `:846:45`; `task-existing-copy-assignment.e2e.test.ts:404:22` (×3 roots), `:731:62`, `:866:28`; `delegated-launch-config-defaults.e2e.test.ts:521:22`, `:639:22` | 7 failures are exactly the stale pins the handoff listed. The 2 `delegated-launch-config-defaults` failures are not caused by this change (stale since autobyteus-197; cause traced in task-comments FU-003); recorded as FU-002 here. |
| REUSE-IMP-02..07 | AF-001, AC-001–AC-009 (unit), QR-001, QR-002, REQ-008 | Server unit / integration / typecheck | IMP-02..IMP-07 | — | Pass | — | — | `git diff --name-only cd8c289b67 e421b2896d` outside `tickets/` is empty. |
| API-01 | REQ-008 | MCP tool texts | `project-task-boundaries.e2e.test.ts` CLS-API-001, POF-API-001 (updated); run with API-02..04 and in API-06 | ENV-1 | Pass | `evidence/API-01-04-updated-suites.log`, `evidence/API-06-projects-folder-gated.log` | `✓ tests/e2e/projects/project-task-boundaries.e2e.test.ts (16 tests)` | Pins the new sentences "Both end this Task's work for its task agents; a task agent is stopped when this was its last open Task", "(ending their work for their task agents, as above)" and "To give a task agent another Task, also while its other Tasks are open, use delegate_task …". |
| API-02 | AC-001, AC-003, AC-004, REQ-003, AC-008 | Agent, Team and Org roots; a Team copy | `task-existing-copy-assignment.e2e.test.ts` EXC-E2E-001..003 (busy refusal replaced) | ENV-1 | Pass | `evidence/API-01-04-updated-suites.log`, `evidence/API-02-04-task-existing-copy-assignment.json`, `evidence/API-06-*` | `✓ EXC-E2E-001 …`, `✓ EXC-E2E-002 …`, `✓ EXC-E2E-003 …`; JSON `team.severalTasks.eMessage` = `New Task assigned to you: existing-copy-team-…-5. Your Task existing-copy-team-…-1 is still open; name the Task key in each report.` | In each root: with A IN_PROGRESS, E is given to the Team copy by its team run id (accepted, same ids back); the coordinator receives E's description and the sentence above; A's and E's roots both name the live copy; two open entries; E again → refused ("already works on this Task"), nothing written; E DONE → no closure frame for the copy, process live, a message to the coordinator accepted and received; A DONE (its last open Task) → one closure frame, process gone. The rest of the journey (closed copy given B, AC-008 refusals, A → B → A) is unchanged and passes. |
| API-03 | QR-001, QR-002, AC-003, AC-004 | Parallel DONE of the copy's Task + its next assignment in one Manager turn | EXC-E2E-004 (refused branch replaced) | ENV-1 | Pass | `evidence/API-02-04-task-existing-copy-assignment.json` (`race`) | `race.outcomes: ["assigned-while-open","assigned-after-close"]`; 24 rounds, all assigned | Both orders happened (the given-Task message names the earlier Task as open only when the assignment came first). In every round: at most one open entry after the DONE, the copy live, the next Task received. |
| API-04 | AC-001 (Agent copies, keys), FU-001 behavior | Agent root | TKD-AGY-001 (two refusals replaced) | ENV-1 | Pass | `evidence/API-02-04-task-existing-copy-assignment.json` (`taskKeys`) | `✓ TKD-AGY-001 …`; `taskKeys.texts.afterDeleted.delegated: true` | A worker whose Task was deleted is given Task E: accepted, message "Your previous Task is closed; this is the work to do now." (the deleted Task is left out, FU-001), no long ID. The helper holding C is given D by key in upper case while C is open: message names C as still open; C DONE keeps the helper live. |
| API-05 | AC-002, AC-005, AC-006, AC-007, AC-003, AC-004, RU-002 | Agent root; Team copy (parent + parts), Agent copies (sub-work, give-back), an idle-shut-down copy | new gated `tests/e2e/projects/task-agent-several-tasks.e2e.test.ts` (SEV-E2E-001..004); run 1, run 2, and in API-06 | ENV-1 | Pass | `evidence/API-05-several-tasks-run1.log`, `evidence/API-05-several-tasks-run2.log`, `evidence/API-05-task-agent-several-tasks.json`, `evidence/API-06-task-agent-several-tasks.json` | Run 2 `Tests  4 passed (4)`; JSON `parentAndParts.closures: 1`, `parentAndParts.cancelled.task.closedParts` (2 keys), `parentAndParts.messages` (two sentences), `subWork.closuresOfWorker: 0`, `giveBack.whileDone.message`, `giveBack.fenced.code: "TASK_AGENT_RESOURCE_CLOSED"`, `wake.assigned.delegated: true` | SEV-001: parent then part 1 (key) and part 2 (key in upper case) to one Team copy; messages "Your Task P is still open; …" and "Your Tasks P, P1 are still open; …"; all three roots and `list_project_tasks` assignments name the copy; parent CANCELLED → `closedParts` both parts, the coordinator process stops, exactly one closure frame, all entries closed. SEV-002: sub-work started on receiving B is recorded under B (none under A); B DONE closes and stops the helper only; the worker gets no closure, stays live, takes A's message. SEV-003: a DONE Task is still refused as before ("The Task is DONE; set it to TODO or IN_PROGRESS before you delegate it."); reopened and given back while A is open → a second open entry, message names A; the open duplicate refused; A DONE → no stop; B CANCELLED → stopped, one closure frame, messages refused. SEV-004: grace 60 s via `updateServerSetting`; the copy holding an open Task is shut down idle; the second Task wakes it (one resumed launch) and its message names the first. Run 1's SEV-003 failure was my test step (it delegated a DONE Task without reopening it; the refusal is preserved behavior, and the unit test also reopens first). |
| API-06 | Preserved behavior | Whole projects folder + app-data-migrations, gated, after the edits | as API-00 | ENV-1 | Pass (in scope) | `evidence/API-06-projects-folder-gated.log` (+ `.full.log.gz`) | `Test Files  1 failed \| 35 passed (36)`, `Tests  2 failed \| 145 passed \| 4 skipped (151)`; the 2 failures = `delegated-launch-config-defaults` (FU-002), identical to API-00 | Idle lifetime, closure, reactivation, change feed, delegation and the new suite all pass. |
| REUSE-IMP-09 | AC-011 (catalogs) | Web guards and all web unit / component suites | IMP-09 | — | Pass | — | — | Ran on `1fa3a1d87e`, the round-2 commit; includes the new catalog assertion pinning both strings. |
| API-07 | AC-010, AC-011, AC-009, REQ-003 | Isolated Electron instance of this worktree's build | build; `isolated-app start --from-worktree --data-root <own>`; `stop`; `seed-desktop.mjs <root> <seed.json>`; `start`; `desktop-journey.mjs <controlPort> <graphqlUrl> <seed.json> <out>`; `stop`; `list` | ENV-2 | Round 1: Fail (API-F-001). Round 2: Pass | Round 1: `evidence/API-07-desktop/run1/result.json`. Round 2: `evidence/API-07-desktop/README.md` (Round 2), `evidence/API-07-r2-electron-build.log`, `run2/result.json`, `run2/J2-task-A-assigned-1440.png`, `run2/J3-task-B-assigned-1440.png`, `run2/J6-zh-task-A-assigned-1440.png`, `run2/J6-zh-task-B-assigned-1440.png`, `run2/start-*.json`, `run2/stop-*.json`, `run2/list-after.json` | Round 1: J2/J3 `obs.text` `"… Offline When the Task is Done, this agent or team stops."`. Round 2: J1–J6 `"Pass"`, `"errors": []`; J2/J3 `"help": "This agent or team stops when its last open Task is Done or Cancelled."`, `"helpClipped": false`; J6 `"help": "这个智能体或团队会在它最后一个未完成的任务完成或取消后停止。"` on both Tasks; build log `old sentence … found in: (none)` | Both Task pages of a team holding two open Tasks name the same team and now state the correct rule, in en and zh-CN. Round 2 used a fresh data package made the same way. |

## Finding API-F-001 (round 1; resolved in round 2)

- Where: `autobyteus-web/components/projects/TaskRootSection.vue` shows `projects.root.help` under "Assigned to" whenever the root is live: en `'When the Task is Done, this agent or team stops.'`, zh-CN `'任务完成后，这个智能体或团队会停止。'` (`localization/messages/{en,zh-CN}/projects.ts:212`).
- Expected (REQ-004, AC-003): closing one of a team's Tasks leaves it running while another is open; it stops when its last open Task closes. The app should not tell the user otherwise (the ticket's problem statement: "the team looked stopped").
- Observed (API-07 J2, J3, and in DOM text): both Task pages of a team that holds A and B say the team stops when that Task is Done. API-02/API-05 prove the server does not stop it then.
- Cause: the change makes an existing UI sentence untrue. The design's Change Scope left "the web app" alone, and REQ-008 lists only the `update_task` / `delegate_task` texts and CM-6; the architecture-phase input asked to check "every other place that assumes one open entry per copy", and this string was not among them. `Read` (source and catalogs) and `Measured` (rendered in the desktop app).
- Preliminary classification: `Design Impact` (an omitted place in the change scope; the fix is a wording change in en and zh-CN, possibly conditional on the copy's other open Tasks). Recommended owner: Solution Designer (design revision; the wording is user-visible).
- Resolution: the failure-origin review confirmed `Design Impact` (CRR-003, CR-002); SR-006 added DEC-013 / AC-011; the web fix `1fa3a1d87e` changed both strings; round 2's API-07 proves them rendered on both Task pages (en and zh-CN).

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-02 (three roots), API-04, API-05 SEV-001, REUSE-IMP-02 | Proven | — |
| AC-002 | Yes | API-05 SEV-001 | Proven | — |
| AC-003 | Yes | API-02, API-05 SEV-002, SEV-003 | Proven | — |
| AC-004 | Yes | API-02, API-05 SEV-001, SEV-003 | Proven | — |
| AC-005 | Yes | API-05 SEV-001 | Proven | — |
| AC-006 | Yes | API-05 SEV-002 | Proven | — |
| AC-007 | No | API-05 SEV-003 | Proven | — |
| AC-008 | No | API-02 (later B to a closed copy: unchanged text), API-04, REUSE-IMP-04 | Proven | — |
| AC-009 | No | API-06 (one-Task copies: idle lifetime, closure, reactivation), API-07 | Proven | — |
| AC-010 | Yes | API-07 (round 2) | Proven | — |
| AC-011 | Yes | API-07 (round 2: J2, J3, J6), REUSE-IMP-09 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 96% | API-01..06 prove AC-001–AC-009; API-07 round 2 proves AC-010, AC-011 | Round 1's API-F-001 resolved | — |
| Changed-boundary execution directness | 96% | 97% | Real roots, delegation, delivery, closure, processes, idle shutdown; real desktop app | — | — |
| Cross-boundary integration realism and mock gap | 95% | 96% | Scripted AGY drives real runtime processes and tools | No provider inference (irrelevant) | — |
| Environment, configuration, identity, and fixture fidelity | 94% | 95% | Clean env, own roots; desktop data by the same server build | Desktop copies restored offline (no runtime in the instance) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | Race in both orders, refusals kept, give-back, sub-work, wake | — | — |
| User-surface, browser, and desktop-shell confidence | 70% | 95% | API-07 round 2 (en and zh-CN, both Tasks, not clipped) | The copies run offline in the instance (no runtime there); live keep-running / stop are server-proven | — |
| Durable regression coverage quality and relevance | 95% | 95% | One new gated suite; stale refusals replaced by the new journeys | — | — |

- Overall post-repository confidence: 91% (92, 96, 95, 94, 95, 70, 95)
- Overall final confidence: 96% (96, 97, 96, 95, 95, 95, 95 → 95.6)
- Round 1 final confidence: 90% (80, 97, 96, 95, 95, 75, 95)
- Calculation method: simple average.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: none material. A closed Task's root reads Offline while the same team works on another open Task (approved design, ARCH-REV-003 residual risk; seen in IMP-08).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (API-07); `Lifecycle` (API-05, gated live processes).
- Confidence gap it addresses: AC-010 and the user-visible state of two open Tasks on one copy.
- Browser validation needed: no separate browser run; no web code changed, and the desktop instance renders the same pages.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: worktree Electron build; instance on an own root; data package made by this worktree's server build with the scripted CLI while the instance was stopped; CDP journey J1–J5.
- Web-equivalent behavior: API-07. Shell-specific: none changed.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven: the copy's live states in the app (it runs offline in the instance, which has no runtime); live stop / keep-running are proven server-side (API-02, API-05).

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Not Affected` (format).
- Representative existing data: one-Task copies in the existing suites (API-06); restored copies in the desktop instance (API-07).
- Version-specific runtime branch or compatibility fallback observed: `No`.

## Compatibility / Legacy Scope Check

- Backward compatibility introduced, tolerated or retained: `No`.
- Durable coverage kept only for compatibility-only behavior: `No` (the removed refusal's assertions were replaced, not kept).

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal: Obsolete Assertion, Upstream Evidence, And Replacement |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/task-agent-several-tasks.e2e.test.ts` (SEV-E2E-001..004, gated) | Added | API-05 | — |
| `autobyteus-server-ts/tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` rootScenario | Updated (refusal assertions removed, replaced) | API-02 | Removed: "This task agent still works on Task A (TODO/IN_PROGRESS) …" (REQ-001 removes the refusal; handoff BEH-001). Replaced in place by the E-while-A journey (AC-001, AC-003, AC-004). |
| same, EXC-E2E-004 | Updated (refused branch removed) | API-03 | Removed: the "refused-busy" branch. Replaced: every round must be assigned; the order is recorded. |
| same, TKD-AGY-001 | Updated (two refusals removed) | API-04 | Removed: the deleted-Task and busy refusals. Replaced: accepted assignments with their message texts (FU-001 behavior pinned). |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` CLS-API-001, POF-API-001 | Updated | API-01 | Old `update_task` sentences replaced by the CR-001 sentences. |

- Added or updated paths attached for review: `Yes` (proportional test-code review requested with this Pass).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Agent runtime CLI (AGY) | Scripted CLI `tests/fixtures/agy-failure-cli.mjs` (real runtime processes and tools) | No provider spend; TESTING.md's no-model runtime | No inference (not part of this behavior) |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Server E2E data roots | Yes | Suites' `afterAll` | Removed (`dataRemoved: true`, no leftover processes in the suite receipts) |
| Round 2: the root-init instance of `run2/start-a.json` and `iso-57522-1039` (journey), root `/tmp/ast-e2e/r2/desktop-root`, the seed backend | Yes | `isolated-app stop`; seed backend SIGTERM; root deleted | None of mine in `list` |
| Instances `iso-53216-e752` (root init) and `iso-53335-cbce` (journey), root `/tmp/ast-e2e/desktop-root`, the seed backend | Yes | `isolated-app stop`; seed backend SIGTERM (`backendStopped: true`); root deleted | None of mine in `list`; root removed |
| `autobyteus-web/electron-dist/`, rebuilt `autobyteus-server-ts/dist/` | Yes (build outputs) | Left in place, not staged | — |

## Preliminary Classification (On `Fail`)

N/A for round 2 (Pass). Round 1: `Design Impact` (API-F-001), confirmed by CRR-003 and resolved.

## Latest Authoritative Result

- Result: `Pass` (round 2)
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: proportional test-code review (code reviewer).
- Notes: API-F-001 resolved. FU-001 and FU-002 in `follow-ups.md` are outside this ticket.
