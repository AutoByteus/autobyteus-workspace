# server-settings - quick_saving

## Transition Metadata
- Transition ID: `server_settings_save_all_loading`
- Trigger: `click:save-all-changes`
- From State: `quick_validation_error`
- To State: `quick_saving`
- Input Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-validation-error.png`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-saving.png`

## Edit Prompt
Transition ID: server_settings_save_all_loading
Trigger: click:save-all-changes
From State: quick_validation_error
To State: quick_saving

Edit this exact screen while preserving layout and style.

Change only state feedback:
- Assume user fixed invalid inputs; remove red error outlines/messages and remove red error badge.
- Show "Save All Changes" top-right button in loading state with inline spinner and text "Saving...".
- Add subtle loading indicators on each service card Save button (tiny spinner + disabled state).
- Add small neutral inline status text below Connection Setup subtitle: "Applying endpoint updates...".

Keep all endpoint rows and content otherwise unchanged.

Expected feedback:
User understands the system is currently saving and controls are temporarily disabled.

## Iteration Log (append-only, latest at bottom)
- Iteration: 1
- Previous Input Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-validation-error.png`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-saving.png`
- Delta Summary: Added save loading treatment and disabled controls.
