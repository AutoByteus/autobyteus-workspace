# Hierarchical TeamRun Launch Configuration — Behavior Contract

## Status And Authority

`Approved` intended-behavior supplement. Approved with `requirements.md` by the user on 2026-08-24. The user subsequently completed personal review of the design package and authorized architecture-review handoff. SR-008 clarifies the already-governing UC-007/R-017/AC-015 topology-repair behavior and the integrated controlled-workspace contract; it introduces no new product behavior.

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

The complete TeamRun default contains runtime, model identifier, model-specific configuration, auto-execute behavior, workspace, and skill-access mode. The workspace hierarchy editor may override every one of those fields except skill-access mode; skill access remains root-authored and inherited because the current launch UI exposes no skill-access control.

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
- Supported edits are runtime, model, model-specific configuration, auto-execute behavior, and workspace.
- Skill-access mode is shown only when needed for read-only clarity; it remains inherited from the root in this ticket.

### Customized State

- Explicit fields are distinguishable from inherited fields.
- Reset removes the Team-scope override and recomputes from the parent.
- Agent overrides remain attached to their Agent addresses.

### Loading, Error, And Locked States

- Runtime/model catalog and workspace loading feedback is associated with the canonical Team address whose effective configuration depends on it and with the launch draft that owns that address-qualified intent.
- Loading preserves the draft's stored intent and inactive New-path buffer, disables only controls that cannot be used safely, and keeps launch blocked until the effective scope is valid.
- Catalog or workspace failure is visible at the affected Team scope and offers the normal recovery/retry action; it never substitutes a different value silently or leaks into another draft/context.
- Read-only, locked, and in-flight drafts disable root, nested-Team, reset, and Agent override edits consistently while keeping effective summaries visible.
- A root-only definition remains the intentional empty hierarchy state: no nested-scope disclosure or placeholder is added.

### Responsive And Accessible Interaction

- Each Team disclosure is keyboard-operable and exposes its expanded/collapsed state.
- Team name, canonical address, hierarchy level, inherited/customized state, and validation feedback remain textually identifiable and are not communicated by color alone.
- Validation feedback is associated with the affected Team address and controls.
- At supported non-mobile widths, indentation or wrapping does not hide scope identity or the reset action. Mobile retains the separate compact root-only behavior described below.
- This ticket introduces no new permission boundary or permission-specific UI state.

### Read-Only Historical State

- New-format runs show the complete effective default stored for the selected TeamRun.
- Migrated older runs show the TeamRun default reconstructed from that Team's persisted direct coordinator launch snapshot.
- Known Agent launch snapshots remain visible.

## Topology Changes Before Launch

- Adding a nested team creates an inherited Team scope by default.
- For an unchanged valid address in the same draft, root and nested-Team workspace selection mode, active or inactive New-path buffer, and address-scoped loading/error presentation remain stable across ordinary configuration edits. A real draft/context change does not reuse another draft's buffer or operation state.
- Removing a nested team invalidates its Team-scope and descendant Agent overrides plus any active or inactive workspace-selection/loading/error state keyed to those removed subjects.
- Moving/renaming a team changes canonical addresses, and changing a subject's kind invalidates the old subject identity. Old overrides or workspace buffers do not silently attach to a different placement.
- One topology-aware draft repair prunes every stale Team/Agent override and stale Team workspace state, reports each affected canonical address once, and stops that launch attempt before any workspace registration or TeamRun create request.
- The root `/` workspace buffer is never pruned by a nested-topology edit. Resetting a valid nested Team override intentionally clears that Team's workspace authoring/loading/error state together with its scoped configuration.
- Launch never accepts an unknown or kind-mismatched scoped subject, and no broad configuration-object watcher is used to approximate these transitions.

## Nested Definition Defaults

The approved rule is deliberately simple:

- A definition's `defaultLaunchConfig` seeds a draft only when that definition is selected as the root TeamRun.
- When the same definition is embedded under another Team, its placement inherits the parent TeamRun.
- An embedded definition never silently replaces parent values and this ticket adds no separate “apply nested definition defaults” action.
- A user-created nested-Team override is the only editable Team-scope intent below root.

## Launch Surfaces

| Surface | Minimum Supported Intent | Required Meaning |
| --- | --- | --- |
| Workspace TeamRun form | Root + nested Team scopes + Agent overrides | Full hierarchical editing |
| Mobile Team setup | Root only | Nested teams inherit root; compact mobile setup gains no hierarchy editor |
| Application team launch profile | Root + existing exact Agent runtime/model overrides | Nested teams inherit root; exact Agent overrides still win |
| External channel team preset | Root-only | All nested teams inherit root |
| Backend programmatic preset | Root-only | All nested teams inherit root |

All surfaces project through the same backend hierarchy contract so root-only authoring does not mean the runtime forgets Team defaults. Every new configured Team execution stores its complete effective default.

## Field Participation

| Field | Root Workspace Scope | Nested Workspace Scope | Exact Agent Override | Complete Team/Agent Snapshot |
| --- | --- | --- | --- | --- |
| Runtime kind | Editable | Inherited or editable | Preserved existing override | Required |
| Model identifier | Editable | Inherited or editable | Preserved existing override | Required |
| Model-specific config | Editable | Inherited or editable | Preserved existing override | Required; nullable configuration remains a complete value |
| Auto-execute tools | Editable | Inherited or editable | Preserved existing override | Required |
| Workspace | Editable | Inherited or editable | No new workspace-form Agent override | Required |
| Skill-access mode | Existing root value | Inherited only | No new workspace-form Agent override | Required |

## Historical Schema Transition

- Existing V1 packages are durable user history and are not discarded.
- A registered startup migration moves them to one new current schema before the TeamRun package catalog and normal readers operate.
- The migration preserves every known ID, topology, handoff, application binding, task, and per-Agent launch snapshot.
- For each historical root/configured Team node, it copies that Team's persisted direct coordinator launch snapshot into the reconstructed Team default. The existing schema invariant guarantees a direct coordinator Agent for every configured Team.
- This is an explicitly accepted historical fallback: it is deterministic and normally matches the former global configuration, but it may reproduce a coordinator-specific override when one existed.
- New runs write a complete non-missing Team default at every configured Team node.
- Current runtime and history readers understand only the new schema; coordinator-based reconstruction remains isolated to the V1 migration and is not used for new launches.

## Dynamic AgentTeam Dependency

After this contract exists, Dynamic AgentTeam can use one simple rule:

> A newly added Agent receives an explicit Agent configuration when supplied; otherwise it receives the complete effective default of its nearest containing TeamRun.

A newly added nested TeamRun inherits its parent effective configuration unless the updated run policy contains a scoped override at the new Team address.
