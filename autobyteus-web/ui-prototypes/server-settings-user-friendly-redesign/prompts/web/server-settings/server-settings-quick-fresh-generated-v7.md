# server-settings - quick_fresh_generated_v7

## Transition Metadata
- Transition ID: `server_settings_fresh_generate_v7`
- Trigger: `system:full-regenerate-no-header-row`
- From State: `none`
- To State: `quick_fresh_generated_v7`
- Input Image: `N/A`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-fresh-generated-v7.png`

## Edit Prompt
Create a high-fidelity desktop web app screenshot, aspect ratio 4:3, no watermark, no device frame.

Screen: AutoByteus -> Server Settings.

Absolute layout rules:
- Left dark sidebar with menu entries: API Keys, Token Usage Statistics, Nodes, External Messaging, Server Settings (selected).
- Main content title: Server Settings.
- One compact top control row under title:
  - Left tabs: Quick Setup (active), Advanced / Developer (inactive)
  - Right primary button: Save All Changes
- Then four provider cards, fully visible, in this exact order:
  1) LM Studio
  2) Ollama
  3) AutoByteus LLM Hosts
  4) AutoByteus VNC Hosts

Critical simplification rule:
- In each card, do NOT render table column headers.
- Instead, render endpoint rows only, each row visually as:
  [protocol dropdown] [host input] [port input]
- Keep text minimal and clean.

Per-card content requirements:
- Card title + small endpoint count badge.
- Top-right subtle Save button.
- One or more endpoint rows.
- Bottom-left text action: + Add endpoint.
- No floating global or orphan save buttons outside cards.

Exact example endpoint rows:
- LM Studio: http | localhost | 1234
- Ollama: http | localhost | 11434
- AutoByteus LLM Hosts:
  - https | 192.168.2.158 | 51739
  - https | 192.168.2.158 | 51740
- AutoByteus VNC Hosts:
  - ws | localhost | 6088
  - ws | localhost | 6089

Visual style:
- Clean modern SaaS UI
- Light neutral page background
- White cards with subtle border and shadow
- Blue accents
- Comfortable spacing but compact enough to fit all four cards

Hard quality checks:
- All four provider card titles must be present and spelled correctly.
- No duplicated column labels because no header row should exist.
- No gibberish text.

## Iteration Log (append-only, latest at bottom)
- Iteration: 1
- Previous Input Image: `N/A`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-fresh-generated-v7.png`
- Delta Summary: Second full generate attempt to remove duplicate header labels.
