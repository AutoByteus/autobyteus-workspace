# Docs Sync Report — projects-left-navigation

## Scope

- Ticket: `projects-left-navigation` (Project Task autobyteus-347). Task size `Large`, architectural risk `High`, route: reviewed (architecture review, code review, API/E2E, test-code review).
- Trigger: code reviewer's validated package (CRR-005 Pass; API-REV-002 Pass, 95%).
- Bootstrap base reference: `origin/personal` `8faae968997564cf52dc404eb6b6f6a7721d5434`.
- Integrated base reference used for docs sync: `origin/personal` `bfb6d5b15438071973294b6c60faa0c811e57b94`, merged into the ticket branch as `0c8a6f4d22`, after the checkpoint commit `754d9f6373` (review records); see the release/deployment report.
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh; evidence `evidence/delivery/DEL-*`.

## Why Docs Were Updated

- Summary: the ticket adds a Projects mode to the left panel's run section, lets a run be started under a Project (from the tree or the New chat chip), records that in a new Projects-owned file `projects/<projectId>/project_runs.json`, adds the `projectRunHistory` query and `projectId` start inputs, a `## Project` system-instruction section, and the briefcase icon. None of this was in the long-lived docs.
- Why this should live in long-lived project docs: the new persisted file, its owner, its write order and its rollback property; the listing rules (cap, scopes); the prompt section; and the web liveness rules (re-read triggers, including Stop) are what a future change to Projects, run history, prompts or the left panel must respect.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | Design spec docs list; new persisted file, ports, GraphQL inputs | `Updated` | Persistence Layout, Delete, new §§ Runs started under a Project / Project run links, Main Owners, GraphQL, Testing |
| `autobyteus-server-ts/docs/modules/run_history.md` | Design spec docs list; new query and listing rules | `Updated` | New § Project Run History; Responsibilities; GraphQL Surface. Base's runtime-switch additions kept |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Design spec docs list; new instruction section | `Updated` | Section ownership table and logical order |
| `autobyteus-web/docs/projects.md` | Design spec docs list; Projects mode, icon | `Updated` | New § Projects Mode In The Left Panel; Primary Navigation icon; Testing |
| `autobyteus-web/docs/workspace_layout.md` | Design spec docs list; run section header, strip label, reveal | `Updated` | App Shell Left Navigation, collapsed strip, reveal owner per mode |
| `autobyteus-web/docs/chat.md` | Design spec docs list; draft Project choice, chip, launch | `Updated` | Intent table row, new § Project choice, carried starts carry no Project |
| `docs/design-cases.md` | Changed by the ticket (Case 14) and by the base | `No change` | Merge kept both sides; numbering has no collision |
| `RELEASE.md`, `TESTING.md`, `DESIGN.md` | Delivery rules; checked for changes in the base | `No change` | Unchanged between `8faae96899` and `bfb6d5b154` |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | New sections + edits | `project_runs.json` in the layout tree and optional files; § Runs started under a Project (shape, single writer, write order before run records, `PROJECT_NOT_FOUND`, entries without a run, tolerant read, readers, older builds); § Project run links (`runLinksOf` rule incl. multi-Project copies); Project Delete keeps the file; `project-run-links-composition.ts`; GraphQL `projectId` inputs; Testing | New persisted file and ports (design SR-009, CR-001) |
| `autobyteus-server-ts/docs/modules/run_history.md` | New section + edits | § Project Run History: which runs, the cap (6 newest + open-work hosts), scopes formula, shape, errors, run records unchanged (rollback-shape test) | New query and listing rules (DS-003) |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Table row + order | `Project` section: owner, presence (Agent runs and Team members, start and restore; none for Org members and Task copies; omitted after Project Delete), text, order, five runtimes | DS-005 |
| `autobyteus-web/docs/projects.md` | New section + edits | Switch and remembered mode; tree shape, actions, states; scoped delegated rows; open-run mark and reveal; group archive scope; `projectRunsStore` reads and the five re-read triggers, trigger 4 including Stop; live status only for runs with a live context; briefcase icon; probe and specs | REQ-001…015; IR-003 / CR-003 |
| `autobyteus-web/docs/workspace_layout.md` | Edits | Run section header switch; strip entry label by mode; reveal owner in Projects mode | REQ-001, REQ-016 strip label |
| `autobyteus-web/docs/chat.md` | Table row + new subsection | `newChatInProject` intent; Project choice (chip tabs, labels, folder rule, "No project", launch, no chip after send); carried starts carry no Project | REQ-004, REQ-005, DEC-014 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Where "started under a Project" lives | In `project_runs.json`, not on run records; written before the run's own records; older builds never read it | design-spec SR-009, E-041/E-042; CRR-001 CR-001 | server `projects.md`, `run_history.md` |
| Project listing rules | Started-under ∪ Task hosts; agent cap 6 + open-work hosts; scopes formula; multi-Project copies | design-spec DS-003; implementation-handoff | server `run_history.md`, `projects.md`; web `projects.md` |
| Projects-mode liveness | Five re-read triggers; Stop is trigger 4; status overlay holds only for runs with a live context | design-spec DS-004 (corrected at delivery), IR-003 Important Assumption 6, CRR-004 | web `projects.md` |
| `## Project` instruction section | Who gets it, when, its text and order | design-spec DS-005; IMP-06; API-01 PRH-01/03 | server `prompt_engineering.md` |
| Draft Project choice | Folder rule, chip, launch input | design-spec DS-001; requirements DEC-014 | web `chat.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Run section always the Workspaces tree; its heading | `Workspaces \| Projects` switch; `WorkspaceHistoryWorkspaceSection` body moved to shared `RunDefinitionGroups` | web `projects.md`, `workspace_layout.md` |
| Projects icon `heroicons:folder` | `heroicons:briefcase` | web `projects.md` § Primary Navigation |
| "Status changes need no re-read" (design DS-004) | Holds only for runs with a live context; Stop re-reads | web `projects.md`; design spec DS-004 corrected (attributed note) |

## No-Impact Decision

N/A: docs were updated.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: finish the post-integration rerun, write the handoff summary and the release/deployment report, archive the ticket, finalize into `origin/personal`.
- Notes: the design spec's DS-004 text was corrected narrowly at delivery, with an attributed note, as IR-003's handoff and the code reviewer asked; intended behavior did not change (CRR-004 accepted it). The Solution Designer is told in the terminal message.
