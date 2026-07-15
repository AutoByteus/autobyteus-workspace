# Team Run Configuration UI Text Wireframes

## Purpose

Pin down the requested Team Configuration retune in text form before visual/design implementation. These wireframes are layout-level and copy-level guidance, not exact Tailwind markup.

Core decisions captured here:

- `Auto approve tools` is a global team-run setting and appears directly after Workspace.
- `Team Members Override` is a real collapsible section with a visible chevron.
- Team Members Override defaults collapsed.
- Expanded member rows are shown as one connected list with shared separators, not separate close-bordered cards.
- Member override row copy is concise because the section already provides the override context.
- Read-only/locked configs keep controls disabled but allow the override disclosure to open for inspection.

Concise member-row copy rules:

| Current verbose copy | Target concise copy | Reason |
| --- | --- | --- |
| `Runtime Override` | `Runtime` | Parent section already says override. |
| `LLM Model Override` | `LLM Model` | Parent section already says override. |
| `Use global runtime default` | `Global default` | Same meaning, less scanning noise. |
| `Use global model (default)` | `Global default` | Same meaning, less scanning noise. |
| `Auto-execute: Use global` | `Auto approve` + `Global default` state | Aligns with global label and avoids legacy wording. |
| `Auto-execute: ON/OFF` | `Auto approve` + `On` / `Off` state | More consistent and shorter. |

Legend:

- `▸` collapsed disclosure
- `▾` expanded disclosure
- `[select]`, `[toggle]`, `[checkbox]` indicate controls
- `(disabled)` marks read-only/locked controls
- `────` between member rows means one shared separator line, not two adjacent card borders

---

## Scenario 1 — Editable new team configuration, initial render, many members

Goal: global settings are visible before any long member list.

```text
Team Configuration

Team Definition
[ Software Engineering Team                                      ]

Runtime
[ Codex App Server                                               v]
Selects the runtime backend used by this team run.

Default LLM Model (Global)
[ OpenAI / GPT-5.5 (default reasoning: medium)                  v]
This model will be used by all members unless overridden.

Thinking                                                   [toggle on]
Thinking configuration not available for this model.

Advanced ▾
  Reasoning Effort     [ xhigh                                v]
  Fast mode            [ Default                              v]

Workspace Directory
[ Existing ][ New ]
[ autobyteus-workspace-superrepo                              v]
Workspace: autobyteus-workspace-superrepo

Auto approve tools                                      [toggle off]
High-trust mode for Codex team members: automatically allows tool calls
and access/permission requests for this run.

▸ Team Members Override (6)

[ Run Team ]
```

Notes:

- The user can see and toggle global Auto approve tools without expanding or scrolling through member overrides.
- Team Members Override is visibly collapsible because the chevron appears at the start of the header.
- Member override controls are hidden by default.
- Member row labels intentionally avoid repeating `Override`; the parent section already says these are overrides.

---

## Scenario 2 — Editable team configuration, override section expanded

Goal: member controls remain available, but siblings visually share one separator line.

```text
...
Auto approve tools                                      [toggle off]
High-trust mode for Codex team members: automatically allows tool calls
and access/permission requests for this run.

▾ Team Members Override (6)

┌────────────────────────────────────────────────────────────────────┐
│ solution_designer        [Coordinator]                             │
│                                                                    │
│ Runtime                                                            │
│ [ Global default                                               v ]  │
│                                                                    │
│ LLM Model                                                          │
│ [ Global default                                               v ]  │
│                                                                    │
│ Auto approve                                                       │
│ [–] Global default                                                 │
│                                                                    │
│ Thinking                                             [toggle on]    │
│ Thinking configuration not available for this model.                │
│                                                                    │
│ Advanced ▾                                                         │
│   Reasoning Effort    [ xhigh                                  v ] │
│   Fast mode           [ Default                                v ] │
├────────────────────────────────────────────────────────────────────┤
│ architecture_reviewer                                              │
│                                                                    │
│ Runtime                                                            │
│ [ Global default                                               v ]  │
│                                                                    │
│ LLM Model                                                          │
│ [ Global default                                               v ]  │
│                                                                    │
│ Auto approve                                                       │
│ [–] Global default                                                 │
│                                                                    │
│ Thinking                                             [toggle on]    │
│ Thinking configuration not available for this model.                │
│                                                                    │
│ Advanced ▾                                                         │
│   Reasoning Effort    [ xhigh                                  v ] │
│   Fast mode           [ Default                                v ] │
├────────────────────────────────────────────────────────────────────┤
│ implementation_engineer                                            │
│ ...                                                                │
├────────────────────────────────────────────────────────────────────┤
│ code_reviewer                                                      │
│ ...                                                                │
├────────────────────────────────────────────────────────────────────┤
│ api_e2e_engineer                                                   │
│ ...                                                                │
├────────────────────────────────────────────────────────────────────┤
│ delivery_engineer                                                  │
│ ...                                                                │
└────────────────────────────────────────────────────────────────────┘
```

