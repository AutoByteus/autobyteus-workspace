# server-settings - advanced_raw_settings_v2_fresh

## Transition Metadata
- Transition ID: `server_settings_advanced_raw_settings_v2_fresh`
- Trigger: `click:advanced-developer-tab`
- From State: `quick_fresh_generated_v9`
- To State: `advanced_raw_settings_v2_fresh`
- Input Image: `N/A (fresh generate)`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-advanced-raw-settings-v2-fresh.png`

## Edit Prompt
Create a high-fidelity desktop web UI screenshot, aspect ratio 4:3, no watermark, no device frame.

Screen context:
- Product: AutoByteus
- Page: Server Settings
- Mode: Advanced / Developer

Hard text lock requirements:
- Main title: Server Settings
- Top tabs: Quick Setup (inactive), Advanced / Developer (active)
- Section heading: Developer Tools
- Section subtitle: Raw environment settings and server diagnostics.
- Inner tabs: All Settings (active), Server Status & Logs (inactive)

Left sidebar labels must be exactly:
- API Keys
- Token Usage Statistics
- Nodes
- External Messaging
- Server Settings (selected)

Main content after Developer Tools:
- A clean table with columns exactly:
  Setting | Value | Description | Actions

Table rows must include these keys (exact spelling):
1) APP_ENV
2) AUTOBYTEUS_SERVER_HOST
3) LMSTUDIO_HOSTS
4) OLLAMA_HOSTS
5) AUTOBYTEUS_LLM_SERVER_HOSTS
6) AUTOBYTEUS_VNC_SERVER_HOSTS

Example values:
- APP_ENV -> production
- AUTOBYTEUS_SERVER_HOST -> http://localhost:8000
- LMSTUDIO_HOSTS -> http://localhost:1234
- OLLAMA_HOSTS -> http://localhost:11434
- AUTOBYTEUS_LLM_SERVER_HOSTS -> https://192.168.2.158:51739,https://192.168.2.158:51740
- AUTOBYTEUS_VNC_SERVER_HOSTS -> localhost:6088,localhost:6089

Description examples:
- APP_ENV: Custom user-defined setting
- AUTOBYTEUS_SERVER_HOST: Public URL of this server
- LMSTUDIO_HOSTS: Comma-separated LM Studio endpoints
- OLLAMA_HOSTS: Comma-separated Ollama endpoints
- AUTOBYTEUS_LLM_SERVER_HOSTS: Comma-separated AutoByteus LLM endpoints
- AUTOBYTEUS_VNC_SERVER_HOSTS: Comma-separated AutoByteus VNC host endpoints

Actions:
- Each row has one small Save button in Actions column.

Bottom row:
- Add custom setting row with empty key and value fields, description "Custom user-defined setting", Save button.

Visual style:
- Same shell style as quick setup approved mockup
- Clean modern SaaS interface, minimal, readable
- Subtle borders and shadows

Strict constraints:
- No gibberish text
- No duplicated keys
- No wrong sidebar labels
- No quick-setup provider cards visible

## Iteration Log (append-only, latest at bottom)
- Iteration: 1
- Previous Input Image: `N/A`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-advanced-raw-settings-v2-fresh.png`
- Delta Summary: Fresh advanced All Settings table prototype aligned to source behavior.
