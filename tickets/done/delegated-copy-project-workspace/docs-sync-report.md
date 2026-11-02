# Docs Sync Report — delegated-copy-project-workspace

## Scope

- Ticket: `delegated-copy-project-workspace` (Project Task autobyteus-97). Task size `Medium`, architectural risk `High`, route: reviewed.
- Trigger: code reviewer's validated package (CRR-001 Pass, API-REV-001 Pass 95.9%, CRR-002 Pass).
- Bootstrap base reference: `origin/personal` `c952758a81`.
- Integrated base reference used for docs sync: `origin/personal` `c952758a81` (the branch was current; nothing to integrate).
- Post-integration verification reference: not needed (no new base commits).

## Why Docs Were Updated

- Summary: a new local delegated copy now runs in its Task's Project's first linked folder, a missing first link refuses the delegation with a new coded error, and a Project folder becomes a Workspaces row after the first delegation into it. No long-lived doc said where a copy runs; one (Org configured placements) implied the configured source always decides it.
- Why this should live in long-lived project docs: the folder rule and its refusal are part of the delegation contract every future change to delegation, Projects or Orgs must respect.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | Design spec docs list (Saved-ID delegation, Workspace Registration Boundary) | `Updated` | New § Folder of a new copy; registration boundary sentence |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | Design spec docs list (CM-6) | `Updated` | One sentence in CM-6; a status row |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Design spec: "if it states inheritance" | `No change` | It speaks only of copies' memory folders, not their working folder |
| `autobyteus-web/docs/agent_orgs.md` | Found by search: "Fresh delegation uses the updated configured source" | `Updated` | The configured source's folder yields to the Task's Project folder (DCF-07) |
| Other server/web docs mentioning copies and workspaces | Search | `No change` | No statement about a copy's working folder |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | New subsection + sentence | § Folder of a new copy (rule, scope across roots and sub-work, Team copy one folder, inherit cases, `TASK_PROJECT_FOLDER_UNAVAILABLE` with its text, no parameter, existing copies keep their folder, remote unaffected, tree unchanged); Workspace Registration Boundary: delegation checks the first link; a Project folder becomes a Workspaces row after the first delegation | REQ-001…008 |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | Sentence + status row | CM-6 names where a new local delegated run works; status row "CM-6 folder of a new delegated run" | Model contract |
| `autobyteus-web/docs/agent_orgs.md` | Qualification | Fresh delegation of a configured placement runs in the Task's Project folder when it has one | REQ-003 (configured placements) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Folder of a new copy | Project's first link, else inherit; refusal on a missing link; existing copies keep theirs | requirements REQ-001…007, DEC-001…006 | server `projects.md`, `collaboration_model.md` |
| Workspaces row for a Project folder | A delegation into an unregistered Project folder registers it | API/E2E API-04 `newRowForProjectFolder: true` | server `projects.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "A new copy always takes the top-level run's folder" (implicit) | The Project folder rule | server `projects.md` § Folder of a new copy |

## No-Impact Decision

N/A.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, archive, finalization into `origin/personal`; no release unless the user asks.