Notes:

- There is one outer boundary around the override list.
- Adjacent sibling members share a single separator at the same location.
- We avoid the current feeling of `card border + gap + card border` between every pair of members.
- Inner Advanced sections can still use their existing disclosure pattern.

---

## Scenario 3 — Editable team configuration with explicit member overrides

Goal: collapsed state should not hide that some overrides exist.

Recommended header shape:

```text
Auto approve tools                                      [toggle on]
High-trust mode for Codex team members: automatically allows tool calls
and access/permission requests for this run.

▸ Team Members Override (6)        2 overridden
```

Expanded connected-list shape:

```text
▾ Team Members Override (6)        2 overridden

┌────────────────────────────────────────────────────────────────────┐
│ solution_designer        [Coordinator] [Overridden]                │
│ Runtime                                                            │
│ [ Codex App Server                                             v ]  │
│ LLM Model                                                          │
│ [ OpenAI / GPT-5.5                                             v ]  │
│ Auto approve                                                       │
│ [✓] On                                                            │
│ ...                                                                │
├────────────────────────────────────────────────────────────────────┤
│ architecture_reviewer                                              │
│ Runtime                                                            │
│ [ Global default                                               v ]  │
│ LLM Model                                                          │
│ [ Global default                                               v ]  │
│ Auto approve                                                       │
│ [–] Global default                                                 │
│ ...                                                                │
├────────────────────────────────────────────────────────────────────┤
│ implementation_engineer            [Overridden]                    │
│ Runtime                                                            │
│ [ Claude Agent SDK                                             v ]  │
│ LLM Model                                                          │
│ [ Claude Sonnet                                                v ]  │
│ Auto approve                                                       │
│ [–] Global default                                                 │
│ ...                                                                │
└────────────────────────────────────────────────────────────────────┘
```

Notes:

- Existing per-member `Overridden` badge remains useful inside expanded rows.
- The collapsed header override count reduces hidden-state risk.
- The header count should be derived from existing meaningful-override logic, not new state.

---

## Scenario 4 — Read-only selected/historical team configuration, initial render

Goal: config is display-only, but global Auto approve remains visible and member overrides are inspectable after expansion.

```text
Team Configuration

Team Definition
[ Software Engineering Team                                    ] (disabled)

Runtime
[ Codex App Server                                             v] (disabled)
Selects the runtime backend used by this team run.

Default LLM Model (Global)
[ OpenAI / GPT-5.5 (default reasoning: medium)                v] (disabled)
This model will be used by all members unless overridden.

Thinking                                                 [toggle on disabled]
Thinking configuration not available for this model.

Advanced ▾
  Reasoning Effort     [ xhigh                              v] (disabled)
  Fast mode            [ Default                            v] (disabled)

Workspace Directory
[ Existing ][ New ] (disabled)
[ autobyteus-workspace-superrepo                            v] (disabled)
Workspace: autobyteus-workspace-superrepo

Auto approve tools                                    [toggle on disabled]
High-trust mode for Codex team members: automatically allows tool calls
and access/permission requests for this run.

▸ Team Members Override (6)

[eye] Selected team run configuration is read-only. Start a new team run to use
different runtime or model settings.
```

Notes:

- The disclosure button itself is not disabled, because inspection is allowed.
- The controls inside remain disabled after expansion.
- Read-only explanatory banner remains below the config content.

---

## Scenario 5 — Read-only selected/historical team configuration, override section expanded

Goal: member values can be inspected without enabling edits.

```text
▾ Team Members Override (6)

┌────────────────────────────────────────────────────────────────────┐
│ solution_designer        [Coordinator]                             │
│ Runtime                                                            │
│ [ Global default                                               v ]  │ (disabled)
│ LLM Model                                                          │
│ [ Global default                                               v ]  │ (disabled)
│ Auto approve                                                       │
│ [–] Global default                                                 │ (disabled)
│ Thinking                                          [toggle on disabled]
│ Advanced ▾                                                         │
│   Reasoning Effort    [ xhigh                                  v ] │ (disabled)
│   Fast mode           [ Default                                v ] │ (disabled)
├────────────────────────────────────────────────────────────────────┤
│ architecture_reviewer                                              │
│ ... disabled controls ...                                          │
└────────────────────────────────────────────────────────────────────┘
```

