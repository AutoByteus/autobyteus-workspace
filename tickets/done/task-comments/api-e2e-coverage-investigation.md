# API/E2E Coverage Investigation — task-comments

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/task-comments/requirements-doc.md` (Approved, SR-013)
- Investigation Notes: `tickets/in-progress/task-comments/investigation-notes.md` (AF-001–AF-009; the "Part 2 Investigation" section belongs to another Task)
- Solution Revision Record: `tickets/in-progress/task-comments/solution-revision-record.md`
- Design Spec (required on every route): `tickets/in-progress/task-comments/design-spec.md` (SR-013, Ready)
- Supplemental Task Artifacts: none (DEC-005: existing Task-page style); `follow-ups.md` (FU-001, FU-002)
- Design Review Report: `tickets/in-progress/task-comments/design-review-report.md` (ARCH-REV-002 Pass)
- Architecture Review Revision Record: `tickets/in-progress/task-comments/architecture-review-revision-record.md`
- Implementation Handoff: `tickets/in-progress/task-comments/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/task-comments/implementation-revision-record.md`
- Code Review Report: `tickets/in-progress/task-comments/code-review-report.md` (CRR-001 Pass, 9.5/10)
- Code Review Revision Record: `tickets/in-progress/task-comments/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `tickets/in-progress/task-comments/api-e2e-revision-record.md` (on completion)
- Current API/E2E Revision ID: `API-REV-001` (on completion)
- Current Investigation Round: 1
- Trigger: implementation review Pass from `/software_engineering_team/code_reviewer` (Medium / High)
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

