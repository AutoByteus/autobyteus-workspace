# server-settings - advanced_default

## Transition Metadata
- Transition ID: `server_settings_switch_to_advanced`
- Trigger: `click:advanced-developer-tab`
- From State: `quick_default`
- To State: `advanced_default`
- Input Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-default.png`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-advanced-developer-default.png`

## Edit Prompt
Transition ID: server_settings_switch_to_advanced
Trigger: click:advanced-developer-tab
From State: quick_default
To State: advanced_default

Edit this same Server Settings screen.
Keep unchanged:
- app shell and side navigation
- main page title and top context
- visual style and spacing rhythm

Change only:
- Switch tabs: "Advanced / Developer" selected, "Quick Setup" unselected.
- Replace quick service cards with an advanced panel titled "Developer Tools".
- In this panel, show a segmented control: "All Settings" selected and "Server Status & Logs" secondary.
- Show a modernized settings table below with columns: Setting, Value, Description, Actions.
- In value cells, for endpoint settings include a compact parsed preview badge: "2 endpoints parsed" and a small "Edit as rows" link.
- Keep Save button per row.
- Add a top-right subtle button "Export .env snapshot".

Goal:
Advanced users keep raw control, but still get clearer structure and better readability.

Preserve the same resolution and composition.

## Iteration Log (append-only, latest at bottom)
- Iteration: 1
- Previous Input Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-default.png`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-advanced-developer-default.png`
- Delta Summary: Added advanced-mode visual concept with structured raw settings table.