Notes:

- This preserves the existing documented contract: selected-team config is inspect-only.
- Expansion is for visibility, not editing.

---

## Scenario 6 — Nested team inside Team Members Override

Goal: nested team hierarchy stays readable without adding heavy competing borders.

```text
▾ Team Members Override (3)

┌────────────────────────────────────────────────────────────────────┐
│ program_manager        [Coordinator]                               │
│ ... member controls ...                                            │
├────────────────────────────────────────────────────────────────────┤
│ BuildSquad                                      [TEAM]             │
│ BuildSquad                                                         │
│                                                                    │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │ review_lead                                                  │  │
│   │ ... member controls ...                                      │  │
│   ├──────────────────────────────────────────────────────────────┤  │
│   │ qa_specialist                                                │  │
│   │ ... member controls ...                                      │  │
│   └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

Alternative lighter nested treatment if borders still feel too heavy:

```text
┌────────────────────────────────────────────────────────────────────┐
│ program_manager                                                    │
│ ...                                                                │
├────────────────────────────────────────────────────────────────────┤
│ BuildSquad  [TEAM]                                                 │
│   │ review_lead                                                    │
│   │ ... controls ...                                               │
│   ├────────────────────────────────────────────────────────────     │
│   │ qa_specialist                                                  │
│   │ ... controls ...                                               │
└────────────────────────────────────────────────────────────────────┘
```

Notes:

- Preserve nested team identity and breadcrumbs.
- Avoid multiple close full card borders at every nesting level.
- Prefer a subtle indent/rail plus shared separators when the nested bordered box feels too heavy.

---

## Scenario 7 — Team with no leaf members

Goal: do not render a meaningless override disclosure.

```text
Team Configuration

Team Definition
[ Empty Team / Unresolved Team                                  ]

Runtime
[ ... ]

Workspace Directory
[ ... ]

Auto approve tools                                      [toggle off]
High-trust mode for Codex team members: automatically allows tool calls
and access/permission requests for this run.

(no Team Members Override section)
```

Notes:

- Matches current `v-if="leafMembers.length > 0"` intent.
- If launch readiness already blocks teams with no runnable leaf members, that stays outside this UI retune.

---

## Scenario 8 — Locked editable/new run after execution starts

Goal: layout remains the same as editable/read-only, but controls no-op/disabled because execution has started.

```text
...
Workspace: autobyteus-workspace-superrepo

Auto approve tools                                  [toggle on disabled]
High-trust mode for Codex team members: automatically allows tool calls
and access/permission requests for this run.

▸ Team Members Override (6)

[lock] Configuration locked because execution has started.
```

Expanded:

```text
▾ Team Members Override (6)

┌────────────────────────────────────────────────────────────────────┐
│ solution_designer                                                  │
│ [all override controls disabled]                                   │
├────────────────────────────────────────────────────────────────────┤
│ architecture_reviewer                                              │
│ [all override controls disabled]                                   │
└────────────────────────────────────────────────────────────────────┘
```

Notes:

- Like read-only mode, the disclosure remains usable for inspection.
- Update handlers continue to no-op when locked.

---

## Implementation Shape Suggested By These Wireframes

Recommended component structure:

```text
TeamRunConfigForm.vue
  Team definition
  RuntimeModelConfigFields
  WorkspaceSelector
  AutoApproveRow (existing markup moved; may remain inline)
  MemberOverrideDisclosure
    header button with inline SVG chevron + aria-expanded
    panel body
      MemberOverrideTree
  Read-only / locked banner
```

Recommended member list styling:

```text
MemberOverrideTree.vue
  root list: rounded border overflow-hidden bg-white divide-y
  leaf member row: no own outer border, padding only
  nested group row: part of same connected list; nested children use subtle inset/rail or a lighter nested connected list
```

Avoid:

```text
<div class="space-y-2">
  <div class="rounded border ...">member A</div>
  <div class="rounded border ...">member B</div>
</div>
```

because it creates two close border lines between adjacent members.

Prefer:

```text
<div class="rounded border overflow-hidden divide-y">
  <div class="p-3">member A</div>
  <div class="p-3">member B</div>
</div>
```

because adjacent members share one separator.
