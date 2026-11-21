# Docs Sync Report

## Scope

- Ticket: `team-run-follows-definition` (Project Task `autobyteus-22`)
- Trigger: post-API/E2E test-code review pass CRR-008 (code reviewer); validated package ready for delivery
- Bootstrap base reference: `origin/personal` @ `a07767f4d0`
- Integrated base reference used for docs sync: `origin/personal` @ `ecd6d4556c` (77 commits), merged into `codex/team-run-follows-definition` as `e87b6b9ac9` (no conflicts)
- Post-integration verification reference: `evidence/DEL-post-integration/` (both typechecks, the ticket's server and web tests, every E2E case of the validation; see `release-deployment-report.md`)

## Why Docs Were Updated

- Summary: the implementation commits documented the server side: `agent_team_execution.md` § Membership Follows The Definition (and FU-001's fix), `agent_communication.md`, `collaboration_model.md`, and the glossary terms Former member, Leaving, Follows its definition. Delivery checked them against the merged code. The web docs did not mention it. `autobyteus-web/docs/agent_teams.md` also said that Reload "does not rewrite … saved run/history state", which is no longer true for a Team run's members, coordinator and handoff rules. Delivery corrected that and added what the Team view shows.
- Why this should live in long-lived project docs: every later change to Team runs, the run tree or the Team view needs to know that a running Team follows its definition, what a former and a leaving member are, and how the view shows them.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | project design rules | No change | Unchanged by the base and the ticket; the Collaboration Model, which DESIGN.md names for Team changes, was updated by the ticket |
| `TESTING.md` | project testing guideline (changed by the base) | No change | The base's new rules were followed in delivery: "Rerun by impact" (plan in the delivery report) and the in-process server hook-timeout owner. The ticket's suites start the built server (`dist/app.js`), not `startStudioE2eRuntimeServer`, so their own hook limits stay correct. The AGY fixture's new `untilFile` gate is documented in the fixture, where the other `CALL_TOOLS` options are. The GraphQL-operation row does not apply: the ticket adds no GraphQL operation |
| `RELEASE.md` | project release guide (changed by the base: iOS icon check) | No change | Followed as written |
| `GLOSSARY.md` | changed by both the ticket and the base | No change | After the merge it has the ticket's three Team Runs terms and the base's Work entry / Busy run changes |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | § Membership Follows The Definition, FU-001 | No change | Matches the planner, listener and follower code and the TF cases |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | the refusal to a former member | No change | The refusal text matches TF-02/TF-03/TFL-02 |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | membership versus delegation; stored tree | No change | Has `formerMembers` and the follow rule |
| `autobyteus-web/docs/agent_teams.md` | the Team view and definition refresh | Updated | See below |
| `autobyteus-web/docs/agent_execution_architecture.md` | run-tree rendering | No change | Describes the rows' pipeline generally; the Leaving tag is documented in `agent_teams.md` |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_teams.md` | Correction + new subsection | § Definition And Package Refresh no longer says saved run state is never rewritten. It points to the new § Team Runs Follow Their Definition, which covers: a new member appears Offline; a removed member's row is tagged **Leaving** ("Removed from the team; finishing its current turn") while it finishes, opens like any member (its approval answered there) and goes once it stops; copies tagged the same; no leaving row after Stop or restart; a leaving member is never the coordinator; the history list shows current members only, while former members stay readable by run ID and on the Memory page | The ticket changed the Team view (AC-009, SR-010, CR-002, CR-003), and the web docs said nothing about it |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Membership follows the definition | Which runs follow (D-SCOPE), trigger, plan, notices, former and leaving members, refusal, warnings | design-spec.md, requirements-doc.md | `agent_team_execution.md`, `agent_communication.md`, `collaboration_model.md`, `GLOSSARY.md` (implementation) |
| The Team view | What the user sees when the definition changes | design-spec.md SR-010, TFU-01..06 | `autobyteus-web/docs/agent_teams.md` (delivery) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `autobyteus-web/components/workspace/team/TeamMembersPanel.vue` (unused, removed in CR-004) | The Team tree rows (`WorkspaceTeamExecutionTree`) | No doc named it; nothing to update |
| A Team run's members fixed at start | The run follows its definition; `formerMembers` in the stored tree | `agent_team_execution.md`, `collaboration_model.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A (docs were updated)

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification record, archive, finalization on `personal` (no release)
- Notes: no new problem outside this ticket was found; follow-ups FU-001..FU-005 are already recorded.
