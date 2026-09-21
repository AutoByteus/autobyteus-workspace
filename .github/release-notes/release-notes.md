## What's New

- Build Agent Orgs from standalone Agents and flat Agent Teams, including coordinator-free organizations, local Org-owned members, and shared reusable definitions.
- Create, import, browse, run, stop, reopen, and continue Agent Org work from the normal catalog and workspace experience.
- Configure stopped Agent Orgs and their members before continuing, while preserving conversation history, activity, tasks, files, and model settings.

## Improvements

- Agent Org catalogs now show readable Agent and Team names, optional avatars, accurate member icons, and usable details without requiring prior inspection.
- History loads earlier during startup and uses a single accessible row target for mouse, keyboard, and disclosure interaction.
- Stopping a run retains its Activity details and draft so completed work remains inspectable offline.
- Flat Team packages tolerate omitted optional presentation metadata while still rejecting genuinely missing member references.
- Org-owned Team-local Agents resolve correctly for direct and mounted execution.

## Fixes

- Legacy nested-Team migration now records per-run warnings without blocking application startup when an individual historical run cannot be converted safely.
- Startup no longer repeatedly rebuilds Agent Org package readiness while loading workspace and organization history.
- Stopped Org and Team configuration reads the latest canonical model settings before Save, copy, or continuation.
- Org history disclosure, selection, Stop actions, sibling rows, and retained content no longer interfere with one another.

## Compatibility Notes

- Existing standalone Agent and flat Team histories remain available without destructive rewriting.
- Invalid definitions with genuinely missing referenced members remain excluded rather than partially loaded.
- Keep frontend and backend components on the same release version when using the new Agent Org execution and configuration behavior.
