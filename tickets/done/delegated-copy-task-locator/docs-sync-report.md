# Docs Sync Report — delegated-copy-task-locator

## Scope

- Ticket: `delegated-copy-task-locator`. Task size `Large`, architectural risk `High`, route: independent review
  (ARCH-REV-002 Pass, CRR-001 Pass, API-REV-001 Pass, CRR-002 Pass).
- Trigger: CRR-002 Pass from `/software_engineering_team/code_reviewer`. The design assigns the two `projects.md` docs
  to delivery (design-spec Final File Responsibility Mapping).
- Bootstrap base reference: `origin/personal` @ `359d2c0efd08a2725c1aa994e69c2d04c56aea46`.
- Integrated base reference used for docs sync: `origin/personal` @ `359d2c0ef`, re-fetched 2026-10-11 at delivery
  start. It has not advanced, so the ticket branch was already current.
- Post-integration verification reference: no new base commits, so the API/E2E validation stands (API-REV-001,
  CRR-002). See `release-deployment-report.md` → Initial Delivery Integration Refresh.
- Docs were synced on top of checkpoint commit `0180f7e7f`.

## Why Docs Were Updated

- **Summary.** The feature adds:
  - a public GraphQL query, `taskWorkerTasks`;
  - a server read, `ProjectTaskService.currentTasksOfTaskWorkers`, built on `rootTaskLocationOf`;
  - two client stores, `taskWorkerTaskStore` and `taskLocatorStore`;
  - a second change-feed consumer that keeps the feed open outside the Projects pages;
  - a new tree-row presentation, the Task summary with its name-line elbow;
  - a request flow that crosses the tree, the shell, the panel, the boards and the cards.

  Before this sync, none of it was in the long-lived docs.
- **Why in long-lived docs.** Later work on Projects, the Workspaces tree or the right panel needs to know three
  things:
  - the server rule: only a Task's root gets an answer, and one worker never fails the batch;
  - which feed messages invalidate which workers;
  - the locate steps, and which surface owns each step.

  The ticket artifacts are archived and are not where people look for current behaviour.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | Projects API owner, Agent Run Resources, GraphQL, Testing | `Updated` | New subsection, GraphQL entry, test coverage |
| `autobyteus-web/docs/projects.md` | Change feed, right-panel Projects tab, Testing | `Updated` | New section, feed consumer, PMU-020..025 |
| `autobyteus-web/docs/agent_execution_architecture.md` | Describes `WorkspaceHierarchyBranches`: the elbow stops at the row midpoint | `Updated` | Name-line anchor note |
| `autobyteus-web/docs/settings.md` | Holds the same branches paragraph as above | `Updated` | Same note, kept identical |
| `autobyteus-web/docs/chat.md` | Mentions `AgentRunTaskRows` | `No change` | Child-row behaviour it describes is unchanged |
| `autobyteus-web/docs/file_explorer.md` | Mentions `revealTool` | `No change` | Files reveal unchanged; locate reuses `revealTool` and is documented in projects.md |
| `autobyteus-web/docs/workspace_layout.md` | Right panel / collapsed strip | `No change` | No shell layout change; the reveal is the existing strip behaviour |
| `autobyteus-web/docs/localization.md` | New keys | `No change` | Workflow unchanged; two additive keys |
| `TESTING.md` and its 7 repointed links | User-directed rewrite (API/E2E round) | `No change` by delivery | Already reviewed in CRR-002. Delivery re-checked links in the four files it edited: 0 missing targets, 0 bad anchors |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | New subsection | "Current Task of a Task worker": who counts as a Task worker; `rootTaskLocationOf` (index only, never throws); `currentTasksOfTaskWorkers` contract (null cases, closed Task still answered, `TASK_WORKER_TASK_READ_FAILED`, read-only); liveness through the existing feed | New server read and its authority rule |
| same | GraphQL entry | `taskWorkerTasks(agentRunIds, teamRunIds)` → `[TaskWorkerTask!]!` shape and order | New public query |
| same | Testing | `task-worker-current-tasks.test.ts`, `project-tasks-schema.test.ts` | New coverage |
| `autobyteus-web/docs/projects.md` | Feed section | `taskWorkerTaskStore` as a third consumer that also retains the feed | Feed lifetime changed |
| same | New section | "Task summaries in the Workspaces tree": rows that get a summary; data store and invalidation rules; row event isolation and accessible names; the locate steps and their owners; expiry and supersede; pages without a right panel (`selectAgentRun` / `onOpenTeamRun`) | New feature behaviour and ownership |
| same | Testing | PMU-020..025 and the fixture helper `task-worker-boundaries.mjs` | New durable coverage |
| `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` | One sentence | `anchor="name-line"` on two-line Task-worker rows | The midpoint rule there was no longer complete |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Task-worker authority | Only a Task's root has a current Task answer. The server's index decides it, not a client scan | design-spec DS-001, AF-002 | server `projects.md` |
| Batch resilience | One worker never fails the batch. A deleted Task or Project answers null | design-spec Interface Boundary Mapping, AR-001 | server `projects.md` |
| Invalidation map | `connected` / `task_upserted` root or cached Task / `task_removed` / `project_removed`; per-key epochs; rebinding | design-spec DS-003 | web `projects.md` |
| Locate steps | `pending` → `revealed` (shell) → `visible` (board, settled list only) → done (card). 10 s expiry. The latest request wins | design-spec DS-002, DS-005 | web `projects.md` |
| No-shell pages | The host opens its run first, and the request waits for the shell | design-spec DS-004, REQ-012 | web `projects.md` |
| Fixture boundary | Probe pages that list Task workers must route `GetTaskWorkerTasks` and `/ws/projects` | api-e2e C-002 | web `projects.md` Testing |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Already-selected branch of `onSelectTeam` inlined | Shared `openTeam` core used by `onSelectTeam` and `onOpenTeamRun`; `onSelectTeam` behaviour unchanged | web `projects.md` (pages without a right panel); code comments |
| TESTING.md per-regression runbook anchors | Owning probe/test file headers (user-directed rewrite; already reviewed) | `TESTING.md`; the seven repointed links |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and release notes, then hold for explicit user verification in the desktop
  app.
- Notes: docs edits are uncommitted on purpose. They are committed with the ticket archive after verification.
