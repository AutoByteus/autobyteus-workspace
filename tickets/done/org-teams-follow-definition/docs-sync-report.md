# Docs Sync Report

## Scope

- Ticket: `org-teams-follow-definition` (Project Task `autobyteus-29`)
- Trigger: post-API/E2E test-code review pass CRR-014, after DR-001's integration block was resolved upstream (SR-016..SR-018, IR-006..IR-009)
- Bootstrap base reference: `9f6add773b`; the ticket branch already merged `origin/personal` `f2c0d2a902` and `a07d6fbac8` (SR-016)
- Integrated base reference used for docs sync: `origin/personal` @ `cb5e1c80f3` (9 commits), merged as `3045cf52e6` (no conflicts)
- Post-integration verification reference: `evidence/DEL-post-integration/`

## Why Docs Were Updated

- Summary: the implementation documented the server side thoroughly:
  - `agent_orgs.md`: the new § Org Container, plus a note that the older sections describe the released shape the migration converts;
  - `collaboration_model.md`: §1, §2.1, CM-3, CM-5, §3, §5;
  - `agent_team_execution.md`: Org-mounted Teams follow;
  - `agent_memory.md`, and `GLOSSARY.md` ("Org Runs").

  The web docs had two gaps:
  - `agent_teams.md` § Team Runs Follow Their Definition (written for autobyteus-22) listed only standalone runs and definition copies as following;
  - `agent_orgs.md` said nothing about the Org view following definitions or the Leaving tag this ticket added to the Org tree (`AgentOrgRunMemberTree.vue`).

  Delivery fixed both.
- Why this should live in long-lived project docs: later changes to Orgs, the Org tree or Team membership need to know that an Org is a container of unit runs that follow their definitions, and how the view shows it.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | project design rules | No change | The change follows the Data Migration Guideline that DESIGN.md names (Migration Required, approved as DEC-001, no rollback) and the Collaboration Model, which the ticket updated |
| `TESTING.md` | testing guideline | No change | The new suites keep their gates and commands in their file headers (`org-container-package.e2e.test.ts`, `agent-org-units-conversion-cost.e2e.test.ts`). The fresh-start job's clean-image step needs Docker, and its units step fails as root; both are host limits the reports record, not wrong commands |
| `RELEASE.md` | release guide | No change | Rollback § already says a release with an app-data migration normally cannot be rolled back and its notes say so; the ticket's `release-notes.md` does. The ticket changes no build input, so no build-only release run applies |
| `GLOSSARY.md` | "Org Runs", "Follows its definition" | No change | Follows its definition now includes a Team mounted in an Org |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | § Org Container | No change | Matches the container, directory, planner, listener and migration code and OC-01..14 |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | CM-3/CM-5, run storage | No change | Lines 96ff. name an Org-mounted Team as a Team run of its own |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Membership Follows The Definition | No change | Line 729: an Org-mounted Team is a Team run of its own and follows |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | unit runs' memory | No change | |
| `autobyteus-web/docs/agent_teams.md` | Team Runs Follow Their Definition | Updated | See below |
| `autobyteus-web/docs/agent_orgs.md` | Status And Hierarchy | Updated | See below |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_teams.md` | Correction | § Team Runs Follow Their Definition: the runs that follow now include a Team inside an Org; it links to the Org view section | It listed only standalone runs and definition copies, which is no longer complete |
| `autobyteus-web/docs/agent_orgs.md` | New subsection | § The Org Follows Its Definitions, under Status And Hierarchy: a new unit or member appears Offline; a removed one is tagged **Leaving** while it finishes (`AgentOrgRunMemberTree.vue`, `leaving` on the run-tree row) and goes once it stops; the Org view otherwise looks as before. Links to the server's § Org Container | The ticket changed the Org tree (REQ-002, REQ-009, AC-002, AC-008; OCU-03..05) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Org container | Units are runs of their own with `containedIn`; container file shape; messages, rules, following, view, upgrade | org-container-storage-contract.md, design-spec.md | `agent_orgs.md`, `collaboration_model.md`, `GLOSSARY.md` (implementation) |
| Org view following definitions | New, leaving and removed units and members in the Org tree | design-spec.md, OCU-01..05 | `autobyteus-web/docs/agent_orgs.md` (delivery) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Org hosting of members inside the Org root (`agent-org-run.ts`, `agent-org-run-options.ts`, `agent-org-communication-port.ts`, `agent-org-execution-scope-builder.ts`, `agent-org-run-message-delivery.ts`, `agent-org-run-execution-tree-mutator.ts`, `root-agent-execution-registry.ts`) | The Org container (`AgentOrgContainers`, `OrgContainerDirectory`, `OrgViewComposition`, `OrgMembershipPlanner`) and unit runs | `agent_orgs.md` § Org Container; the older sections are marked as the released shape the migration converts |
| The Org's own message log and member folders | Unit runs' logs and folders; startup migration `20261122_agent_org_units_own_runs_v1` | `agent_orgs.md` § Org Container (Upgrade) |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification record, archive, finalization (no release)
- Notes: delivery found one new follow-up, FU-002 (two two-server cases share the ID RC-56).
