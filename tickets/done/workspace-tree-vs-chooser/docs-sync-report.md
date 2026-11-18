# Docs Sync Report

## Scope

- Ticket: `workspace-tree-vs-chooser` (Project Task `autobyteus-385`), SR-004 / API-REV-001 / CRR-002, CRR-003
- Trigger: the code reviewer's pass after the API/E2E test-code review CRR-003 (reviewed route, `task_size=Large`, `architectural_risk=High`)
- Base: `origin/personal` @ `3ef5e33eec`; the branch already contains it
- Post-integration verification: delivery's clean-clone run (`evidence/DEL-*-clean-clone.log`)

## Why Docs Were Updated

- The change updated seven docs:
  - web `workspace_layout.md`: the three views (Workspaces, Runs, Projects) in a "View" menu; folders listed only while they have a listed run; no remove button on folder rows; no add form in the run section;
  - web `projects.md`, `chat.md` (Remove in the chooser, with the refusal while a run is active), `file_explorer.md`;
  - `GLOSSARY.md`;
  - server `run_history.md` (`lastActivityAt`, `RunLastActivityReader`, the read windows) and `workspaces.md`.
- Delivery checked them against the code on the validated head and found them accurate. Delivery made no doc edits.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| The seven docs listed above | The change's own docs | Updated (by the change; verified) | They match WVC-001…004, PLN-01…10 and the read probe |
| `DESIGN.md` | The project's design document (skill rule) | No change | It mentions workspaces only as pnpm workspace packages; no principle or design case is affected |
| `TESTING.md` | The testing guideline (skill rule) | No change | It lists test layers, not individual probe scripts; the new opt-in probes (`test:e2e:workspace-views-chooser`, `run-history-read-budget-probe.mjs`) belong to their layer as they are |
| `RELEASE.md` | The release guide (skill rule) | No change | Nothing about finalizing or releasing changes |
| Other web and server docs mentioning removing a folder or workspace | Older text about a tree-side Remove | No change | The hits are about packages, definitions and integrations |

## Removed / Replaced Components Recorded

| Old | Replaced By | Documented In |
| --- | --- | --- |
| Remove on the left tree's folder rows | Remove in the chat chooser (refused while a run is active) | `chat.md`, `workspace_layout.md` |
| The "No workspace" bucket | Org runs stored without a root folder show only in the Runs view | `workspace_layout.md`, `run_history.md` |
| The run section's add form and New Project link | Removed; folders come from the chooser, Projects from the Projects page | `workspace_layout.md`, `projects.md` |

## Delivery Continuation

- Result: `Pass`. Next: verification and finalization. No release unless the user says so (AC-007).
