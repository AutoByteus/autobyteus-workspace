# Hierarchical TeamRun Launch Configuration — Behavior Contract

## Status And Authority

`Draft` intended-behavior supplement. It requires approval with `requirements.md`.

## Configuration Subjects

The hierarchy contains two different configurable subjects:

- **TeamRun scope:** establishes defaults for all descendant Agents until a nearer TeamRun scope overrides a field.
- **Agent placement:** overrides fields for exactly one Agent.

Canonical rooted addresses identify both subjects. The definition tree determines whether an address is a Team or Agent; the configuration model must not guess.

## Resolution Rule

```text
root TeamRun configuration
  -> merge nested TeamRun override at each path segment
  -> merge exact Agent override
  -> complete resolved Agent launch configuration
```

Equivalently:

```text
Agent override
  > nearest containing TeamRun effective configuration
  > ancestor TeamRun effective configurations
  > root TeamRun configuration
```

The editable hierarchy stores only explicit intent. Runtime and persistence store complete effective snapshots.

## Example

```text
/                                  AUTOBYTEUS, GPT-5.4
/research                          CLAUDE, Sonnet
/research/reviewer                 model override: Opus
/research/writer                   no Agent override
/delivery                          inherits root
/delivery/release_manager          no Agent override
```

Effective results:

| Subject | Effective runtime/model |
| --- | --- |
| `/research` TeamRun default | CLAUDE / Sonnet |
| `/research/reviewer` | CLAUDE / Opus |
| `/research/writer` | CLAUDE / Sonnet |
| `/delivery` TeamRun default | AUTOBYTEUS / GPT-5.4 |
| `/delivery/release_manager` | AUTOBYTEUS / GPT-5.4 |

Changing the root model affects `/delivery` immediately in the editable draft but does not affect the explicitly customized `/research` model. A partial `/research` override still inherits any fields it did not customize.

## Workspace Launch UI

### Root TeamRun

- Display the complete root configuration first.
- Keep the current root-only flow compact when no nested teams exist.

### Nested TeamRun

Each nested-team group displays:

1. Team name and canonical address.
2. State: **Inherited** or **Customized**.
3. Effective configuration summary.
4. An expandable global configuration area.
5. A reset-to-parent action when customized.
6. Nested Teams and Agent overrides below it.

### Inherited State

- Controls display effective parent values.
- The UI states that the values come from the parent TeamRun.
- Editing a supported field creates or updates the nested-Team scope override.

### Customized State

- Explicit fields are distinguishable from inherited fields.
- Reset removes the Team-scope override and recomputes from the parent.
- Agent overrides remain attached to their Agent addresses.

### Read-Only Historical State

- Current-schema runs show the complete effective default stored for the selected TeamRun.
- Older runs show that the TeamRun default is unavailable rather than displaying a fabricated inherited value.
- Known Agent launch snapshots remain visible.

## Topology Changes Before Launch

- Adding a nested team creates an inherited Team scope by default.
- Removing a nested team invalidates its team-scope and descendant Agent overrides.
- Moving/renaming a team changes canonical addresses; old overrides do not silently attach to a different placement.
- The approved cleanup UX is pending, but launch must never accept unknown-scope overrides.

## Launch Surfaces

| Surface | Minimum Supported Intent | Required Meaning |
| --- | --- | --- |
| Workspace TeamRun form | Root + nested Team scopes + Agent overrides | Full hierarchical editing |
| Application team launch profile | Root-only or full hierarchy, pending scope decision | Must use the same precedence rule |
| External channel team preset | Root-only | All nested teams inherit root |
| Backend programmatic preset | Root-only | All nested teams inherit root |

## Field-Participation Decision Pending

Runtime, model identifier, model-specific config, and auto-execute behavior already support Agent-level variation and are strong candidates for Team-scope inheritance.

Workspace and skill-access mode are currently root-wide in frontend authoring even though resolved Agent nodes contain their executable values. Requirements approval must decide whether a nested TeamRun is a complete launch unit for these fields too.

## Dynamic AgentTeam Dependency

After this contract exists, Dynamic AgentTeam can use one simple rule:

> A newly added Agent receives an explicit Agent configuration when supplied; otherwise it receives the complete effective default of its nearest containing TeamRun.

A newly added nested TeamRun inherits its parent effective configuration unless the updated run policy contains a scoped override at the new Team address.
