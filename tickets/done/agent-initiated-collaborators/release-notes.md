# Release Notes — Agents can find and bring in other agents and teams themselves

## New

- **`list_available_agents` (optional tool).** Turn it on for an agent in the tool picker, and the agent can list the shared agents and agent teams it may work with: name, kind, address and description. It follows the same rules as the `@` menu (no Orgs, no internal helpers, not the run's own agent or team). It only lists; it never adds anything.
- **Agents bring collaborators in themselves.** When an agent sends its first message to a listed address with `send_message_to`, that agent or team joins the run, exactly as if you had `@`-mentioned it. It appears under the run, uses the run's settings, and keeps its conversation; later messages reach the same instance. A `@` mention and an agent bring-in of the same definition share one instance.
- **Parallel copies from the catalog.** `delegate_task` to a listed agent or team starts a fresh, separate copy for that task. Every call makes another copy, so work can run in parallel. Copies don't add a collaborator, and they survive Stop and reopen.
- **Teams work as one unit everywhere.** Inside any team instance (a collaborator team, a delegated copy, or an Org's mounted team), a handoff by address reaches that same instance's member. Two parallel copies of a team never cross. Each copy follows its own team's handoffs and instruction.

## Changed (approved behavior changes)

- **Org copies of a mounted team stay inside the copy.** A delegated copy of a team that is mounted in an Org now talks to its own members instead of reaching the mounted team's members.
- **Copies are placed by address.** A copy of a teammate stays inside its team. A copy of anything at the top level (an Org-level agent or team, a collaborator, a catalog agent or team) now appears at the top level of the run, even when a mounted team's member started it. "Started by …" stays in the screen-reader label only. Runs saved earlier keep their recorded placement.
- **Clearer tool wording.** On every runtime, the prompt and tool descriptions now say that `send_message_to` reaches the one instance at an address (bringing it in on first use) and that `delegate_task` always starts a new copy.

## If something can't be added

- If a listed agent or team can't run with the run's settings, the bring-in fails with the reason and nothing is added. A catalog copy that can't run returns the reason and starts nothing.

## Upgrade notes

- **No data migration.** Existing runs and history open as before.
- **Downgrade:** older versions can't restore copies started from the catalog.

## Known limitations

- The Grok (ACP) runtime wasn't tested live this round (provider quota). It uses the same tool path verified on Claude, Codex and Antigravity.
