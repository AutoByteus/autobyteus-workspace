# Prompt: Server Settings Basics Ultra Clean (V11 - strict layout lock)

- Transition ID: `server_settings_basics_ultra_clean_v11`
- Use Case: Basics page visual de-noising while preserving current implementation layout
- Platform: web
- Flow: server-settings
- Screen: server-settings
- State: basics_ultra_clean_v11
- Trigger: `system:refine-clean-style-layout-locked`
- From State: `basics_ultra_clean_v10`
- To State: `basics_ultra_clean_v11`
- Source: Edit
- Input Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-basics-ultra-clean-v10.png`

Edit this image with strict structure lock.

Keep unchanged:
- Exact page information architecture and relative layout regions:
  - Left dark app icon rail
  - Settings sidebar
  - Server Settings submenu with Basics and Advanced
  - Main content provider sections and web search section
- Keep only these providers in Basics:
  - LM Studio
  - Ollama
  - AutoByteus LLM Hosts
  - AutoByteus VNC Hosts
- Keep per-provider Save button and + Add endpoint actions.

Fix and improve:
- Remove accidental wrong labels/content from prior draft.
- Make text clean and legible; no gibberish.
- Reduce visual noise and "too many squares":
  - Use minimal container chrome.
  - Keep cards very soft with nearly invisible separators.
  - Inputs should use subtle, thin, light-gray outlines.
  - Increase whitespace rhythm between groups.
- Keep selected submenu "Basics" with subtle gray background highlight; "Advanced" plain.

Style constraints:
- Neutral modern look, very clean, low-contrast borders.
- No extra badges, no extra random panels, no duplicated sections.
- No extra provider not in list above.

Aspect ratio remains 16:9.
