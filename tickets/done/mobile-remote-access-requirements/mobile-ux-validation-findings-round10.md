# Round 10 Mobile UX Validation Findings — Non-WebSocket Issues

## Scope

These findings come from API/E2E browser validation of the mobile PWA on 2026-05-19. They intentionally exclude the shared single-agent WebSocket command-identity issue. That issue was later rechecked against latest `origin/personal` `98cfdc24` and found already fixed on base, so no separate command-identity ticket remains.

## Summary Judgment

The mobile journey is functionally close for the phone-first MVP. Core routes and surfaces were validated:

- Home node/status/primary action/recent work.
- Continue latest run.
- Switch work.
- Chat / Runs / Files / Activity one-task-at-a-time mobile shell.
- Files preview and attach.
- Activity filters and tool/history visibility.
- `/mobile/workspace` unsupported redirect.
- Desktop `/workspace` no-regression.

The remaining items below are UX/design polish or product-scope decisions rather than immediate mobile implementation blockers.

## UX-1 — Runtime/model visibility in mobile Run Setup

### Observation

Mobile Run Setup only shows `Runtime/model: Existing desktop defaults`. It does not expose a visible runtime/model selector. For real validation with Codex + GPT-5.5, I had to use a browser-only default-launch fixture to simulate Codex/GPT-5.5 desktop defaults for the Codex agent definition.

### Why it matters

If the intended mobile journey is “match desktop functional power,” users may expect to verify or change runtime/model on phone before launching. If the intended mobile journey is deliberately simplified, relying on desktop defaults is acceptable, but the UX should make that contract explicit.

### Suggestion

Decide one of these product directions:

1. Keep mobile simplified: make the copy more explicit, e.g. `Uses the agent's desktop default runtime/model`, and perhaps show the resolved value when available.
2. Add a compact advanced row: collapsed by default, allowing runtime/model change only when needed.
3. Require desktop defaults for mobile MVP and document that mobile does not own advanced runtime configuration.

## UX-2 — Activity view is functional but dense on phone

### Observation

Activity filters, team/tool history, error rows, and unsupported notices are functional. However, real team/tool data can create very dense phone screens, especially long `run_bash` commands, tool logs, and message excerpts.

### Why it matters

The user can technically reach the information, but scanning and deciding what to do next is harder than on desktop.

### Suggestion

- Default to compact rows with one or two lines.
- Use explicit drill-in / expand for full logs.
- Keep chips for `Messages`, `Tools`, `Errors`, `Approvals`.
- Preserve unsupported terminal/browser-pane notices, but keep them short.

## UX-3 — File browsing works, but large folders need more mobile-oriented discovery

### Observation

Files preview and attach are functional. Large folders can still become long scroll lists, and visible-file search alone may not be enough for common mobile use.

### Why it matters

Phone users usually need quick resume/attach behavior rather than full desktop-style file exploration.

### Suggestion

Add mobile shortcuts such as:

- Recent files.
- Attached files.
- Markdown/code files.
- Changed by current run.
- Sticky breadcrumb/current folder.
- Explicit deep-search action separate from “search visible files.”

## UX-4 — Attachment/context visibility should stay near the send/launch decision

### Observation

File attach works and the context tray shows attached state. But on a long mobile Chat, attachment state can be separated from the actual composer/send control or duplicated with the shared composer context area.

### Why it matters

Users need confidence that the next message or next launch will include the intended file(s), especially on a small screen.

### Suggestion

- Keep context count close to the composer/send button.
- Keep draft context count close to the Run Setup launch button.
- Avoid conflicting duplicate indicators between the mobile tray and shared composer context UI.
- Provide a clear `clear` or `remove` action for accidental attachments.

## UX-5 — New-run target selection is improved, but still deserves intentional-choice review

### Observation

Run Setup now uses mobile pickers and shows a launch summary. It is much better than the earlier native/huge selector problem. However, with many agents and teams, accidental target selection remains a risk if context defaults are not obvious.

### Suggestion

- Keep `Current context` grouping.
- Prefer recent/favorite targets near the top.
- Avoid arbitrary first-item defaults unless launched from an explicit target context.
- In the launch summary, emphasize target + workspace + runtime source before submit.

## Recommendation

Route these items to `solution_designer` for mobile UX design follow-up. They do not need to block the current functional implementation if the MVP scope accepts desktop defaults and compact-but-functional Activity/Files behavior, but they should be captured before final product polish.