A Project Task has an add-only comment thread `comments: [{id, createdAt, text}]` in its `task.json`: the Task-local number (max + 1), server time, trimmed non-empty text, no author (REQ-001, 002, 004). Agents add one comment per `update_task add_comment` call, by key in any case or long ID; it combines with other fields in one write; blank, Temp task or unknown Task are refused with nothing written, including a combined status (REQ-005). The `update_task` result is unchanged. The app adds through GraphQL `addProjectTaskComment` (blank → `TASK_COMMENT_INVALID`) on the Task page and in the tab's Task view (REQ-006). Views show the thread oldest first with number, time and full text, live (REQ-007). `list_project_tasks` returns `comments` (texts, oldest first; absent when none); `search_project_tasks` returns `commentCount` (absent when 0); the exact search, shared with the board's search box, also matches comment text (REQ-008, DEC-025). No new tool (REQ-010). `update_task` names parts a parent's close could not close in `partsNotClosed` (only when any; REQ-011, autobyteus-187). Delegated work (new and existing task agent) carries a "Comments:" block of `- ` bullets after the description, none when there are no comments (REQ-012). Existing Tasks read as no comments, no conversion (REQ-013, `Directly Usable — No Migration`). Strings in en and zh-CN (REQ-014). AC-013 needs an isolated desktop instance.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003, SCN-005, SCN-006, SCN-007, SCN-009 (SCN-004 withdrawn).
- Real-use scenarios added from the implemented behavior:
  - RU-001: the Project Task Manager closes a Task and records why in the same call (`status=DONE` + `add_comment`); the feed and the run closure see one write.
  - RU-002: the user adds a comment in the tab while the Task page is open in another view; the page updates live (and the reverse for an agent's comment).
  - RU-003: a damaged `agent_run_resources.json` of one part (DESIGN.md rule 7), the real cause of a part failing to close (SCN-006).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 agent `add_comment` | Added | REQ-001, 002, 004, 005; DS-001 | Tool E2E over MCP and native; refusals write nothing; combined write |
| BEH-001 app `addProjectTaskComment` | Added | REQ-006; DS-002 | GraphQL E2E; browser and desktop journeys |
| BEH-002 thread in page and tab, live | Added | REQ-007 | Browser probe (tab with a real run), desktop instance |
| BEH-004 list / search / board search | Added | REQ-008, DEC-025 | Tool E2E (list, search), GraphQL board search, browser / desktop board search |
| BEH-006 `partsNotClosed` | Added | REQ-011 | Tool E2E with a damaged run-data file |
| BEH-007 comments in delegated work | Added | REQ-012 | Gated live E2E: new and existing task agent |
| REQ-013 existing data | Preserved (reader) | Directly Usable | GraphQL E2E on a synthesized pre-comments `task.json`; desktop J-case |
| Strict `/ws/projects` schema + wire | Changed | REQ-007 | Live feed frames parsed by the strict schema |
| Other tools, description, keys, deps, parts, statuses | Preserved | Preserved Behavior Boundary | Whole projects E2E folder |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `task-comments.ts`, `update()` patch, `TaskPartClosure`, search exact tier | Server unit (IMP-02) | Real HTTP / MCP / store together | Server E2E |
| API / transport / contract | Yes | Tool param / fields, GraphQL field + mutation, feed schema, work text | Unit schema / manifest tests | Real MCP host, type-graphql, strict feed, real delegation | Server E2E (ungated + gated live) |
| Frontend component / state | Yes | `TaskCommentsSection`, store `addComment` | Web unit (IMP-04) | Rendering against a real backend; tab view | Browser probe; desktop |
| Browser integration / user journey | Yes | Page, tab, live update, board search | IMP-07 (page only; no tab, no zh-CN) | Tab view and adding from it; zh-CN | Browser probe; desktop |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same renderer | — | AC-013 | Isolated desktop instance |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | Delegated work text to live task agents | Unit (lifecycle fixtures) | A real worker's first message | Gated AGY E2E |
| Persisted-data transition | Yes (additive field) | `task.json` `comments` | Store unit | Real server read path | GraphQL E2E, desktop |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments`, branch `codex/task-comments`, HEAD `1b83434652` (code `e014c349b8`).
- Project type and runtime stack: pnpm monorepo; Node / Fastify / type-graphql server, Nuxt / Electron web, vitest.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments/TESTING.md`; `AGENTS.md`; `docs/isolated-app-instances.md`.
- Conflicting, missing, or unclear project instructions: none.
- Required environment variables or secrets available: `N/A` (scripted AGY CLI; no provider).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Layers, environments, rules | Server E2E `vitest run <file> --no-watch` from `autobyteus-server-ts` with `env -i PATH HOME=<resolved temp> TMPDIR`; gated AGY `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`; browser probes own their stack; isolated desktop `isolated-app start --build`; Rule 9: find each failure's cause |
| `docs/isolated-app-instances.md` | Desktop instance | `start` / `stop` / `list`; CDP attach to the reported `controlPort`; baseline-only server environment |
| `autobyteus-server-ts/tests/e2e/projects/project-task-parts-live.e2e.test.ts`, `project-task-context-files-delegation.e2e.test.ts`, `task-existing-copy-assignment.e2e.test.ts` | Live Manager + worker pattern | `CALL_TOOL:{…}`; worker conversation via `agentRunCollaborationMemberProjection`; existing-copy assignment with `target_agent_run_id` |
| task-part-of ticket's API-08 / API-09 scripts (in `tickets/done/task-part-of/evidence/`) | Proven probe and desktop patterns | Probe-owned stack; desktop seed via GraphQL, statuses via the tool writer while stopped |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server E2E (in-process Studio server) | `autobyteus-server-ts` | `env -i … pnpm exec vitest run <files> --no-watch` | Own temp roots | Suite `beforeAll` | Suite `afterAll` |
| Scripted AGY CLI | `tests/fixtures/agy-failure-cli.mjs` | `ANTIGRAVITY_CLI_COMMAND` | One process per agent | `--version` gate | Agents terminated |
| Probe stack | `autobyteus-web` | ticket-owned probe | Free ports, own data root | `/graphql`, Nuxt page | Process groups killed, root removed |
| Isolated desktop instance | repo root | `pnpm -C autobyteus-web build:electron:mac`, `isolated-app start --from-worktree --data-root <own>` | Own data root, ports | `start` result | `isolated-app stop`, `list` empty, root removed |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Tasks with comments | Real tools and GraphQL | Test-owned roots | With the root |
| A part with damaged run data | Test writes an unparsable `agent_run_resources.json` for that part in the test-owned root (DESIGN.md rule 7 case), readers rebuilt | Own root only | With the root |
| Live task agents | Manager `delegate_task` (scripted AGY) | No provider | Terminated |
| Pre-comments `task.json` | A current file with `comments` removed, in the test-owned root | Never real data | With the root |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- References: design-spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing-data setup: a `task.json` with every current key except `comments`.
- Evidence planned: API-03 (reads as no comments through GraphQL and the tools, bytes unchanged until its own save, which writes `"comments"`), API-09 J-case in the desktop; reused store unit test (IMP-02).
- Migration-specific scenarios: N/A.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/e2e/projects/*` exact tool acks / list shapes | `{projectId, taskId, status, dependsOn, partOf}` etc. | REQ-008 (fields absent when empty), preserved acks | Still Valid (expected) | API-00 baseline run | Rerun; update only if the baseline shows an additive pin |
| `project-task-boundaries.e2e.test.ts` CTX-E2E-001 tool schema key lists | `update_task` property keys | REQ-005 adds `add_comment` | Needs Update (expected) | API-00 | Add `add_comment` |
| `projects-graphql.e2e.test.ts` API-007 mutation list / input fields | `createProjectTask`, `deleteProjectTask`, `updateProjectTask` | REQ-006 adds `addProjectTaskComment` | Needs Update (expected) | API-00 | Add the mutation |
| `project-change-feed.e2e.test.ts` feed-equals-snapshot | Snapshot query field list | REQ-007 (`comments` on the wire) | Needs Update (expected) | API-00 | Add `comments` to the snapshot query |
| `delegated-launch-config-defaults.e2e.test.ts` (gated) | Member launches `null` when inherited; DLC-008 pre-change restore | autobyteus-197 (not this ticket) | Out Of Scope (stale vs base) | API-00, receipt | Follow-up FU-003; not edited |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs`, `project-manager-ux-probe.mjs` | Projects UI journeys | Preserved | Still Valid | — | Rerun (API-07) |

The baseline run (API-00) confirms or corrects the "expected" decisions above before any edit.

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | — | Whole `tests/e2e/projects` + `app-data-migrations`, gated, on HEAD | Existing Test | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… vitest run tests/e2e/projects tests/e2e/app-data-migrations --no-watch` | Find every pin this change alters by evidence |
| REUSE-IMP-01..05 | AC-001, 002, 005, 008–012 (unit) | typecheck, server unit / integration, web unit, guards | Reused | IMP-01..IMP-05 | `git diff --name-only e014c349b8 1b83434652` touches only the ticket folder |
| API-01 | Additive pins | Server E2E | Durable (update) | Pins found by API-00 | Approved additive behavior |
| API-02 | AC-001, AC-005 (list), AC-008, REQ-010 | Real Studio HTTP + scoped MCP + native tools | Durable (add) | `project-task-boundaries.e2e.test.ts` CMT-API-001 | Agent contract through the real MCP host |
| API-03 | AC-001 (app side), AC-011, REQ-006 server | GraphQL in-process schema + real store | Durable (add) | `projects-graphql.e2e.test.ts` API-012 | type-graphql mutation, blank refusal, existing data |
| API-04 | AC-005 (search), AC-016 (server rule) | GraphQL `searchProjectTasks` (the board's query) + MCP `search_project_tasks` | Durable (add) | `project-task-search.e2e.test.ts` CMT-SEARCH-001 | Exact tier shared by board and tool |
| API-05 | AC-009 | Real tools over MCP; a part with damaged run data | Durable (add) | `project-task-boundaries.e2e.test.ts` CMT-API-002 | The real failure cause, not a mocked store |
| API-06 | AC-010, AC-001 (Temp task, combined one write via the feed), REQ-007 wire | Live Manager + workers, `/ws/projects` | Durable (add, gated) | new `tests/e2e/projects/project-task-comments-live.e2e.test.ts` | Delegated work text to real task agents; feed |
| API-07 | Preserved | Whole projects folder gated (after edits) + browser probes `test:e2e:projects`, `project-manager-ux` | Existing Test | as API-00; `pnpm -C autobyteus-web test:e2e:projects --skip-server-build --output-dir=<fresh>`; `node autobyteus-web/tests/e2e/project-manager-ux-probe.mjs --output-dir <fresh>` | Regression |
| API-08 | AC-003, AC-004 (page and tab), AC-016, REQ-007 live | Browser: `dist/app.js` + scripted AGY + Nuxt dev + Chrome | Temporary Probe | ticket-owned `evidence/API-08-probe/comments-live-probe.mjs` | The tab needs a real run; one ticket's journey |
| API-09 | AC-013, AC-011, AC-012 (rendered), AC-003, AC-004, AC-016 | Isolated Electron instance of this worktree's build | Journey | build, `isolated-app start`, seed, `desktop-journey.mjs`, stop | Required by AC-013 |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-02, API-05 | `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` | Tool contract at the real MCP boundary; `partsNotClosed` from real damaged data |
| API-03 | `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` | GraphQL mutation, refusal, existing data |
| API-04 | `autobyteus-server-ts/tests/e2e/projects/project-task-search.e2e.test.ts` | Exact tier over comments for board and tool |
| API-06 | `autobyteus-server-ts/tests/e2e/projects/project-task-comments-live.e2e.test.ts` | Delegated work text and feed with live task agents |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-01 | `project-task-boundaries.e2e.test.ts` CTX-E2E-001 | `add_comment` in the `update_task` key list | API-00 confirmed |
| API-01 | `projects-graphql.e2e.test.ts` API-007, API-011 | `addProjectTaskComment` in the mutation list; `comments` in the task.json key set | API-00 (API-011's key set was not foreseen) |
| API-01 | `project-change-feed.e2e.test.ts` | `comments { id createdAt text }` in the snapshot query | API-00 confirmed (4 cases) |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron wrapping the Nuxt renderer, embedded server.
- Testing guideline used: `TESTING.md`, `docs/isolated-app-instances.md`.
- Web-equivalent behavior: everything changed. Shell-specific behavior: none.
- Chosen approach: browser probe for the tab and live journeys that need a running agent (the instance's baseline-only server environment cannot get the scripted CLI; in task-part-of the tab was unreachable in the instance without a run); isolated instance of this worktree's build for AC-013 (Task page add and thread, board search, zh-CN, existing data).
- How the run avoids disturbing an already-running desktop application: own ports, data root and process group; attach only to the reported `controlPort`.

## Live Environment And Fixture Plan

- Startup order: server E2E → probe stack → desktop build and instance.
- Environment choices: `env -i` with a resolved temp `HOME`; `AGY_FAKE_CASE=linked_skills`.
- Health checks: suite `beforeAll`; `/graphql`; Nuxt page; `isolated-app start` result.
- Seed data: GraphQL and real tools; desktop statuses through the tool writer while stopped (no GraphQL status mutation).
- Journeys: UC-001–UC-004, UC-006, UC-007.
- Evidence: logs (excerpt + gz), suite JSON, DOM / state JSON, screenshots.
- Cleanup: probe processes and roots, instance and its root.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-006 (withdrawn), FU-001, FU-002 | Out of scope | — | No | Already in `follow-ups.md` |
| AC-002 concurrency through HTTP | QR-001 is unit-proven (IMP-02); real use is one user plus agents, not a contrived race | Low | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added and updated; none removed)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: existing test files are edited only after the API-00 baseline run has finished (a mid-run edit was loaded by a running baseline in task-part-of). API-00 also showed `delegated-launch-config-defaults` failing for a reason outside this ticket (stale since autobyteus-197): recorded as FU-003, not edited here. During execution the tab turned out reachable in the desktop instance through the Chat page's "Show tools", so AC-013's tab journey runs in API-09 too; PMU-021's intermittent browser error was traced to the file explorer (FU-004).
