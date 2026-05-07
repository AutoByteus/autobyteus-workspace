# Superseding Rework: Built-In Agent Subsystem Owns Platform Infrastructure Only

## Status

Revised after latest user clarification on 2026-05-07.

The built-in-agent centralization direction remains valid, but its scope is narrower: `Daily Assistant` is not a server built-in/default-featured agent. The server built-in-agent subsystem should currently provision only true platform infrastructure built-ins, specifically `Memory Compactor`.

## Corrected Product Direction

- `Memory Compactor` is a server/platform built-in because compaction runtime needs a default compaction agent id.
- `Daily Assistant` is a private/user-managed agent. It belongs under `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/` and can be featured by users through Settings when available.
- The server must not seed, default-feature, or migrate Daily Assistant.

## Target Architecture

```text
autobyteus-server-ts/src/built-in-agents/
  built-in-agent-bootstrapper.ts
  built-in-agent-registry.ts
  templates/
    memory-compactor/
      agent.md
      agent-config.json
```

The subsystem is still worth keeping even with one current row because it cleanly owns platform packaged-agent provisioning and replaces the scattered compaction bootstrap/template path.

## Built-In Agent Registry

The registry should declare platform built-ins only.

Required active row:

- Memory Compactor
  - canonical id: `autobyteus-memory-compactor`
  - display name: `Memory Compactor`
  - template dir: `memory-compactor`
  - setting default: initialize blank `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` to `autobyteus-memory-compactor` after the definition resolves

Explicitly not a registry row:

- `daily-assistant`
- `autobyteus-super-assistant`

## Bootstrapper Responsibility

The unified built-in-agent bootstrapper should:

1. Iterate platform built-in registry rows.
2. Ensure each platform built-in has `<appDataDir>/agents/<id>/agent.md` and `agent-config.json` when missing.
3. Preserve existing files by default.
4. Resolve seeded definitions through `AgentDefinitionService`.
5. Initialize per-agent platform settings when blank; currently only compaction agent id for Memory Compactor.
6. Refresh definition cache after successful provisioning.
7. Return testable result data.

The bootstrapper should not initialize/migrate `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` for Daily Assistant.

## Required Moves / Removals

Keep/move:

```text
autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent/*
→ autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/*
```

Replace:

```text
autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent-bootstrapper.ts
→ autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts
  autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts
```

Remove from active server source/WIP:

```text
autobyteus-server-ts/src/built-in-agents/templates/daily-assistant/
Daily Assistant row/constants/legacy migration/featured default in built-in-agent-registry.ts
Daily Assistant featured-setting initialization/migration in built-in-agent-bootstrapper.ts when unused
```

## Runtime Storage

Runtime seeded platform built-ins remain normal file-backed agents under:

```text
<appDataDir>/agents/autobyteus-memory-compactor/
```

No fresh server startup should create:

```text
<appDataDir>/agents/daily-assistant/
```

unless a user/private process already placed it there. Private package-root loading is separate and does not involve built-in bootstrapping.

## Validation Expectations

- Fresh startup seeds Memory Compactor only.
- Blank `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` initializes to `autobyteus-memory-compactor` after resolution.
- Non-blank compaction setting is preserved.
- Fresh startup does not seed `daily-assistant`.
- Fresh startup does not initialize/migrate featured catalog setting to `daily-assistant`.
- Built output includes Memory Compactor built-in template and excludes Daily Assistant built-in template.
- Active scans find no one-off compactor bootstrapper/template and no active server Daily Assistant built-in provisioning.

## User Direction

User explicitly said the latest change should be simple: remove Daily Assistant from built-ins, keep/move it in `autobyteus-private-agents`, and keep the current grouping plus Memory Compactor built-in centralization changes.
