# server-settings - advanced_server_status_logs_v1

## Transition Metadata
- Transition ID: `server_settings_advanced_server_status_logs_v1`
- Trigger: `click:server-status-and-logs`
- From State: `advanced_raw_settings_v2_fresh`
- To State: `advanced_server_status_logs_v1`
- Input Image: `N/A (fresh generate)`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-advanced-server-status-logs-v1.png`

## Edit Prompt
Create a high-fidelity desktop web UI screenshot, aspect ratio 4:3, no watermark, no device frame.

Screen context:
- Product: AutoByteus
- Page: Server Settings
- Top mode: Advanced / Developer is active
- Inner panel: Server Status & Logs is active

Layout requirements:
1) Left sidebar labels exactly:
- API Keys
- Token Usage Statistics
- Nodes
- External Messaging
- Server Settings (selected)

2) Main content top:
- Title: Server Settings
- Tabs row: Quick Setup (inactive), Advanced / Developer (active)
- Helper line below tabs: Raw environment settings and diagnostics.
- Segmented control below helper line:
  - All Settings (inactive)
  - Server Status & Logs (active)

3) Main panel content for Server Status & Logs:
- Card title: Server Status
- Large status card with green accent for running state
- Row with green dot + text: Server Running
- Message: The server is running and ready to use.
- Right-side actions in status card:
  - Refresh Status (secondary)
  - Restart Server (primary)

4) Below status card, a Technical Details card:
- Title: Technical Details
- Fields:
  - Server URL: /graphql
  - Health Check Status: OK
  - Log File: /Users/normy/.autobyteus/logs/server.log
- Below fields, a simple logs preview area with monospaced text lines:
  - [INFO] Server started on localhost:8000
  - [INFO] GraphQL endpoint ready at /graphql
  - [INFO] Health check: OK

Visual style:
- Same shell style as approved quick/advanced prototypes
- Clean modern SaaS, light background, white cards
- Subtle shadows and borders
- Blue accents + green status accent
- Clear readable text

Hard constraints:
- No gibberish text
- Must show Server Status & Logs as active inner segment
- Must not show raw settings table in this screen

## Iteration Log (append-only, latest at bottom)
- Iteration: 1
- Previous Input Image: `N/A`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-advanced-server-status-logs-v1.png`
- Delta Summary: Fresh advanced Server Status & Logs panel with status card and technical details/log preview.
