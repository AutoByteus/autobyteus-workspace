# server-settings - quick_default

## Transition Metadata
- Transition ID: `server_settings_quick_default`
- Trigger: `system:open-server-settings-quick`
- From State: `none`
- To State: `quick_default`
- Input Image: `N/A`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-default.png`

## Edit Prompt
Create a production-ready desktop web app UI screen, aspect ratio 16:9.

Product: AutoByteus settings page.
User goal: configure server endpoints quickly without typing comma-separated strings.
Persona: non-technical to moderately technical users.
Platform: web desktop, comfortable density.

Hard constraints:
- No watermark
- No device frame
- No decorative scene outside app UI
- Keep a realistic in-app screenshot style

Keep this shell structure:
- Leftmost dark vertical icon rail
- Left settings navigation pane with items: API Keys, Token Usage Statistics, Nodes, External Messaging, Server Settings (selected)
- Main content area titled "Server Settings"
- Tabs at top: "Quick Setup" selected, "Advanced / Developer" secondary

Redesign the Quick Setup panel to feel user-friendly:
- Panel title: "Connection Setup"
- Subtitle: "Add one or more endpoints per service. No commas needed."
- Top right CTA button: "Save All Changes"

Inside panel show 4 service cards:
1) LM Studio
2) Ollama
3) AutoByteus LLM
4) AutoByteus VNC

For each service card:
- Header row with service name and a subtle status badge (e.g., "1 endpoint")
- Small helper text explaining expected format in plain language
- Endpoint rows in a structured form, not one text box:
  - Protocol dropdown (http/https/ws)
  - Host input (placeholder like localhost or 192.168.2.158)
  - Port input as separate numeric field (placeholder 1234)
  - Path input optional for URL-based services
  - Row action icon button to delete row
- "Add endpoint" button below rows
- Inline per-card "Save" ghost button on the right

Visual style direction:
- Clean modern enterprise UI, friendly and clear
- Strong hierarchy and spacing, not cramped
- Use warm neutral background with white cards
- Blue primary actions, green subtle success accents
- High readability and clear labels
- Visible but restrained borders and shadows

Include realistic example values:
- LM Studio: http localhost 1234
- Ollama: http localhost 11434
- AutoByteus LLM: https 192.168.2.158 ports 51739 and 51740 (two rows)
- AutoByteus VNC: ws localhost ports 6080 and 6081 (two rows)

The screen should look like a polished redesign of the existing AutoByteus Server Settings UI, preserving layout familiarity while making endpoint entry much easier for end users.

## Iteration Log (append-only, latest at bottom)
- Iteration: 1
- Previous Input Image: `N/A`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-default.png`
- Delta Summary: Baseline generated shell with row-based endpoint inputs.
