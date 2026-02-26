Product UI prototype, web app screen, aspect ratio 16:9, high-fidelity desktop screenshot.

Create a production-ready redesign of the "Agent Team Detail" page for an enterprise AI desktop app.

Product base spec:
- Platform: web desktop app, 16:9 ratio.
- Style: modern enterprise SaaS, calm and structured, high readability.
- Typography: clean humanist sans with strong title hierarchy and compact metadata text.
- Palette: neutral gray/slate surfaces, white cards, cobalt primary action accent, subtle semantic badges.
- Spacing: consistent 8px rhythm and clear sectional grouping.
- Accessibility intent: clear action hierarchy, legible metadata, visible section boundaries.

Frame composition:
- Include full app shell (window chrome, left icon rail, AI Agents sidebar with "Agent Teams" active).
- Main content area should look polished and information-dense without clutter.
- Sidebar must match the current app navigation style and labels only:
  - "Local Agents"
  - "Agent Teams" (active)
  - "Running Agents" (disabled)
  - "Agent Marketplace" (disabled)

Page layout requirements:
- Header card at top:
  - Team avatar (image or initials badge) beside team name.
  - Team name, role tag, and short description.
  - Metadata chips: member count, coordinator, nested team count, last updated.
  - Top-right actions: primary "Run Team", secondary "Edit", tertiary "Delete".
- Lightweight detail section:
  - Team description block.
  - Compact key-value metadata row for coordinator and composition summary.
- Members section:
  - Title: "Members (N)".
  - Each member row/card includes:
    - Member avatar/initial
    - Member name
    - Type badge (AGENT or TEAM)
    - Coordinator badge when applicable
    - Referenced blueprint name/subtitle
    - Optional quick action icon (view reference)
  - Visual treatment should be cleaner than plain bordered gray blocks.
  - Keep member cards concise and avoid extra dashboard widgets.

Data realism:
- Use realistic members: storyboard_designer, image_generator, audio_generator, video_assembler.
- Mark one AGENT member clearly as coordinator.
- Include at least one TEAM-type nested member example if layout allows.

Output requirements:
- Polished production UI mockup only.
- No wireframe overlays, no external annotations, no device frame.
- Hard constraints:
  - Do NOT render any section labeled "Team Health".
  - Do NOT render monitoring/health/status dashboard cards on this page.
  - Do NOT render the text "Team Health" anywhere in the UI, including sidebar labels.
  - Do NOT render generic dashboard navigation items such as "Dashboard", "Monitorings", "Users", or unrelated admin menus.
