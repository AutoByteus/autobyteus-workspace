# Task History First Workspace Prototype Spec

## Scope
- Platform: web
- Flow: `workspace-task-history`
- Fidelity: high
- Simulation mode: state-only (single default screen for product review)

## Product Intent
Show that users should see task history immediately on app open, without caring whether the underlying runtime is active or inactive. The UI should prioritize "New Task" and "Continue Task" behaviors while hiding process-level complexity.

## Core UX Rules
- Left panel is a unified task history list, not an "active process only" list.
- A task row always shows a short one-line summary and last activity time.
- Clicking a task opens it immediately.
- If runtime is unavailable, the UI should signal restore progress instead of forcing users to understand process state.
- "New Task" remains a primary CTA and does not depend on existing runtime entries.

## Visual Direction
- Light mode only.
- Calm, low-noise productivity aesthetic.
- Clear hierarchy between navigation rail, task history list, and active workspace pane.
- No decorative gimmicks; realism over concept-art styling.

## Active Prototype Artifact
- `ui-prototypes/task-history-first-workspace/images/web/workspace-task-history/workspace-task-history-default.png`
- Prompt source of truth:
  `ui-prototypes/task-history-first-workspace/prompts/web/workspace-task-history/workspace-task-history-default.md`
