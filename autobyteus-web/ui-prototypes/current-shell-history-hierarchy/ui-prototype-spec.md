# Current Shell History Hierarchy Prototype Spec

## Scope
- Platform: web
- Flow: `agents-page-left-history-hierarchy`
- Fidelity: high
- Simulation mode: state-only

## Product Intent
Preserve the existing `/agents` page layout and visual language while refining only the left lower history section so users can quickly resume prior tasks. No major shell redesign is allowed.

## Hard Constraints
- Keep global left navigation unchanged.
- Keep page header, search, reload, and `Create Agent` controls unchanged.
- Keep right content cards (`db manager`, `SuperAgent`) unchanged.
- Change only the lower-left history section hierarchy and row labels.
- Do not add a new top-level "Create Task" CTA.
- Do not use "Running" as a section label.

## Hierarchy
- `workspace -> agent -> recent tasks`

## Task Row Rules
- Show short summary title (single line, ellipsis).
- Show relative time on the right.
- Show only latest 10 tasks per expanded branch.
- Selected task highlighted.

## Active Prototype Artifacts
- `ui-prototypes/current-shell-history-hierarchy/images/web/agents-page-history/agents-page-history-by-workspace-default.png`
