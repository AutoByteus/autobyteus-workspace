# Superseding Rework: Daily Assistant Identity Is Private/User-Managed

## Status

Revised after latest user clarification on 2026-05-07.

Earlier identity work established the desired name/folder `daily-assistant` / `Daily Assistant`. The corrected ownership is now: that identity belongs in the private agents package, not in server built-in/default-featured provisioning.

## Correct Target Identity

- Private agent folder: `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/`
- Agent definition id from folder: `daily-assistant`
- `agent.md` frontmatter name: `Daily Assistant`
- Old private/source candidate: `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/super-ai-assistant/`
- Legacy server/product id/name `autobyteus-super-assistant` / `AutoByteus Super Assistant`: not an active server built-in alias or migration target in the corrected design.

## Required Implementation Change

1. Add/rename/copy the private assistant definition to `autobyteus-private-agents/agents/daily-assistant/`.
2. Set `agent.md` frontmatter to `name: Daily Assistant`.
3. Preserve the intended tools, processors, and assistant instructions from the current private assistant source unless implementation finds a more current private source.
4. Remove active server built-in/default-feature references for Daily Assistant:
   - no server template;
   - no built-in registry row;
   - no server seed into `<appDataDir>/agents/daily-assistant/`;
   - no default featured setting initialization;
   - no featured migration from `autobyteus-super-assistant`.
5. Keep frontend behavior generic: if users configure the private package root and feature `daily-assistant` in Settings, the existing featured catalog flow displays it.

## Explicitly Rejected Now

- Keeping Daily Assistant as a server built-in/default-featured agent.
- Creating both private and server built-in Daily Assistant sources.
- Server auto-migrating old featured rows to `daily-assistant`.
- Frontend hard-coded aliases/display overrides for `autobyteus-super-assistant`.

## Validation Expectations

- Private path `agents/daily-assistant/` exists in `/Users/normy/autobyteus_org/autobyteus-private-agents` with formal name `Daily Assistant`.
- Server built-in registry/templates do not contain Daily Assistant.
- With `AUTOBYTEUS_AGENT_PACKAGE_ROOTS=/Users/normy/autobyteus_org/autobyteus-private-agents`, the normal agent loader can discover `daily-assistant`.
- `Featured agents` shows Daily Assistant only when user settings choose it.

## User Direction

User asked to keep current changes, remove Daily Assistant from built-ins, and keep/move it to `autobyteus-private-agents` so users decide what becomes featured.
