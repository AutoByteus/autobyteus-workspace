# Docs Sync Report — mention-delegation-dismissal

## Scope

- Ticket: `mention-delegation-dismissal`. Classification is unchanged: `task_size=Large`, `architectural_risk=High`, reviewed route.
- Trigger: CRR-002 passed. The code reviewer handed off the full validated package for delivery.
- Bootstrap base reference: `origin/personal@3c8e49ad5`.
- Integrated base reference used for docs sync: `origin/personal@a07b17a5e`, merged into the ticket branch as `e09a17bc9`.
- Post-integration verification reference: `delivery-evidence/post-integration-server.log` and `delivery-evidence/post-integration-web.log`. Both passed.

## Why Docs Were Updated

- Summary:
  - `@` mentions no longer add a collaborator. The focused agent delegates instead.
  - A description-only `delegate_task` from an unowned sender creates a Task with no Project (ad-hoc) and returns its `task_id`.
  - `create_or_update_task` now has strict create and update modes. The update mode rejects `project_id` together with `task_id`.
  - Setting an ad-hoc Task to DONE closes its copies forever.
  - Every agent that has `delegate_task` also gets `create_or_update_task`.
  - Deleting a run deletes its ad-hoc Tasks.
- Why this should live in long-lived project docs: these are durable tool contracts, storage layout (`<appDataDir>/ad-hoc-tasks/`) and lifecycle rules. Agents, runtimes and future work depend on them.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | Ad-hoc Tasks, the strict `create_or_update_task` modes, storage, DONE and deletion | Updated (implementation commit); merged cleanly with the base's retired built-in Project Task Manager text | Checked after the merge: the base's "ships no Project manager agent" paragraph and our ad-hoc section agree |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | `@` resolution adds nothing; `delegate_task` result carries `task_id` | Updated (implementation) | Accurate |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | `create_or_update_task` added wherever `delegate_task` is | Updated (implementation) | Accurate |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | MCP tool schema modes | Updated (implementation) | Accurate |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Mention resolution; ad-hoc ownership | Updated (implementation) | Accurate |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team `@` and `delegate_task` `task_id` | Updated (implementation) | Accurate |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Mention note text | Updated (implementation) | Accurate |
| `autobyteus-web/docs/chat.md` | Mention chips and collaborator rows | Updated (implementation), plus a delivery merge-conflict resolution | Kept our sentence (`collaborator_added adds the contexts in place.`, with no pending-send clause, because `@` no longer adds). Added the base's new "Collaborator Artifacts" bullet. |
| `autobyteus-web/docs/projects.md` | Ad-hoc Tasks hidden from the Projects page; tool modes | Updated (implementation) | Accurate |
| `autobyteus-web/docs/agent_teams.md` | Team `@` behavior | Updated (implementation) | Accurate |
| `TESTING.md` | New gated E2E suite and probe commands | Updated (API/E2E round) | Merged cleanly with the base's changes |
| `autobyteus-server-ts/README.md`, `docs/modules/agent_definition.md` | Base-only changes (retired built-in migration) | No change | They do not describe the changed tool contract |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/chat.md` | Merge reconciliation (delivery) | Combined the implementation wording with the base's Collaborator Artifacts bullet | The conflict came from the latest-base integration |
| All other docs listed above | Behavior update (implementation `a2a7b37bc`, API/E2E round) | See the implementation handoff | Final behavior |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Tasks with no Project | Text-only `task.json` under `ad-hoc-tasks/`. They are hidden from Projects, not gated by the Projects migration, and deleted with their hosting run. | design-spec.md | server `projects.md` § Tasks With No Project (Ad-Hoc) |
| Strict `create_or_update_task` modes | Create is `{project_id, description}`. Update is `{task_id, status?, description?}`, and `project_id` is rejected. | requirements-doc.md REQ-005 | server `projects.md`, `agent_tools_mcp_server.md`; web `projects.md` |
| `@` resolves, does not add | The note instructs `delegate_task`. There is no collaborator row at send time. | design-spec.md | `agent_communication.md`, `standalone_agent_run_root.md`, web `chat.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `@` mention adds a collaborator at send time | Mention resolution plus a note; the focused agent uses `delegate_task` | `agent_communication.md`, web `chat.md` |
| Update via `{project_id, task_id}` | Update via `{task_id}` alone | server `projects.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: write the handoff summary and release notes, then hold for explicit user verification.
- Notes: the coordinated update to the agent repository's Project Task Manager skill (external repo) stays a residual risk. It is not a doc gap in this repository.
