# Product Design Requested — autobyteus-458: change a run's model and runtime on the phone

- Purpose: `New Request` (the founder's routing, 2026-11-17: analysis by the Solution Designer first, then the Product team's screen, consistent with the phone conversation design of autobyteus-506; the founder approves the screen; then this Software Engineering team builds it)
- Requested by: the founder, through `/project_task_manager`; Solution Designer of `software_engineering_team_90d2d82493b440c8807db86dfe28c6b8`
- Suggested designer: the Product team copy that has autobyteus-506 (`product_team_b622eeee720f41d18073dbd374fea33f`)

## The founder's words (condensed)

"The more I use my phone to work, the more I find a limitation: sometimes a model runs out of limits and I want to switch the model or the runtime, but I'm not able to on the phone … Imagine I'm outside: then I cannot update on my phone." (2026-11-10) — and again (2026-11-17): the desktop can update the runtime and the model; the Android phone version should provide it too, "configure the runtime and the model in a setting on the phone".

## What the screen must let him do (requirements-doc.md REQ-001…006)

- See the open agent's current runtime and model (agent run, Team lead, Team member, Org member).
- For a stopped run: choose another runtime and model from the lists the desktop offers; runtimes or models that cannot run now (usage limit reached) are marked, with when they can again when known.
- For a running run: Stop first (as on the desktop), then choose.
- The change applies when he sends the next message: the screen says so; then he types "continue".
- A Team or Org: the open member's own setting, one member at a time.
- The node's refusals in plain words (for example "'<model>' is not offered by <runtime> now. Refresh the model list and choose again.").

## What exists (investigation-notes.md)

- Phone run menu (⋮): Artifacts, Files, Activity, Messages (members), VNC Viewer (Docker nodes). No settings entry. The composer can stop a generation, not a run.
- Desktop: `ExistingRunConfigEditor.vue` (Stop when running; runtime and model choosers per agent or member; save → applies on the next message).
- Founder's screenshot: `marketing_content_creator`, "Stopped · in Marketing Team", his "Continue please" sent, composer open.

## Questions for the design

- Where the entry lives (the ⋮ menu, the header's status line, or both) and how a member of a Team is chosen when the run screen shows one member.
- How the usage-limit marks look, and what the screen says after a save ("applies when you send the next message").
- Constraints: names only, never node addresses (433); read-mostly phone layout of 506; no new Android permission.

## Links

- `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-model-runtime-458/tickets/in-progress/phone-run-model-runtime-458/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-model-runtime-458/tickets/in-progress/phone-run-model-runtime-458/investigation-notes.md`
- Founder's screenshot: `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_6ccbe8ec-f08a-4891-952f-efc126be9ac4/context/ctx_37a43e08bceb__51.jpg`
