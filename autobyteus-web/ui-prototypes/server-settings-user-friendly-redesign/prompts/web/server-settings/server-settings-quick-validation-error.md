# server-settings - quick_validation_error

## Transition Metadata
- Transition ID: `server_settings_endpoint_validation_error`
- Trigger: `blur:empty-host-or-invalid-port`
- From State: `quick_add_endpoint_focus`
- To State: `quick_validation_error`
- Input Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-add-endpoint-focus.png`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-validation-error.png`

## Edit Prompt
Transition ID: server_settings_endpoint_validation_error
Trigger: blur:empty-host-or-invalid-port
From State: quick_add_endpoint_focus
To State: quick_validation_error

Edit this exact UI screenshot while preserving all layout and styling.

Change only these state details in the AutoByteus LLM service card:
- The newly added row should show validation errors.
- Host field outlined in red with message under it: "Host is required".
- Port field outlined in red with message under it: "Port must be 1-65535".
- Add a compact red error banner inside this card top-right: "1 endpoint has invalid values".
- Keep Save button disabled for this card (low-contrast disabled style).

Keep all other cards and shell elements unchanged.

Expected feedback:
User clearly knows exactly which fields are wrong and what to fix.

## Iteration Log (append-only, latest at bottom)
- Iteration: 1
- Previous Input Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-add-endpoint-focus.png`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-validation-error.png`
- Delta Summary: Added inline validation and error banner.
