# server-settings - quick_provider_cards_simplified_v2

## Transition Metadata
- Transition ID: `server_settings_provider_cards_simplified_v2`
- Trigger: `system:apply-user-feedback-simplify`
- From State: `quick_default`
- To State: `quick_provider_cards_simplified_v2`
- Input Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-default.png`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-provider-cards-simplified-v2.png`

## Edit Prompt
Transition ID: server_settings_provider_cards_simplified_v2
Trigger: system:apply-user-feedback-simplify
From State: quick_default
To State: quick_provider_cards_simplified_v2

Edit this AutoByteus Server Settings screen based on user feedback.

Keep unchanged:
- Left app shell and settings navigation
- Quick Setup and Advanced / Developer tabs
- Provider-specific sections/cards (do NOT merge providers)
- Per-provider add endpoint behavior

Simplify and clarify:
- Replace page section heading "Connection Setup" with a simpler heading: "Endpoints".
- Replace subtitle with short plain text: "Add endpoints for each provider."
- Reduce visual noise: lighter borders, less duplicated helper text, tighter but clean spacing.
- Keep exactly four provider cards in this order:
  1) LM Studio
  2) Ollama
  3) AutoByteus LLM Hosts
  4) AutoByteus VNC Hosts

For each provider card:
- Show provider title and a compact endpoint count badge.
- Show rows with columns: Protocol, Host, Port (and optional Path only where useful).
- Keep one clear "+ Add endpoint" action inside that provider card.
- Keep one simple card-level save action.

Important:
- Make AutoByteus VNC Hosts clearly visible as its own section and include ws/wss style endpoint rows.
- Do not mix providers in one table.
- Keep overall look simple, clean, and easy for non-technical users.

Goal:
Use the earlier per-provider clarity, but simplify top wording and reduce perceived complexity.

## Iteration Log (append-only, latest at bottom)
- Iteration: 1
- Previous Input Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-default.png`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-provider-cards-simplified-v2.png`
- Delta Summary: Kept provider cards, simplified top copy/visual density, ensured explicit AutoByteus VNC Hosts section.
