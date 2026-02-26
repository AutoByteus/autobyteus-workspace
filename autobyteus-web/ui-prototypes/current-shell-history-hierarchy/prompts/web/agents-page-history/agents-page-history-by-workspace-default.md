Create a production-ready desktop web app screenshot mock for the `/agents` page.

Aspect ratio: 16:9
Fidelity: high
Mode: realistic SaaS product screenshot, not wireframe.

Critical instruction:
Preserve the current shell and visual language. Only change the lower-left instance list to history hierarchy.

Hard lock shell (must match):
- Light theme only. No dark sidebar, no dark mode.
- No browser frame/device frame.
- Left panel has top nav list exactly:
  Agents
  Agent Teams
  Applications
  Prompts
  Messaging
  Skills
  Tools
  Memory
  Media
- Bottom left footer: Settings.
- Main top row:
  - Search box placeholder similar to "Search agents by name or description..."
  - Reload button
  - Create Agent button (exact label)
- Main body:
  - two cards: db manager and SuperAgent
  - each card has Sync button, Run button, View Details link
  - keep existing card spacing and neutral gray page background

Forbidden:
- No "Dashboard", no "Workflows", no "Users" in left nav.
- No "Create Task" CTA.
- No chat panel or alternate app screen.
- No dark blue/black left rail.

Required change (only):
- In lower-left list region, show hierarchy:
  workspace -> agent -> recent task summaries
- Do not use the word "Running" as section title.
- Use no extra section title above the hierarchy.
- Keep all hierarchy rows inside the same lower-left panel block.
- Do NOT place task summaries in a separate middle column.

Hierarchy details:
1) workspace row: autobyteus_org (folder icon + chevron)
2) expanded agent row beneath: SuperAgent (10) (agent icon + chevron)
3) expanded recent task summary rows (maximum 10 visible):
   - left status dot
   - one-line summary with ellipsis if needed
   - right-aligned relative time (4h, 55m, 2d, etc.)
   - selected row subtle highlight in same style family as current selected row
   - each task row is visually indented under SuperAgent (10), making child relationship obvious

Task examples:
- Describe messaging bindings
- Analyze distributed agent behav...
- Fix super agent avatar on team ...
- Assess node data sync feasibility
- Analyze agent tool-call UI flow
- Adjust workflow skill iteration
- Redesign sidebar to single level
- Investigate electron build failure
- Create refined server settings UI
- Investigate remote node settings

Semantics:
- Do not present active vs inactive distinction.
- All rows should feel directly resumable by click.
