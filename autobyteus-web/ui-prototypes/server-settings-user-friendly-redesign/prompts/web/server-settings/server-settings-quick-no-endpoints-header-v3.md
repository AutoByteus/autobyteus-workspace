# server-settings - quick_provider_cards_no_extra_header_v3

## Transition Metadata
- Transition ID: `server_settings_remove_endpoints_header_v3`
- Trigger: `system:apply-feedback-remove-extra-header`
- From State: `quick_provider_cards_simplified_v2`
- To State: `quick_provider_cards_no_extra_header_v3`
- Input Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-provider-cards-simplified-v2.png`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-no-endpoints-header-v3.png`

## Edit Prompt
Transition ID: server_settings_remove_endpoints_header_v3
Trigger: system:apply-feedback-remove-extra-header
From State: quick_provider_cards_simplified_v2
To State: quick_provider_cards_no_extra_header_v3

Edit this Server Settings UI mockup to simplify structure.

Keep unchanged:
- Left app shell and side navigation
- Main page title "Server Settings"
- Two top tabs only: "Quick Setup" and "Advanced / Developer"
- Four provider cards with per-provider "+ Add endpoint" behavior
- Save actions and overall style direction

Change only:
- Remove the separate "Endpoints" section heading and its subtitle entirely.
- Remove any extra top block that duplicates setup wording.
- Place the Quick Setup / Advanced tabs directly under the existing page title area.
- Provider cards start right below the tabs with clean spacing.
- Keep AutoByteus VNC Hosts as a distinct provider card in the list.
- Preserve simple, low-noise, user-friendly style.

Goal:
The screen should feel simpler: one page title, one mode switch, then provider cards. No redundant section header.

## Iteration Log (append-only, latest at bottom)
- Iteration: 1
- Previous Input Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-provider-cards-simplified-v2.png`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-no-endpoints-header-v3.png`
- Delta Summary: Removed redundant section header and promoted tabs as primary top control.
