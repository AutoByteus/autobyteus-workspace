# Handoff Summary — task-comments

Project Task `autobyteus-259` Part 1: add-only comments on Project Tasks; plus `autobyteus-187`: `partsNotClosed`.

## What Shipped

- A Project Task has a comment thread (`comments: [{id, createdAt, text}]` in `task.json`). Comments are only added: numbered per Task, timed by the server, trimmed and non-empty (`TASK_COMMENT_INVALID`). They never change the description, but they do bump `updatedAt`. Temp tasks have no comments.
- Agents add a comment with `update_task add_comment`, in the same single write as any other fields; there is no new tool. The app adds one with the GraphQL mutation `addProjectTaskComment`, from the Task page and from the Projects tab.
- Readers:
  - `list_project_tasks` shows the comment texts;
  - `search_project_tasks` and the board search match words that appear only in comments, and results carry `commentCount`;
  - the Task page and the tab show the thread live;
  - delegating a saved Task appends a "Comments:" block after the description (new and existing copies).
- `update_task` closing a parent now lists the parts it could not close in `partsNotClosed` (autobyteus-187).
- Persisted data: `Directly Usable — No Migration`. An absent `comments` field means no comments.

## Classification And Route

- `task_size`: Medium. `architectural_risk`: High. Route: Reviewed (ARCH-REV-002, CRR-001 source, API-REV-001, CRR-002 test code). Delivery did not reclassify.

## Integration Refresh

- Bootstrap base: `origin/personal` @ `786055f3d7`. Latest base checked: `origin/personal` @ `d8df12435c` (109 commits: remote collaboration work, the NFS guide, betas up to `v1.5.8-beta.8` and stable `v1.5.8`).
- Method: merge `96625b9ba5`, no conflicts. One file overlapped, `root-task-execution-lifecycle.ts`: the base changed remote Team handling, the ticket added comments to the work text, in different hunks, and both survived.
- No checkpoint commit was needed: the branch was fully committed.
- Rerun plan (TESTING.md "Rerun by impact"):
  - The base changed no dependencies, schema, `autobyteus-ts` or contract packages.
  - It changed the server composition every E2E boots, the delegation lifecycle that AC-010 uses, and an additive scripted-AGY fixture command.
  - So: typecheck and build (always after a merge); the ticket's server E2E cases through the gated folder; the web guards. API-08 and API-09 are still valid, because the base changed no web Projects code.

| Check | Command | Result |
| --- | --- | --- |
| DEL-01 | server typecheck | exit 0 |
| DEL-05 | server build | exit 0 |
| DEL-02 | server `test:unit`, run alongside the web suite | 6493 passed, 1 failed (FU-005, a race in a test, cause found) |
| DEL-02b | server `test:unit`, run alone | 791 files, 6494 tests passed; exit 0 |
| DEL-03 | web `test:nuxt --run` | 654 files, 4695 tests passed; exit 0 |
| DEL-06 | web guards (3) | all passed |
| DEL-04 | gated `tests/e2e/projects` + `app-data-migrations`, verbose | 141 passed, 4 skipped, 2 failed. The 2 failures are FU-003, identical to the API-00 / API-07 baseline. Every task-comments case passes: CMT-API-001, CMT-API-002, CMT-LIVE-001 to 004, API-012, CMT-SEARCH-001 |

- A delivery lesson about rerun proportion, parallel load and Rule 9 led to a TESTING.md refinement, committed on its own as `bf81ce2a0f` `docs(testing): plan merge reruns by impact; one heavy run at a time`. The user asked for it during this delivery.

## Verification From Evidence

- Judgement: `Sufficient`. Every critical AC is directly proven, the final confidence is 96% (target 95%), and no user check is needed.
- Files I opened:
  - `API-06-project-task-comments-live.json`, and its DEL-04 rerun: AC-010 for a new and an existing copy, DONE + comment as one write, Temp refusals.
  - API-08 `evidence.json` and `API-08-page-after.png`: comments #1 to #5 from the page, the tab and the Manager, live; no browser errors.
  - API-09 `result.json` and `J7-task-page-760.png`: J1 to J8 Pass; zh-CN; old `task.json` bytes unchanged.
- Note: J7's `docOverflow: true` means "no overflow". The field is misnamed in the journey script (`scrollWidth <= innerWidth + 1`), and the screenshot confirms it.

## Docs

- The ticket updated server `projects.md`, `agent_tools_mcp_server.md` and web `projects.md`; I checked them.
- Delivery added the Comments-block clause to the work-packet summaries in `agent_tools.md` and `agent_team_execution.md`. See `docs-sync-report.md`.

## Release

- Decision: **No release**, the RELEASE.md default. The Task says "Release as the user decides", and the user has not decided. A beta is available on request.
- `release-notes.md` is written for the next release.

## Residual Risks

- AC-002 (concurrent comments) is proven by unit tests only.
- Long threads enlarge list results (accepted in the design).
- After a rollback, an older build drops comments from Tasks it rewrites (accepted; stated in the release notes).

## Follow-ups (`follow-ups.md`, unsent; the Solution Designer sends them)

- FU-001: meaning search over comments and long descriptions.
- FU-002: tell a running worker about new comments.
- FU-003: stale gated suite `delegated-launch-config-defaults` (autobyteus-197); still fails 2 cases on the merged base.
- FU-004: file explorer logs its own disconnect as an error.
- FU-005 (delivery): `native-compaction-terminal-drain.test.ts` races its own event delivery under load.
