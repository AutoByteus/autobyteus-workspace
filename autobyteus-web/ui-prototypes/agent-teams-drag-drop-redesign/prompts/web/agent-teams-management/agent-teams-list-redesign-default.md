Product UI prototype, web app screen, aspect ratio 16:9, high-fidelity desktop screenshot.

Create a production-ready redesign of the "Agent Teams" list page for an enterprise AI desktop app.

Product base spec:
- Platform: web desktop app, 16:9 ratio.
- Style: modern SaaS, high clarity, minimal noise, strong hierarchy.
- Typography: clean humanist sans with clear heading/body contrast.
- Palette: neutral slate canvas, white content cards, cobalt-blue primary actions, subtle border tones.
- Spacing: strict 8px spacing rhythm with generous breathing room.
- Accessibility intent: visible active states, keyboard-focus affordance, readable text at normal zoom.

Frame composition:
- Include full app shell with macOS window chrome.
- Leftmost vertical dark icon rail with minimalist monochrome icons.
- Secondary sidebar titled "AI Agents" with nav items:
  - "Local Agents"
  - "Agent Teams" (active)
  - "Running Agents" (disabled)
  - "Agent Marketplace" (disabled)
- Main content area is Agent Teams management.

Main content requirements:
- Header row:
  - Title: "Agent Teams"
  - Subtitle: "Manage blueprints for multi-agent teams"
  - Right actions: secondary "Reload" and primary "Create New Team"
- Simple search row below header:
  - Include exactly one search input only.
  - Search input placeholder: "Search teams by name"
  - Do NOT include any filter chips, tabs, or advanced filter controls.
- Team cards in a two-column grid, consistent card height.

Card redesign requirements:
- Each card includes:
  - A team avatar area (image avatar or branded initials badge) near the team name.
  - Team name + short description.
  - Role badge.
  - Member summary strip with small avatar tokens and type tags (AGENT / TEAM).
  - Metadata row: coordinator name, member count, nested-team count, last updated time.
  - Actions: primary "Run Team" and secondary "View Details" positioned in the top-right/header area of each card.
- Do NOT place the primary/secondary actions in a bottom footer row.
- Visual style should be cleaner and more polished than a plain gray container card.
- Maintain calm visual rhythm; avoid heavy gradients and decorative clutter.

Use realistic sample data with team names such as:
- cinematic stage play generation team
- product launch squad
- customer support escalation team
- qa verification pod

Output requirements:
- Polished production UI mockup only.
- No wireframe overlays, no annotation callouts, no device frame.
