# Superseding Rework: Daily Assistant Is Private/User-Managed, Not Server Built-In

## Status

Current authoritative addendum for Daily Assistant as of 2026-05-07.

User clarified that `Daily Assistant` should not remain a server-provided built-in/default-featured agent. It should live in the private agent package at `/Users/normy/autobyteus_org/autobyteus-private-agents`, and users can choose whether to feature it through the existing Server Settings / Featured catalog items UI.

This artifact supersedes previous `daily-assistant` server built-in/default-featured direction. Keep the current Agents page grouping work and keep the built-in-agent centralization for true platform built-ins, but remove Daily Assistant from server built-ins.

## Correct Product Direction

- `Memory Compactor` is a true platform built-in agent because the platform uses it for memory compaction and defaults `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` to it.
- `Daily Assistant` is a user/private/recommended agent, not platform infrastructure.
- The server must not automatically seed `Daily Assistant` into `<appDataDir>/agents`.
- The server must not automatically initialize `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` to feature `Daily Assistant`.
- Users can make `Daily Assistant` featured through the existing Settings UI if it is available through configured agent package roots.

## Private Agent Location

Use the private agents repo as the source of the Daily Assistant definition:

```text
/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/
  agent.md
  agent-config.json
```

Current investigation found an existing private source candidate:

```text
/Users/normy/autobyteus_org/autobyteus-private-agents/agents/super-ai-assistant/
  agent.md
  agent-config.json
```

Implementation should migrate/rename or copy that private agent to `agents/daily-assistant/` with `agent.md` name `Daily Assistant`, preserving intended tools/processors from the private definition.

The server loads private package agents when configured with:

```text
AUTOBYTEUS_AGENT_PACKAGE_ROOTS=/Users/normy/autobyteus_org/autobyteus-private-agents
```

## Required Server Code Changes

1. Remove `Daily Assistant` from `BUILT_IN_AGENT_DEFINITIONS`.
2. Remove Daily Assistant template files from server built-in templates.
3. Remove Daily Assistant legacy migration/seeding/featured-setting code from server built-in bootstrapper.
4. Keep `Memory Compactor` in the unified built-in-agent subsystem.
5. Keep `bootstrapBuiltInAgents()` but have it seed only true platform built-ins, currently `Memory Compactor`.
6. Keep blank compaction setting initialization for `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID=autobyteus-memory-compactor`.
7. Do not auto-migrate `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` from `autobyteus-super-assistant` to `daily-assistant`; featured catalog selection is user-managed now.
8. Remove/update tests, smoke scripts, docs, validation artifacts, and handoff text that claim server fresh startup seeds or features `Daily Assistant` by default.

## Required Private-Agent Change

In `/Users/normy/autobyteus_org/autobyteus-private-agents`:

- Add or rename to `agents/daily-assistant/`.
- Set `agent.md` frontmatter:

```yaml
name: Daily Assistant
```

- Keep the appropriate Daily Assistant instructions/tools/processors.

## What Stays From Current Work

- Agents page grouping stays.
- Featured catalog settings UI stays.
- Users can add `Daily Assistant` to featured catalog items if they want.
- Built-in-agent centralization stays, but it now contains only platform built-ins such as Memory Compactor.
- Memory Compactor remains seeded under `<appDataDir>/agents/autobyteus-memory-compactor/`.

## Explicitly Rejected Now

- Server auto-seeding `Daily Assistant`.
- Server auto-featuring `Daily Assistant`.
- Treating `Daily Assistant` as platform infrastructure.
- Keeping Daily Assistant in `autobyteus-server-ts/src/built-in-agents/templates/`.
- Maintaining legacy `autobyteus-super-assistant` migration in server bootstrapper for a non-built-in private agent.

## Validation Expectations

- Fresh server startup with empty data dir seeds `Memory Compactor` only as a built-in platform agent.
- Fresh server startup does not create `<appDataDir>/agents/daily-assistant/` unless it already exists through user/private package loading or manual user data.
- Fresh server startup does not initialize featured catalog setting to `daily-assistant`.
- Compaction setting still initializes to `autobyteus-memory-compactor` when blank.
- With `AUTOBYTEUS_AGENT_PACKAGE_ROOTS=/Users/normy/autobyteus_org/autobyteus-private-agents`, GraphQL can discover private `daily-assistant` if present in that package root.
- Settings UI can feature `daily-assistant` when user chooses it.
- Active source/docs should not claim Daily Assistant is a server built-in/default-featured agent.

## User Direction

User said this should be simple: remove Daily Assistant from built-ins and move/keep it in `autobyteus-private-agents`; keep the current Agents page grouping and Memory Compactor built-in centralization changes.
