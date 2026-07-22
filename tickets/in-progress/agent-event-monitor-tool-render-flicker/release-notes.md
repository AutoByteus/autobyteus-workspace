# Release Notes — Stable Codex Reasoning And Tool History

## Fixes

- Fixed a long-running Codex Event Monitor issue where a completed tool card could appear, disappear after later Thinking activity, and then reappear.
- Kept completed Codex reasoning snapshots grouped into the same logical Thinking block until the next real transcript or lifecycle boundary.
- Completed each logical Thinking block through the existing generic segment lifecycle before the boundary that closed it, so recent-window retention no longer treats old completed Thinking as permanently mutable.
- Preserved coherent standalone and focused team-member feeds when switching between active runs.

## Behavior And Compatibility

- Tool-card visuals, Thinking visuals, selection/hydration behavior, GraphQL/WebSocket shapes, and the existing recent-window limits are unchanged.
- Matching updates to an already-created tool card do not split a Thinking block; the first new ordered card, assistant text, turn transition, or terminal error closes it in deterministic order.
- Reasoning without a usable turn identity is completed immediately instead of leaving an abandoned mutable segment.
- Existing raw traces, active/archive files, snapshots, and history projections remain directly usable. No migration, backfill, or maintenance window is required.
- No Electron shell, packaging, or platform-specific code changed.

## Validation

- Architecture review passed.
- Implementation-source review passed at `9.5/10` with no unresolved source findings.
- API/E2E execution passed at `95%` confidence; all confidence categories were at least 90% and no critical acceptance criterion lacked direct proof.
- Deterministic standalone and focused-team production spines each passed 110 reasoning/tool cycles: 220 reasoning snapshots became 110 logical blocks and 110 neutral ends, with the latest 100 visuals retaining 50 completed Thinking blocks and 50 terminal tools.
- Affected repository execution passed 169 tests with one intentionally environment-gated live test skipped; fresh real standalone MCP/WebSocket and focused-team model-driven runs passed.
- Proportional review of the three updated durable tests passed with no findings.
- A fresh delivery fetch confirmed `origin/personal@965f97685c08569a98186b2a894243c0b3f602d3` was already contained; no new base commit required integration or a duplicate suite run.
