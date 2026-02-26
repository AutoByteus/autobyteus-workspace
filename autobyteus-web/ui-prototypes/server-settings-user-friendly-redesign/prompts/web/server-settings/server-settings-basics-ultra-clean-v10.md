# Prompt: Server Settings Basics Ultra Clean (V10)

- Transition ID: `server_settings_basics_ultra_clean_v10`
- Use Case: Server Settings basics page visual simplification
- Platform: web
- Flow: server-settings
- Screen: server-settings
- State: basics_ultra_clean_v10
- Trigger: `system:apply-clean-ui-reduction-pass`
- From State: `current-implemented-basics`
- To State: `basics_ultra_clean_v10`
- Source: Generate

Generate a high-fidelity web app screenshot of the AutoByteus Settings page, Server Settings -> Basics submenu selected.

Aspect ratio: 16:9.

Design direction: ultra-clean, minimal visual noise, very low border density, high readability, calm professional layout.

Must keep these IA elements:
- Left dark icon rail (app-level nav)
- Settings sidebar with items: API Keys, Token Usage Statistics, Nodes, External Messaging, Server Settings
- Under Server Settings, two submenu items: Basics (selected), Advanced (unselected)
- Main content shows provider blocks for:
  - LM Studio
  - Ollama
  - AutoByteus LLM Hosts
  - AutoByteus VNC Hosts
- Each provider row supports protocol/host/port style fields (VNC has host/port rows), + Add endpoint link, and per-provider Save button
- Web Search Configuration block at bottom with Save Search Config

Visual simplification requirements:
- Remove heavy box-in-box appearance.
- Use soft surface sections: mostly white backgrounds, subtle elevation, almost invisible 1px separators only where necessary.
- Inputs should be lighter and cleaner: very soft outline, no harsh dark stroke.
- Reduce number of visible rectangles by relying on spacing and grouping instead of borders.
- Keep plenty of whitespace between provider groups.
- Sidebar and content should align to a clear vertical rhythm.
- Selected submenu item "Basics" should have subtle gray background highlight; parent "Server Settings" should not dominate.

Typography & hierarchy:
- Provider titles medium-bold but not oversized.
- Controls and form text should feel consistent and clean.
- Keep text concise, no extra helper paragraphs at top.

Interaction cues in static mock:
- Save buttons visible but secondary (neutral light style).
- + Add endpoint in muted blue.
- Overall tone should feel modern, simple, and not busy.

Do not include:
- Extra decorative cards, badges, large pills, or bright colored blocks.
- Duplicate headers like "Server Settings" repeated in content.
