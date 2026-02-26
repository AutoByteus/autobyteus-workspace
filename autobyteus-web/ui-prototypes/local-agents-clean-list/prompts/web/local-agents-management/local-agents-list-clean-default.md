Product UI prototype, web app screen, aspect ratio 16:9, high-fidelity desktop screenshot.

Create a cleaner "Local Agents" page redesign for an enterprise AI desktop app, including the full application shell.

Product base spec:
- Platform: web desktop app, 16:9 ratio.
- Style: modern SaaS, minimal noise, strong hierarchy, calm and organized.
- Typography: clean humanist sans, clear size contrast.
- Palette: neutral gray canvas, white surfaces, slate text, cobalt-blue accent for primary CTA, subtle borders.
- Spacing: consistent 8px system, generous whitespace, stable alignment grid.
- Accessibility intent: clear contrast, obvious active navigation state, clear primary action.

Frame composition:
- Show full desktop app layout, not just the content panel.
- Include top desktop window chrome bar (macOS style traffic-light dots).
- Include leftmost dark vertical icon rail with small monochrome icons.
- Include second left sidebar panel titled "AI Agents" with nav items:
  - "Local Agents" (active/highlighted)
  - "Agent Teams"
  - "Running Agents" (disabled look)
  - "Agent Marketplace" (disabled look)
- Main content panel on the right for Local Agents management.

Main content layout:
- Header row:
  - Title: "Local Agents"
  - Subtitle: "Access your installed local AI agents"
  - Right actions: secondary "Reload" button and primary "Create New Agent" button.
- One search bar below header:
  - Placeholder: "Search agents by name or description..."
- Below search: two-column grid of consistent-height agent cards, at least 6 cards visible.

Card redesign rules:
- Keep cards calmer and less chaotic than a typical dense card layout.
- Card internal structure:
  - Left: avatar tile (image or initials).
  - Center: agent name, one short description line, compact metadata rows for Tools and Skills.
  - Metadata must use text-first representation compatible with backend data:
    - Show labels and counts like "Tools 4" and "Skills 2".
    - Show tool names and skill names as small text chips only (examples: write_file, generate_image, run_bash).
    - Do NOT use custom icons for individual tools or skills.
  - Right: one strong primary "Run" button and low-emphasis "View Details" action.
- Ensure strict alignment and equal card heights for easy scanning.
- Reduce visual noise:
  - Avoid large chip clusters.
  - Avoid heavy gradients.
  - Keep border/shadow subtle.

Visual hierarchy goals:
- First glance: page title + primary "Create New Agent".
- Second glance: card titles and Run actions.
- Third glance: tool/skill text chips.

Use realistic agent names such as:
- implementation
- Reflective Storyteller
- Visual Book Storyteller
- SlideDesigner
- SlideNarrator
- WeChat Official Account Agent

Output requirements:
- Final output should look like a polished production UI mockup.
- No annotations, no callouts, no wireframe placeholders.
