# Docs Sync Report — projects-tree-one-place

## Scope

- Ticket: `projects-tree-one-place` (Project Task autobyteus-353). Task size `Medium`, architectural risk `Low`, route: direct (no architecture, code or test-code review).
- Trigger: API/E2E validation API-REV-001 Pass (95.7%).
- Bootstrap base reference: `origin/personal` `f7f331d96b`.
- Integrated base reference used for docs sync: `origin/personal` `f7f331d96b` (the ticket branch was already current; nothing to integrate).
- Post-integration verification reference: not needed (no new base commits); see `release-deployment-report.md` § Initial Delivery Integration Refresh.

## Why Docs Were Updated

- Summary: this ticket changes what Projects mode lists. A Project now lists exactly the runs started under it: no Task hosts, no per-Project scopes of delegated rows, no Org group, no pinning beyond the 6-run cap, and Task events no longer re-read. The docs written by autobyteus-347 described the old rules.
- Why this should live in long-lived project docs: the listing rule ("one place per run") and the re-read triggers are what future work on Projects mode and run history must respect; stale scope/host text would mislead.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/run_history.md` | Implementation handoff; § Project Run History described hosts, pinning and scopes | `Updated` | Section rewritten |
| `autobyteus-server-ts/docs/modules/projects.md` | § Project run links described the removed `runLinksOf` | `Updated` | Subsection removed; port list and Testing updated; a misplaced testing note (347) fixed |
| `autobyteus-web/docs/projects.md` | § Projects Mode In The Left Panel described scopes, Org rows, several Projects per run and Task-event re-reads | `Updated` | Tree, delegated rows, open run, re-read triggers, Testing |
| `autobyteus-web/docs/workspace_layout.md` | The reveal "in every Project that lists the run" | `Updated` | One line |
| `autobyteus-web/docs/chat.md` | Project choice and launch | `No change` | Starting under a Project is unchanged |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | `## Project` section | `No change` | Unchanged by this ticket |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/run_history.md` | Section rewrite | § Project Run History: exactly the runs started under the Project; a host run is in no Project; no Org runs; plain 6-newest cap; no delegated rows in the read; shape `{projectId, agentDefinitions, teamDefinitions}`; `ProjectRunLinks` has only `startedRunsOf` | REQ-001, DEC-002…004 |
| `autobyteus-server-ts/docs/modules/projects.md` | Removal + edits | § Project run links removed (`runLinksOf` is gone); Main Owners names `ProjectRunLinks (startedRunsOf)`; Testing bullets corrected | Removed component |
| `autobyteus-web/docs/projects.md` | Section rewrite | One Project per run; host runs stay in Workspaces; agent groups and TEAMS group, no Org group; delegated rows as in Workspaces; reveal in the run's Project; re-read triggers (`connected`, Project added/renamed/removed, start from this window, archive/delete/Stop of Agent and Team runs), Task events read nothing; Testing list without the removed specs | REQ-001…004 |
| `autobyteus-web/docs/workspace_layout.md` | One line | Reveal in the run's Project | REQ-001 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One place per run | Projects mode reflects `project_runs.json` only; a run handing out a Project's Tasks is not listed under it | requirements REQ-001, DEC-001/002; design spec | server `run_history.md`; web `projects.md` |
| Re-read triggers | Only events that change a listing re-read; Task events do not | implementation handoff (`projectRunsStore`) | web `projects.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `TaskExecutionResourceService.runLinksOf`, `ProjectRunLinks.runLinksOf`, Task-host listing | Listing from `startedRunsOf` only | server `run_history.md` § Project Run History |
| `projectRunHistory.scopes`, `agentOrgRuns`; `utils/collaboration/taskExecutionScope.ts`; scope props of the row components | Unscoped Workspaces rows; no Org group | web `projects.md` § Projects Mode In The Left Panel |
| Pinning of open-work hosts beyond the cap (`listAgentGroupsOf` `pinned`) | Plain 6-newest cap | server `run_history.md` |
| Task-event and unscoped-copy re-reads in `projectRunsStore` | Listing-change triggers only | web `projects.md` |

## No-Impact Decision

N/A: docs were updated.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, archive, finalization into `origin/personal`, then the user's beta release per `RELEASE.md`.
- Notes: `tickets/done/projects-left-navigation/` keeps 347's historical documents (including its release notes' "Older runs are included" bullet) unchanged; this ticket's `release-notes.md` states the change for a later stable release.
