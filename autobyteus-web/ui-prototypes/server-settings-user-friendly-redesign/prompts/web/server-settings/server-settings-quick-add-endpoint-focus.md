# server-settings - quick_add_endpoint_focus

## Transition Metadata
- Transition ID: `server_settings_add_endpoint_focus`
- Trigger: `click:add-endpoint-auto-llm`
- From State: `quick_default`
- To State: `quick_add_endpoint_focus`
- Input Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-default.png`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-add-endpoint-focus.png`

## Edit Prompt
Transition ID: server_settings_add_endpoint_focus
Trigger: click:add-endpoint-auto-llm
From State: quick_default
To State: quick_add_endpoint_focus

Edit this existing AutoByteus Server Settings screen.
Keep unchanged:
- overall app shell layout (left dark icon rail, settings sidebar, main panel)
- typography scale and color style
- all cards and spacing
- image ratio and resolution

Change only:
- In the "AutoByteus LLM" service card, show that user clicked "+ Add endpoint".
- Add one new empty endpoint row below existing rows with clear input placeholders:
  protocol dropdown default "https", host placeholder "host or IP", port placeholder "port", optional path placeholder "/optional/path".
- Add visible keyboard focus ring on the new Host input.
- Show tiny helper text under this row: "Tip: use one endpoint per row."
- Keep other service cards unchanged.

Expected feedback:
User clearly sees a new row has been added and cursor focus is ready for host input.

## Iteration Log (append-only, latest at bottom)
- Iteration: 1
- Previous Input Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-default.png`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-add-endpoint-focus.png`
- Delta Summary: Added new endpoint row and focus affordance.
