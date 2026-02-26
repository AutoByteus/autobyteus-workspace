# UI Behavior Test Matrix

| transition_id | flow | screen | trigger | from_state | to_state | expected next state image | acceptance check | open question / risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| basics_default_render | server-settings-basics | server-settings-right-pane | page load | loading | default | images/web/server-settings-right-pane/server-settings-basics-clean-organized-default.png | Each provider is rendered as a separate card with clear title, helper text, and per-card save action. | None |
| basics_edit_row | server-settings-basics | server-settings-right-pane | input change in endpoint row | default | dirty | images/web/server-settings-right-pane/server-settings-basics-clean-organized-default.png | Unsaved state appears at card footer without collapsing layout alignment. | Dirty visual can be strengthened in a follow-up state variant if requested. |
| basics_add_endpoint | server-settings-basics | server-settings-right-pane | click add endpoint | default | default with extra row | images/web/server-settings-right-pane/server-settings-basics-clean-organized-default.png | New row follows the same grid alignment and keeps card structure intact. | None |
| basics_save_card | server-settings-basics | server-settings-right-pane | click save | dirty | success | images/web/server-settings-right-pane/server-settings-basics-clean-organized-default.png | Save action is clearly scoped to the active provider card and does not create cross-card confusion. | Success toast still handled by app-level notification pattern. |
